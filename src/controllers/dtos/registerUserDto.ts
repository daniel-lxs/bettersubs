import { t } from 'elysia';

export const registerUserDto = t.Object({
  username: t.String(),
  email: t.String(),
  password: t.String(),
  confirmPassword: t.String(),
  inviteCode: t.Optional(t.String()),
});

export type RegisterUserDto = (typeof registerUserDto)['static'];
