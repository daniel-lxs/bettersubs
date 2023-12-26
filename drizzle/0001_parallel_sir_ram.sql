CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text,
	`email` text,
	`passwordHash` text,
	`isAdmin` integer
);
--> statement-breakpoint
ALTER TABLE subtitles ADD `ownerId` integer;