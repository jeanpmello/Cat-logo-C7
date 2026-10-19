ALTER TABLE `warrantyRecords` ADD `signedDocumentUrl` text;--> statement-breakpoint
ALTER TABLE `warrantyRecords` ADD `signedDocumentKey` varchar(255);--> statement-breakpoint
ALTER TABLE `warrantyRecords` ADD `signedDocumentName` varchar(180);--> statement-breakpoint
ALTER TABLE `warrantyRecords` ADD `signedDocumentMime` varchar(80);--> statement-breakpoint
ALTER TABLE `warrantyRecords` ADD `signedDocumentAt` timestamp;