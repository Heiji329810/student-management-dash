// Runtime response contracts mirror the existing frontend entities.
import { z } from "zod";
export const userRoleSchema = z.union([
  z.literal("student"),
  z.literal("founder"),
]);
export const electionPublishedResultSchema = z
  .object({
    applicationId: z.string(),
    applicantName: z.string(),
    averageScore: z.union([z.number(), z.null()]),
    totalScore: z.number(),
    selected: z.boolean(),
  })
  .strict();
export const studentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    studentId: z.string(),
  })
  .strict();
export const activitySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    date: z.string(),
    location: z.string(),
    maxParticipants: z.number().optional(),
    registeredStudents: z.array(z.string()),
    clubId: z.string(),
    durationType: z
      .union([z.literal("one-day"), z.literal("long-term")])
      .optional(),
    endDate: z.string().optional(),
    locationUndetermined: z.boolean().optional(),
    allStudentsOnCampus: z.boolean().optional(),
    cancelled: z.boolean().optional(),
    cancellationReason: z.string().optional(),
    cancelledAt: z.string().optional(),
    linkedElectionId: z.string().optional(),
  })
  .strict();
export const clubSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    founderId: z.string(),
    founderName: z.string(),
    founderNames: z.array(z.string()).optional(),
    activities: z.array(activitySchema),
    members: z.array(z.string()),
    isSchoolOfficial: z.boolean().optional(),
    sourceApplicationId: z.string().optional(),
  })
  .strict();
export const attendanceStatusSchema = z.union([
  z.literal("present"),
  z.literal("absent"),
  z.literal("leave"),
]);
export const clubAttendanceEntrySchema = z
  .object({
    clubId: z.string(),
    weekStart: z.string(),
    studentId: z.string(),
    status: attendanceStatusSchema,
    updatedAt: z.string(),
  })
  .strict();
export const createClubInputSchema = z
  .object({
    founderNames: z.array(z.string()),
    name: z.string(),
    category: z.string(),
    description: z.string(),
    wantsSchoolOfficial: z.boolean(),
    managingTeacherName: z.string().optional(),
  })
  .strict();
export const clubApplicationStatusSchema = z.union([
  z.literal("pending"),
  z.literal("rejected"),
  z.literal("approved_ordinary"),
  z.literal("approved_official_candidate"),
  z.literal("established_official"),
  z.literal("established_ordinary"),
]);
export const clubApplicationSchema = z
  .object({
    ...createClubInputSchema.shape,
    id: z.string(),
    applicantUserId: z.string(),
    applicantStudentId: z.string(),
    applicantName: z.string(),
    applicantEmail: z.string(),
    status: clubApplicationStatusSchema,
    submittedAt: z.string(),
    reviewedAt: z.string().optional(),
    reviewedByUserId: z.string().optional(),
    reviewedByName: z.string().optional(),
    teacherComment: z.string().optional(),
    electionId: z.string().optional(),
    resultingClubId: z.string().optional(),
  })
  .strict();
export const clubApplicationDecisionSchema = z.union([
  z.literal("approve"),
  z.literal("reject"),
]);
export const clubElectionStatusSchema = z.union([
  z.literal("scheduled"),
  z.literal("ended"),
]);
export const clubElectionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    electionDate: z.string(),
    minimumRequiredVotes: z.number(),
    candidateApplicationIds: z.array(z.string()),
    status: clubElectionStatusSchema,
    createdByUserId: z.string(),
    createdAt: z.string(),
    endedAt: z.string().optional(),
    officialEventActivityId: z.string().optional(),
  })
  .strict();
export const clubElectionVoteSchema = z
  .object({
    id: z.string(),
    electionId: z.string(),
    applicationId: z.string(),
    studentUserId: z.string(),
    studentId: z.string(),
    createdAt: z.string(),
  })
  .strict();
export const electionApplicationFieldTypeSchema = z.union([
  z.literal("short_text"),
  z.literal("long_text"),
  z.literal("choice"),
  z.literal("video_upload"),
  z.literal("file_upload"),
]);
export const electionApplicationFieldSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    helpText: z.string().optional(),
    type: electionApplicationFieldTypeSchema,
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })
  .strict();
