import { randomBytes } from 'node:crypto';
import { writeFile,mkdir } from 'node:fs/promises';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
// Browser fixtures are always isolated from developer data and integration tests.
const url=new URL(process.env.DATABASE_URL!);
if(!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Browser fixtures require local PostgreSQL');
const adminURL=new URL(url);adminURL.pathname='/postgres';
const admin=new Pool({connectionString:adminURL.toString()});
if(!(await admin.query("select 1 from pg_database where datname='student_dash_browser'")).rows.length)await admin.query('create database student_dash_browser');
await admin.end();
url.pathname='/student_dash_browser';
process.env.DATABASE_URL=url.toString();
process.env.APP_ORIGIN='http://localhost:5274';process.env.BETTER_AUTH_URL='http://localhost:4101';process.env.PORT='4101';process.env.NODE_ENV='test';
const {db,pool}=await import('../apps/server/src/db.js');
const {provisionAccount}=await import('../apps/server/src/accounts.js');
try {
 if((await pool.query('select current_database() as name')).rows[0].name!=='student_dash_browser')throw new Error('Unexpected fixture DB');
 await migrate(db,{migrationsFolder:fileURLToPath(new URL('../apps/server/drizzle',import.meta.url))});
 const tables=(await pool.query("select tablename from pg_tables where schemaname='public'")).rows;
 if(tables.length)await pool.query(`truncate ${tables.map(r=>'"'+String(r.tablename).replaceAll('"','""')+'"').join(',')} cascade`);
 const actors:Record<string,{email:string;password:string;name:string;role:'student'|'founder';studentId?:string;id?:string}>={
  teacher:{email:'teacher@browser.example',name:'Demo Teacher',role:'founder',password:randomBytes(24).toString('base64url')},
  owner:{email:'owner@browser.example',name:'Demo Owner',role:'student',studentId:'DEMO-001',password:randomBytes(24).toString('base64url')},
  member:{email:'member@browser.example',name:'Demo Member',role:'student',studentId:'DEMO-002',password:randomBytes(24).toString('base64url')},
  outsider:{email:'outsider@browser.example',name:'Demo Visitor',role:'student',studentId:'DEMO-003',password:randomBytes(24).toString('base64url')},
 };
 for(const actor of Object.values(actors))actor.id=(await provisionAccount(actor)).id;
 await mkdir('.local',{recursive:true});
 await writeFile('.local/browser-accounts.json',JSON.stringify(actors),{mode:0o600});
 const env=[...Object.entries({DATABASE_URL:process.env.DATABASE_URL,BETTER_AUTH_SECRET:process.env.BETTER_AUTH_SECRET,BETTER_AUTH_URL:process.env.BETTER_AUTH_URL,APP_ORIGIN:process.env.APP_ORIGIN,PORT:'4101',NODE_ENV:'test',TZ:'Asia/Taipei',API_TARGET:'http://127.0.0.1:4101'})].map(([k,v])=>`${k}=${v}`).join('\n')+'\n';
 await writeFile('.env.e2e',env,{mode:0o600});
 console.log('Isolated browser fixtures ready. Account credentials are in ignored .local/browser-accounts.json.');
}finally{await pool.end();}
