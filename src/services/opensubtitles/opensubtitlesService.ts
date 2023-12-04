import jwt from 'jsonwebtoken';
import {
  AuthResponse,
  Datum,
  DownloadRequestResponse,
  OpensubtitlesServiceConfig,
  SearchParams,
  SubtitleSearchResponse,
} from './types';
import { Subtitle } from '../../types/Subtitle';
import { FeatureType, SubtitleProviders } from '../../types';
import { searchOptionsTp } from '../../controllers/dtos/searchOptionsDto';
import objectToRecord from '../../helpers/objectToRecord';

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
          const responseData = (await response.json()) as AuthResponse;
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

  async searchSubtitles(searchOptions: searchOptionsTp): Promise<Subtitle[]> {
    const headers = this.getHeaders();

    try {
      const searchParams: SearchParams = {
        imdb_id: searchOptions.imdbId.split('tt')[1],
        languages: searchOptions.language,
        type: searchOptions.featureType,
        page: '1', //Search first page for now
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
        return this.mapSearchResponseToSubtitle(responseData);
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
    const attributes = datum.attributes;
    const featureDetails = attributes.feature_details;

    return {
      externalId: datum.id,
      provider: SubtitleProviders.Opensubtitles,
      fileId: attributes.files[0].file_id.toString(),
      createdOn: attributes.upload_date,
      comments: attributes.comments,
      releaseName: attributes.release,
      downloadCount: attributes.download_count,
      language: attributes.language,
      featureDetails: {
        featureType:
          attributes.feature_details.feature_type.toLocaleLowerCase() as FeatureType,
        year: featureDetails.year.toString(),
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
      //await this.authenticate();
      const { link } = await this.requestDownload(fileId);

      const response = await fetch(link, {
        method: 'GET',
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
}
