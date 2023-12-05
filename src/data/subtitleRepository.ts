import { FeatureDetails, Subtitle } from '../types';
import { getDb } from './connection';
import { sql, eq, and } from 'drizzle-orm';
import { subtitle, featureDetails } from './schema';
import { objectHasId } from '../helpers/objectHasId';
import { searchOptionsTp } from '../controllers/dtos';

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
      featureDetails,
      comments,
      language,
    } = subtitle;

    // Check if featureDetails with the given imdbId already exists
    const checkFeatureDetailsQuery = sql`
      SELECT id FROM feature_details WHERE imdbId = ${featureDetails.imdbId}
    `;

    const existingFeatureDetails = db.get<typeof featureDetails>(
      checkFeatureDetailsQuery
    );

    // If featureDetails with the given imdbId already exists, use its id
    let lastId: number | undefined;

    if (
      existingFeatureDetails &&
      isValidEntity<FeatureDetails>(existingFeatureDetails, ['id', 'imdbId'])
    ) {
      lastId = existingFeatureDetails.id;
    } else {
      const {
        featureType,
        year,
        title,
        featureName,
        imdbId,
        seasonNumber,
        episodeNumber,
      } = featureDetails;

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
        throw new Error('Failed to insert feature details record');
      }

      lastId = featureDetailsResult.id;
    }
    if (!lastId) {
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
  } catch (error) {
    console.log(error);
    throw new Error('Failed to insert record ' + JSON.stringify(error));
  }
}

export function findOneByFileId(fileId: string): Subtitle {
  const db = getDb();
  const result = db.select().from(subtitle).where(eq(subtitle.fileId, fileId));

  if (result) {
    return mapToSubtitle(result);
  }
  throw new Error('Record not found');
}
//TODO Add pagination
export function findSubtitles(searchOptions: searchOptionsTp): Subtitle[] {
  try {
    const { language, imdbId, episodeNumber, seasonNumber } = searchOptions;
    const db = getDb();
    const query = db
      .select()
      .from(subtitle)
      .leftJoin(featureDetails, eq(subtitle.featureDetails, featureDetails.id))
      .where(
        and(
          eq(subtitle.language, language),
          eq(featureDetails.imdbId, imdbId),
          episodeNumber
            ? eq(featureDetails.episodeNumber, episodeNumber)
            : undefined,
          seasonNumber
            ? eq(featureDetails.seasonNumber, seasonNumber)
            : undefined
        )
      );

    const result = query.all();

    if (!result) {
      return [];
    }

    const subtitles = result.map(mapToSubtitle);
    return subtitles;
  } catch (error) {
    console.debug('Error:' + error);
    throw new Error('Subtitle not found ' + JSON.stringify(error));
  }
}

//TODO Add download count update

function mapToSubtitle(result: any): Subtitle {
  if (
    !result &&
    !isValidEntity<typeof subtitle>(result, ['id', 'externalId', 'fileId'])
  ) {
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
