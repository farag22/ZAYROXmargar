CREATE TABLE `shop_delivery_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`governorate` varchar(80) NOT NULL,
	`feeCents` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shop_delivery_zones_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_zones_shop_governorate_unique` UNIQUE(`shopId`,`governorate`)
);
--> statement-breakpoint
ALTER TABLE `storefront_orders` ADD `delivery_governorate` varchar(80);--> statement-breakpoint
ALTER TABLE `storefront_orders` ADD `delivery_fee_cents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `delivery_zones_shop_active_idx` ON `shop_delivery_zones` (`shopId`,`isActive`);