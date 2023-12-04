import { SubtitleProviders } from '../types';

export function generateSubtitleUrl(
  fileId: string,
  provider: SubtitleProviders
) {
  return `/subtitle/download/?fileId=${fileId}&provider=${provider}`;
}
