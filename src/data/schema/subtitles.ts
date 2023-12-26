import { relations } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { usersModel } from '../schema';

export const subtitleModel = sqliteTable('subtitles', {
  id: integer('id').primaryKey(),
  externalId: text('externalId'),
  provider: text('provider'),
  fileId: text('fileId'),
  createdOn: integer('createdOn', { mode: 'timestamp' }),
  url: text('url'),
  releaseName: text('releaseName'),
  comments: text('comments'),
  featureDetails: integer('featureDetailsId'),
  downloadCount: integer('downloadCount'),
  language: text('language'),
  owner: integer('ownerId'),
});

export const subtitleRelations = relations(subtitleModel, ({ one }) => ({
  featureDetails: one(featureDetailsModel, {
    fields: [subtitleModel.featureDetails],
    references: [featureDetailsModel.id],
  }),
  owner: one(usersModel, {
    fields: [subtitleModel.owner],
    references: [usersModel.id],
  }),
}));

export const featureDetailsModel = sqliteTable('feature_details', {
  seasonNumber: integer('seasonNumber'),
  episodeNumber: integer('episodeNumber'),
  featureType: text('featureType'),
  year: text('year'),
  title: text('title'),
  featureName: text('featureName'),
  imdbId: text('imdbId'),
  id: integer('id').primaryKey(), //For some reason the last column is not returned on queries
});

export const featureDetailsRelations = relations(
  featureDetailsModel,
  ({ many }) => ({
    subtitles: many(subtitleModel),
  })
);
