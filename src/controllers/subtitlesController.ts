import Elysia, { InternalServerError, NotFoundError, t } from 'elysia';
import { SearchOptionsDto } from '../dtos/searchOptions';
import getEnvOrThrow from '../helpers/getOrThrow';
import { OpensubtitlesService } from '../services/opensubtitles/opensubtitlesService';
import { TvdbService } from '../services/tvdb/tvdbService';
import Fuse from 'fuse.js';
import { Addic7edService } from '../services/addic7ted/addic7tedService';
import { SubtitleProviders } from '../types';
import {
  getFileFromS3,
  getS3Client,
  uploadFileToS3,
} from '../storage/s3Strategy';
import { Logger } from 'logging';

export function subtitlesController(app: Elysia, logger: Logger): Elysia {
  const opensubtitlesService = new OpensubtitlesService({
    apiUrl: getEnvOrThrow('OB_API_URL'),
    apiKey: getEnvOrThrow('OB_API_KEY'),
    userAgent: getEnvOrThrow('USER_AGENT'),
    username: getEnvOrThrow('OB_USERNAME'),
    password: getEnvOrThrow('OB_PASSWORD'),
  });

  const tvdbService = new TvdbService({
    apiUrl: getEnvOrThrow('TVDB_API_URL'),
    apiKey: getEnvOrThrow('TVDB_API_KEY'),
  });

  const addic7edService = new Addic7edService(
    {
      apiUrl: getEnvOrThrow('ADICC7ED_API_URL'),
    },
    tvdbService
  );

  const s3Config = {
    accessKeyId: getEnvOrThrow('S3_ACCESS_KEY_ID'),
    secretAccessKey: getEnvOrThrow('S3_SECRET_ACCESS_KEY'),
    region: getEnvOrThrow('S3_REGION'),
    bucket: getEnvOrThrow('S3_BUCKET'),
  };
  const s3Client = getS3Client(s3Config);

  app.group('/subtitle', (app) =>
    app
      .model({ SearchOptionsDto })
      .post(
        '/search',
        async ({ body }) => {
          try {
            const opensubtitlesPromise =
              opensubtitlesService.searchSubtitles(body);

            const addic7edPromise = addic7edService.searchSubtitles(body);

            const results = await Promise.all([
              opensubtitlesPromise,
              addic7edPromise,
            ]);
            const combinedResults = results.flat();

            const fuse = new Fuse(combinedResults, {
              keys: ['releaseName', 'comments'],
              ignoreLocation: true,
            });

            const fuseResult = fuse.search(body.query);
            return fuseResult;
          } catch (error) {
            logger.error(JSON.stringify(error));
            throw new InternalServerError(`Something went wrong`);
          }
        },
        {
          body: SearchOptionsDto,
        }
      )
      .get(
        '/',
        async ({ query: { fileId, provider } }) => {
          try {
            const subtitle = await getFileFromS3(s3Client, s3Config, fileId);
            return subtitle;
          } catch (error) {
            let file: string | undefined;
            //TODO: add more providers
            switch (provider) {
              case SubtitleProviders.Opensubtitles:
                file = await opensubtitlesService.downloadSubtitle(fileId);
                break;
              case SubtitleProviders.Addic7ted:
                file = await addic7edService.downloadSubtitle(fileId);
                break;
            }
            if (!file || file.length < 1) {
              throw new NotFoundError('Subtitle file not found');
            }
            uploadFileToS3(s3Client, s3Config, fileId, file);
            return file;
          }
        },
        {
          query: t.Object({
            fileId: t.String(),
            provider: t.Enum(SubtitleProviders),
          }),
        }
      )
  );
  return app;
}
