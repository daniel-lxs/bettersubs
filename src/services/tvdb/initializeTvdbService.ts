import getEnvOrThrow from '../../helpers/getOrThrow';
import { TvdbService } from './tvdbService';

export function initializeTvdbService(): TvdbService {
  const tvdbService = new TvdbService({
    apiUrl: getEnvOrThrow('TVDB_API_URL'),
    apiKey: getEnvOrThrow('TVDB_API_KEY'),
  });
  return tvdbService;
}
