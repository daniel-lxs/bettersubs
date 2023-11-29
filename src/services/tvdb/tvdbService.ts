import jwt from 'jsonwebtoken';
import { TvdbServiceConfig, SearchResult, ShowData } from './types';
import getEnvOrThrow from '../../helpers/getOrThrow';
import { TvdbService } from './tvdbService';

export class TvdbService {
  private config: TvdbServiceConfig;
  private token: string;

  constructor(config: TvdbServiceConfig) {
    this.config = config;
    this.token = '';
    this.authenticate();
  }

  isTokenExpired(): boolean {
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

  private async authenticate() {
    try {
      if (this.isTokenExpired()) {
        const apiUrl = this.config.apiUrl;
        const apiKey = this.config.apiKey;

        const loginResult = await fetch(`${apiUrl}/login`, {
          method: 'POST',
          body: JSON.stringify({
            apiKey,
            pin: '1234', // for some reason you need to pass this
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (loginResult.ok) {
          const responseData = await loginResult.json();
          if (responseData.status !== 'success' || !responseData.data.token) {
            throw new Error('Authentication failed or token not received.');
          }
          this.token = responseData.data.token;
        } else {
          throw new Error(`Request failed with status ${loginResult.status}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  async getShowByIMDBId(imdbId: string): Promise<ShowData> {
    await this.authenticate();
    const apiUrl = this.config.apiUrl;

    const headers = {
      Authorization: `Bearer ${this.token}`,
    };

    try {
      const result = await fetch(`${apiUrl}/search/remoteid/${imdbId}`, {
        headers,
      });

      if (result.ok) {
        const responseData = await result.json();
        return responseData.data[0].series;
      } else {
        throw new Error(`Request failed with status ${result.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  }
}

function initializeTvdbService(): TvdbService {
  const tvdbService = new TvdbService({
    apiUrl: getEnvOrThrow('TVDB_API_URL'),
    apiKey: getEnvOrThrow('TVDB_API_KEY'),
  });
  return tvdbService;
}
