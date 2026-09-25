CREATE TABLE `shop_payment_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`method` varchar(32) NOT NULL,
	`accountName` varchar(120),
	`accountNumber` varchar(96) NOT NULL,
	`isActive` int NOT NULL DEFAULT 0,
	`isCodDepositMethod` int NOT NULL DEFAULT 0,
	`codDepositCents` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shop_payment_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_methods_shop_method_unique` UNIQUE(`shopId`,`method`)
);
--> statement-breakpoint
ALTER TABLE `storefront_orders` ADD `payment_mode` varchar(32);--> statement-breakpoint
ALTER TABLE `storefront_orders` ADD `payment_method` varchar(32);--> statement-breakpoint
ALTER TABLE `storefront_orders` ADD `payment_account_number` varchar(96);--> statement-breakpoint
ALTER TABLE `storefront_orders` ADD `payment_amount_cents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `storefront_orders` ADD `payment_status` varchar(32) DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `storefront_orders` ADD `payment_payer_phone` varchar(32);--> statement-breakpoint
ALTER TABLE `storefront_orders` ADD `payment_reference` varchar(120);--> statement-breakpoint
ALTER TABLE `storefront_orders` ADD `payment_proof_url` varchar(768);--> statement-breakpoint
CREATE INDEX `payment_methods_shop_active_idx` ON `shop_payment_methods` (`shopId`,`isActive`);