CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(40) NOT NULL,
	`entity` varchar(40) NOT NULL,
	`entityId` int,
	`summary` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`url` text NOT NULL,
	`storageKey` varchar(255),
	`caption` varchar(160),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','viewer','seller','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `authorizedUsers` ADD `accessLevel` enum('viewer','seller','admin') DEFAULT 'seller' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `cosmeticCondition` varchar(160);--> statement-breakpoint
ALTER TABLE `products` ADD `battery` varchar(120);--> statement-breakpoint
ALTER TABLE `products` ADD `accessories` varchar(255);--> statement-breakpoint
ALTER TABLE `products` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `products` ADD `originalPrice` varchar(60);--> statement-breakpoint
ALTER TABLE `products` ADD `promoPrice` varchar(60);