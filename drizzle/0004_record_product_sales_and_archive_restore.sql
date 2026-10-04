ALTER TABLE `products` ADD `statusBeforeArchive` enum('available','sold');--> statement-breakpoint
ALTER TABLE `products` ADD `soldByUserId` int;--> statement-breakpoint
ALTER TABLE `products` ADD `soldByName` varchar(120);