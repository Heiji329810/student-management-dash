ALTER TABLE "user" ADD COLUMN "approved" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "user" SET "approved" = true;
