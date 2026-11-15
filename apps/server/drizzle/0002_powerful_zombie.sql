CREATE TABLE "club_comment_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "club_comment_report_unique" ON "club_comment_reports" USING btree (("data"->>'ratingId'),("data"->>'reporterUserId'),("data"->>'ratingUpdatedAt'));