import { provisionAccount } from "./accounts.js";
import { pool } from "./db.js";
try {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
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
