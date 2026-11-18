// Offline operator recovery. Never exposed as an HTTP route.
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db, pool } from "./db.js";
import { user, account, session } from "./schema.js";
import { lock } from "./store.js";
try {
  if (process.env.ACCOUNT_ADMIN_APPROVED !== "yes") throw new Error("Operator approval required");
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 4096) throw new Error("Input too large");
  }
  const data = z.object({ email: z.email().transform(v => v.toLowerCase()), password: z.string().min(12).max(128) }).strict().parse(JSON.parse(input));
  const password = await hashPassword(data.password);
  await db.transaction(async tx => {
    await lock(tx);
    const [target] = await tx.select().from(user).where(eq(user.email, data.email));
    if (!target) throw new Error("Unknown account");
    const updated = await tx.update(account).set({ password, updatedAt: new Date() })
      .where(and(eq(account.userId, target.id), eq(account.providerId, "credential"))).returning({ id: account.id });
    if (updated.length !== 1) throw new Error("Expected one credential account");
    await tx.delete(session).where(eq(session.userId, target.id));
  });
  console.log("Password replaced; existing sessions revoked.");
} catch {
  console.error("Recovery failed. Check operator approval, account identity and input.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
