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
