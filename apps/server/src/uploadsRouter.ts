import { Router } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import {
  uploadInputSchema,
  RECALL_WINDOW_MS,
  MAX_STUDENT_UPLOAD_BYTES,
  uploadListSchema,
  uploadDetailSchema,
} from "@student-dash/shared/uploads";
import type { User } from "@student-dash/shared/types";
import { db } from "./db.js";
import {
  studentUploads as uploads,
  uploadVersions as versions,
  uploadComments as comments,
  user,
  notifications,
  clubApplications,
} from "./schema.js";
import { lock, type Database } from "./store.js";
import { HttpError } from "./errors.js";
import { isAccountReadOnly, READ_ONLY_MESSAGE } from "./accountAccess.js";
import { prepareFile } from "./filePreview.js";
export const uploadsRouter = Router({ mergeParams: true });
uploadsRouter.use(async (req, res, next) => {
  const [application] = await db.select().from(clubApplications).where(eq(clubApplications.id, String(req.params.applicationId)));
  if (!application || (res.locals.user.role !== "founder" && application.data.applicantUserId !== res.locals.user.id)) throw new HttpError(404, "Application not found.");
  res.locals.applicationId = application.id;
  next();
});
uploadsRouter.param("id", async (req, _res, next, id) => {
  const [upload] = await db.select({ id: uploads.id }).from(uploads).where(and(eq(uploads.id, id), eq(uploads.applicationId, String(req.params.applicationId))));
  if (!upload) return next(new HttpError(404, "File submission not found in this application."));
  next();
});
const identity = z.object({ expectedUserId: z.string().min(1) });
const meta = {
  id: versions.id,
  version: versions.version,
  name: versions.name,
  mime: versions.mime,
  size: versions.size,
  createdAt: versions.createdAt,
};
const summary = {
  id: uploads.id,
  ownerId: uploads.ownerId,
  applicationId: uploads.applicationId,
  ownerName: user.name,
  studentId: user.studentId,
  recalled: uploads.recalled,
  currentVersion: uploads.currentVersion,
  name: versions.name,
  size: versions.size,
  updatedAt: uploads.updatedAt,
};
function serialize(row: { updatedAt: Date; [key: string]: unknown }) {
  return {
    ...row,
    updatedAt: row.updatedAt.toISOString(),
    recallUntil: new Date(
      row.updatedAt.getTime() + RECALL_WINDOW_MS,
    ).toISOString(),
  };
}
async function getUpload(connection: Database, id: string, actor: User) {
  const [upload] = await connection
    .select()
    .from(uploads)
    .where(eq(uploads.id, id));
  if (
    !upload ||
    (upload.ownerId !== actor.id &&
      (actor.role !== "founder" || upload.recalled))
  )
    throw new HttpError(404, "File submission not found.");
  return upload;
}
async function assertWriter(
  connection: Database,
  actor: User,
  expectedUserId: string,
  role: "student" | "founder",
) {
  if (actor.id !== expectedUserId)
    throw new HttpError(409, "Your session changed. Reload before saving.");
  const [record] = await connection
    .select()
    .from(user)
    .where(eq(user.id, actor.id))
    .for("update");
  if (!record?.approved || record.role !== role)
    throw new HttpError(
      403,
      role === "student"
        ? "Student access required."
        : "Teacher access required.",
    );
  if (isAccountReadOnly(record.createdAt))
    throw new HttpError(403, READ_ONLY_MESSAGE);
  return record;
}
uploadsRouter.get("/", async (req, res) => {
  const actor = res.locals.user as User;
  const offset = z.coerce
    .number()
    .int()
    .min(0)
    .max(100000)
    .parse(req.query.offset ?? 0);
  const rows = await db
    .select(summary)
    .from(uploads)
    .innerJoin(user, eq(user.id, uploads.ownerId))
    .innerJoin(
      versions,
      and(
        eq(versions.uploadId, uploads.id),
        eq(versions.version, uploads.currentVersion),
      ),
    )
    .where(
      and(eq(uploads.applicationId, String(res.locals.applicationId)), actor.role === "founder"
        ? eq(uploads.recalled, false)
        : eq(uploads.ownerId, actor.id)),
    )
    .orderBy(desc(uploads.updatedAt), desc(uploads.id))
    .limit(51)
    .offset(offset);
  res.json(
    uploadListSchema.parse({
      items: rows.slice(0, 50).map(serialize),
      nextOffset: rows.length > 50 ? offset + 50 : null,
    }),
  );
});
const uploadRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
async function saveUpload(
  req: import("express").Request,
  res: import("express").Response,
) {
  const actor = res.locals.user as User;
  if (actor.role !== "student")
    throw new HttpError(403, "Only students can upload files.");
  const input = uploadInputSchema.parse(req.body);
  if (input.expectedUserId !== actor.id)
    throw new HttpError(409, "Your session changed. Reload before uploading.");
  const prepared = await prepareFile(input.name, input.base64);
  const id = await db.transaction(async (tx) => {
    await lock(tx);
    await assertWriter(tx, actor, input.expectedUserId, "student");
    const [usage] = await tx
      .select({ total: sql<number>`coalesce(sum(${versions.size}),0)::int` })
      .from(versions)
      .innerJoin(uploads, eq(uploads.id, versions.uploadId))
      .where(eq(uploads.ownerId, actor.id));
    if (usage.total + prepared.size > MAX_STUDENT_UPLOAD_BYTES)
      throw new HttpError(
        409,
        "Your 100 MB file storage limit has been reached, including previous versions.",
      );
    const now = new Date();
    let uploadId: string;
    let version = 1;
    if (req.params.id) {
      const existing = await getUpload(tx, String(req.params.id), actor);
      if (existing.ownerId !== actor.id)
        throw new HttpError(
          403,
          "Only the student who uploaded this file can replace it.",
        );
      if (input.expectedVersion !== existing.currentVersion)
        throw new HttpError(
          409,
          "This file changed. Refresh before replacing it.",
        );
      if (existing.currentVersion >= 10)
        throw new HttpError(
          409,
          "This submission has reached its 10-version limit.",
        );
      version = existing.currentVersion + 1;
      uploadId = existing.id;
      await tx
        .update(uploads)
        .set({ currentVersion: version, recalled: false, updatedAt: now })
        .where(eq(uploads.id, uploadId));
    } else {
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(uploads)
        .where(eq(uploads.ownerId, actor.id));
      if (count >= 20)
        throw new HttpError(409, "You can keep up to 20 file submissions.");
      uploadId = randomUUID();
      await tx
        .insert(uploads)
        .values({
          id: uploadId,
          ownerId: actor.id,
          applicationId: String(req.params.applicationId),
          createdAt: now,
          updatedAt: now,
        });
    }
    await tx
      .insert(versions)
      .values({
        id: randomUUID(),
        uploadId,
        version,
        name: input.name,
        base64: input.base64,
        ...prepared,
        createdAt: now,
      });
    return uploadId;
  });
  res.status(201).json({ id });
}

