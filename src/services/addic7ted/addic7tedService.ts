import {
  SearchResponse,
  SubtitleResponse,
  Addic7edServiceConfig,
  MatchingSubtitle,
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
    const searchResponse = await this.fetchTvdbShowData(id);
    return searchResponse.shows[0];
  }

  private async fetchTvdbShowData(id: string) {
    const response = await fetch(
      `${this.config.apiUrl}/shows/external/tvdb/${id}`
    );
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json() as Promise<SearchResponse>;
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
    matchingSubtitle: MatchingSubtitle,
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
      downloadCount,
    } = matchingSubtitle;

    return {
      originId: subtitleId,
      provider: SubtitleProviders.Addic7ted,
      fileId: subtitleId,
      createdOn: subtitleDiscovered,
      url: downloadUri,
      releaseName: version,
      downloadCount: downloadCount,
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
      const subtitleResponse = await this.fetchSubtitleResponse(
        addic7edShowData.id,
        searchOptions.seasonNumber,
        searchOptions.episodeNumber,
        searchOptions.language
      );

      const mappedSubtitles =
        this.mapSubtitleResponseToSubtitle(subtitleResponse);
      return mappedSubtitles;
    }
    return [];
  }

  private async fetchSubtitleResponse(
    showId: string,
    seasonNumber: number,
    episodeNumber: number,
    language: string
  ) {
    const response = await fetch(
      `${this.config.apiUrl}/subtitles/get/${showId}/${seasonNumber}/${episodeNumber}/${language}`
    );
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json() as Promise<SubtitleResponse>;
  }

  async downloadSubtitle(fileId: string) {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/subtitles/download/${fileId}`,
        {
          method: 'GET',
        }
      );
      if (response.ok) {
        return response.text();
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  }
}
