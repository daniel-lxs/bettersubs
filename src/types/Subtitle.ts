import { FeatureType } from './FeatureTypes';
import { SubtitleProviders } from './SubtitleProviders';

export interface Subtitle {
  id?: number;
  externalId: string;
  provider: SubtitleProviders;
  fileId: string;
  createdOn: Date;
  url?: string;
  releaseName: string;
  featureDetailsId?: number;
  featureDetails: FeatureDetails;
  comments?: string;
  downloadCount: number;
  language: string;
}

export interface FeatureDetails {
  id?: number;
  featureType: FeatureType;
  year: string;
  title: string;
  featureName: string;
  imdbId: string;
  seasonNumber?: number;
  episodeNumber?: number;
}
