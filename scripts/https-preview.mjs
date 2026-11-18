// Temporary HTTPS testing link. Run with: node --import tsx scripts/https-preview.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, chmod, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
process.umask(0o077);
const port = 4102;
const urlFile = '.local/https-url.txt';
const privateEnv = parseEnv(await readFile('.env.live', 'utf8'));
if (new URL(privateEnv.DATABASE_URL).pathname !== '/student_dash_live') throw new Error('Expected the dedicated live database');
let secret;
try { secret = (await readFile('.local/https-auth-secret', 'utf8')).trim(); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  secret = randomBytes(48).toString('base64url');
  await writeFile('.local/https-auth-secret', secret, { mode: 0o600, flag: 'wx' });
}
await chmod('.local/https-auth-secret', 0o600);
await unlink(urlFile).catch(error => { if (error.code !== 'ENOENT') throw error; });
let server = createServer((_req, res) => { res.writeHead(503, { 'Cache-Control': 'no-store' }); res.end('HTTPS preview is starting.'); });
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
const tunnel = spawn('.local/bin/cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`, '--protocol', 'http2'], { stdio: ['ignore', 'pipe', 'pipe'] });
let stopping = false;
let pool;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  tunnel.kill('SIGTERM');
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  if (pool) await pool.end();
  await unlink(urlFile).catch(() => {});
  process.exit(code);
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => void stop());
tunnel.once('exit', code => { if (!stopping) { console.error(`HTTPS tunnel stopped (${code}).`); void stop(1); } });
try {
  const origin = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Cloudflare did not return an HTTPS URL within 90 seconds')), 90_000);
    let output = '';
    function read(chunk) {
      output = (output + chunk.toString()).slice(-16_384);
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) { clearTimeout(timeout); resolve(match[0]); }
    }
    tunnel.stdout.on('data', read); tunnel.stderr.on('data', read);
    tunnel.once('error', error => { clearTimeout(timeout); reject(error); });
    tunnel.once('exit', () => { clearTimeout(timeout); reject(new Error('Tunnel exited before setup completed')); });
  });
  Object.assign(process.env, {
    DATABASE_URL: privateEnv.DATABASE_URL,
    BETTER_AUTH_SECRET: secret,
    APP_ORIGIN: origin,
    BETTER_AUTH_URL: origin,
    NODE_ENV: 'production',
    PORT: String(port),
  });
  const { app } = await import('../apps/server/src/app.ts');
  ({ pool } = await import('../apps/server/src/db.ts'));
  await pool.query('select 1');
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  server = await new Promise((resolve, reject) => {
    const running = app.listen(port, '127.0.0.1', () => resolve(running)); running.once('error', reject);
  });
  await writeFile(urlFile, `${origin}\n`, { mode: 0o600 });
  console.log(`HTTPS testing link: ${origin}`);
  console.log('Temporary link; keep this computer awake. Stop with systemctl --user stop student-dash-https-preview.service');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'HTTPS setup failed');
  await stop(1);
}
