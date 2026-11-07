CREATE TABLE `github_connections` (
	`board_id` integer PRIMARY KEY NOT NULL,
	`encrypted_token` text NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `github_repositories` (
	`card_id` integer PRIMARY KEY NOT NULL,
	`board_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`full_name` text NOT NULL,
	`description` text,
	`private` integer NOT NULL,
	`archived` integer NOT NULL,
	`fork` integer NOT NULL,
	`language` text,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `github_repositories_board_repository` ON `github_repositories` (`board_id`,`repository_id`);