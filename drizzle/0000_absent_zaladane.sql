CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brand` varchar(80) NOT NULL,
	`model` varchar(140) NOT NULL,
	`processor` varchar(140) NOT NULL,
	`generation` varchar(40) NOT NULL,
	`ram` varchar(20) NOT NULL,
	`ramType` varchar(20) NOT NULL,
	`storage` varchar(40) NOT NULL,
	`gpu` varchar(120) NOT NULL,
	`os` varchar(60) NOT NULL,
	`serial` varchar(140) NOT NULL,
	`screen` varchar(30) NOT NULL,
	`category` enum('Notebook','Desktop') NOT NULL DEFAULT 'Notebook',
	`condition` enum('Seminovo revisado','Novo') NOT NULL DEFAULT 'Seminovo revisado',
	`price` varchar(60) NOT NULL DEFAULT 'Sob consulta',
	`imageUrl` text,
	`imageKey` varchar(255),
	`status` enum('available','sold','hidden') NOT NULL DEFAULT 'available',
	`badge` varchar(80),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