uploadsRouter.post("/:id/versions", uploadRateLimit, saveUpload);
uploadsRouter.post("/:id/recall", async (req, res) => {
  const input = identity
    .extend({ expectedVersion: z.number().int().positive() })
    .strict()
    .parse(req.body);
  const actor = res.locals.user as User;
  await db.transaction(async (tx) => {
    await lock(tx);
    await assertWriter(tx, actor, input.expectedUserId, "student");
    const upload = await getUpload(tx, String(req.params.id), actor);
    if (upload.ownerId !== actor.id)
      throw new HttpError(403, "Only the uploader can recall this submission.");
    if (upload.recalled || input.expectedVersion !== upload.currentVersion)
      throw new HttpError(
        409,
        "This submission changed. Refresh the file list.",
      );
    if (Date.now() >= upload.updatedAt.getTime() + RECALL_WINDOW_MS)
      throw new HttpError(
        409,
        "The 10-minute recall window has ended. You can still upload a replacement.",
      );
    await tx
      .update(uploads)
      .set({ recalled: true })
      .where(eq(uploads.id, upload.id));
  });
  res.json({ recalled: true });
});
uploadsRouter.get("/:id", async (req, res) => {
  const actor = res.locals.user as User;
  const result = await db.transaction(
    async (tx) => {
      const upload = await getUpload(tx, String(req.params.id), actor);
      const [row] = await tx
        .select(summary)
        .from(uploads)
        .innerJoin(user, eq(user.id, uploads.ownerId))
        .innerJoin(
          versions,
          and(
            eq(versions.uploadId, uploads.id),
            eq(versions.version, uploads.currentVersion),
          ),
        )
        .where(eq(uploads.id, upload.id));
      const allVersions = await tx
        .select(meta)
        .from(versions)
        .where(eq(versions.uploadId, upload.id))
        .orderBy(desc(versions.version));
      const feedback = allVersions.length
        ? await tx
            .select({
              id: comments.id,
              versionId: comments.versionId,
              teacherName: comments.teacherName,
              body: comments.body,
              createdAt: comments.createdAt,
            })
            .from(comments)
            .where(
              inArray(
                comments.versionId,
                allVersions.map((v) => v.id),
              ),
            )
            .orderBy(comments.createdAt, comments.id)
        : [];
      return {
        upload: serialize(row),
        versions: allVersions.map((v) => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
        })),
        comments: feedback.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        })),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
  res.json(uploadDetailSchema.parse(result));
});
uploadsRouter.get("/:id/versions/:versionId/:action", async (req, res) => {
  const actor = res.locals.user as User;
  if (!["content", "preview"].includes(String(req.params.action)))
    throw new HttpError(404, "File not found.");
  const file = await db.transaction(
    async (tx) => {
      const upload = await getUpload(tx, String(req.params.id), actor);
      const [file] = await tx
        .select()
        .from(versions)
        .where(
          and(
            eq(versions.id, String(req.params.versionId)),
            eq(versions.uploadId, upload.id),
          ),
        );
      if (!file) throw new HttpError(404, "File version not found.");
      return file;
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
  if (req.params.action === "preview") return res.json(file.preview);
  const inline = req.query.inline === "1" && file.mime.startsWith("image/");
  res.setHeader(
    "Content-Type",
    inline ? file.mime : "application/octet-stream",
  );
  res.setHeader(
    "Content-Disposition",
    `${inline ? "inline" : "attachment"}; filename="download.${file.name.split(".").pop()?.toLowerCase()}"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16))}`,
  );
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.send(Buffer.from(file.base64, "base64"));
});
uploadsRouter.post("/:id/comments", async (req, res) => {
  const input = identity
    .extend({
      versionId: z.string().min(1),
      body: z.string().trim().min(1).max(4000),
    })
    .strict()
    .parse(req.body);
  const actor = res.locals.user as User;
  await db.transaction(async (tx) => {
    await lock(tx);
    const teacher = await assertWriter(
      tx,
      actor,
      input.expectedUserId,
      "founder",
    );
    const upload = await getUpload(tx, String(req.params.id), actor);
    if (upload.recalled) throw new HttpError(404, "File submission not found.");
    const [version] = await tx
      .select({
        id: versions.id,
        name: versions.name,
        version: versions.version,
      })
      .from(versions)
      .where(
        and(eq(versions.id, input.versionId), eq(versions.uploadId, upload.id)),
      );
    if (!version) throw new HttpError(404, "File version not found.");
    const id = randomUUID(),
      now = new Date();
    await tx
      .insert(comments)
      .values({
        id,
        versionId: version.id,
        teacherId: teacher.id,
        teacherName: teacher.name,
        body: input.body,
        createdAt: now,
      });
    await tx
      .insert(notifications)
      .values({
        id: `file-feedback-${id}`,
        data: {
          id: `file-feedback-${id}`,
          recipientUserId: upload.ownerId,
          type: "file_feedback",
          title: "Teacher feedback on your file",
          message: `${teacher.name} commented on ${version.name} (version ${version.version}).`,
          createdAt: now.toISOString(),
          href: `/club-applications/${encodeURIComponent(upload.applicationId!)}?upload=${upload.id}#student-files`,
        },
      });
  });
  res.status(201).json({ ok: true });
});
