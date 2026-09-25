CREATE TABLE `storefront_order_status_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`orderId` int NOT NULL,
	`status` enum('new','processing','ready_to_ship','shipped','delivered','cancelled') NOT NULL,
	`channel` enum('in_app','sms','whatsapp') NOT NULL DEFAULT 'in_app',
	`message` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storefront_order_status_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `storefront_order_status_events_order_idx` ON `storefront_order_status_events` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `storefront_order_status_events_shop_idx` ON `storefront_order_status_events` (`shopId`,`createdAt`);--> statement-breakpoint
INSERT INTO `storefront_order_status_events` (`shopId`, `orderId`, `status`, `channel`, `message`, `createdAt`)
SELECT `shopId`, `id`, CASE WHEN `status` = 'completed' THEN 'delivered' ELSE `status` END, 'in_app', 'تم إنشاء الطلب.', `createdAt`
FROM `storefront_orders`;
