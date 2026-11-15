import { journalCommentClub } from "./commentModeration.js";
import type { AppState } from "@student-dash/shared/state";
import type { User } from "@student-dash/shared/types";
export function projectState(source: AppState, user: User): AppState {
  const state = structuredClone(source);
  state.clubs = state.clubs.map((c) => ({
    ...c,
    activities: c.activities.filter((a) => !a.cancelled),
  }));
  const teacher = user.role === "founder";
  const ownStudent = state.students.find(
    (s) => s.studentId === user.studentId,
  )?.id;
  const managed = new Set(
    state.clubs.filter((c) => c.founderId === user.id).map((c) => c.id),
  );
  state.notifications = state.notifications.filter(
    (n) => n.recipientUserId === user.id,
  );
  state.readNotificationIds = {
    [user.id]: state.readNotificationIds[user.id] ?? [],
  };
  state.removalNotices = state.removalNotices.filter(
    (n) => n.studentId === ownStudent,
  );
  state.clubCommentReports = state.clubCommentReports.filter(
    (report) => {
      if (report.source === "journal") {
        const comment = source.journalThreadComments.find(c => c.id === report.commentId);
        if (!comment || !journalCommentClub(source, comment) || comment.clubId !== report.clubId || comment.activityId !== report.activityId) return false;
      }
      return teacher || managed.has(report.clubId) || report.reporterUserId === user.id;
    },
  );
  state.journalThreadComments = state.journalThreadComments.filter(c => !!journalCommentClub(source, c)).map(c =>
    c.commentUnpublished && !teacher && !managed.has(c.clubId) ? {...c, body: ""} : c,
  );
  state.clubCommentReports = state.clubCommentReports.map(report => {
    if (report.source !== "journal") return report;
    const comment = source.journalThreadComments.find(c => c.id === report.commentId);
    const authorized = !!comment && !!journalCommentClub(source, comment) && comment.clubId === report.clubId && comment.activityId === report.activityId;
    return !authorized || (comment?.commentUnpublished && !teacher && !managed.has(report.clubId)) ? {...report, commentSnapshot: ""} : report;
  });
  // Retain numerical records for rankings, but never send hidden text to students.
  state.clubRatings = state.clubRatings.map(r =>
    r.commentUnpublished && !teacher && !managed.has(r.clubId) ? { ...r, comment: "" } : r,
  );
  state.clubCommentReports = state.clubCommentReports.map(report =>
    report.source !== "journal" && !teacher && !managed.has(report.clubId) && state.clubRatings.some(r => r.id === report.ratingId && r.commentUnpublished)
      ? { ...report, commentSnapshot: "" } : report,
  );
  if (!teacher) {
    state.clubApplications = state.clubApplications.filter(
      (a) =>
        a.applicantUserId === user.id ||
        a.status === "approved_official_candidate" ||
        a.status.startsWith("established"),
    );
    state.clubApplications = state.clubApplications.map((a) =>
      a.applicantUserId === user.id
        ? a
        : { ...a, applicantEmail: "", teacherComment: undefined },
    );
    const assigned = new Set(
      state.electionScorerInvites
        .filter((i) => i.scorerUserId === user.id)
        .map((i) => i.electionId),
    );
    state.eventElectionApplications = state.eventElectionApplications.filter(
      (a) => a.applicantUserId === user.id || assigned.has(a.electionId),
    );
    state.electionScorerInvites = state.electionScorerInvites.filter(
      (i) => i.scorerUserId === user.id,
    );
    state.electionCandidateScores = state.electionCandidateScores.filter(
      (s) => s.scorerStudentId === ownStudent,
    );
    state.electionApplicantMessages = state.electionApplicantMessages.filter(
      (m) =>
        state.eventElectionApplications.some(
          (a) => a.electionId === m.electionId && a.applicantUserId === user.id,
        ),
    );
    state.clubElectionVotes = state.clubElectionVotes.filter(
      (v) => v.studentUserId === user.id,
    );
    // Attendance used by own participation/rating pages and owner management screens.
    state.clubAttendance = state.clubAttendance.filter(
      (a) => a.studentId === ownStudent || managed.has(a.clubId),
    );
    state.students = state.students.map((s) =>
      s.id === ownStudent ||
      state.clubs.some(
        (c) =>
          managed.has(c.id) &&
          (c.members.includes(s.id) ||
            c.activities.some((a) => a.registeredStudents.includes(s.id))),
      )
        ? s
        : { ...s, email: "", studentId: "" },
    );
  }
  return state;
}
