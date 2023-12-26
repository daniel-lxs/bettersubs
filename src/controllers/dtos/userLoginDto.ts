import { t } from 'elysia';

export const userLoginDto = t.Object({
  username: t.String(),
  password: t.String(),
});

export type UserLoginDto = (typeof userLoginDto)['static'];
