import getEnvOrThrow from '../../helpers/getOrThrow';
import { TvdbService } from '../tvdb/tvdbService';
import { Addic7edService } from './addic7tedService';

export function initializeAddic7tedService(
  tvdbService: TvdbService
): Addic7edService {
  const addic7edService = new Addic7edService(
    {
      apiUrl: getEnvOrThrow('ADICC7ED_API_URL'),
    },
    tvdbService
  );
  return addic7edService;
}
