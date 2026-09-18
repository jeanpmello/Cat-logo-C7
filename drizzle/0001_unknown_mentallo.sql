CREATE TABLE `authorizedUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`label` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authorizedUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `authorizedUsers_email_unique` UNIQUE(`email`)
);
