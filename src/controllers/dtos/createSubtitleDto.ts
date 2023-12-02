import { t } from 'elysia';
import { FeatureType } from '../../types';
import { languageCodesDto } from './languageCodesDto';

export const createSubtitleDto = t.Object({
  file: t.File({ maxSize: '1m', type: 'text/plain' }),
  releaseName: t.String(),
  comments: t.Optional(t.String()),
  featureType: t.Enum(FeatureType),
  language: t.Union(languageCodesDto),
  year: t.String(),
  title: t.String(),
  featureName: t.String(),
  imdbId: t.String(),
  seasonNumber: t.Optional(t.String()),
  episodeNumber: t.Optional(t.String()),
});

export type createSubtitleTp = (typeof createSubtitleDto)['static'];
