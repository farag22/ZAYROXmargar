CREATE TABLE `payment_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentRequestId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('created','approved','rejected','status_viewed') NOT NULL,
	`detail` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`orderCode` varchar(48) NOT NULL,
	`plan` enum('basic','pro') NOT NULL,
	`billingMonths` int NOT NULL DEFAULT 1,
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'EGP',
	`provider` varchar(32) NOT NULL DEFAULT 'vodafone_cash',
	`payerPhone` varchar(32) NOT NULL,
	`transferReference` varchar(96),
	`receiptKey` varchar(512) NOT NULL,
	`receiptUrl` varchar(768) NOT NULL,
	`status` enum('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending',
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`rejectionReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_requests_order_code_unique` UNIQUE(`orderCode`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `plan` enum('free','basic','pro') NOT NULL DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `startsAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `endsAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `provider` varchar(32) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `externalReference` varchar(255);--> statement-breakpoint
CREATE INDEX `payment_audit_request_idx` ON `payment_audit_logs` (`paymentRequestId`);--> statement-breakpoint
CREATE INDEX `payment_requests_shop_idx` ON `payment_requests` (`shopId`);--> statement-breakpoint
CREATE INDEX `payment_requests_status_idx` ON `payment_requests` (`status`,`createdAt`);--> statement-breakpoint
