CREATE TABLE `rentals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`customerName` varchar(160) NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`returnDate` varchar(10) NOT NULL,
	`paymentMethod` varchar(80) NOT NULL,
	`status` enum('active','returned') NOT NULL DEFAULT 'active',
	`returnedAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rentals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `status` enum('available','sold','hidden','rented') NOT NULL DEFAULT 'available';