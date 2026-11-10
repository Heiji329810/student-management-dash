import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
// Test utility: never expires a persistent demo or ordinary development session.
const root = new URL('../', import.meta.url);
process.loadEnvFile(fileURLToPath(new URL('.env.e2e', root)));
const connection = new URL(process.env.DATABASE_URL);
if (connection.pathname !== '/student_dash_browser' || !['localhost', '127.0.0.1'].includes(connection.hostname)) {
  throw new Error('Refusing to change sessions outside the isolated local browser fixture');
}
const accounts = JSON.parse(await readFile(new URL('.local/browser-accounts.json', root), 'utf8'));
const actor = accounts[process.argv[2]];
if (!actor?.id) throw new Error('Choose a provisioned browser fixture actor');
const pool = new Pool({ connectionString: connection.toString() });
try {
  const result = await pool.query('UPDATE "session" SET "expiresAt" = TIMESTAMP \'2000-01-01 00:00:00\' WHERE "userId" = $1', [actor.id]);
  console.log(`Expired ${result.rowCount} isolated fixture sessions.`);
} finally {
  await pool.end();
}
