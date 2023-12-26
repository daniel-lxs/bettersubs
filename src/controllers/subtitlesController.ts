import Elysia, { InternalServerError, NotFoundError, t } from 'elysia';
import { v4 as uuidv4 } from 'uuid';
import Fuse from 'fuse.js';

import { FeatureType, Subtitle, SubtitleProviders } from '../types';
import { createSubtitleDto, searchOptionsDto } from './dtos';

import { getFileFromS3OrThrow, uploadFileToS3 } from '../storage/s3Strategy';

import createLogger from 'logging';

import { initializeOpensubtitlesService } from '../services/opensubtitles/initializeOpensubtitlesService';

import { initializeTvdbService } from '../services/tvdb/initializeTvdbService';

import { initializeAddic7tedService } from '../services/addic7ted/initializeAddic7tedService';

import { initializeS3Client } from '../storage/initializeS3Client';
import {
  findSubtitles,
  insertSubtitle,
} from '../data/repositories/subtitleRepository';
import { generateSubtitleUrl } from '../helpers/generateSubtitleUrl';
import { isValidEpisode } from '../helpers/isValidEpisode';

export function subtitlesController(app: Elysia): Elysia {
  const opensubtitlesService = initializeOpensubtitlesService();
  const tvdbService = initializeTvdbService();
  const addic7edService = initializeAddic7tedService(tvdbService);
  const { s3Client, s3Config } = initializeS3Client();

  const logger = createLogger('SubtitleController');

  app.group('/subtitle', (app) =>
    app
      .post(
        '/search',
        async ({ body }) => {
          try {
            let featureType: FeatureType | undefined = body.featureType;
            if (!featureType) {
              featureType = (await tvdbService.getFeatureByImdbId(body.imdbId))
                .featureType;
            }

            if (featureType === FeatureType.Episode) {
              if (!body.episodeNumber || !body.seasonNumber) {
                throw new Error(
                  'Cannot complete request: You provided a show with an invalid season or episode'
                );
              }
            }

            const localResults = findSubtitles(body);

            const results = (
              await Promise.all([
                opensubtitlesService.searchSubtitles(body),
                featureType === FeatureType.Episode
                  ? addic7edService.searchSubtitles(body)
                  : Promise.resolve([]),
              ])
            ).flat();

            const fuse = new Fuse(results, {
              keys: ['releaseName', 'comments'],
              ignoreLocation: true,
            });

            if (!body.query) {
              results.sort((a, b) => b.downloadCount - a.downloadCount);
              return [...localResults, ...results];
            }

            const fuseResult = fuse.search(body.query);
            return [...localResults, ...fuseResult];
          } catch (error) {
            logger.error(error);
            throw new InternalServerError(`Something went wrong: ${error}`);
          }
        },
        {
          body: searchOptionsDto,
        }
      )
      .post(
        '/create',
        async ({ body, set }) => {
          const uploadedFile = await body.file.text();
          const fileId = uuidv4();
          const provider = SubtitleProviders.Bettersubs;
          const {
            releaseName,
            imdbId,
            seasonNumber,
            episodeNumber,
            comments,
            language,
          } = body;

          const { featureType, data: featureData } =
            await tvdbService.getFeatureByImdbId(imdbId);

          let newSubtitle: Subtitle;

          if (featureType === FeatureType.Episode) {
            if (!isValidEpisode(body)) {
              throw new Error(
                'Feature type is of episode but the season or episode numbers are invalid'
              );
            }

            const { year, name } = featureData[0].series;

            const parsedSeasonNumber = parseInt(seasonNumber as string);
            const parsedEpisodeNumber = parseInt(episodeNumber as string);

            newSubtitle = {
              externalId: uuidv4(),
              provider,
              fileId,
              comments,
              createdOn: new Date(),
              url: generateSubtitleUrl(fileId, SubtitleProviders.Bettersubs),
              releaseName: releaseName,
              downloadCount: 0,
              language,
              featureDetails: {
                featureType,
                year,
                title: name,
                featureName: `${name} S${parsedSeasonNumber}E${parsedEpisodeNumber} (${year})`,
                imdbId,
                seasonNumber: parsedSeasonNumber,
                episodeNumber: parsedEpisodeNumber,
              },
            };
          } else {
            const { year, name } = featureData[0].movie;

            newSubtitle = {
              externalId: uuidv4(),
              provider,
              fileId,
              comments,
              createdOn: new Date(),
              url: generateSubtitleUrl(fileId, SubtitleProviders.Bettersubs),
              releaseName: releaseName,
              downloadCount: 0,
              language,
              featureDetails: {
                featureType,
                year,
                title: name,
                featureName: `${name} (${year})`,
                imdbId,
              },
            };
          }

          try {
            //TODO: Prevent duplicates
            uploadFileToS3(s3Client, s3Config, fileId, uploadedFile);
            const result = insertSubtitle(newSubtitle);

            set.status = 201;
            return result;
          } catch (error) {
            logger.error(error);
            throw new InternalServerError('Cannot save new subtitle');
          }
        },
        { body: createSubtitleDto }
      )
      .get(
        '/download',
        async ({ query: { fileId, provider } }) => {
          let subtitleFile: string | null = null;

          const responseHeaders = {
            'Content-Disposition': `attachment; filename=${fileId}.srt`,
            'Content-Type': 'text/plain',
          };

          try {
            subtitleFile = await getFileFromS3OrThrow(
              s3Client,
              s3Config,
              fileId,
              true
            );

            return new Response(subtitleFile, { headers: responseHeaders });
          } catch (error) {
            logger.info('Subtitle not found in storage');
          }

          switch (provider) {
            case SubtitleProviders.Opensubtitles:
              subtitleFile = await opensubtitlesService.downloadSubtitle(
                fileId
              );
              break;
            case SubtitleProviders.Addic7ted:
              subtitleFile = await addic7edService.downloadSubtitle(fileId);
              break;
          }

          if (!subtitleFile || subtitleFile.length < 1) {
            throw new NotFoundError('Subtitle file not found');
          }

          uploadFileToS3(s3Client, s3Config, fileId, subtitleFile);
          //insertSubtitle(subtitleMetadata);

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
