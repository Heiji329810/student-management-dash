import { MIN_PRESENT_SESSIONS_TO_RATE, countPresentSessions } from "@student-dash/shared/clubRatings";
import { isActivityPast } from "@student-dash/shared/activities";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { CommandName } from "@student-dash/shared/contracts";
import { commandSchemas } from "@student-dash/shared/contracts";
import type { AppState } from "@student-dash/shared/state";
import type { User } from "@student-dash/shared/types";
import { canModerateJournalComment, journalCommentClub } from "./commentModeration.js";
import { createDomain } from "./domain.js";
import { HttpError } from "./errors.js";
import { media } from "./schema.js";
import type { Database } from "./store.js";

const teacherOnly = new Set<CommandName>([
  "reviewClubApplication",
  "createClubElection",
  "finalizeClubElection",
  "createOfficialEvent",
  "createEventElection",
  "submitExternalElectionScore",
  "startStudentCouncilTerm",
  "assignStudentCouncilDepartmentMember",
  "removeStudentCouncilDepartmentMember",
  "sendEventElectionMessage",
  "publishEventElectionResults",
  "teacherAddOfficialClubMember",
  "teacherRemoveOfficialClubMember",
]);
const ownerOnly = new Set<CommandName>([
  "createActivity",
  "updateActivity",
  "cancelActivity",
  "setClubMemberAttendance",
  "saveActivityJournal",
]);
export async function executeCommand(
  db: Database,
  state: AppState,
  user: User,
  users: User[],
  command: CommandName,
  input: unknown,
): Promise<boolean> {
  const args = commandSchemas[command].parse(input) as unknown[];
  if (
    user.role === "student" &&
    (!user.studentId ||
      !state.students.some((s) => s.studentId === user.studentId))
  )
    throw new HttpError(403, "Account is missing its student roster identity");
  if (teacherOnly.has(command) && user.role !== "founder")
    throw new HttpError(403, "Teacher access required");
  if (ownerOnly.has(command)) {
    const club = state.clubs.find((c) => c.id === args[0]);
    if (!club) throw new HttpError(404, "Club not found");
    if (user.role !== "student" || club.founderId !== user.id)
      throw new HttpError(403, "Club owner access required");
  }
  if (
    [
      "registerForActivity",
      "unregisterFromActivity",
      "joinClub",
      "leaveClub",
      "submitClubApplication",
      "castClubElectionVote",
      "submitEventElectionApplication",
      "saveClubRating",
      "reportClubRatingComment",
      "reportJournalThreadComment",
    ].includes(command) &&
    user.role !== "student"
  )
    throw new HttpError(403, "Student access required");
  if (["registerForActivity", "unregisterFromActivity"].includes(command)) {
    const club = state.clubs.find((c) => c.id === args[1]);
    const activity = club?.activities.find(
      (a) => a.id === args[0] && !a.cancelled,
    );
    if (!activity) throw new HttpError(404, "Activity not found");
    if (command === "registerForActivity") {
      if (activity.cancelled || isActivityPast(activity))
        throw new HttpError(409, "Activity is closed");
      const student = state.students.find(
        (s) => s.studentId === user.studentId,
      );
      if (
        !activity.allStudentsOnCampus &&
        activity.maxParticipants &&
        activity.registeredStudents.length >= activity.maxParticipants &&
        !activity.registeredStudents.includes(student?.id ?? "")
      )
        throw new HttpError(409, "Activity is full");
    }
  }
  if (["joinClub", "leaveClub"].includes(command)) {
    const club = state.clubs.find((c) => c.id === args[0]);
    if (!club) throw new HttpError(404, "Club not found");
    if (club.category === "School Official Events")
      throw new HttpError(403, "Membership is managed by teachers");
    if (command === "leaveClub" && club.founderId === user.id)
      throw new HttpError(409, "The founder must remain a member");
  }
  if (
    command === "markNotificationRead" &&
    !state.notifications.some(
      (n) => n.id === args[0] && n.recipientUserId === user.id,
    )
  )
    throw new HttpError(404, "Notification not found");
  if (
    [
      "saveActivityJournal",
      "postJournalThreadComment",
      "toggleJournalLike",
    ].includes(command)
  ) {
    const activity = state.clubs
      .find((c) => c.id === args[0])
      ?.activities.find((a) => a.id === args[1]);
    if (!activity) throw new HttpError(404, "Activity not found");
    if (command === "saveActivityJournal") {
      const journal = args[2] as { participantIds: string[]; photos: string[] };
      if (
        journal.participantIds.some(
          (id) => !activity.registeredStudents.includes(id),
        )
      )
        throw new HttpError(
          422,
          "Participants must be registered for this activity",
        );
      for (let i = 0; i < journal.photos.length; i++) {
        const photo = journal.photos[i];
        if (photo.startsWith("/api/media/")) {
          const [existing] = await db
            .select()
            .from(media)
            .where(eq(media.id, photo.split("/").pop()!));
          if (!existing || existing.ownerId !== user.id)
            throw new HttpError(403, "Invalid photo ownership");
          continue;
        }
        const match = /^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/.exec(
          photo,
        )!;
        const bytes = Buffer.from(match[2], "base64");
        const valid =
          match[1] === "image/png"
            ? bytes
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : match[1] === "image/jpeg"
              ? bytes[0] === 255 && bytes[1] === 216
              : match[1] === "image/gif"
                ? bytes.toString("ascii", 0, 3) === "GIF"
                : bytes.toString("ascii", 0, 4) === "RIFF" &&
                  bytes.toString("ascii", 8, 12) === "WEBP";
        if (!valid) throw new HttpError(422, "Invalid image bytes");
        const id = randomUUID();
        await db
          .insert(media)
          .values({ id, ownerId: user.id, mime: match[1], base64: match[2] });
        journal.photos[i] = `/api/media/${id}`;
      }
    }
  }
  if (command === "publishEventElectionResults") {
    const election = state.eventElections.find((e) => e.id === args[0]);
    if (
      election?.councilDepartmentId &&
      !state.studentCouncilTerms.some(
        (t) =>
          t.status === "active" &&
          t.departments.some(
            (d) =>
              d.id === election.councilDepartmentId &&
              d.electionId === election.id,
          ),
      )
    )
      throw new HttpError(
        409,
        "Election does not belong to the active council department",
      );
  }
  if (command === "submitEventElectionApplication") {
    const election = state.eventElections.find((e) => e.id === args[0]);
    if (election) {
      const answers = args[1] as Record<string, string>;
      if (
        Object.keys(answers).some(
          (key) => !election.applicationFields.some((f) => f.id === key),
        )
      )
        throw new HttpError(422, "Unknown application field");
      // Identity is session-owned; class remains an applicant-provided field.
      answers["system-name"] = user.name;
      if (
        election.applicationFields.some(
          (f) => f.type === "file_upload" || f.type === "video_upload",
        )
      )
        throw new HttpError(
          422,
          "Election file/video uploads are not supported by the current frontend",
        );
    }
  }
  if (
    command === "setClubMemberAttendance" &&
    new Date(`${args[1]}T00:00:00Z`).getUTCDay() !== 1
  )
    throw new HttpError(422, "Attendance week must start on Monday");
  if (command === "startStudentCouncilTerm") {
    const departments = args[1] as {
      name: string;
      memberStudentIds: string[];
    }[];
    if (
      departments.some((d) =>
        d.memberStudentIds.some(
          (id) => !state.students.some((s) => s.id === id),
        ),
      )
    )
      throw new HttpError(422, "Unknown student");
  }
  if (command === "reportClubRatingComment") {
    const target = state.clubRatings.find(r => r.clubId === args[0] && r.id === args[1]);
    const club = state.clubs.find(c => c.id === args[0]);
    if (!target || !club) throw new HttpError(404, "Club rating not found");
    const student = state.students.find(s => s.studentId === user.studentId);
    const eligible = user.role === "student" && !!student && club.members.includes(student.id)
      && countPresentSessions(state.clubAttendance, club.id, student.id) >= MIN_PRESENT_SESSIONS_TO_RATE;
    if (target.commentUnpublished || target.userId === user.id || (eligible && club.founderId !== user.id && !state.clubRatings.some(r => r.clubId === club.id && r.userId === user.id)))
      throw new HttpError(403, "Comment is not visible to this account");
    if (!users.some(u => u.id === target.userId && u.role === "student"))
      throw new HttpError(403, "Only student comments can be reported");
    if (!target.comment.trim() || target.updatedAt !== (args[2] as {ratingUpdatedAt: string}).ratingUpdatedAt)
      throw new HttpError(409, "Comment changed. Reload before reporting.");
    if (state.clubCommentReports.some(r => r.ratingId === target.id && r.reporterUserId === user.id && r.ratingUpdatedAt === target.updatedAt))
      throw new HttpError(409, "You already reported this comment version");
  }
  if (["deleteClubRatingComment", "setClubCommentPublished", "setClubCommentPinned", "dismissClubCommentReport"].includes(command)) {
    const report = command === "dismissClubCommentReport" ? state.clubCommentReports.find(r => r.id === args[0]) : undefined;
    if (command === "dismissClubCommentReport" && !report) throw new HttpError(404, "Report not found");
    if (report?.source === "journal") {
      const comment = state.journalThreadComments.find(c => c.id === report.commentId);
      if (!comment || !journalCommentClub(state, comment) || comment.clubId !== report.clubId || comment.activityId !== report.activityId)
        throw new HttpError(404, "Journal comment not found");
    }
    const clubId = report?.clubId ?? args[0];
    const club = state.clubs.find(c => c.id === clubId);
    if (!club) throw new HttpError(404, "Club not found");
    if (user.role !== "founder" && club.founderId !== user.id)
      throw new HttpError(403, "Club leader or teacher access required");
    if (!report && !state.clubRatings.some(r => r.clubId === clubId && r.id === args[1]))
      throw new HttpError(404, "Club rating not found");
  }
  if (["deleteJournalCommentText", "setJournalCommentPublished", "setJournalCommentPinned", "reportJournalThreadComment"].includes(command)) {
    const target = state.journalThreadComments.find(c => c.id === args[0]);
    if (!target || !journalCommentClub(state, target)) throw new HttpError(404, "Journal comment not found");
    if (command === "reportJournalThreadComment") {
      if (target.userId === user.id || target.commentUnpublished || target.commentDeleted || !target.body.trim())
        throw new HttpError(403, "Comment is not visible to this account");
      if (!users.some(u => u.id === target.userId && u.role === "student")) throw new HttpError(403, "Only student comments can be reported");
      if (state.clubCommentReports.some(r => r.source === "journal" && r.commentId === target.id && r.reporterUserId === user.id))
        throw new HttpError(409, "You already reported this comment version");
    } else if (!canModerateJournalComment(state, user, target)) throw new HttpError(403, "Club leader or teacher access required");
  }
  if (command === "deleteJournalThreadComment") {
    const target = state.journalThreadComments.find((c) => c.id === args[0]);
    if (!target) throw new HttpError(404, "Comment not found");
    if (target.userId !== user.id)
      throw new HttpError(403, "Only the author can delete this comment");
  }
  if (command === "postJournalThreadComment") {
    const input = args[2] as { parentId?: string };
    if (
      input.parentId &&
      !state.journalThreadComments.some(
        (c) =>
          c.id === input.parentId &&
          c.clubId === args[0] &&
          c.activityId === args[1],
      )
    )
      throw new HttpError(422, "Reply must belong to the same journal");
  }
  const domain = createDomain(state, user, users);
  // Schemas validate the heterogeneous tuple before dispatch; retain a single boundary.
  const result = (domain[command] as (...args: any[]) => boolean | void)(
    ...args,
  );
  if (result === false && command !== "toggleJournalLike")
    throw new HttpError(409, "Action is not allowed in the current state");
  return result ?? true;
}
