CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`color` varchar(16) NOT NULL DEFAULT '#0f766e',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_shop_name_unique` UNIQUE(`shopId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`phone` varchar(32),
	`email` varchar(320),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `debt_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`customerId` int NOT NULL,
	`saleId` int,
	`type` enum('debt','payment','adjustment') NOT NULL,
	`amountCents` int NOT NULL,
	`dueDate` timestamp,
	`note` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `debt_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`category` varchar(80) NOT NULL,
	`amountCents` int NOT NULL,
	`note` text,
	`spentAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`productId` int NOT NULL,
	`saleId` int,
	`type` enum('sale','restock','adjustment','return') NOT NULL,
	`quantityDelta` int NOT NULL,
	`note` varchar(255),
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`type` enum('low_stock','debt_due','system') NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`categoryId` int,
	`name` varchar(160) NOT NULL,
	`sku` varchar(80),
	`sellingPriceCents` int NOT NULL,
	`costPriceCents` int NOT NULL DEFAULT 0,
	`quantityInStock` int NOT NULL DEFAULT 0,
	`reorderPoint` int NOT NULL DEFAULT 5,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_shop_sku_unique` UNIQUE(`shopId`,`sku`)
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`saleId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(160) NOT NULL,
	`unitPriceCents` int NOT NULL,
	`costPriceCents` int NOT NULL,
	`quantity` int NOT NULL,
	`lineTotalCents` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`invoiceNo` varchar(48) NOT NULL,
	`customerId` int,
	`status` enum('completed','void') NOT NULL DEFAULT 'completed',
	`totalCents` int NOT NULL,
	`paidCents` int NOT NULL,
	`debtCents` int NOT NULL DEFAULT 0,
	`discountCents` int NOT NULL DEFAULT 0,
	`paymentMethod` enum('cash','card','transfer','credit') NOT NULL DEFAULT 'cash',
	`note` text,
	`soldAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_shop_invoice_unique` UNIQUE(`shopId`,`invoiceNo`)
);
--> statement-breakpoint
CREATE TABLE `shop_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','manager','cashier') NOT NULL DEFAULT 'cashier',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_members_shop_user_unique` UNIQUE(`shopId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'SAR',
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Riyadh',
	`ownerUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`plan` enum('free','pro') NOT NULL DEFAULT 'free',
	`status` enum('active','trialing','past_due','canceled') NOT NULL DEFAULT 'active',
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_shop_unique` UNIQUE(`shopId`)
);
--> statement-breakpoint
CREATE INDEX `categories_shop_idx` ON `categories` (`shopId`);--> statement-breakpoint
CREATE INDEX `customers_shop_idx` ON `customers` (`shopId`);--> statement-breakpoint
CREATE INDEX `debt_shop_customer_idx` ON `debt_transactions` (`shopId`,`customerId`);--> statement-breakpoint
CREATE INDEX `debt_due_idx` ON `debt_transactions` (`shopId`,`dueDate`);--> statement-breakpoint
CREATE INDEX `expenses_shop_spent_idx` ON `expenses` (`shopId`,`spentAt`);--> statement-breakpoint
CREATE INDEX `inventory_shop_product_idx` ON `inventory_movements` (`shopId`,`productId`);--> statement-breakpoint
CREATE INDEX `inventory_sale_idx` ON `inventory_movements` (`saleId`);--> statement-breakpoint
CREATE INDEX `notifications_shop_read_idx` ON `notifications` (`shopId`,`isRead`);--> statement-breakpoint
CREATE INDEX `products_shop_idx` ON `products` (`shopId`);--> statement-breakpoint
CREATE INDEX `products_stock_idx` ON `products` (`shopId`,`quantityInStock`);--> statement-breakpoint
CREATE INDEX `sale_items_sale_idx` ON `sale_items` (`saleId`);--> statement-breakpoint
CREATE INDEX `sale_items_product_idx` ON `sale_items` (`shopId`,`productId`);--> statement-breakpoint
CREATE INDEX `sales_shop_sold_idx` ON `sales` (`shopId`,`soldAt`);--> statement-breakpoint
CREATE INDEX `sales_customer_idx` ON `sales` (`customerId`);--> statement-breakpoint
CREATE INDEX `shop_members_user_idx` ON `shop_members` (`userId`);--> statement-breakpoint
CREATE INDEX `shops_owner_idx` ON `shops` (`ownerUserId`);