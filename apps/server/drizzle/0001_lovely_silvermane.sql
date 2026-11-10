CREATE UNIQUE INDEX "activity_journal_unique" ON "activity_journals" USING btree (("data"->>'clubId'),("data"->>'activityId'));--> statement-breakpoint
CREATE INDEX "club_application_applicant" ON "club_applications" USING btree (("data"->>'applicantUserId'));--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_unique" ON "club_attendance" USING btree (("data"->>'clubId'),("data"->>'weekStart'),("data"->>'studentId'));--> statement-breakpoint
CREATE UNIQUE INDEX "club_vote_unique" ON "club_election_votes" USING btree (("data"->>'electionId'),("data"->>'applicationId'),("data"->>'studentUserId'));--> statement-breakpoint
CREATE UNIQUE INDEX "club_rating_unique" ON "club_ratings" USING btree (("data"->>'clubId'),("data"->>'userId'));--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_score_unique" ON "election_candidate_scores" USING btree (("data"->>'electionId'),("data"->>'applicationId'),("data"->>'scorerStudentId'));--> statement-breakpoint
CREATE UNIQUE INDEX "election_application_unique" ON "event_election_applications" USING btree (("data"->>'electionId'),("data"->>'applicantUserId'));--> statement-breakpoint
CREATE UNIQUE INDEX "journal_like_unique" ON "journal_likes" USING btree (("data"->>'clubId'),("data"->>'activityId'),("data"->>'userId'));--> statement-breakpoint
CREATE INDEX "notification_recipient_idx" ON "notifications" USING btree (("data"->>'recipientUserId'));--> statement-breakpoint
CREATE UNIQUE INDEX "school_year_unique" ON "student_council_terms" USING btree (("data"->>'schoolYear'));