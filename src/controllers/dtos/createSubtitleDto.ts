import { t } from 'elysia';
import { FeatureType, SubtitleProviders } from '../../types';

export const CreateSubtitleDto = t.Object({
  releaseName: t.String(),
  comments: t.Optional(t.String()),
  featureDetails: t.Object({
    featureType: t.Enum(FeatureType),
    year: t.Number(),
    title: t.String(),
    featureName: t.String(),
    imdbId: t.String(),
    seasonNumber: t.Optional(t.Number({ minimum: 1 })),
    episodeNumber: t.Optional(t.Number({ minimum: 1 })),
  }),
});

export type CreateSubtitleTp = (typeof CreateSubtitleDto)['static'];
