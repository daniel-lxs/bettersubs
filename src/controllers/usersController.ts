import Elysia from 'elysia';
import * as jwt from 'jsonwebtoken';
import cookie from '@elysiajs/cookie';

import { findUserByUsername } from '../data/repositories/userRepository';
import { validatePassword } from '../services/auth/authService';
import { userLoginDto } from './dtos';
import getEnvOrThrow from '../helpers/getOrThrow';

export function usersController(app: Elysia): Elysia {
  app.group('/user', (app) =>
    app
      .use(cookie())
      .post(
        '/login',
        async ({ setCookie, body, set }) => {
          const jwtSecret = getEnvOrThrow('JWT_SECRET');
          const { username, password } = body;
          const foundUser = findUserByUsername(username);
          const isValidPassword = validatePassword(
            password,
            foundUser.passwordHash
          );

          if (!isValidPassword) {
            set.status = 401;
            throw new Error('Invalid user and password combination');
          }
          const accessToken = jwt.sign({ username }, jwtSecret);
          setCookie('auth', accessToken);
          return accessToken;
        },
        { body: userLoginDto }
      )
      .get('/me', ({ cookie: { auth }, set }) => {
        const jwtSecret = getEnvOrThrow('JWT_SECRET');
        const decodedUsername = jwt.verify(auth, jwtSecret);
        if (!decodedUsername || typeof decodedUsername !== 'string') {
          set.status = 401;
          throw new Error('Invalid access token');
        }
        const user = findUserByUsername(decodedUsername);
        return user;
      })
  );

  return app;
}
