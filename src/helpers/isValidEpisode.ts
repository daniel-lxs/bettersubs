import { CreateSubtitleDto } from '../controllers/dtos';

export function isValidEpisode({
  seasonNumber,
  episodeNumber,
}: CreateSubtitleDto): boolean {
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
