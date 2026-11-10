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
  const email = await rl.question("Email: ");
  const name = await rl.question("Name: ");
  const role = await rl.question("Role (student/founder): ");
  const studentId =
    role === "student" ? await rl.question("Student ID: ") : undefined;
  process.stdout.write("Password (12+ characters): ");
  hidden = true;
  const password = await rl.question("");
  hidden = false;
  process.stdout.write("\n");
  rl.close();
  const child = spawn("npm", ["run", "account:create"], {
    stdio: ["pipe", "inherit", "inherit"],
  });
  child.stdin.end(JSON.stringify({ email, name, role, studentId, password }));
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
} finally {
  rl.close();
}
