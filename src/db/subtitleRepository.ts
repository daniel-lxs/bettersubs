import { Subtitle } from '../types';
import { getDb } from './connection';

function objectHasId(object: Object): object is { id: number } {
  return object.hasOwnProperty('id');
}

export function insertSubtitle(subtitle: Subtitle) {
  try {
    const db = getDb();

    console.log('db is good');

    const {
      externalId,
      provider,
      fileId,
      createdOn,
      url,
      releaseName,
      featureDetails,
      comments,
      downloadCount,
    } = subtitle;

    // Insert feature details first
    const insertFeatureDetailsQuery = db.query(`
  INSERT INTO feature_details (
    featureType, year, title, featureName, imdbId, seasonNumber, episodeNumber
  )
  VALUES ($featureType, $year, $title, $featureName, $imdbId, $seasonNumber, $episodeNumber)
  RETURNING id
`);

    console.log('first query created ');

    const featureDetailsParams = {
      $featureType: featureDetails.featureType,
      $year: featureDetails.year,
      $title: featureDetails.title,
      $featureName: featureDetails.featureName,
      $imdbId: featureDetails.imdbId,
      $seasonNumber: featureDetails.seasonNumber || null,
      $episodeNumber: featureDetails.episodeNumber || null,
    };
    let lastId: number;
    const featureDetailsResult =
      insertFeatureDetailsQuery.get(featureDetailsParams);

    console.log(
      'did the query above me run? if so what is this ' +
        JSON.stringify(featureDetailsResult)
    );

    if (
      !featureDetailsResult ||
      typeof featureDetailsResult !== 'object' ||
      !objectHasId(featureDetailsResult)
    ) {
      throw new Error('Failed to insert record');
    }
    lastId = featureDetailsResult.id;

    console.log('I AM NOT SURPRISED' + featureDetailsResult);

    // Now insert subtitle with the obtained featureDetailsId
    const insertSubtitleQuery = db.query(`
   INSERT INTO subtitles (
     externalId, provider, fileId, createdOn, url, releaseName,
     featureDetailsId, comments, downloadCount
   )
   VALUES ($externalId, $provider, $fileId, $createdOn, $url, $releaseName,
           $featureDetailsId, $comments, $downloadCount)
 `);

    const subtitleParams = {
      $externalId: externalId,
      $provider: provider,
      $fileId: fileId,
      $createdOn: new Date(createdOn).toISOString(),
      $url: url,
      $releaseName: releaseName,
      $featureDetailsId: lastId,
      $comments: comments || null,
      $downloadCount: downloadCount,
    };

    insertSubtitleQuery.run(subtitleParams);
  } catch (error) {
    throw new Error('Failed to insert record ' + JSON.stringify(error));
  }
}

export function findOneByFileId(fileId: string): Subtitle {
  const db = getDb();

  const query = db.query(`
    SELECT * FROM subtitles WHERE fileId = $fileId
  `);

  const result = query.get({ $fileId: fileId });

  if (result && isValidEntity<Subtitle>(result, ['externalId', 'fileId'])) {
    return result;
  }
  throw new Error('Record not found');
}

export function findManyByImdbId(imdbId: string): Subtitle[] {
  const db = getDb();

  const query = db.query(`SELECT * FROM subtitles WHERE imdbId = $imdbId`);

  const results = query.all({ $imdbId: imdbId });

  if (results) {
    return results.filter((result) =>
      isValidEntity<Subtitle>(result, ['externalId', 'fileId'])
    ) as Subtitle[];
  }
  return [];
}
