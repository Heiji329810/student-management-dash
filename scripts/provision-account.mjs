import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";
import { Writable } from "node:stream";
let hidden = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!hidden) process.stdout.write(chunk);
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
try {
  if (!process.stdin.isTTY) throw new Error("Interactive provisioning requires a terminal");
  const email = await rl.question("Email: ");
  const recovery = process.argv.includes("--recover");
  const name = recovery ? undefined : await rl.question("Name: ");
  const role = recovery ? undefined : await rl.question("Role (student/founder): ");
  const studentId =
    role === "student" ? await rl.question("Student ID: ") : undefined;
  process.stdout.write("Password (12+ characters): ");
  hidden = true;
  const password = await rl.question("");
  hidden = false;
  process.stdout.write("\n");
  rl.close();
  const child = spawn(process.execPath, ["--import", "tsx", recovery ? "apps/server/src/recover.ts" : "apps/server/src/provision.ts"], {
    stdio: ["pipe", "inherit", "inherit"],
  });
  child.stdin.end(JSON.stringify(process.argv.includes("--recover") ? { email, password } : { email, name, role, studentId, password }));
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
} finally {
  rl.close();
}
