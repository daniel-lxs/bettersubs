import { sql, eq, and } from 'drizzle-orm';
import createLogger from 'logging';

import { FeatureDetails, Subtitle } from '../../types';
import { getDb } from '../connection';
import { subtitleModel, featureDetailsModel } from '../schema';
import { objectHasId } from '../../helpers/objectHasId';
import { isValidEntity } from '../../helpers/isValidEntity';
import { SearchOptionsDto } from '../../controllers/dtos';

const logger = createLogger('SubtitleRepository');

export function insertSubtitle(subtitle: Subtitle) {
  try {
    const db = getDb();

    const {
      externalId,
      provider,
      fileId,
      createdOn,
      url,
      releaseName,
      featureDetails: {
        featureType,
        year,
        title,
        featureName,
        imdbId,
        seasonNumber,
        episodeNumber,
      },
      comments,
      language,
    } = subtitle;

    const checkFeatureDetailsQuery = db
      .select()
      .from(featureDetailsModel)
      .where(
        and(
          eq(featureDetailsModel.imdbId, imdbId),
          ...(episodeNumber
            ? [eq(featureDetailsModel.episodeNumber, episodeNumber)]
            : []),
          ...(seasonNumber
            ? [eq(featureDetailsModel.seasonNumber, seasonNumber)]
            : [])
        )
      );

    //For some reason get doesn't work
    const [existingFeatureDetails] = checkFeatureDetailsQuery.all();

    // If featureDetails with the given imdbId already exists, use its id
    let lastId: number | undefined;

    if (
      existingFeatureDetails &&
      isValidEntity<FeatureDetails>(existingFeatureDetails, ['id', 'imdbId'])
    ) {
      lastId = existingFeatureDetails.id;
    } else {
      const insertFeatureDetailsQuery = sql`
        INSERT INTO feature_details (
          featureType, year, title, featureName, imdbId, seasonNumber, episodeNumber
        )
        VALUES (${featureType}, ${year}, ${title}, ${featureName}, ${imdbId}, ${
        seasonNumber || null
      }, ${episodeNumber || null})
        RETURNING id
      `;

      const featureDetailsResult = db.get<{ id: number }>(
        insertFeatureDetailsQuery
      );

      if (
        !featureDetailsResult ||
        typeof featureDetailsResult !== 'object' ||
        !objectHasId(featureDetailsResult)
      ) {
        logger.error('Failed to insert feature details record');
        throw new Error('Failed to insert feature details record');
      }

      lastId = featureDetailsResult.id;
    }
    if (!lastId) {
      logger.error('Failed to insert feature details record');
      throw new Error('Failed to insert feature details record');
    }

    // Now insert subtitle with the obtained featureDetails
    const insertSubtitleQuery = sql`
   INSERT INTO subtitles (
     externalId, provider, fileId, createdOn, url, releaseName,
     featureDetailsId, comments, language, downloadCount
   )
   VALUES (${externalId}, ${provider}, ${fileId}, ${createdOn.getTime()}, ${
      url || null
    }, ${releaseName}, ${lastId}, ${comments || null}, ${language}, ${0})
 `;

    db.run(insertSubtitleQuery);

    return findOneByFileId(fileId);
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to insert record');
  }
}

export function findOneByFileId(fileId: string): Subtitle {
  const db = getDb();
  const result = db
    .select()
    .from(subtitleModel)
    .leftJoin(
      featureDetailsModel,
      eq(subtitleModel.featureDetails, featureDetailsModel.id)
    )
    .where(eq(subtitleModel.fileId, fileId))
    .all();

  if (result.length > 0) {
    return mapToSubtitle(result[0]);
  }
  logger.error('Record not found');
  throw new Error('Record not found');
}
export function findSubtitles(searchOptions: SearchOptionsDto): Subtitle[] {
  try {
    logger.info('findSubtitles: ' + JSON.stringify(searchOptions));

    const { language, imdbId, episodeNumber, seasonNumber } = searchOptions;
    const db = getDb();

    const query = db
      .select()
      .from(subtitleModel)
      .leftJoin(
        featureDetailsModel,
        eq(subtitleModel.featureDetails, featureDetailsModel.id)
      )
      .where(
        and(
          eq(subtitleModel.language, language),
          eq(featureDetailsModel.imdbId, imdbId),
          ...(episodeNumber
            ? [eq(featureDetailsModel.episodeNumber, episodeNumber)]
            : []),
          ...(seasonNumber
            ? [eq(featureDetailsModel.seasonNumber, seasonNumber)]
            : [])
        )
      );

    const result = query.all();

    logger.info('Query result: ' + JSON.stringify(result));

    if (!result) return [];

    const subtitles = result.map(mapToSubtitle);
    return subtitles;
  } catch (error) {
    logger.error(error);
    throw new Error('Subtitle not found: ' + JSON.stringify(error));
  }
}

//TODO Add download count update

function mapToSubtitle(result: any): Subtitle {
  if (
    !result &&
    !isValidEntity<typeof subtitleModel>(result, ['id', 'externalId', 'fileId'])
  ) {
    logger.error('Entity is not valid');
    throw new Error('Entity is not valid');
  }
  const { subtitles, feature_details } = result;
  return {
    id: subtitles.id,
    externalId: subtitles.externalId,
    provider: subtitles.provider,
    fileId: subtitles.fileId,
    createdOn: subtitles.createdOn,
    url: subtitles.url,
    releaseName: subtitles.releaseName,
    comments: subtitles.comments,
    downloadCount: subtitles.downloadCount,
    language: subtitles.language,
    featureDetails: {
      id: feature_details.id,
      featureType: feature_details.featureType,
      year: feature_details.year,
      title: feature_details.title,
      featureName: feature_details.featureName,
      imdbId: feature_details.imdbId,
      seasonNumber: feature_details.seasonNumber,
      episodeNumber: feature_details.episodeNumber,
    },
  };
}
