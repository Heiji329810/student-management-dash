export interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  maxParticipants?: number;
  registeredStudents: string[]; // student IDs
  clubId: string;
  durationType?: 'one-day' | 'long-term';
  endDate?: string;
  locationUndetermined?: boolean;
  allStudentsOnCampus?: boolean;
  cancelled?: boolean;
  cancellationReason?: string;
  cancelledAt?: string;
  linkedElectionId?: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  founderId: string;
  founderName: string;
  founderNames?: string[];
  activities: Activity[];
  members: string[];
  isSchoolOfficial?: boolean;
  sourceApplicationId?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface ClubAttendanceEntry {
  clubId: string;
  weekStart: string;
  studentId: string;
  status: AttendanceStatus;
  updatedAt: string;
}

export interface CreateClubInput {
  founderNames: string[];
  name: string;
  category: string;
  description: string;
  wantsSchoolOfficial: boolean;
  managingTeacherName?: string;
}

export type ClubApplicationStatus =
  | 'pending'
  | 'rejected'
  | 'approved_ordinary'
  | 'approved_official_candidate'
  | 'established_official'
  | 'established_ordinary';

export interface ClubApplication extends CreateClubInput {
  id: string;
  applicantUserId: string;
  applicantStudentId: string;
  applicantName: string;
  applicantEmail: string;
  status: ClubApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  teacherComment?: string;
  electionId?: string;
  resultingClubId?: string;
}

export type ClubApplicationDecision = 'approve' | 'reject';

export type ClubElectionStatus = 'scheduled' | 'ended';

export interface ClubElection {
  id: string;
  title: string;
  electionDate: string;
  minimumRequiredVotes: number;
  candidateApplicationIds: string[];
  status: ClubElectionStatus;
  createdByUserId: string;
  createdAt: string;
  endedAt?: string;
  officialEventActivityId?: string;
}

export interface ClubElectionVote {
  id: string;
  electionId: string;
  applicationId: string;
  studentUserId: string;
  studentId: string;
  createdAt: string;
}

export type ElectionApplicationFieldType =
  | 'short_text'
  | 'long_text'
  | 'choice'
  | 'video_upload'
  | 'file_upload';

export interface ElectionApplicationField {
  id: string;
  label: string;
  helpText?: string;
  type: ElectionApplicationFieldType;
  required: boolean;
  options?: string[];
}

export type EventElectionStatus = 'published' | 'results_published';

export interface EventElection {
  id: string;
  activityId: string;
  officialClubId: string;
  councilDepartmentId?: string;
  title: string;
  electionType: string;
  standards: string;
  electionDate: string;
  applicationFields: ElectionApplicationField[];
  status: EventElectionStatus;
  createdByUserId: string;
  createdAt: string;
  resultSummary?: string;
  resultsPublishedAt?: string;
  publishedResults?: ElectionPublishedResult[];
}

export interface EventElectionApplication {
  id: string;
  electionId: string;
  applicantUserId: string;
  applicantStudentId: string;
  applicantName: string;
  answers: Record<string, string>;
  submittedAt: string;
}

export interface ElectionScorerInvite {
  id: string;
  electionId: string;
  scorerStudentId: string;
  scorerUserId: string;
  scorerName?: string;
  invitedAt: string;
}

export interface ElectionCandidateScore {
  id: string;
  electionId: string;
  applicationId: string;
  scorerStudentId: string;
  score: number;
  note?: string;
  updatedAt: string;
}

export interface ElectionApplicantMessage {
  id: string;
  electionId: string;
  message: string;
  sentAt: string;
  sentByUserId: string;
}

export interface ElectionPublishedResult {
  applicationId: string;
  applicantName: string;
  averageScore: number | null;
  totalScore: number;
  selected: boolean;
}

export interface CreateEventElectionInput {
  activityId: string;
  title: string;
  electionType: string;
  standards: string;
  electionDate: string;
  applicationFields: ElectionApplicationField[];
  scorerStudentIds: string[];
  externalScorerNames: string[];
}

export interface StudentCouncilDepartment {
  id: string;
  name: string;
  memberStudentIds: string[];
  electionId?: string;
}

export interface StudentCouncilTerm {
  id: string;
  schoolYear: string;
  status: 'active' | 'archived';
  departments: StudentCouncilDepartment[];
  createdAt: string;
  archivedAt?: string;
}

export interface CreateActivityInput {
  title: string;
  description: string;
  startDateTime: string;
  durationType: 'one-day' | 'long-term';
  endDate?: string;
  location: string;
  locationUndetermined: boolean;
  estimatedParticipants?: number;
  allStudentsOnCampus: boolean;
}

export interface CancelActivityInput {
  reason: string;
}

export interface ActivityRemovalNotice {
  id: string;
  studentId: string;
  activityTitle: string;
  clubName: string;
  clubId: string;
  activityDate: string;
  message: string;
  removedAt: string;
}

export type NotificationType =
  | 'comment_reply'
  | 'event_registration'
  | 'club_join'
  | 'journal_like'
  | 'new_activity'
  | 'activity_cancelled'
  | 'club_application_result'
  | 'club_election_scheduled'
  | 'club_election_result'
  | 'event_election_date'
  | 'event_election_scorer_invite'
  | 'event_election_message'
  | 'event_election_result';

export interface NotificationRecord {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  href?: string;
  activityTitle?: string;
  clubName?: string;
  cancellationMessage?: string;
}

export interface ActivityJournalInput {
  activityName: string;
  reflection: string;
  participantIds: string[];
  socialMediaLink?: string;
  photos: string[];
}

/** @deprecated Legacy free-text field from older journal entries */
export interface ActivityJournalLegacy {
  participants?: string;
}

export interface ActivityJournal extends ActivityJournalInput, ActivityJournalLegacy {
  id: string;
  clubId: string;
  activityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalCommentInput {
  rating: number;
  comment: string;
}

/** @deprecated Migrated to JournalThreadComment */
export interface JournalComment extends JournalCommentInput {
  id: string;
  clubId: string;
  activityId: string;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLike {
  id: string;
  clubId: string;
  activityId: string;
  userId: string;
  userName: string;
  createdAt: string;
}

/** @deprecated Migrated to JournalThreadComment */
export interface JournalCommentReplyInput {
  reply: string;
}

/** @deprecated Migrated to JournalThreadComment */
export interface JournalCommentReply extends JournalCommentReplyInput {
  id: string;
  commentId: string;
  clubId: string;
  activityId: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface JournalThreadCommentInput {
  body: string;
  rating?: number;
  parentId?: string;
}

export interface JournalThreadComment {
  id: string;
  clubId: string;
  activityId: string;
  parentId: string | null;
  userId: string;
  userName: string;
  body: string;
  rating?: number;
  createdAt: string;
}

export type UserRole = 'student' | 'founder';

export interface ClubRatingScores {
  activities: number;
  community: number;
  organization: number;
  leadership: number;
}

export interface ClubRatingInput {
  dimensions: ClubRatingScores;
  overall: number;
  comment: string;
}

export interface ClubRatingRecord extends ClubRatingInput {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string;
}
