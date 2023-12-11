import { FeatureType } from '../../../types';

export type SearchResponse = ShowSearchResult | MovieSearchResult;

export interface ShowSearchResult {
  featureType: FeatureType.Episode;
  status: string;
  data: ShowDatum[];
}
export interface MovieSearchResult {
  featureType: FeatureType.Movie;
  status: string;
  data: MovieDatum[];
}

export interface MovieDatum {
  movie: MovieData;
}

export interface ShowDatum {
  series: ShowData;
}

export interface ShowData {
  id: number;
  name: string;
  slug: string;
  image: string;
  nameTranslations: string[];
  overviewTranslations: string[];
  aliases: Alias[];
  firstAired: Date;
  lastAired: Date;
  nextAired: string;
  score: number;
  status: Status;
  originalCountry: string;
  originalLanguage: string;
  defaultSeasonType: number;
  isOrderRandomized: boolean;
  lastUpdated: Date;
  averageRuntime: number;
  episodes: null;
  overview: string;
  year: string;
}

export interface MovieData {
  aliases: Alias[];
  id: number;
  image: string;
  lastUpdated: string;
  name: string;
  nameTranslations: string[];
  overviewTranslations: string[];
  score: number;
  slug: string;
  status: Status;
  runtime: number;
  year: string;
}

export interface Alias {
  language: string;
  name: string;
}

export interface Status {
  id: null;
  name: null;
  recordType: string;
  keepUpdated: boolean;
}