export const eventElectionStatusSchema = z.union([
  z.literal("published"),
  z.literal("results_published"),
]);
export const eventElectionSchema = z
  .object({
    id: z.string(),
    activityId: z.string(),
    officialClubId: z.string(),
    councilDepartmentId: z.string().optional(),
    title: z.string(),
    electionType: z.string(),
    standards: z.string(),
    electionDate: z.string(),
    applicationFields: z.array(electionApplicationFieldSchema),
    status: eventElectionStatusSchema,
    createdByUserId: z.string(),
    createdAt: z.string(),
    resultSummary: z.string().optional(),
    resultsPublishedAt: z.string().optional(),
    publishedResults: z.array(electionPublishedResultSchema).optional(),
  })
  .strict();
export const eventElectionApplicationSchema = z
  .object({
    id: z.string(),
    electionId: z.string(),
    applicantUserId: z.string(),
    applicantStudentId: z.string(),
    applicantName: z.string(),
    answers: z.record(z.string(), z.string()),
    submittedAt: z.string(),
  })
  .strict();
export const electionScorerInviteSchema = z
  .object({
    id: z.string(),
    electionId: z.string(),
    scorerStudentId: z.string(),
    scorerUserId: z.string(),
    scorerName: z.string().optional(),
    invitedAt: z.string(),
  })
  .strict();
export const electionCandidateScoreSchema = z
  .object({
    id: z.string(),
    electionId: z.string(),
    applicationId: z.string(),
    scorerStudentId: z.string(),
    score: z.number(),
    note: z.string().optional(),
    updatedAt: z.string(),
  })
  .strict();
export const electionApplicantMessageSchema = z
  .object({
    id: z.string(),
    electionId: z.string(),
    message: z.string(),
    sentAt: z.string(),
    sentByUserId: z.string(),
  })
  .strict();
export const createEventElectionInputSchema = z
  .object({
    activityId: z.string(),
    title: z.string(),
    electionType: z.string(),
    standards: z.string(),
    electionDate: z.string(),
    applicationFields: z.array(electionApplicationFieldSchema),
    scorerStudentIds: z.array(z.string()),
    externalScorerNames: z.array(z.string()),
  })
  .strict();
export const studentCouncilDepartmentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    memberStudentIds: z.array(z.string()),
    electionId: z.string().optional(),
  })
  .strict();
export const studentCouncilTermSchema = z
  .object({
    id: z.string(),
    schoolYear: z.string(),
    status: z.union([z.literal("active"), z.literal("archived")]),
    departments: z.array(studentCouncilDepartmentSchema),
    createdAt: z.string(),
    archivedAt: z.string().optional(),
  })
  .strict();
export const createActivityInputSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    startDateTime: z.string(),
    durationType: z.union([z.literal("one-day"), z.literal("long-term")]),
    endDate: z.string().optional(),
    location: z.string(),
    locationUndetermined: z.boolean(),
    estimatedParticipants: z.number().optional(),
    allStudentsOnCampus: z.boolean(),
  })
  .strict();
export const cancelActivityInputSchema = z
  .object({ reason: z.string() })
  .strict();
export const activityRemovalNoticeSchema = z
  .object({
    id: z.string(),
    studentId: z.string(),
    activityTitle: z.string(),
    clubName: z.string(),
    clubId: z.string(),
    activityDate: z.string(),
    message: z.string(),
    removedAt: z.string(),
  })
  .strict();
export const notificationTypeSchema = z.union([
  z.literal("comment_reply"),
  z.literal("event_registration"),
  z.literal("club_join"),
  z.literal("journal_like"),
  z.literal("new_activity"),
  z.literal("activity_cancelled"),
  z.literal("club_application_result"),
  z.literal("club_election_scheduled"),
  z.literal("club_election_result"),
  z.literal("event_election_date"),
  z.literal("event_election_scorer_invite"),
  z.literal("event_election_message"),
  z.literal("event_election_result"),
]);
export const notificationRecordSchema = z
  .object({
    id: z.string(),
    recipientUserId: z.string(),
    type: notificationTypeSchema,
    title: z.string(),
    message: z.string(),
    createdAt: z.string(),
    href: z.string().optional(),
    activityTitle: z.string().optional(),
    clubName: z.string().optional(),
    cancellationMessage: z.string().optional(),
  })
  .strict();
