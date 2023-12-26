import { relations } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { subtitleModel } from '../schema';

export const usersModel = sqliteTable('users', {
  id: integer('id').primaryKey(),
  username: text('username'),
  email: text('email'),
  passwordHash: text('passwordHash'),
  isAdmin: integer('isAdmin', { mode: 'boolean' }),
});

export const usersRelations = relations(usersModel, ({ many }) => ({
  subtitles: many(subtitleModel),
}));
