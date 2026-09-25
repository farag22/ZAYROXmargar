CREATE TABLE `admin_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(80),
	`detail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`code` enum('free','basic','pro') NOT NULL,
	`name` varchar(80) NOT NULL,
	`priceCents` int NOT NULL,
	`maxProducts` int NOT NULL,
	`maxShops` int NOT NULL,
	`reportsEnabled` int NOT NULL DEFAULT 0,
	`pdfExportEnabled` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plans_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','shop_owner','super_admin') NOT NULL DEFAULT 'shop_owner';--> statement-breakpoint
UPDATE `users` SET `role` = CASE `role` WHEN 'admin' THEN 'super_admin' ELSE 'shop_owner' END;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('shop_owner','super_admin') NOT NULL DEFAULT 'shop_owner';--> statement-breakpoint
INSERT INTO `plans` (`code`, `name`, `priceCents`, `maxProducts`, `maxShops`, `reportsEnabled`, `pdfExportEnabled`, `isActive`) VALUES
('free', 'مجانية', 0, 75, 1, 0, 0, 1),
('basic', 'أساسية', 14900, 500, 2, 1, 1, 1),
('pro', 'احترافية', 29900, 5000, 5, 1, 1, 1);--> statement-breakpoint
CREATE INDEX `admin_audit_actor_idx` ON `admin_audit_logs` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `admin_audit_created_idx` ON `admin_audit_logs` (`createdAt`);
