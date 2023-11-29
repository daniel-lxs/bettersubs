import getEnvOrThrow from '../../helpers/getOrThrow';
import { OpensubtitlesService } from './opensubtitlesService';

export function initializeOpensubtitlesService(): OpensubtitlesService {
  const opensubtitlesService = new OpensubtitlesService({
    apiUrl: getEnvOrThrow('OB_API_URL'),
    apiKey: getEnvOrThrow('OB_API_KEY'),
    userAgent: getEnvOrThrow('USER_AGENT'),
    username: getEnvOrThrow('OB_USERNAME'),
    password: getEnvOrThrow('OB_PASSWORD'),
  });
  return opensubtitlesService;
}
