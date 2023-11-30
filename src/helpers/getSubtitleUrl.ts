import { SubtitleProviders } from '../types';

export function generateSubtitleUrl(fileId: string) {
  return `/download/?fileId=${fileId}&provider=${SubtitleProviders.Bettersubs}`;
}
