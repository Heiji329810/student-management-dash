import { assertFixtureEnvironment } from "./fixture-guard.js";
assertFixtureEnvironment();
import { randomBytes } from 'node:crypto';
import { writeFile,readFile,mkdir } from 'node:fs/promises';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
const url=new URL(process.env.DATABASE_URL!);
if(!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Demo requires local PostgreSQL');
const adminURL=new URL(url);adminURL.pathname='/postgres';
const admin=new Pool({connectionString:adminURL.toString()});
if(!(await admin.query("select 1 from pg_database where datname='student_dash_demo'")).rows.length)await admin.query('create database student_dash_demo');
await admin.end();url.pathname='/student_dash_demo';
process.env.DATABASE_URL=url.toString();process.env.APP_ORIGIN='http://localhost:5275';process.env.BETTER_AUTH_URL='http://192.168.101.93:5275';process.env.PORT='4100';process.env.NODE_ENV='development';
const {db,pool}=await import('../apps/server/src/db.js');
const {provisionAccount}=await import('../apps/server/src/accounts.js');
const {loadState,loadUsers,saveState,lock}=await import('../apps/server/src/store.js');
const {executeCommand}=await import('../apps/server/src/service.js');
try {
 await migrate(db,{migrationsFolder:fileURLToPath(new URL('../apps/server/drizzle',import.meta.url))});
 let actors:Record<string,{email:string;password:string;name:string;role:'student'|'founder';studentId?:string}>;
 try{actors=JSON.parse(await readFile('.local/demo-accounts.json','utf8'));}catch{
  if((await loadUsers(db)).length)throw new Error('Existing demo accounts found; preserve them and provision manually');
  actors={teacher:{email:'teacher@demo.example',name:'Demo Teacher',role:'founder',password:randomBytes(24).toString('base64url')},owner:{email:'owner@demo.example',name:'Demo Club Owner',role:'student',studentId:'DEMO-OWNER',password:randomBytes(24).toString('base64url')},member:{email:'student@demo.example',name:'Demo Student',role:'student',studentId:'DEMO-MEMBER',password:randomBytes(24).toString('base64url')}};
  for(const actor of Object.values(actors))await provisionAccount(actor);
  await mkdir('.local',{recursive:true});await writeFile('.local/demo-accounts.json',JSON.stringify(actors),{mode:0o600});
 }
 await db.transaction(async tx=>{
  await lock(tx);const state=await loadState(tx);const users=await loadUsers(tx);
  if(state.clubs.some(c=>c.name==='Demo Science Club'))return;
  const teacher=users.find(u=>u.email===actors.teacher.email)!;const owner=users.find(u=>u.email===actors.owner.email)!;const member=users.find(u=>u.email===actors.member.email)!;
  await executeCommand(tx,state,owner,users,'submitClubApplication',[{founderNames:[owner.name],name:'Demo Science Club',category:'Science',description:'Fictional demonstration club for exploring the student dashboard.',wantsSchoolOfficial:false}]);
  await executeCommand(tx,state,teacher,users,'reviewClubApplication',[state.clubApplications[0].id,'approve','Welcome to the fictional demo.']);
  const club=state.clubs.find(c=>c.name==='Demo Science Club')!;
  await executeCommand(tx,state,member,users,'joinClub',[club.id]);
  const future=new Date();future.setDate(future.getDate()+7);const past=new Date();past.setDate(past.getDate()-7);
  for(const [title,date] of [['Demo Science Workshop',future],['Demo Past Meetup',past]] as const)await executeCommand(tx,state,owner,users,'createActivity',[club.id,{title,description:'A fictional activity for exploring this local demo.',startDateTime:date.toISOString(),durationType:'one-day',location:'Demo Room',locationUndetermined:false,estimatedParticipants:20,allStudentsOnCampus:false}]);
  const upcoming=state.clubs.find(c=>c.id===club.id)!.activities.find(a=>a.title==='Demo Science Workshop')!;
  await executeCommand(tx,state,member,users,'registerForActivity',[upcoming.id,club.id]);
  await executeCommand(tx,state,member,users,'submitClubApplication',[{founderNames:[member.name],name:'Demo Art Society',category:'Art and Design',description:'A fictional pending application for teacher review.',wantsSchoolOfficial:false}]);
  await saveState(tx,state);
 });
 const env=Object.entries({DATABASE_URL:url.toString(),BETTER_AUTH_SECRET:process.env.BETTER_AUTH_SECRET,BETTER_AUTH_URL:process.env.BETTER_AUTH_URL,APP_ORIGIN:process.env.APP_ORIGIN,PORT:'4100',NODE_ENV:'development',TZ:'Asia/Taipei',API_TARGET:'http://127.0.0.1:4100'}).map(([k,v])=>`${k}=${v}`).join('\n')+'\n';
 await writeFile('.env.demo',env,{mode:0o600});
 await writeFile('.local/demo-login.txt','Local fictional demo: http://localhost:5275\n\n'+Object.entries(actors).map(([key,a])=>`${key}\nEmail: ${a.email}\nPassword: ${a.password}\n`).join('\n'),{mode:0o600});
 console.log('Persistent isolated demo ready at http://localhost:5275. Credentials are in .local/demo-login.txt.');
}finally{await pool.end();}
