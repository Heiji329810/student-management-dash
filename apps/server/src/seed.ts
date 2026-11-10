import { db, pool } from "./db.js";
import { loadUsers, lock } from "./store.js";
import { initializeOrganizations } from "./accounts.js";
try {
  await db.transaction(async (tx) => {
    await lock(tx);
    const teacher = (await loadUsers(tx)).find((u) => u.role === "founder");
    if (!teacher) throw new Error("Provision a teacher account first");
    await initializeOrganizations(tx, teacher);
  });
  console.log("Required system organizations initialized.");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Initialization failed",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
