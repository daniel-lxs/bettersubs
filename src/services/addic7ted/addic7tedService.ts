import axios, { isAxiosError } from 'axios';
import {
  SearchResponse,
  SubtitleResponse,
  Addic7edServiceConfig,
} from './types';
import { Subtitle, FeatureType, SubtitleProviders } from '../../types';
import { TvdbService } from '../tvdb/tvdbService';
import { SearchOptionsTp } from '../../dtos/searchOptions';

export class Addic7edService {
  private config: Addic7edServiceConfig;

  constructor(config: Addic7edServiceConfig, private tvdbService: TvdbService) {
    this.config = config;
  }

  private async getShowByTvdbId(id: string) {
    const response = await this.fetchTvdbShowData(id);
    return response.data.shows[0];
  }

  private async fetchTvdbShowData(id: string) {
    return axios.get<SearchResponse>(
      `${this.config.apiUrl}/shows/external/tvdb/${id}`
    );
  }

  private mapSubtitleResponseToSubtitle(
    subtitleResponse: SubtitleResponse
  ): Subtitle[] {
    const { matchingSubtitles, episode } = subtitleResponse;
    const { season, number, title, show } = episode;

    return matchingSubtitles.map((matchingSubtitle) =>
      this.mapMatchingSubtitle(matchingSubtitle, show, season, number, title)
    );
  }

  private mapMatchingSubtitle(
    matchingSubtitle: any,
    show: string,
    season: number,
    number: number,
    title: string
  ): Subtitle {
    const {
      subtitleId,
      version = '',
      downloadUri,
      discovered: subtitleDiscovered,
    } = matchingSubtitle;

    return {
      originId: subtitleId,
      provider: SubtitleProviders.Addic7ted,
      fileId: subtitleId,
      createdOn: subtitleDiscovered,
      url: downloadUri,
      releaseName: version,
      featureDetails: {
        featureType: FeatureType.Episode,
        title,
        featureName: show,
        seasonNumber: season,
        episodeNumber: number,
      },
      comments: '',
    };
  }

  async searchSubtitles(searchOptions: SearchOptionsTp) {
    const tvdbShowData = await this.tvdbService.getShowByIMDBId(
      searchOptions.imdbId
    );
    const addic7edShowData = await this.getShowByTvdbId(
      tvdbShowData.id.toString()
    );

    if (searchOptions.featureType === FeatureType.Episode) {
      if (!searchOptions.seasonNumber || !searchOptions.episodeNumber) {
        throw new Error(
          'Cannot complete request: season or episode are missing'
        );
      }
      const response = await this.fetchSubtitleResponse(
        addic7edShowData.id,
        searchOptions.seasonNumber,
        searchOptions.episodeNumber,
        searchOptions.language
      );

      const mappedSubtitles = this.mapSubtitleResponseToSubtitle(response.data);
      return mappedSubtitles;
    }
  }

  private async fetchSubtitleResponse(
    showId: string,
    seasonNumber: number,
    episodeNumber: number,
    language: string
  ) {
    return axios.get<SubtitleResponse>(
      `${this.config.apiUrl}/subtitles/get/${showId}/${seasonNumber}/${episodeNumber}/${language}`
    );
  }

  async downloadSubtitle(fileId: string) {
    try {
      const response = await this.fetchSubtitleDownload(fileId);
      if (response.status >= 200 && response.status < 300) {
        return response.data;
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  private async fetchSubtitleDownload(fileId: string) {
    return axios.get<string>(
      `${this.config.apiUrl}/subtitles/download/${fileId}`,
      {
        responseType: 'text',
      }
    );
  }
}
