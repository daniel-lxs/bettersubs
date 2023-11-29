import Elysia, { InternalServerError, NotFoundError, t } from 'elysia';
import { v4 as uuidv4 } from 'uuid';
import { SearchOptionsDto } from './dtos/searchOptions';
import Fuse from 'fuse.js';
import { FeatureType, Subtitle, SubtitleProviders } from '../types';
import { getFileFromS3, uploadFileToS3 } from '../storage/s3Strategy';
import { Logger } from 'logging';
import cache from '../helpers/cache';
import { createSubtitle } from '../db/subtitleRepository';
import { initializeOpensubtitlesService } from '../services/opensubtitles/initializeOpensubtitlesService';
import { initializeTvdbService } from '../services/tvdb/initializeTvdbService';
import { initializeAddic7tedService } from '../services/addic7ted/initializeAddic7tedService';
import { initializeS3Client } from '../storage/initializeS3Client';

export function subtitlesController(app: Elysia, logger: Logger): Elysia {
  const opensubtitlesService = initializeOpensubtitlesService();
  const tvdbService = initializeTvdbService();
  const addic7edService = initializeAddic7tedService(tvdbService);
  const { s3Client, s3Config } = initializeS3Client();

  app.group('/subtitle', (app) =>
    app
      .model({ SearchOptionsDto })
      .use(cache())
      .post(
        '/search',
        async ({ body, cache }) => {
          try {
            let queryKey = uuidv4();

            const results = (
              await Promise.all([
                opensubtitlesService.searchSubtitles(body),
                body.featureType === FeatureType.Episode
                  ? addic7edService.searchSubtitles(body)
                  : Promise.resolve([]),
              ])
            ).flat();

            results.forEach((e) => {
              e.fileId = `${queryKey};${e.fileId}`;
            });

            cache.set(queryKey, results); //We cache the search to extract metadata later

            const fuse = new Fuse(results, {
              keys: ['releaseName', 'comments'],
              ignoreLocation: true,
            });

            if (!body.query) {
              results.sort((a, b) => b.downloadCount - a.downloadCount);
              return results;
            }

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
        async ({ query: { fileId, provider }, cache }) => {
          let subtitleFile: string;
          const [queryKey, cachedFileId] = fileId.split(';');

          try {
            const subtitle = await getFileFromS3(
              s3Client,
              s3Config,
              cachedFileId
            );
            subtitleFile = subtitle;
          } catch (error) {
            logger.info('Subtitle not found in storage');
          }

          switch (provider) {
            case SubtitleProviders.Opensubtitles:
              subtitleFile = await opensubtitlesService.downloadSubtitle(
                cachedFileId
              );
              break;
            case SubtitleProviders.Addic7ted:
              subtitleFile = await addic7edService.downloadSubtitle(
                cachedFileId
              );
              break;
          }
          if (!subtitleFile || subtitleFile.length < 1) {
            throw new NotFoundError('Subtitle file not found');
          }

          const subtitleMetadatum: Subtitle[] = cache.get(queryKey);
          if (!subtitleMetadatum) {
            throw new NotFoundError('Invalid fileId, try searching again');
          }

          const subtitleMetadata = subtitleMetadatum.find((subtitle) =>
            subtitle.fileId.includes(cachedFileId)
          );
          if (!subtitleMetadata) {
            throw new NotFoundError('Subtitle file not found');
          }
          subtitleMetadata.fileId = cachedFileId; //Original file id

          createSubtitle(subtitleMetadata);
          cache.remove(queryKey);

          uploadFileToS3(s3Client, s3Config, cachedFileId, subtitleFile);
          return new Response(subtitleFile, {
            headers: {
              'Content-Disposition': `attachment; filename=${cachedFileId}.srt`,
              'Content-Type': 'text/plain',
            },
          });
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
