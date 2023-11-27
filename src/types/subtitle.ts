import { FeatureType } from "./featureTypes";
import { SubtitleProviders } from "./subtitleProviders";

export interface Subtitle {
  originId: string;
  provider: SubtitleProviders;
  fileId: string;
  createdOn: Date;
  url: string;
  releaseName: string;
  featureDetails: FeatureDetails;
  comments?: string;
}

export interface FeatureDetails {
  featureType: FeatureType;
  year?: number;
  title: string;
  featureName: string;
  imdbId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}
