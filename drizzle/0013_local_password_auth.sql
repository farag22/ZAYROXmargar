ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
