import { t } from 'elysia';
import { FeatureType } from '../types';

export const SearchOptionsDto = t.Object({
  imdbId: t.String(),
  language: t.String(),
  query: t.Optional(t.String()),
  featureType: t.Enum(FeatureType),
  episodeNumber: t.Optional(t.Number({ minimum: 1 })),
  seasonNumber: t.Optional(t.Number({ minimum: 1 })),
});

export type SearchOptionsTp = (typeof SearchOptionsDto)['static'];
