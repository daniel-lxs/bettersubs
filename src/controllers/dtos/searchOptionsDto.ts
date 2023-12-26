import { t } from 'elysia';
import { FeatureType } from '../../types';
import { languageCodesDto } from './languageCodesDto';

export const searchOptionsDto = t.Object({
  imdbId: t.String(),
  language: t.Union(languageCodesDto),
  query: t.Optional(t.String()),
  featureType: t.Optional(t.Enum(FeatureType)),
  episodeNumber: t.Optional(t.Number({ minimum: 1 })),
  seasonNumber: t.Optional(t.Number({ minimum: 1 })),
});

export type SearchOptionsDto = (typeof searchOptionsDto)['static'];
