import getEnvOrThrow from '../../helpers/getOrThrow';
import { OpensubtitlesService } from './opensubtitlesService';

export function initializeOpensubtitlesService(): OpensubtitlesService {
  const opensubtitlesService = new OpensubtitlesService({
    apiUrl: getEnvOrThrow('OS_API_URL'),
    apiKey: getEnvOrThrow('OS_API_KEY'),
    userAgent: getEnvOrThrow('USER_AGENT'),
    username: getEnvOrThrow('OS_USERNAME'),
    password: getEnvOrThrow('OS_PASSWORD'),
  });
  return opensubtitlesService;
}
