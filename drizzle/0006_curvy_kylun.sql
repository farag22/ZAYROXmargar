CREATE TABLE `storefront_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(160) NOT NULL,
	`productImage` varchar(768),
	`unitPriceCents` int NOT NULL,
	`quantity` int NOT NULL,
	`lineTotalCents` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storefront_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storefront_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`orderNo` varchar(48) NOT NULL,
	`customerName` varchar(150) NOT NULL,
	`customerPhone` varchar(32) NOT NULL,
	`customerAddress` text NOT NULL,
	`customerNote` text,
	`status` enum('new','processing','shipped','completed') NOT NULL DEFAULT 'new',
	`subtotalCents` int NOT NULL,
	`totalCents` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storefront_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `storefront_orders_shop_order_unique` UNIQUE(`shopId`,`orderNo`)
);
--> statement-breakpoint
ALTER TABLE `shops` ADD `slug` varchar(120);--> statement-breakpoint
ALTER TABLE `shops` ADD `is_storefront_active` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD CONSTRAINT `shops_slug_unique` UNIQUE(`slug`);--> statement-breakpoint
CREATE INDEX `storefront_order_items_order_idx` ON `storefront_order_items` (`orderId`);--> statement-breakpoint
CREATE INDEX `storefront_order_items_shop_product_idx` ON `storefront_order_items` (`shopId`,`productId`);--> statement-breakpoint
CREATE INDEX `storefront_orders_shop_status_idx` ON `storefront_orders` (`shopId`,`status`,`createdAt`);