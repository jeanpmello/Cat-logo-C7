CREATE TABLE `catalogEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(40) NOT NULL,
	`productId` int,
	`source` varchar(80),
	`path` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalogEvents_id` PRIMARY KEY(`id`)
);
