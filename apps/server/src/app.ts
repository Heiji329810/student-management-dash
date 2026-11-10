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
import { ZodError } from "zod";
import { eq, sql } from "drizzle-orm";
import { commandEnvelope } from "@student-dash/shared/contracts";
import type { User } from "@student-dash/shared/types";
import { auth } from "./auth.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { HttpError } from "./errors.js";
import { loadState, saveState, loadUsers, lock } from "./store.js";
import { projectState } from "./projection.js";
import { executeCommand } from "./service.js";
import { media } from "./schema.js";
export const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
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
  if (
    req.path.startsWith("/api/auth/sign-up") ||
    req.path.startsWith("/api/auth/update-user") ||
    req.path.startsWith("/api/auth/delete-user")
  )
    return next(new HttpError(403, "Account provisioning is managed locally"));
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
app.use(express.json({ limit: "32mb" }));
app.use("/api", async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) throw new HttpError(401, "Please sign in");
  const role = session.user.role;
  if (role !== "student" && role !== "founder")
    throw new HttpError(403, "Unknown account role");
  res.locals.user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role,
    studentId: session.user.studentId ?? undefined,
  } satisfies User;
  next();
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
