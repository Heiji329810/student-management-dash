import { provisionAccount } from "./accounts.js";
import { config } from "./config.js";
import { pool } from "./db.js";
try {
  if (config.NODE_ENV === "production" && process.env.ACCOUNT_ADMIN_APPROVED !== "yes")
    throw new Error("Production account provisioning requires operator approval");
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 4096) throw new Error("Input too large");
  }
  await provisionAccount(JSON.parse(input));
  console.log("Account provisioned.");
} catch {
  console.error(
    "Account provisioning failed. Check input fields, uniqueness and database availability.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
