CREATE TABLE `feature_details` (
	`id` integer PRIMARY KEY NOT NULL,
	`featureType` text,
	`year` text,
	`title` text,
	`featureName` text,
	`imdbId` text,
	`seasonNumber` integer,
	`episodeNumber` integer
);
--> statement-breakpoint
CREATE TABLE `subtitles` (
	`id` integer PRIMARY KEY NOT NULL,
	`externalId` text,
	`provider` text,
	`fileId` text,
	`createdOn` integer,
	`url` text,
	`releaseName` text,
	`comments` text,
	`featureDetailsId` integer,
	`downloadCount` integer,
	`language` text
);
