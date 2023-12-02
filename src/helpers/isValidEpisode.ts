import { createSubtitleTp } from '../controllers/dtos';

export function isValidEpisode({
  seasonNumber,
  episodeNumber,
}: createSubtitleTp): boolean {
  if (!seasonNumber || !episodeNumber) {
    return false;
  }

  const parsedSeasonNumber = parseInt(seasonNumber);
  const parsedEpisodeNumber = parseInt(episodeNumber);

  if (Number.isNaN(parsedSeasonNumber) || Number.isNaN(parsedEpisodeNumber)) {
    return false;
  }
  return true;
}
