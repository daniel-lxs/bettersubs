import axios, { isAxiosError } from 'axios';
import jwt from 'jsonwebtoken';
import { TvdbServiceConfig, SearchResult, ShowData } from './types';

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

        const loginResult = await axios.post<{
          status: string;
          data: { token: string };
        }>(`${apiUrl}/login`, {
          apiKey,
          pin: '1234', // for some reason you need to pass this
        });

        if (
          loginResult.data.status !== 'success' ||
          !loginResult.data.data.token
        ) {
          throw new Error('Authentication failed or token not received.');
        }

        this.token = loginResult.data.data.token;
      }
    } catch (error) {
      if (isAxiosError(error)) {
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
      const result = await axios.get<SearchResult>(
        `${apiUrl}/search/remoteid/${imdbId}`,
        {
          headers,
        }
      );

      return result.data.data[0].series;
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(error.message);
      }
      throw error;
    }
  }
}
