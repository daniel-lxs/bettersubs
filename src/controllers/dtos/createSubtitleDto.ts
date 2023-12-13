import { t } from 'elysia';
import { languageCodesDto } from './languageCodesDto';

export const createSubtitleDto = t.Object({
  file: t.File({ maxSize: '1m', type: 'application/x-subrip' }),
  imdbId: t.String(),
  releaseName: t.String(),
  comments: t.Optional(t.String()),
  language: t.Union(languageCodesDto),
  seasonNumber: t.Optional(t.String()),
  episodeNumber: t.Optional(t.String()),
});

export type createSubtitleTp = (typeof createSubtitleDto)['static'];
