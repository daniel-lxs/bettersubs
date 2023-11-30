import jwt from 'jsonwebtoken';
import {
  AuthResponse,
  Datum,
  DownloadRequestResponse,
  OpensubtitlesServiceConfig,
  SearchParams,
  SubtitleSearchResponse,
} from './types';
import { Subtitle } from '../../types/subtitle';
import { FeatureType, SubtitleProviders } from '../../types';
import { SearchOptionsTp } from '../../controllers/dtos/searchOptionsDto';
import objectToRecord from '../../helpers/objectToRecord';
import getEnvOrThrow from '../../helpers/getOrThrow';

export class OpensubtitlesService {
  private config: OpensubtitlesServiceConfig;
  private token: string;

  constructor(config: OpensubtitlesServiceConfig) {
    this.config = config;
    this.token = '';
    //this.authenticate();
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
        const response = await fetch(`${this.config.apiUrl}/login`, {
          method: 'POST',
          headers,
          body: JSON.stringify(loginRequestData),
        });

        if (response.ok) {
          const responseData = await response.json();
          if (!responseData.token) {
            throw new Error('Login error, token not found');
          }
          this.token = responseData.token;
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

  private mapSearchResponseToSubtitle(
    searchResponse: SubtitleSearchResponse
  ): Subtitle[] {
    return searchResponse.data.map(this.mapSubtitleAttributes);
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

        const response = await fetch(urlWithParams, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const responseData = await response.json();
          // Append the subtitles from the current page to the result array
          subtitles.push(...this.mapSearchResponseToSubtitle(responseData));

          // Update totalPages based on the response
          totalPages = responseData.total_pages;

          // Move to the next page
          currentPage++;
        } else {
          throw new Error(`Request failed with status ${response.status}`);
        }
      }

      return subtitles;
    } catch (error) {
      if (error instanceof Error) {
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
      const response = await fetch(`${this.config.apiUrl}/download`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        return response.json() as Promise<DownloadRequestResponse>;
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

  private mapSubtitleAttributes(datum: Datum): Subtitle {
    const featureDetails = datum.attributes.feature_details;
    return {
      externalId: datum.id,
      provider: SubtitleProviders.Opensubtitles,
      fileId: datum.attributes.subtitle_id,
      createdOn: datum.attributes.upload_date,
      url: datum.attributes.url,
      comments: datum.attributes.comments,
      releaseName: datum.attributes.release,
      downloadCount: datum.attributes.download_count,
      featureDetails: {
        featureType:
          datum.attributes.feature_details.feature_type.toLocaleLowerCase() as FeatureType,
        year: featureDetails.year,
        title: featureDetails.title,
        featureName: featureDetails.movie_name,
        imdbId: `tt${featureDetails.imdb_id}`,
        seasonNumber: featureDetails.season_number,
        episodeNumber: featureDetails.episode_number,
      },
    };
  }

  async downloadSubtitle(fileId: string): Promise<string> {
    try {
      await this.authenticate();
      const { link } = await this.requestDownload(fileId);

      const response = await fetch(link, {
        method: 'GET',
        headers: this.getHeaders(),
      });

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

  async authenticateRequest(
    baseApiUrl: string,
    loginRequestData: any,
    headers: Record<string, string>
  ): Promise<AuthResponse> {
    try {
      const response = await fetch(`${baseApiUrl}/login`, {
        method: 'POST',
        headers,
        body: JSON.stringify(loginRequestData),
      });

      if (response.ok) {
        return response.json() as Promise<AuthResponse>;
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

function initializeOpensubtitlesService(): OpensubtitlesService {
  const opensubtitlesService = new OpensubtitlesService({
    apiUrl: getEnvOrThrow('OB_API_URL'),
    apiKey: getEnvOrThrow('OB_API_KEY'),
    userAgent: getEnvOrThrow('USER_AGENT'),
    username: getEnvOrThrow('OB_USERNAME'),
    password: getEnvOrThrow('OB_PASSWORD'),
  });
  return opensubtitlesService;
}
