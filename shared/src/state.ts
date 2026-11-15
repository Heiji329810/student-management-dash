import type {
  ActivityJournal,
  ActivityRemovalNotice,
  Club,
  ClubApplication,
  ClubAttendanceEntry,
  ClubElection,
  ClubElectionVote,
  ClubRatingRecord,
  ClubCommentReport,
  ElectionApplicantMessage,
  ElectionCandidateScore,
  ElectionScorerInvite,
  EventElection,
  EventElectionApplication,
  JournalLike,
  JournalThreadComment,
  NotificationRecord,
  Student,
  StudentCouncilTerm,
} from "@student-dash/shared/types";

export interface AppState {
  clubs: Club[];
  clubApplications: ClubApplication[];
  clubElections: ClubElection[];
  clubElectionVotes: ClubElectionVote[];
  eventElections: EventElection[];
  eventElectionApplications: EventElectionApplication[];
  electionScorerInvites: ElectionScorerInvite[];
  electionCandidateScores: ElectionCandidateScore[];
  electionApplicantMessages: ElectionApplicantMessage[];
  studentCouncilTerms: StudentCouncilTerm[];
  students: Student[];
  removalNotices: ActivityRemovalNotice[];
  activityJournals: ActivityJournal[];
  journalThreadComments: JournalThreadComment[];
  journalLikes: JournalLike[];
  clubAttendance: ClubAttendanceEntry[];
  clubRatings: ClubRatingRecord[];
  clubCommentReports: ClubCommentReport[];
  notifications: NotificationRecord[];
  readNotificationIds: Record<string, string[]>;
}

export const emptyState = (): AppState => ({
  clubs: [],
  clubApplications: [],
  clubElections: [],
  clubElectionVotes: [],
  eventElections: [],
  eventElectionApplications: [],
  electionScorerInvites: [],
  electionCandidateScores: [],
  electionApplicantMessages: [],
  studentCouncilTerms: [],
  students: [],
  removalNotices: [],
  activityJournals: [],
  journalThreadComments: [],
  journalLikes: [],
  clubAttendance: [],
  clubRatings: [],
  clubCommentReports: [],
  notifications: [],
  readNotificationIds: {},
});
