CREATE TABLE `aiSupervisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`sessionId` int,
	`scope` enum('case','session') NOT NULL DEFAULT 'case',
	`counselorId` int NOT NULL,
	`axisObstacleSource` enum('external','internal','mixed'),
	`axisObstacleSourceDetail` text,
	`axisNeedStructure` text,
	`axisEnergyLevel` enum('high','medium','low'),
	`axisEnergyDetail` text,
	`recommendedTechniques` json,
	`supervisionAdvice` text,
	`nextSessionSuggestion` text,
	`riskAlert` text,
	`rawResult` json,
	`modelSource` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiSupervisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`caseId` int NOT NULL,
	`supervisorId` int NOT NULL,
	`content` text NOT NULL,
	`annotationType` enum('direction','caution','strategy','praise','question') NOT NULL DEFAULT 'direction',
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `annotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childName` varchar(64) NOT NULL,
	`age` int,
	`grade` varchar(32),
	`gender` enum('male','female','other'),
	`personalityType` enum('self_esteem','relational','transactional','self_driven'),
	`initialAssessment` text,
	`familySystem` json,
	`initialLadderLevel` int DEFAULT 0,
	`currentLadderLevel` int DEFAULT 0,
	`counselorId` int NOT NULL,
	`supervisorId` int,
	`status` enum('active','completed','paused') NOT NULL DEFAULT 'active',
	`personalityProfile` json,
	`psychologicalAssessment` json,
	`notes` text,
	`transcriptKey` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `counselorGrowth` (
	`id` int AUTO_INCREMENT NOT NULL,
	`counselorId` int NOT NULL,
	`styleQuadrant` enum('guardian','lighthouse','mirror','navigator'),
	`radarData` json,
	`totalConsultHours` int DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `counselorGrowth_id` PRIMARY KEY(`id`),
	CONSTRAINT `counselorGrowth_counselorId_unique` UNIQUE(`counselorId`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`counselorId` int NOT NULL,
	`sessionNumber` int NOT NULL,
	`sessionDate` timestamp NOT NULL,
	`emotionalState` text,
	`emotionalTone` enum('positive','neutral','negative','mixed'),
	`parentFeedback` text,
	`interventionStrategies` text,
	`ladderLevel` int NOT NULL DEFAULT 0,
	`dimensionScores` json,
	`factors` json,
	`keyEvents` text,
	`emotionalShifts` text,
	`strategyEvaluation` text,
	`nextSteps` text,
	`srsMethod` int,
	`srsGoals` int,
	`srsContent` int,
	`srsOverall` int,
	`transcriptKey` varchar(500),
	`additionalNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trainingRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`counselorId` int NOT NULL,
	`trainingType` enum('book','movie','experience','course') NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`insights` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trainingRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`phone` varchar(20),
	`passwordHash` varchar(255),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
