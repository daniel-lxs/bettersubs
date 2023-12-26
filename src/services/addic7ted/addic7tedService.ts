import createLogger from 'logging';
import {
  SearchResponse,
  SubtitleResponse,
  Addic7edServiceConfig,
  MatchingSubtitle,
} from './types';
import { Subtitle, FeatureType, SubtitleProviders } from '../../types';
import { TvdbService } from '../tvdb/tvdbService';
import { SearchOptionsDto } from '../../controllers/dtos/searchOptionsDto';
import { ShowData } from '../tvdb/types';

const logger = createLogger('Addic7edService');

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
    const { season, number, title, show, year, showImdbId } = episode;

    return matchingSubtitles.map((matchingSubtitle) =>
      this.mapMatchingSubtitle(
        matchingSubtitle,
        show,
        season,
        number,
        title,
        year,
        showImdbId
      )
    );
  }

  private mapMatchingSubtitle(
    matchingSubtitle: MatchingSubtitle,
    show: string,
    season: number,
    number: number,
    title: string,
    year: string,
    showImdbId: string
  ): Subtitle {
    const {
      subtitleId,
      version = '',
      discovered: subtitleDiscovered,
      downloadCount,
      language,
    } = matchingSubtitle;

    return {
      externalId: subtitleId,
      provider: SubtitleProviders.Addic7ted,
      fileId: subtitleId,
      createdOn: subtitleDiscovered,
      releaseName: version,
      downloadCount: downloadCount,
      language,
      featureDetails: {
        featureType: FeatureType.Episode,
        title,
        year,
        imdbId: showImdbId,
        featureName: show,
        seasonNumber: season,
        episodeNumber: number,
      },
      comments: '',
    };
  }

  async searchSubtitles(searchOptions: SearchOptionsDto): Promise<Subtitle[]> {
    try {
      const { featureType, data: tvdbShowData } =
        await this.tvdbService.getFeatureByImdbId(searchOptions.imdbId);

      if (
        !tvdbShowData ||
        tvdbShowData.length === 0 ||
        featureType !== FeatureType.Episode
      ) {
        return [];
      }

      const addic7edShowData = await this.getShowByTvdbId(
        tvdbShowData[0].series.id.toString()
      );

      if (!searchOptions.seasonNumber || !searchOptions.episodeNumber) {
        throw new Error(
          'Cannot complete request: season or episode are missing'
        );
      }

      const subtitleResponse = await this.fetchSubtitleResponse(
        addic7edShowData.id,
        searchOptions.seasonNumber,
        searchOptions.episodeNumber,
        searchOptions.language,
        searchOptions.imdbId,
        tvdbShowData[0].series
      );

      const mappedSubtitles =
        this.mapSubtitleResponseToSubtitle(subtitleResponse);
      return mappedSubtitles;
    } catch (error) {
      logger.error(error);
      return [];
    }
  }

  private async fetchSubtitleResponse(
    showId: string,
    seasonNumber: number,
    episodeNumber: number,
    language: string,
    imdbId: string,
    showData: ShowData
  ) {
    const response = await fetch(
      `${this.config.apiUrl}/subtitles/get/${showId}/${seasonNumber}/${episodeNumber}/${language}`
    );
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data: SubtitleResponse = await response.json();
    data.episode.year = showData.year;
    data.episode.showImdbId = imdbId;

    return data;
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
