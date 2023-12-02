import Elysia, {
  InternalServerError,
  NotFoundError,
  ValidationError,
  t,
} from 'elysia';
import { v4 as uuidv4 } from 'uuid';
import Fuse from 'fuse.js';

import { FeatureType, Subtitle, SubtitleProviders } from '../types';
import { createSubtitleDto, searchOptionsDto } from './dtos';

import { getFileFromS3, uploadFileToS3 } from '../storage/s3Strategy';

import { Logger } from 'logging';
import cache from '../helpers/cache';

import { initializeOpensubtitlesService } from '../services/opensubtitles/initializeOpensubtitlesService';

import { initializeTvdbService } from '../services/tvdb/initializeTvdbService';

import { initializeAddic7tedService } from '../services/addic7ted/initializeAddic7tedService';

import { initializeS3Client } from '../storage/initializeS3Client';
import { insertSubtitle } from '../db/subtitleRepository';
import { generateSubtitleUrl } from '../helpers/getSubtitleUrl';
import { isValidEpisode } from '../helpers/isValidEpisode';

export function subtitlesController(app: Elysia, logger: Logger): Elysia {
  const opensubtitlesService = initializeOpensubtitlesService();
  const tvdbService = initializeTvdbService();
  const addic7edService = initializeAddic7tedService(tvdbService);
  const { s3Client, s3Config } = initializeS3Client();

  app.group('/subtitle', (app) =>
    app
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
          body: searchOptionsDto,
        }
      )
      .post(
        '/create',
        async ({ body, set }) => {
          const file = await body.file.text();
          const fileId = uuidv4();
          const provider = SubtitleProviders.Bettersubs;
          const {
            featureType,
            year,
            title,
            featureName,
            imdbId,
            seasonNumber,
            episodeNumber,
            comments,
            language,
          } = body;

          if (featureType === FeatureType.Episode) {
            if (!isValidEpisode(body)) {
              throw new Error(
                'Feature type is of episode but the season or episode numbers are invalid'
              );
            }
          }
          const parsedSeasonNumber = parseInt(seasonNumber as string);
          const parsedEpisodeNumber = parseInt(episodeNumber as string);

          const newSubtitle: Subtitle = {
            externalId: uuidv4(),
            provider,
            fileId,
            comments,
            createdOn: new Date(),
            url: generateSubtitleUrl(fileId),
            releaseName: body.releaseName,
            downloadCount: 0,
            language,
            featureDetails: {
              featureType,
              year,
              title,
              featureName,
              imdbId,
              seasonNumber: parsedSeasonNumber,
              episodeNumber: parsedEpisodeNumber,
            },
          };
          try {
            await uploadFileToS3(s3Client, s3Config, fileId, file);
            insertSubtitle(newSubtitle);
            set.status = 201;
          } catch (error) {
            logger.error(JSON.stringify(error));
            throw new InternalServerError('Cannot save new subtitle');
          }
        },
        { body: createSubtitleDto }
      )
      .get(
        '/download',
        async ({ query: { fileId, provider }, cache }) => {
          const [queryKey, cachedFileId] = fileId.split(';');
          let subtitleFile: string | null = null;

          try {
            subtitleFile = await getFileFromS3(
              s3Client,
              s3Config,
              cachedFileId
            );
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

          subtitleMetadata.fileId = cachedFileId; // Original file id
          //cache.remove(queryKey);
          uploadFileToS3(s3Client, s3Config, cachedFileId, subtitleFile);
          insertSubtitle(subtitleMetadata);

          const responseHeaders = {
            'Content-Disposition': `attachment; filename=${cachedFileId}.srt`,
            'Content-Type': 'text/plain',
          };

          return new Response(subtitleFile, { headers: responseHeaders });
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
