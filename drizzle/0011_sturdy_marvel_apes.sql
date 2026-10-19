CREATE TABLE `privateLoginAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`identifier` varchar(180) NOT NULL,
	`failures` int NOT NULL DEFAULT 0,
	`lockedUntil` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `privateLoginAttempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `privateLoginAttempts_identifier_unique` UNIQUE(`identifier`)
);
--> statement-breakpoint
CREATE TABLE `warrantyRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`customerName` varchar(160) NOT NULL,
	`saleDate` varchar(10) NOT NULL,
	`expiresAt` varchar(10) NOT NULL,
	`serial` varchar(140) NOT NULL,
	`status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
	`printedAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warrantyRecords_id` PRIMARY KEY(`id`)
);
