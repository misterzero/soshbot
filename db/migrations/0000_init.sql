CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`type` text NOT NULL,
	`platform` text NOT NULL,
	`image_path` text NOT NULL,
	`caption` text,
	`generated_at` integer NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `brand_kits` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`logo_path` text,
	`colors` text,
	`fonts` text,
	`voice_sample` text,
	`hashtags` text,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `calendar_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`ical_url` text NOT NULL,
	`last_synced_at` integer,
	`sync_status` text DEFAULT 'never' NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `entertainers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`genre` text,
	`bio_short` text,
	`bio_long` text,
	`website` text,
	`socials` text,
	`standard_rate` real,
	`payout_method` text,
	`match_aliases` text,
	`booking_notes` text
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`ical_uid` text,
	`calendar_source_id` text,
	`title` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`space` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`entertainer_id` text,
	`notes` text,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`calendar_source_id`) REFERENCES `calendar_sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entertainer_id`) REFERENCES `entertainers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_ical_uid_unique` ON `events` (`ical_uid`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`entertainer_id` text NOT NULL,
	`kind` text NOT NULL,
	`path` text NOT NULL,
	`mime` text DEFAULT 'image/jpeg' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`entertainer_id`) REFERENCES `entertainers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`monthly_budget` real DEFAULT 0 NOT NULL
);
