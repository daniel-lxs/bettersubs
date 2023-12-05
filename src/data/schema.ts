import { relations } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const subtitle = sqliteTable('subtitles', {
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
});

export const subtitleRelations = relations(subtitle, ({ one }) => ({
  featureDetails: one(featureDetails, {
    fields: [subtitle.featureDetails],
    references: [featureDetails.id],
  }),
}));

export const featureDetails = sqliteTable('feature_details', {
  id: integer('id').primaryKey(),
  featureType: text('featureType'),
  year: text('year'),
  title: text('title'),
  featureName: text('featureName'),
  imdbId: text('imdbId'),
  seasonNumber: integer('seasonNumber'),
  episodeNumber: integer('episodeNumber'),
});

export const featureDetailsRelations = relations(
  featureDetails,
  ({ many }) => ({
    subtitles: many(subtitle),
  })
);
