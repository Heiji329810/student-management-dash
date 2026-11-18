import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { provisionInput } from "@student-dash/shared/contracts";
import { auth } from "./auth.js";
import { db } from "./db.js";
import { user, students } from "./schema.js";
import { lock, loadState, saveState, type Database } from "./store.js";
import type { User } from "@student-dash/shared/types";
export async function initializeOrganizations(tx: Database, teacher: User) {
  const state = await loadState(tx);
  for (const [id, name, description] of [
    [
      "system-official-events",
      "School Official Events",
      "School-wide events organized by teachers.",
    ],
    [
      "system-student-council",
      "Student Council",
      "Annual Student Council departments and membership.",
    ],
  ])
    if (!state.clubs.some((c) => c.name === name))
      state.clubs.push({
        id,
        name,
        description,
        category: "School Official Events",
        founderId: teacher.id,
        founderName: teacher.name,
        isSchoolOfficial: true,
        activities: [],
        members: [],
      });
  await saveState(tx, state);
}
export async function provisionAccount(input: unknown, approved = true) {
  const data = provisionInput.parse(input);
  data.email = data.email.trim().toLowerCase();
  let createdId: string | undefined;
  try {
    return await db.transaction(async (tx) => {
      await lock(tx);
      if (
        (await tx.select().from(user).where(eq(user.email, data.email))).length
      )
        throw new Error("Account already exists");
      if (
        data.studentId &&
        (
          await tx
            .select()
            .from(students)
            .where(eq(students.studentId, data.studentId))
        ).length
      )
        throw new Error("Student ID already exists");
      // Better Auth owns credential hashing and account creation on its connection.
      // Compensating cleanup below handles failure of the domain transaction.
      const result = await auth.api.signUpEmail({
        body: { email: data.email, password: data.password, name: data.name },
      });
      createdId = result.user.id;
      await tx
        .update(user)
        .set({ role: data.role, studentId: data.studentId ?? null, approved })
        .where(eq(user.id, createdId));
      if (data.role === "student" && approved)
        await tx
          .insert(students)
          .values({
            id: randomUUID(),
            name: data.name,
            email: data.email,
            studentId: data.studentId!,
          });
      if (data.role === "founder")
        await initializeOrganizations(tx, {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: "founder",
        });
      return { id: createdId };
    });
  } catch (error) {
    // Delete only the newly created account, never an existing conflicting identity.
    if (createdId) await db.delete(user).where(eq(user.id, createdId));
    throw error;
  }
}
