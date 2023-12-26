import { Subtitle } from './Subtitle';

export interface User {
  id?: number;
  username: string;
  email: string;
  passwordHash?: string;
  isAdmin: boolean;
  subtitles?: Subtitle[];
}
