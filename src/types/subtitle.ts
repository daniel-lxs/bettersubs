import { FeatureType } from './featureTypes';
import { SubtitleProviders } from './subtitleProviders';

export interface Subtitle {
  externalId: string;
  provider: SubtitleProviders;
  fileId: string;
  createdOn: Date;
  url: string;
  releaseName: string;
  featureDetailsId?: number;
  featureDetails: FeatureDetails;
  comments?: string;
  downloadCount: number;
}

export interface FeatureDetails {
  featureType: FeatureType;
  year: number;
  title: string;
  featureName: string;
  imdbId: string;
  seasonNumber?: number;
  episodeNumber?: number;
}