export const activityJournalInputSchema = z
  .object({
    activityName: z.string(),
    reflection: z.string(),
    participantIds: z.array(z.string()),
    socialMediaLink: z.string().optional(),
    photos: z.array(z.string()),
  })
  .strict();
export const activityJournalLegacySchema = z
  .object({ participants: z.string().optional() })
  .strict();
export const activityJournalSchema = z
  .object({
    ...activityJournalInputSchema.shape,
    ...activityJournalLegacySchema.shape,
    id: z.string(),
    clubId: z.string(),
    activityId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
export const journalCommentInputSchema = z
  .object({ rating: z.number(), comment: z.string() })
  .strict();
export const journalCommentSchema = z
  .object({
    ...journalCommentInputSchema.shape,
    id: z.string(),
    clubId: z.string(),
    activityId: z.string(),
    userId: z.string(),
    userName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
export const journalLikeSchema = z
  .object({
    id: z.string(),
    clubId: z.string(),
    activityId: z.string(),
    userId: z.string(),
    userName: z.string(),
    createdAt: z.string(),
  })
  .strict();
export const journalCommentReplyInputSchema = z
  .object({ reply: z.string() })
  .strict();
export const journalCommentReplySchema = z
  .object({
    ...journalCommentReplyInputSchema.shape,
    id: z.string(),
    commentId: z.string(),
    clubId: z.string(),
    activityId: z.string(),
    userId: z.string(),
    userName: z.string(),
    createdAt: z.string(),
  })
  .strict();
export const journalThreadCommentInputSchema = z
  .object({
    body: z.string(),
    rating: z.number().optional(),
    parentId: z.string().optional(),
  })
  .strict();
export const journalThreadCommentSchema = z
  .object({
    id: z.string(),
    clubId: z.string(),
    activityId: z.string(),
    parentId: z.union([z.string(), z.null()]),
    userId: z.string(),
    userName: z.string(),
    body: z.string(),
    rating: z.number().optional(),
    createdAt: z.string(),
  })
  .strict();
export const clubRatingScoresSchema = z
  .object({
    activities: z.number(),
    community: z.number(),
    organization: z.number(),
    leadership: z.number(),
  })
  .strict();
export const clubRatingInputSchema = z
  .object({
    dimensions: clubRatingScoresSchema,
    overall: z.number(),
    comment: z.string(),
  })
  .strict();
export const clubRatingRecordSchema = z
  .object({
    ...clubRatingInputSchema.shape,
    id: z.string(),
    clubId: z.string(),
    userId: z.string(),
    userName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
export const userSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: userRoleSchema,
    studentId: z.string().optional(),
  })
  .strict();
export const appStateSchema = z
  .object({
    clubs: z.array(clubSchema),
    clubApplications: z.array(clubApplicationSchema),
    clubElections: z.array(clubElectionSchema),
    clubElectionVotes: z.array(clubElectionVoteSchema),
    eventElections: z.array(eventElectionSchema),
    eventElectionApplications: z.array(eventElectionApplicationSchema),
    electionScorerInvites: z.array(electionScorerInviteSchema),
    electionCandidateScores: z.array(electionCandidateScoreSchema),
    electionApplicantMessages: z.array(electionApplicantMessageSchema),
    studentCouncilTerms: z.array(studentCouncilTermSchema),
    students: z.array(studentSchema),
    removalNotices: z.array(activityRemovalNoticeSchema),
    activityJournals: z.array(activityJournalSchema),
    journalThreadComments: z.array(journalThreadCommentSchema),
    journalLikes: z.array(journalLikeSchema),
    clubAttendance: z.array(clubAttendanceEntrySchema),
    clubRatings: z.array(clubRatingRecordSchema),
    notifications: z.array(notificationRecordSchema),
    readNotificationIds: z.record(z.string(), z.array(z.string())),
  })
  .strict();
export const stateResponseSchema = z
  .object({ state: appStateSchema, user: userSchema })
  .strict();
export const commandResponseSchema = z
  .object({ state: appStateSchema, result: z.boolean() })
  .strict();
export const apiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    issues: z.array(z.unknown()).optional(),
  }),
});
