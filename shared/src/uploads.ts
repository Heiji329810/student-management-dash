import { z } from "zod";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_STUDENT_UPLOAD_BYTES = 100 * 1024 * 1024;
export const RECALL_WINDOW_MS = 10 * 60 * 1000;
export const UPLOAD_ACCEPT = ".xlsx,.csv,.pdf,.docx,.png,.jpg,.jpeg,.webp,.txt";
export const filePreviewSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("spreadsheet"),
    sheets: z.array(
      z.object({
        name: z.string(),
        rows: z.array(z.array(z.string())),
        truncated: z.boolean(),
      }),
    ),
    truncated: z.boolean(),
  }),
  z.object({
    kind: z.literal("text"),
    text: z.string(),
    truncated: z.boolean(),
  }),
  z.object({ kind: z.literal("pdf") }),
  z.object({ kind: z.literal("image") }),
]);
export type FilePreview = z.infer<typeof filePreviewSchema>;
export const uploadVersionSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  name: z.string(),
  mime: z.string(),
  size: z.number().int(),
  createdAt: z.string(),
});
export const uploadSummarySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  applicationId: z.string(),
  ownerName: z.string(),
  studentId: z.string().nullable(),
  recalled: z.boolean(),
  currentVersion: z.number().int(),
  name: z.string(),
  size: z.number().int(),
  updatedAt: z.string(),
  recallUntil: z.string(),
});
export const uploadListSchema = z.object({
  items: z.array(uploadSummarySchema),
  nextOffset: z.number().nullable(),
});
export const uploadDetailSchema = z.object({
  upload: uploadSummarySchema,
  versions: z.array(uploadVersionSchema),
  comments: z.array(
    z.object({
      id: z.string(),
      versionId: z.string(),
      teacherName: z.string(),
      body: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export type UploadSummary = z.infer<typeof uploadSummarySchema>;
export type UploadDetail = z.infer<typeof uploadDetailSchema>;
export const uploadInputSchema = z
  .object({
    expectedUserId: z.string().min(1),
    name: z
      .string()
      .trim()
      .min(1)
      .max(180)
      .refine(
        (value) => !/[\x00-\x1f\x7f/\\:]/.test(value),
        "Invalid filename",
      ),
    base64: z
      .string()
      .min(4)
      .max(Math.ceil(MAX_UPLOAD_BYTES / 3) * 4),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();
