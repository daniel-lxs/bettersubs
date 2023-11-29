import { SQLQueryBindings } from 'bun:sqlite';
import { Subtitle } from '../types';
import { getDb } from './connection';

export function createSubtitle(subtitle: Subtitle) {
  const db = getDb();

  const {
    originId,
    provider,
    fileId,
    createdOn,
    url,
    releaseName,
    featureDetails,
    comments,
    downloadCount,
  } = subtitle;

  const insertSubtitleQuery = `
  INSERT INTO subtitles (
    originId, provider, fileId, createdOn, url, releaseName,
    featureType, year, title, featureName, imdbId,
    seasonNumber, episodeNumber, comments, downloadCount
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

  const params: SQLQueryBindings[] = [
    originId,
    provider,
    fileId,
    new Date(createdOn).toISOString(),
    url,
    releaseName,
    featureDetails.featureType,
    featureDetails.year,
    featureDetails.title,
    featureDetails.featureName,
    featureDetails.imdbId,
    featureDetails.seasonNumber || null,
    featureDetails.episodeNumber || null,
    comments || null,
    downloadCount,
  ];

  db.run(insertSubtitleQuery, params);
}
