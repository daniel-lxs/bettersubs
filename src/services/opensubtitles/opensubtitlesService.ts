import axios, { AxiosResponse, isAxiosError } from 'axios';
import jwt from 'jsonwebtoken';
import {
  AuthResponse,
  DownloadRequestResponse,
  OpensubtitlesServiceConfig,
  SearchParams,
  SubtitleSearchResponse,
} from './types';
import { Subtitle } from '../../types/subtitle';
import { FeatureType, SubtitleProviders } from '../../types';
import { SearchOptionsTp } from '../../dtos/searchOptions';
import objectToRecord from '../../helpers/objectToRecord';

export class OpensubtitlesService {
  private config: OpensubtitlesServiceConfig;
  private token: string;

  constructor(config: OpensubtitlesServiceConfig) {
    this.config = config;
    this.token = '';
    this.authenticate();
  }

  private getHeaders(): Record<string, string> {
    return {
      Accept: 'application/json',
      'Api-Key': this.config.apiKey,
      'Content-Type': 'application/json',
      'User-Agent': this.config.userAgent,
    };
  }

  private isTokenExpired(): boolean {
    try {
      const decodedToken: any = jwt.decode(this.token);

      if (!decodedToken || typeof decodedToken.exp !== 'number') {
        return true;
      }

      const currentTimestamp: number = Math.floor(Date.now() / 1000);

      return decodedToken.exp < currentTimestamp;
    } catch (error) {
      return true;
    }
  }

  private async authenticate(): Promise<void> {
    if (this.isTokenExpired()) {
      const headers = this.getHeaders();

      const loginRequestData = {
        username: this.config.username,
        password: this.config.password,
      };

      try {
        const response = await authenticateRequest(
          this.config.apiUrl,
          loginRequestData,
          headers
        );

        if (!response.data.token) {
          throw new Error('Login error, token not found');
        }
        if (response.status >= 200 && response.status < 300) {
          this.token = response.data.token;
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
  }

  private mapSearchResponseToSubtitle(
    searchResponse: SubtitleSearchResponse
  ): Subtitle[] {
    return searchResponse.data.map(mapSubtitleAttributes);
  }

  async searchSubtitles(searchOptions: SearchOptionsTp): Promise<Subtitle[]> {
    const headers = this.getHeaders();
    const subtitles: Subtitle[] = [];

    try {
      let currentPage = 1;
      let totalPages = 1; // Initialize totalPages to a non-zero value to enter the loop

      while (currentPage <= totalPages) {
        const searchParams: SearchParams = {
          imdb_id: searchOptions.imdbId.split('tt')[1],
          languages: searchOptions.language,
          type: searchOptions.featureType,
          year: searchOptions.year.toString(),
          page: currentPage.toString(),
        };

        if (searchOptions.featureType === FeatureType.Episode) {
          if (!searchOptions.seasonNumber || !searchOptions.episodeNumber) {
            throw new Error(
              'Cannot complete request: season or episode are missing'
            );
          }
          searchParams.season_number = searchOptions.seasonNumber.toString();
          searchParams.episode_number = searchOptions.episodeNumber.toString();
        }

        const searchParamsRecord = objectToRecord(searchParams);

        const urlWithParams = `${
          this.config.apiUrl
        }/subtitles?${new URLSearchParams(searchParamsRecord)}`;

        const response = await axios.get<SubtitleSearchResponse>(
          urlWithParams,
          { headers }
        );

        if (response.status >= 200 && response.status < 300) {
          // Append the subtitles from the current page to the result array
          subtitles.push(...this.mapSearchResponseToSubtitle(response.data));

          // Update totalPages based on the response
          totalPages = response.data.total_pages;

          // Move to the next page
          currentPage++;
        } else {
          throw new Error(`Request failed with status ${response.status}`);
        }
      }

      return subtitles;
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  private async requestDownload(
    fileId: string
  ): Promise<DownloadRequestResponse> {
    await this.authenticate();
    const headers = {
      ...this.getHeaders(),
      Authorization: `Bearer ${this.token}`,
    };

    const requestData = {
      file_id: fileId,
    };

    try {
      const response = await axios.post<DownloadRequestResponse>(
        `${this.config.apiUrl}/download`,
        requestData,
        {
          headers,
        }
      );
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

  async downloadSubtitle(fileId: string): Promise<string> {
    try {
      await this.authenticate();
      const { link } = await this.requestDownload(fileId);
      const response = await axios.get<string>(link, {
        responseType: 'text',
      });
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
}

async function authenticateRequest(
  baseApiUrl: string,
  loginRequestData: any,
  headers: Record<string, string>
): Promise<AxiosResponse<AuthResponse>> {
  return axios.post<AuthResponse>(`${baseApiUrl}/login`, loginRequestData, {
    headers,
  });
}

function mapSubtitleAttributes(datum: any): Subtitle {
  const featureDetails = datum.attributes.feature_details;
  return {
    originId: datum.id,
    provider: SubtitleProviders.Opensubtitles,
    fileId: datum.attributes.subtitle_id,
    createdOn: datum.attributes.upload_date,
    url: datum.attributes.url,
    comments: datum.attributes.comments,
    releaseName: datum.attributes.release,
    featureDetails: {
      featureType: datum.attributes.feature_details.feature_type,
      year: featureDetails.year,
      title: featureDetails.title,
      featureName: featureDetails.movie_name,
      imdbId: `tt${featureDetails.imdb_id}`,
      seasonNumber: featureDetails.season_number,
      episodeNumber: featureDetails.episode_number,
    },
  };
}
