import { z } from "zod";
const id = z.string().trim().min(1).max(200);
const text = z.string().trim().min(1).max(1000);
const ids = z
  .array(id)
  .max(1000)
  .refine((a) => new Set(a).size === a.length, "Duplicate IDs");
const date = z.iso.date();
const dateTime = z.string().refine(value => {
  const format = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/;
  return format.test(value) && z.iso.date().safeParse(value.slice(0, 10)).success && Number.isFinite(Date.parse(value));
}, 'Invalid calendar date and time');
const optionalUrl = z
  .union([
    z.literal(""),
    z
      .url()
      .refine(
        (v) => ["http:", "https:"].includes(new URL(v).protocol),
        "Use HTTP(S)",
      ),
  ])
  .optional();
const image = z
  .string()
  .max(4_000_000)
  .refine(
    (v) =>
      /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ||
      /^\/api\/media\/[a-f0-9-]+$/.test(v),
    "Use a supported image",
  );
export const activityInput = z
  .object({
    title: text,
    description: z
      .string()
      .trim()
      .min(1)
      .max(30000)
      .refine((v) => v.split(/\s+/).length <= 100, "Maximum 100 words"),
    startDateTime: dateTime,
    durationType: z.enum(["one-day", "long-term"]),
    endDate: z.string().optional(),
    location: z.string().max(1000),
    locationUndetermined: z.boolean(),
    estimatedParticipants: z.number().int().positive().max(100000).optional(),
    allStudentsOnCampus: z.boolean(),
  })
  .strict()
  .refine(
    (v) => v.locationUndetermined || !!v.location.trim(),
    "Location required",
  )
  .refine(
    (v) => v.allStudentsOnCampus || !!v.estimatedParticipants,
    "Capacity required",
  )
  .refine(
    (v) =>
      v.durationType !== "long-term" ||
      (!!v.endDate &&
        (date.safeParse(v.endDate).success || dateTime.safeParse(v.endDate).success) &&
        Date.parse(v.endDate) >= Date.parse(v.startDateTime)),
    "Valid end date required",
  );
const clubInput = z
  .object({
    founderNames: z.array(text).min(1).max(5),
    name: text,
    category: z
      .string()
      .refine(
        (v) =>
          [
            "Science",
            "Computer Science",
            "Academic/Competitions",
            "Art and Design",
            "Social Care/Volunteer",
          ].includes(v),
        "Invalid category",
      ),
    description: z
      .string()
      .trim()
      .min(1)
      .max(30000)
      .refine((v) => v.split(/\s+/).length <= 100, "Maximum 100 words"),
    wantsSchoolOfficial: z.boolean(),
    managingTeacherName: z.string().max(200).optional(),
  })
  .strict()
  .refine(
    (v) => !v.wantsSchoolOfficial || !!v.managingTeacherName?.trim(),
    "Managing teacher required",
  );
const score = z.number().int().min(1).max(5);
const field = z
  .object({
    id,
    label: text,
    helpText: z.string().max(1000).optional(),
    type: z.enum([
      "short_text",
      "long_text",
      "choice",
      "video_upload",
      "file_upload",
    ]),
    required: z.boolean(),
    options: z.array(text).max(100).optional(),
  })
  .strict();
const electionInput = z
  .object({
    activityId: id,
    title: text,
    electionType: text,
    standards: text,
    electionDate: date,
    applicationFields: z
      .array(field)
      .min(1)
      .max(50)
      .refine(
        (fields) => new Set(fields.map((f) => f.id)).size === fields.length,
        "Duplicate field IDs",
      ),
    scorerStudentIds: ids,
    externalScorerNames: z.array(text).max(100),
  })
  .strict();
