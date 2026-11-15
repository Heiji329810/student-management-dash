import { isDeepStrictEqual } from "node:util";
import { inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { AppState } from "@student-dash/shared/state";
import { emptyState } from "@student-dash/shared/state";
import * as S from "./schema.js";
export type Database = NodePgDatabase<typeof S>;
const documents = {
  clubApplications: S.clubApplications,
  clubElections: S.clubElections,
  clubElectionVotes: S.clubElectionVotes,
  eventElections: S.eventElections,
  eventElectionApplications: S.eventElectionApplications,
  electionScorerInvites: S.electionScorerInvites,
  electionCandidateScores: S.electionCandidateScores,
  electionApplicantMessages: S.electionApplicantMessages,
  studentCouncilTerms: S.studentCouncilTerms,
  removalNotices: S.removalNotices,
  activityJournals: S.activityJournals,
  journalThreadComments: S.journalThreadComments,
  journalLikes: S.journalLikes,
  clubAttendance: S.clubAttendance,
  clubRatings: S.clubRatings,
  clubCommentReports: S.clubCommentReports,
  notifications: S.notifications,
};
export async function lock(db: Database) {
  await db.execute(sql`select pg_advisory_xact_lock(329810)`);
}
export async function loadState(db: Database): Promise<AppState> {
  const state = emptyState();
  state.students = await db.select().from(S.students);
  const clubRows = await db.select().from(S.clubs);
  const activityRows = await db.select().from(S.activities);
  const members = await db.select().from(S.memberships);
  const registrations = await db.select().from(S.registrations);
  state.clubs = clubRows.map((c) => ({
    ...c.data,
    activities: activityRows
      .filter((a) => a.clubId === c.id)
      .map((a) => ({
        ...a.data,
        registeredStudents: registrations
          .filter((r) => r.activityId === a.id)
          .map((r) => r.studentId),
      })),
    members: members.filter((m) => m.clubId === c.id).map((m) => m.studentId),
  }));
  for (const [key, table] of Object.entries(documents)) {
    const rows = await db.select().from(table);
    // Each table has the same id/data shape, with its own strongly typed payload.
    (state as unknown as Record<string, unknown>)[key] = rows.map(
      (r) => r.data,
    );
  }
  state.readNotificationIds = Object.fromEntries(
    (await db.select().from(S.notificationReads)).map((r) => [r.id, r.data]),
  );
  return state;
}
// A single generic persistence boundary for the structurally identical record tables.
// Domain and public contracts remain typed; this helper also serves normalized rows.
async function syncRows(db: Database, table: any, rows: any[]) {
  const previous = await db.select().from(table);
  const byId = new Map(previous.map((r: any) => [r.id, r]));
  const keep = new Set(rows.map((r) => r.id));
  const removed = previous
    .filter((r: any) => !keep.has(r.id))
    .map((r: any) => r.id);
  if (removed.length) await db.delete(table).where(inArray(table.id, removed));
  for (const row of rows) {
    if (isDeepStrictEqual(byId.get(row.id), row)) continue;
    const { id, ...set } = row;
    await db
      .insert(table)
      .values(row)
      .onConflictDoUpdate({ target: table.id, set });
  }
}
export async function saveState(db: Database, state: AppState) {
  // Core parents first. Clubs/activities are never deleted by existing workflows.
  // Roster identities are managed by account provisioning, never by business commands.
  await syncRows(
    db,
    S.clubs,
    state.clubs.map(({ activities, members, ...data }) => ({
      id: data.id,
      founderId: data.founderId,
      data,
    })),
  );
  await syncRows(
    db,
    S.activities,
    state.clubs.flatMap((c) =>
      c.activities.map(({ registeredStudents, ...data }) => ({
        id: data.id,
        clubId: c.id,
        data,
      })),
    ),
  );
  await syncRows(
    db,
    S.memberships,
    state.clubs.flatMap((c) =>
      c.members.map((studentId) => ({
        id: JSON.stringify([c.id, studentId]),
        clubId: c.id,
        studentId,
      })),
    ),
  );
  await syncRows(
    db,
    S.registrations,
    state.clubs.flatMap((c) =>
      c.activities.flatMap((a) =>
        a.registeredStudents.map((studentId) => ({
          id: JSON.stringify([a.id, studentId]),
          activityId: a.id,
          studentId,
        })),
      ),
    ),
  );
  for (const [key, table] of Object.entries(documents)) {
    const records = state[key as keyof typeof documents];
    await syncRows(
      db,
      table,
      records.map((r) => ({
        id:
          "id" in r
            ? r.id
            : JSON.stringify([r.clubId, r.weekStart, r.studentId]),
        data: r,
      })),
    );
  }
  await syncRows(
    db,
    S.notificationReads,
    Object.entries(state.readNotificationIds).map(([id, data]) => ({
      id,
      data,
    })),
  );
}
export async function loadUsers(db: Database) {
  return (await db.select().from(S.user)).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    studentId: u.studentId ?? undefined,
  }));
}
