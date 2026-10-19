ALTER TABLE `products` ADD `soldById` int;--> statement-breakpoint
ALTER TABLE `products` ADD `soldByName` varchar(120);--> statement-breakpoint
ALTER TABLE `warrantyRecords` ADD `signedDocument2Url` text;--> statement-breakpoint
ALTER TABLE `warrantyRecords` ADD `signedDocument2Key` varchar(255);--> statement-breakpoint
ALTER TABLE `warrantyRecords` ADD `signedDocument2Name` varchar(180);--> statement-breakpoint
ALTER TABLE `warrantyRecords` ADD `signedDocument2Mime` varchar(80);--> statement-breakpoint
ALTER TABLE `warrantyRecords` ADD `signedDocument2At` timestamp;