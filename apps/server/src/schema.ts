import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type * as T from "@student-dash/shared/types";
export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
  role: text().$type<T.UserRole>().notNull().default("student"),
  studentId: text().unique(),
});
export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp().notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);
export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp(),
    refreshTokenExpiresAt: timestamp(),
    scope: text(),
    password: text(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (t) => [
    index("account_user_idx").on(t.userId),
    uniqueIndex("account_provider_unique").on(t.providerId, t.accountId),
  ],
);
export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
export const students = pgTable("students", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  studentId: text().notNull().unique(),
});
export const clubs = pgTable("clubs", {
  id: text().primaryKey(),
  founderId: text()
    .notNull()
    .references(() => user.id),
  data: jsonb().$type<Omit<T.Club, "activities" | "members">>().notNull(),
});
export const activities = pgTable(
  "activities",
  {
    id: text().primaryKey(),
    clubId: text()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    data: jsonb().$type<Omit<T.Activity, "registeredStudents">>().notNull(),
  },
  (t) => [index("activity_club_idx").on(t.clubId)],
);
export const memberships = pgTable(
  "memberships",
  {
    id: text().primaryKey(),
    clubId: text()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    studentId: text()
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("membership_unique").on(t.clubId, t.studentId)],
);
export const registrations = pgTable(
  "registrations",
  {
    id: text().primaryKey(),
    activityId: text()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    studentId: text()
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("registration_unique").on(t.activityId, t.studentId)],
);
// One row per domain record. JSONB retains nested form structures; ownership and
// parent keys are indexed explicitly where used for authorization/joins.
export const clubApplications = pgTable(
  "club_applications",
  {
    id: text().primaryKey(),
    data: jsonb().$type<T.ClubApplication>().notNull(),
  },
  (t) => [
    index("club_application_applicant").on(
      sql`(${t.data}->>'applicantUserId')`,
    ),
  ],
);
export const clubElections = pgTable("club_elections", {
  id: text().primaryKey(),
  data: jsonb().$type<T.ClubElection>().notNull(),
});
export const clubElectionVotes = pgTable(
  "club_election_votes",
  {
    id: text().primaryKey(),
    data: jsonb().$type<T.ClubElectionVote>().notNull(),
  },
  (t) => [
    uniqueIndex("club_vote_unique").on(
      sql`(${t.data}->>'electionId')`,
      sql`(${t.data}->>'applicationId')`,
      sql`(${t.data}->>'studentUserId')`,
    ),
  ],
);
export const eventElections = pgTable("event_elections", {
  id: text().primaryKey(),
  data: jsonb().$type<T.EventElection>().notNull(),
});
export const eventElectionApplications = pgTable(
  "event_election_applications",
  {
    id: text().primaryKey(),
    data: jsonb().$type<T.EventElectionApplication>().notNull(),
  },
  (t) => [
    uniqueIndex("election_application_unique").on(
      sql`(${t.data}->>'electionId')`,
      sql`(${t.data}->>'applicantUserId')`,
    ),
  ],
);
export const electionScorerInvites = pgTable("election_scorer_invites", {
  id: text().primaryKey(),
  data: jsonb().$type<T.ElectionScorerInvite>().notNull(),
});
export const electionCandidateScores = pgTable(
  "election_candidate_scores",
  {
    id: text().primaryKey(),
    data: jsonb().$type<T.ElectionCandidateScore>().notNull(),
  },
  (t) => [
    uniqueIndex("candidate_score_unique").on(
      sql`(${t.data}->>'electionId')`,
      sql`(${t.data}->>'applicationId')`,
      sql`(${t.data}->>'scorerStudentId')`,
    ),
  ],
);
export const electionApplicantMessages = pgTable(
  "election_applicant_messages",
  {
    id: text().primaryKey(),
    data: jsonb().$type<T.ElectionApplicantMessage>().notNull(),
  },
);
export const studentCouncilTerms = pgTable(
  "student_council_terms",
  {
    id: text().primaryKey(),
    data: jsonb().$type<T.StudentCouncilTerm>().notNull(),
  },
  (t) => [
    uniqueIndex("school_year_unique").on(sql`(${t.data}->>'schoolYear')`),
  ],
);
export const removalNotices = pgTable("removal_notices", {
  id: text().primaryKey(),
  data: jsonb().$type<T.ActivityRemovalNotice>().notNull(),
});
export const activityJournals = pgTable(
  "activity_journals",
  {
    id: text().primaryKey(),
    data: jsonb().$type<T.ActivityJournal>().notNull(),
  },
  (t) => [
    uniqueIndex("activity_journal_unique").on(
      sql`(${t.data}->>'clubId')`,
      sql`(${t.data}->>'activityId')`,
    ),
  ],
);
export const journalThreadComments = pgTable("journal_thread_comments", {
  id: text().primaryKey(),
  data: jsonb().$type<T.JournalThreadComment>().notNull(),
});
export const journalLikes = pgTable(
  "journal_likes",
  { id: text().primaryKey(), data: jsonb().$type<T.JournalLike>().notNull() },
  (t) => [
    uniqueIndex("journal_like_unique").on(
      sql`(${t.data}->>'clubId')`,
      sql`(${t.data}->>'activityId')`,
      sql`(${t.data}->>'userId')`,
    ),
  ],
);
export const clubAttendance = pgTable(
  "club_attendance",
  {
    id: text().primaryKey(),
    data: jsonb().$type<T.ClubAttendanceEntry>().notNull(),
  },
  (t) => [
    uniqueIndex("attendance_unique").on(
      sql`(${t.data}->>'clubId')`,
      sql`(${t.data}->>'weekStart')`,
      sql`(${t.data}->>'studentId')`,
    ),
  ],
);
export const clubRatings = pgTable(
  "club_ratings",
  {
    id: text().primaryKey(),
    data: jsonb().$type<T.ClubRatingRecord>().notNull(),
  },
  (t) => [
    uniqueIndex("club_rating_unique").on(
      sql`(${t.data}->>'clubId')`,
      sql`(${t.data}->>'userId')`,
    ),
  ],
);
export const clubCommentReports = pgTable("club_comment_reports", {
  id: text().primaryKey(),
  data: jsonb().$type<T.ClubCommentReport>().notNull(),
}, (t) => [uniqueIndex("club_comment_report_unique").on(
  sql`(${t.data}->>'ratingId')`,
  sql`(${t.data}->>'reporterUserId')`,
  sql`(${t.data}->>'ratingUpdatedAt')`,
)]);
export const notifications = pgTable(
  "notifications",
  {
    id: text().primaryKey(),
    data: jsonb().$type<T.NotificationRecord>().notNull(),
  },
  (t) => [
    index("notification_recipient_idx").on(
      sql`(${t.data}->>'recipientUserId')`,
    ),
  ],
);
export const notificationReads = pgTable("notification_reads", {
  id: text().primaryKey(),
  data: jsonb().$type<string[]>().notNull(),
});
export const media = pgTable("media", {
  id: text().primaryKey(),
  ownerId: text()
    .notNull()
    .references(() => user.id),
  mime: text().notNull(),
  base64: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});
