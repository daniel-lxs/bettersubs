import Elysia from 'elysia';
import * as jwt from 'jsonwebtoken';
import cookie from '@elysiajs/cookie';

import { findUserByUsername } from '../data/repositories/userRepository';
import { registerUser, validatePassword } from '../services/auth/authService';
import { registerUserDto, userLoginDto } from './dtos';
import getEnvOrThrow from '../helpers/getOrThrow';

export function usersController(app: Elysia): Elysia {
  app.group('/user', (app) =>
    app
      .use(cookie())
      .post(
        '/register',
        async ({ body, setCookie, set }) => {
          const user = await registerUser(body);
          const jwtSecret = getEnvOrThrow('JWT_SECRET');
          const accessToken = jwt.sign({ username: user.username }, jwtSecret);
          set.status = 201;
          setCookie('auth', accessToken);

          delete user.passwordHash;
          return user;
        },
        { body: registerUserDto }
      )
      .post(
        '/login',
        async ({ setCookie, body, set }) => {
          const jwtSecret = getEnvOrThrow('JWT_SECRET');
          const { username, password } = body;
          const foundUser = findUserByUsername(username);

          if (!foundUser || !foundUser.passwordHash) {
            set.status = 401;
            throw new Error('Invalid user and password combination');
          }

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
        const decodedPayload = jwt.verify(auth, jwtSecret);

        if (
          typeof decodedPayload === 'object' &&
          'username' in decodedPayload
        ) {
          const user = findUserByUsername(decodedPayload.username);
          delete user.passwordHash;
          return user;
        }

        set.status = 401;
        throw new Error('Invalid access token');
      })
  );

  return app;
}
