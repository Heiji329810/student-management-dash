import {
  stateResponseSchema,
  commandResponseSchema,
} from "@student-dash/shared/responses";
import express from "express";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { z, ZodError } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { commandEnvelope } from "@student-dash/shared/contracts";
import type { User } from "@student-dash/shared/types";
import { auth } from "./auth.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { HttpError } from "./errors.js";
import { loadState, saveState, loadUsers, lock } from "./store.js";
import { projectState } from "./projection.js";
import { executeCommand } from "./service.js";
import { randomUUID } from "node:crypto";
import { media, user, students } from "./schema.js";
import { provisionAccount } from "./accounts.js";
import { accountExpiresAt, isAccountReadOnly, READ_ONLY_MESSAGE } from "./accountAccess.js";
import { uploadsRouter } from "./uploadsRouter.js";
export const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (config.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  }
  next();
});
app.get("/api/health", async (_req, res) => {
  await db.execute(sql`select 1`);
  res.json({ ok: true });
});
app.use("/api", (req, _res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    if (
      !origin ||
      ![config.APP_ORIGIN, new URL(config.BETTER_AUTH_URL).origin].includes(
        origin,
      )
    )
      throw new HttpError(403, "Untrusted request origin");
    if (req.get("sec-fetch-site") === "cross-site")
      throw new HttpError(403, "Cross-site request rejected");
  }
  next();
});
app.all("/api/auth/{*splat}", (req, res, next) => {
  const allowed = new Map([
    ["/api/auth/get-session", ["GET"]],
    ["/api/auth/sign-in/email", ["POST"]],
    ["/api/auth/sign-out", ["POST"]],
    ["/api/auth/change-password", ["POST"]],
    ["/api/auth/list-sessions", ["GET"]],
    ["/api/auth/revoke-session", ["POST"]],
    ["/api/auth/revoke-sessions", ["POST"]],
    ["/api/auth/revoke-other-sessions", ["POST"]],
  ]);
  if (!allowed.get(req.path)?.includes(req.method))
    return next(new HttpError(403, "This account operation is not available"));
  return toNodeHandler(auth)(req, res);
});
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
const signupInput = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  studentId: z.string().trim().min(1).max(200),
  password: z.string().min(12).max(128),
}).strict();
app.post("/api/signup", rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }), express.json({ limit: "8kb" }), async (req, res) => {
  const input = signupInput.parse(req.body);
  try {
    await provisionAccount({ ...input, role: "student" }, false);
  } catch {
    throw new HttpError(409, "Unable to create account. Your email or student ID may already be registered. Try signing in or contact the school.");
  }
  res.status(201).json({ status: "pending" });
});
app.use(express.json({ limit: "32mb" }));
app.use("/api", async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) throw new HttpError(401, "Please sign in");
  const [record] = await db.select({ approved: user.approved, createdAt: user.createdAt, role: user.role, name: user.name, email: user.email, studentId: user.studentId }).from(user).where(eq(user.id, session.user.id));
  if (!record?.approved) throw new HttpError(403, "Your account is awaiting approval. You can access the dashboard once the school approves your account.");
  const readOnly = isAccountReadOnly(record.createdAt);
  if (readOnly && !["GET", "HEAD", "OPTIONS"].includes(req.method)) throw new HttpError(403, READ_ONLY_MESSAGE);
  const role = record.role;
  if (role !== "student" && role !== "founder")
    throw new HttpError(403, "Unknown account role");
  res.locals.user = {
    id: session.user.id,
    name: record.name,
    email: record.email,
    role,
    studentId: record.studentId ?? undefined,
    readOnly,
    expiresAt: accountExpiresAt(record.createdAt).toISOString(),
  } satisfies User;
  next();
});
app.use("/api/club-applications/:applicationId/uploads", uploadsRouter);
app.get("/api/account-requests", async (_req, res) => {
  if (res.locals.user.role !== "founder") throw new HttpError(403, "Teacher access required");
  const requests = await db.select({ id: user.id, name: user.name, email: user.email, studentId: user.studentId, createdAt: user.createdAt })
    .from(user).where(and(eq(user.approved, false), eq(user.role, "student"))).orderBy(user.createdAt);
  res.json({ requests });
});
app.post("/api/account-requests/:id/approve", async (req, res) => {
  if (res.locals.user.role !== "founder") throw new HttpError(403, "Teacher access required");
  const { expectedUserId } = z.object({ expectedUserId: z.string().min(1) }).strict().parse(req.body);
  if (expectedUserId !== res.locals.user.id) throw new HttpError(409, "Your session changed. Reload before approving.");
  await db.transaction(async tx => {
    await lock(tx);
    const [teacher] = await tx.select().from(user).where(eq(user.id, expectedUserId)).for("update");
    if (!teacher?.approved || teacher.role !== "founder") throw new HttpError(403, "Teacher access required");
    if (isAccountReadOnly(teacher.createdAt)) throw new HttpError(403, READ_ONLY_MESSAGE);
    const approved = await tx.update(user).set({ approved: true, updatedAt: new Date() })
      .where(and(eq(user.id, req.params.id), eq(user.approved, false), eq(user.role, "student"))).returning({ id: user.id, name: user.name, email: user.email, studentId: user.studentId });
    if (!approved.length) throw new HttpError(409, "This request has already been reviewed or is no longer available. Refresh the list.");
    const target = approved[0];
    if (!target.studentId) throw new HttpError(409, "Student ID is missing.");
    await tx.insert(students).values({ id: randomUUID(), name: target.name, email: target.email, studentId: target.studentId });
  });
  res.json({ approved: true });
});
app.get("/api/state", async (_req, res) => {
  const state = await db.transaction((tx) => loadState(tx), {
    isolationLevel: "repeatable read",
    accessMode: "read only",
  });
  res.json(
    stateResponseSchema.parse({
      state: projectState(state, res.locals.user),
      user: res.locals.user,
    }),
  );
});
app.post("/api/commands", async (req, res) => {
  const { command, args, expectedUserId } = commandEnvelope.parse(req.body);
  if (expectedUserId !== res.locals.user.id) throw new HttpError(409, "Your session changed. Reload before saving.");
  const result = await db.transaction(async (tx) => {
    await lock(tx);
    const [actor] = await tx.select({ id: user.id, name: user.name, email: user.email, role: user.role, studentId: user.studentId, createdAt: user.createdAt, approved: user.approved }).from(user).where(eq(user.id, res.locals.user.id)).for("update");
    if (!actor?.approved) throw new HttpError(403, "Account access is not approved.");
    if (isAccountReadOnly(actor.createdAt)) throw new HttpError(403, READ_ONLY_MESSAGE);
    if (actor.role !== res.locals.user.role || actor.studentId !== (res.locals.user.studentId ?? null)) throw new HttpError(409, "Your account permissions changed. Reload before saving.");
    const state = await loadState(tx);
    const result = await executeCommand(
      tx,
      state,
      res.locals.user,
      await loadUsers(tx),
      command,
      args,
    );
    const response = commandResponseSchema.parse({ result, state: projectState(state, res.locals.user) });
    await saveState(tx, state);
    return response;
  });
  res.json(commandResponseSchema.parse(result));
});
app.get("/api/media/:id", async (req, res) => {
  const [photo] = await db
    .select()
    .from(media)
    .where(eq(media.id, req.params.id));
  if (!photo) throw new HttpError(404, "Photo not found");
  const journal = await db.execute(
    sql`select j.id from activity_journals j join activities a on a.id = j.data->>'activityId' where j.data->'photos' ? ${`/api/media/${photo.id}`} and coalesce((a.data->>'cancelled')::boolean, false) = false limit 1`,
  );
  if (!journal.rows.length) throw new HttpError(404, "Photo not published");
  res.type(photo.mime).send(Buffer.from(photo.base64, "base64"));
});
app.use("/api", (_req, _res, next) =>
  next(new HttpError(404, "Route not found")),
);
const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (existsSync(path.join(webDist, "index.html"))) {
  app.use(express.static(webDist));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(webDist, "index.html")),
  );
}
app.use((_req, _res, next) => next(new HttpError(404, "Route not found")));
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof ZodError)
      return res
        .status(422)
        .json({
          error: { message: "Validation failed", issues: error.issues },
        });
    if (error instanceof HttpError)
      return res
        .status(error.status)
        .json({ error: { message: error.message } });
    const status = (error as { status?: number }).status;
    if (status === 413 || status === 400)
      return res
        .status(status)
        .json({
          error: {
            message: status === 413 ? "Request too large" : "Malformed JSON",
          },
        });
    console.error(
      "API request failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    return res
      .status(500)
      .json({ error: { message: "Internal server error" } });
  },
);