export const commandSchemas = {
  registerForActivity: z.tuple([id, id]),
  unregisterFromActivity: z.tuple([id, id]),
  submitClubApplication: z.tuple([clubInput]),
  reviewClubApplication: z.tuple([
    id,
    z.enum(["approve", "reject"]),
    z.string().max(2000),
  ]),
  createClubElection: z.tuple([date, z.number().int().positive().max(100000)]),
  finalizeClubElection: z.tuple([id]),
  castClubElectionVote: z.tuple([id, id]),
  createOfficialEvent: z.tuple([activityInput]),
  createEventElection: z.tuple([electionInput]),
  submitEventElectionApplication: z.tuple([
    id,
    z.record(id, z.string().max(1000000)),
  ]),
  scoreEventElectionCandidate: z.tuple([
    id,
    id,
    z.number().min(0).max(100),
    z.string().max(2000),
  ]),
  submitExternalElectionScore: z.tuple([
    id,
    id,
    id,
    z.number().min(0).max(100),
    z.string().max(2000),
  ]),
  startStudentCouncilTerm: z.tuple([
    z.string().regex(/^\d{4}[–-]\d{4}$/),
    z
      .array(z.object({ name: text, memberStudentIds: ids }).strict())
      .min(1)
      .max(12),
  ]),
  assignStudentCouncilDepartmentMember: z.tuple([id, id]),
  removeStudentCouncilDepartmentMember: z.tuple([id, id]),
  sendEventElectionMessage: z.tuple([id, text]),
  publishEventElectionResults: z.tuple([id, text, ids]),
  setClubMemberAttendance: z.tuple([
    id,
    date,
    id,
    z.enum(["present", "absent", "leave"]),
  ]),
  joinClub: z.tuple([id]),
  leaveClub: z.tuple([id]),
  teacherAddOfficialClubMember: z.tuple([id, id]),
  teacherRemoveOfficialClubMember: z.tuple([id, id]),
  createActivity: z.tuple([id, activityInput]),
  updateActivity: z.tuple([id, id, activityInput]),
  cancelActivity: z.tuple([
    id,
    id,
    z.object({ reason: text.min(10) }).strict(),
  ]),
  saveClubRating: z.tuple([
    id,
    z
      .object({
        dimensions: z
          .object({
            activities: score,
            community: score,
            organization: score,
            leadership: score,
          })
          .strict(),
        overall: score,
        comment: z.string().max(500),
      })
      .strict(),
  ]),
  markNotificationRead: z.tuple([id]),
  saveActivityJournal: z.tuple([
    id,
    id,
    z
      .object({
        activityName: text,
        reflection: z
          .string()
          .trim()
          .min(1)
          .max(30000)
          .refine((v) => v.split(/\s+/).length <= 1000),
        participantIds: ids,
        socialMediaLink: optionalUrl,
        photos: z.array(image).max(8),
      })
      .strict(),
  ]),
  postJournalThreadComment: z.tuple([
    id,
    id,
    z
      .object({
        body: z.string().trim().min(1).max(500),
        rating: score.optional(),
        parentId: id.optional(),
      })
      .strict(),
  ]),
  deleteJournalThreadComment: z.tuple([id]),
  toggleJournalLike: z.tuple([id, id]),
} as const;
export type CommandName = keyof typeof commandSchemas;
export type CommandArgs<K extends CommandName> = z.input<
  (typeof commandSchemas)[K]
>;
export type CommandRequest = {
  [K in CommandName]: { expectedUserId: string; command: K; args: CommandArgs<K> };
}[CommandName];
export const commandEnvelope = z
  .object({
    expectedUserId: id,
    command: z.enum(
      Object.keys(commandSchemas) as [CommandName, ...CommandName[]],
    ),
    args: z.array(z.unknown()).max(10),
  })
  .strict();
export const loginInput = z
  .object({ email: z.email(), password: z.string().min(1).max(128) })
  .strict();
export const provisionInput = z
  .object({
    email: z.email(),
    password: z.string().min(12).max(128),
    name: text,
    role: z.enum(["student", "founder"]),
    studentId: id.optional(),
  })
  .strict()
  .refine((v) => v.role !== "student" || !!v.studentId, "Student ID required");
