import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { configSchema } from '../src/config.js';
import { assertFixtureEnvironment } from '../../../scripts/fixture-guard.js';
const valid = {NODE_ENV:'production',DATABASE_URL:'postgresql://operator:unused@localhost/school_live',BETTER_AUTH_SECRET:'8xK2m4A9zQ7vB5nD3rT6yU1iO0pLwEhs',APP_ORIGIN:'https://school.example.org',BETTER_AUTH_URL:'https://school.example.org'};
test('production fails closed on fixture databases, placeholder secrets and insecure origins',()=>{
 assert.ok(configSchema.safeParse(valid).success);
 for(const change of [{DATABASE_URL:'postgresql://unused@localhost/student_dash_demo'},{BETTER_AUTH_SECRET:'replace-with-at-least-32-random-characters'},{APP_ORIGIN:'http://school.example.org'},{APP_ORIGIN:'https://other.example.org'},{APP_ORIGIN:'https://school.example.org/path'}])
  assert.equal(configSchema.safeParse({...valid,...change}).success,false);
});
test('fixture entrypoints reject production before connecting or writing',()=>{
 assert.throws(()=>assertFixtureEnvironment({NODE_ENV:'production'}));
 for(const script of ['prepare-demo.ts','prepare-browser.ts']) {
  const result=spawnSync(process.execPath,['--import','tsx',`scripts/${script}`],{cwd:new URL('../../../',import.meta.url),env:{...process.env,NODE_ENV:'production',DATABASE_URL:'deliberately-invalid'},encoding:'utf8'});
  assert.equal(result.status,1);
  assert.match(result.stderr,/Fixture setup is disabled in production/);
 }
});

test('production provisioning requires explicit operator approval',()=>{
 const result=spawnSync(process.execPath,['--import','tsx','apps/server/src/provision.ts'],{cwd:new URL('../../../',import.meta.url),env:{...process.env,...valid,ACCOUNT_ADMIN_APPROVED:'no'},input:'{}',encoding:'utf8'});
 assert.equal(result.status,1);
 assert.match(result.stderr,/Account provisioning failed/);
});
