import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { AppState } from '@student-dash/shared/state';
import type { CommandName } from '@student-dash/shared/contracts';

// Redirect BEFORE importing any module that initializes the application's pool.
// Refuse any destructive setup unless the connection names our isolated database.
const isolated = new URL(process.env.DATABASE_URL!);
isolated.pathname = '/student_dash_test';
process.env.DATABASE_URL = isolated.toString();
const root = fileURLToPath(new URL('../../../', import.meta.url));
const psql = (query:string) => execFileSync('psql', ['-h', `${root}.local/socket`, '-p', '55439', '-U', 'student_dash', '-d', 'postgres', '-tAc', query], {
 env:{...process.env, PGPASSWORD:decodeURIComponent(isolated.password)}, encoding:'utf8', stdio:['ignore','pipe','pipe'],
}).trim();
if (psql("SELECT 1 FROM pg_database WHERE datname='student_dash_test'") !== '1') psql('CREATE DATABASE student_dash_test');

const { app } = await import('../src/app.js');
const { auth } = await import('../src/auth.js');
const { db, pool } = await import('../src/db.js');
const S = await import('../src/schema.js');
const { loadState, saveState, lock } = await import('../src/store.js');
const { commandSchemas } = await import('@student-dash/shared/contracts');
const origin = process.env.APP_ORIGIN!;
const password = 'Integration-only-password-123!';
type Actor = {id:string; cookie:string; student:string; email:string};
let actorSequence=0;
const exercised = new Set<CommandName>();
const succeeded = new Set<CommandName>();
async function command(actor:Actor, name:CommandName, args:unknown[], status=200) {
 exercised.add(name);
 const response = await request(app).post('/api/commands').set('Origin',origin).set('Cookie',actor.cookie).send({expectedUserId:actor.id,command:name,args});
 assert.equal(response.status,status,`${name}: ${JSON.stringify(response.body)}`);
 if(status===200)succeeded.add(name);
 return response.body as {state:AppState;result:boolean};
}
async function state(actor:Actor) {
 const response=await request(app).get('/api/state').set('Cookie',actor.cookie).expect(200);
 return response.body.state as AppState;
}
async function fixture(update:(state:AppState)=>void) {
 await db.transaction(async tx=>{await lock(tx);const current=await loadState(tx);update(current);await saveState(tx,current);});
}
async function makeActor(name:string, role:'student'|'founder'='student'):Promise<Actor> {
 const email=`${name}@integration.example`;
 const signup=await auth.api.signUpEmail({body:{email,password,name}});
 const student=`student-${name}`;
 await db.update(S.user).set({role,studentId:role==='student'?student:null}).where(eq(S.user.id,signup.user.id));
 if(role==='student')await db.insert(S.students).values({id:student,studentId:student,name,email});
 const signin=await request(app).post('/api/auth/sign-in/email').set('Origin',origin).set('x-forwarded-for',`198.51.100.${++actorSequence}`).send({email,password}).expect(200);
 const cookies=signin.headers['set-cookie'] as unknown as string[];
 assert.ok(cookies?.length);
 assert.ok(cookies.some(c=>/HttpOnly/i.test(c)&&/SameSite=Lax/i.test(c)));
 return {id:signup.user.id,cookie:cookies.map(c=>c.split(';')[0]).join('; '),student,email};
}
const activity=(title='Workshop',capacity=2)=>({title,description:'A practical learning workshop',startDateTime:'2099-06-01T12:00:00Z',durationType:'one-day',location:'Room 1',locationUndetermined:false,estimatedParticipants:capacity,allStudentsOnCampus:false});
const application=(name='Science Society',official=false)=>({founderNames:['Owner'],name,category:'Science',description:'Study science together',wantsSchoolOfficial:official,...(official?{managingTeacherName:'Teacher'}:{})});
const rating={dimensions:{activities:5,community:4,organization:4,leadership:5},overall:5,comment:'Excellent'};
let teacher:Actor,owner:Actor,member:Actor,outsider:Actor,clubId:string,activityId:string;

test('PostgreSQL, BetterAuth and Express integration',async t=>{
 t.after(async()=>{await pool.end();});
 assert.equal(new URL(process.env.DATABASE_URL!).pathname,'/student_dash_test');
 const database=await pool.query('select current_database() as name');
 assert.equal(database.rows[0].name,'student_dash_test');
 await migrate(db,{migrationsFolder:fileURLToPath(new URL('../drizzle',import.meta.url))});
 const tables=await pool.query("select tablename from pg_tables where schemaname='public'");
 if(tables.rows.length)await pool.query(`TRUNCATE ${tables.rows.map(r=>`"${String(r.tablename).replaceAll('"','""')}"`).join(',')} CASCADE`);
 teacher=await makeActor('teacher','founder');owner=await makeActor('owner');member=await makeActor('member');outsider=await makeActor('outsider');
 await fixture(s=>{s.clubs.push({id:'official',name:'School Events',description:'Official events',category:'School Official Events',founderId:teacher.id,founderName:'Teacher',activities:[],members:[],isSchoolOfficial:true},{id:'council',name:'Student Council',description:'Council',category:'School Official Events',founderId:teacher.id,founderName:'Teacher',activities:[],members:[],isSchoolOfficial:true});});

 await t.test('authentication, protected provisioning, origin, expiry and logout',async()=>{
  await request(app).get('/api/health').expect(200);
  await request(app).get('/api/state').expect(401);
  await request(app).post('/api/commands').set('Origin',origin).send({expectedUserId:owner.id,command:'joinClub',args:['official']}).expect(401);
  await request(app).post('/api/auth/sign-up/email').set('Origin',origin).send({}).expect(403);
  for(const path of ['/api/auth/update-user','/api/auth/delete-user'])await request(app).post(path).set('Origin',origin).set('Cookie',owner.cookie).send({}).expect(403);
  await request(app).post('/api/auth/sign-in/email').set('Origin',origin).send({email:owner.email,password:'incorrect-password'}).expect(401);
  await request(app).post('/api/commands').set('Cookie',owner.cookie).send({expectedUserId:owner.id,command:'joinClub',args:['official']}).expect(403);
  await request(app).post('/api/commands').set('Origin','https://untrusted.example').set('Cookie',owner.cookie).send({expectedUserId:owner.id,command:'joinClub',args:['official']}).expect(403);
  await request(app).post('/api/commands').set('Origin',origin).set('Sec-Fetch-Site','cross-site').set('Cookie',owner.cookie).send({expectedUserId:owner.id,command:'joinClub',args:['official']}).expect(403);
  assert.equal((await request(app).get('/api/state').set('Cookie',teacher.cookie).expect(200)).body.user.role,'founder');
  await db.execute(sql`update "user" set role='unknown-role' where id=${owner.id}`);
  try {await request(app).get('/api/state').set('Cookie',owner.cookie).expect(403);} finally {await db.update(S.user).set({role:'student'}).where(eq(S.user.id,owner.id));}
  for(let attempt=0;attempt<4;attempt++)await request(app).post('/api/auth/sign-in/email').set('Origin',origin).set('x-forwarded-for','198.51.100.200').send({email:owner.email,password:'invalid-password'}).expect(attempt<3?401:429);
  const expired=await makeActor('expired');
  await db.update(S.session).set({expiresAt:new Date(0)}).where(eq(S.session.userId,expired.id));
  await request(app).get('/api/state').set('Cookie',expired.cookie).expect(401);
  const missing=await makeActor('missing-identity');
  await db.delete(S.students).where(eq(S.students.id,missing.student));
  await command(missing,'joinClub',['official'],403);
  await command(missing,'submitClubApplication',[application('Missing Identity')],403);
  const logout=await makeActor('logout');
  await request(app).post('/api/auth/sign-out').set('Origin',origin).set('Cookie',logout.cookie).send({}).expect(200);
  await request(app).get('/api/state').set('Cookie',logout.cookie).expect(401);
 });
 await t.test('CLI provisioning success and compensation after domain insert failure',async()=>{
  const run=(body:Record<string,unknown>)=>spawnSync(`${root}node_modules/.bin/tsx`,['--env-file-if-exists=.env','apps/server/src/provision.ts'],{cwd:root,env:{...process.env},input:JSON.stringify(body),encoding:'utf8'});
  const success=run({email:'provisioned@integration.example',password,name:'Provisioned',role:'student',studentId:'provisioned-student'});
  assert.equal(success.status,0,'provisioning CLI must succeed with valid input');
  const provisioned=await db.select().from(S.user).where(eq(S.user.email,'provisioned@integration.example'));
  assert.equal(provisioned.length,1);assert.equal(provisioned[0].studentId,'provisioned-student');
  assert.equal((await db.select().from(S.students).where(eq(S.students.studentId,'provisioned-student'))).length,1);
  await db.insert(S.students).values({id:'domain-only',name:'Domain only',email:'domain-only@integration.example',studentId:'domain-only'});
  const accountsBefore=(await db.select().from(S.account)).length;
  const duplicate=run({email:'duplicate@integration.example',password,name:'Duplicate',role:'student',studentId:'domain-only'});
  assert.equal(duplicate.status,1,'duplicate domain student ID must fail provisioning');
  await pool.query(`CREATE FUNCTION integration_reject_student() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.email='compensated@integration.example' THEN RAISE EXCEPTION 'intentional integration failure'; END IF; RETURN NEW; END $$`);
  await pool.query('CREATE TRIGGER integration_reject_student BEFORE INSERT ON students FOR EACH ROW EXECUTE FUNCTION integration_reject_student()');
  let failed:ReturnType<typeof run>;
  try {failed=run({email:'compensated@integration.example',password,name:'Compensated',role:'student',studentId:'compensated-student'});} finally {await pool.query('DROP TRIGGER integration_reject_student ON students');await pool.query('DROP FUNCTION integration_reject_student()');}
  assert.equal(failed.status,1,'forced post-signup domain insert failure must fail provisioning');
  assert.equal((await db.select().from(S.user).where(eq(S.user.email,'compensated@integration.example'))).length,0,'failed provisioning must compensate BetterAuth user');
  assert.equal((await db.select().from(S.account)).length,accountsBefore,'failed provisioning must cascade credential cleanup');
  assert.ok(!failed.stdout.includes(password)&&!failed.stderr.includes(password),'CLI must never print credentials');
 });
 await t.test('every command rejects a malformed tuple and unknown envelopes',async()=>{
  for(const name of Object.keys(commandSchemas) as CommandName[])await command(owner,name,[],422);
  await request(app).post('/api/commands').set('Origin',origin).set('Cookie',owner.cookie).send({expectedUserId:owner.id,command:'arbitrary',args:[]}).expect(422);
  await request(app).post('/api/commands').set('Origin',origin).set('Cookie',owner.cookie).set('Content-Type','application/json').send('{').expect(400);
 });
 await t.test('command session identity mismatch rejects before mutation or disclosure',async()=>{
  const before=await loadState(db);
  const mismatch=await request(app).post('/api/commands').set('Origin',origin).set('Cookie',member.cookie).send({expectedUserId:owner.id,command:'submitClubApplication',args:[application('Wrong Session Application')]}).expect(409);
  assert.deepEqual(Object.keys(mismatch.body),['error'],'session mismatch must not return state, user, or mutation results');
  assert.match(mismatch.body.error.message,/session changed/i);
  assert.deepEqual(await loadState(db),before,'session mismatch must leave all persisted domain records unchanged');
  await request(app).post('/api/commands').set('Origin',origin).set('Cookie',owner.cookie).send({command:'submitClubApplication',args:[application('Missing Session Identity')]}).expect(422);
  assert.deepEqual(await loadState(db),before,'missing expected identity must leave domain records unchanged');
 });
 await t.test('club applications, review ownership, reject and official approval',async()=>{
  for(const description of [Array(101).fill('word').join(' '),'x'.repeat(30001)])await command(owner,'submitClubApplication',[{...application(),description}],422);
  await command(owner,'submitClubApplication',[application()]);
  await command(owner,'submitClubApplication',[application()],409);
  let appId=(await state(owner)).clubApplications[0].id;
  assert.equal((await state(outsider)).clubApplications.length,0);
  await command(member,'reviewClubApplication',[appId,'approve',''],403);
  await command(teacher,'reviewClubApplication',[appId,'approve','Approved']);
  await command(teacher,'reviewClubApplication',[appId,'approve',''],409);
  clubId=(await state(owner)).clubs.find(c=>c.name==='Science Society')!.id;
  assert.deepEqual((await state(owner)).clubs.find(c=>c.id===clubId)!.members,[owner.student]);
  await command(owner,'submitClubApplication',[application('Rejected Club')]);
  appId=(await state(owner)).clubApplications.find(a=>a.name==='Rejected Club')!.id;
  await command(teacher,'reviewClubApplication',[appId,'reject',''],409);
  await command(teacher,'reviewClubApplication',[appId,'reject','Please revise']);
  await command(owner,'submitClubApplication',[application('Official Science',true)]);
  appId=(await state(owner)).clubApplications.find(a=>a.name==='Official Science')!.id;
  await command(teacher,'reviewClubApplication',[appId,'approve','']);
  assert.equal((await state(owner)).clubApplications.find(a=>a.id===appId)!.status,'established_official');
 });
 await t.test('membership, teacher membership controls and privacy projections',async()=>{
  await command(member,'joinClub',[clubId]);await command(member,'joinClub',[clubId]);
  assert.equal((await state(owner)).clubs.find(c=>c.id===clubId)!.members.filter(id=>id===member.student).length,1);
  await command(member,'leaveClub',[clubId]);await command(member,'joinClub',[clubId]);
  await command(owner,'leaveClub',[clubId],409);
  await command(member,'joinClub',['official'],403);
  await command(member,'leaveClub',['official'],403);
  await command(member,'teacherAddOfficialClubMember',['official',member.student],403);
  await command(teacher,'teacherAddOfficialClubMember',['official',member.student]);
  await command(teacher,'teacherAddOfficialClubMember',['official',member.student],409);
  await command(teacher,'teacherRemoveOfficialClubMember',['official',member.student]);
  await command(teacher,'teacherRemoveOfficialClubMember',['official',member.student],409);
  assert.equal((await state(outsider)).students.find(s=>s.id===member.student)!.email,'');
  assert.equal((await state(owner)).students.find(s=>s.id===member.student)!.email,member.email);
 });
 await t.test('activity create/update and concurrent capacity enforcement',async()=>{
  await command(member,'createActivity',[clubId,activity()],403);
  await command(teacher,'createActivity',[clubId,activity()],403);
  for(const description of [Array(101).fill('word').join(' '),'x'.repeat(30001)])await command(owner,'createActivity',[clubId,{...activity(),description}],422);
  await command(owner,'createActivity',[clubId,activity()]);
  activityId=(await state(owner)).clubs.find(c=>c.id===clubId)!.activities[0].id;
  await command(owner,'updateActivity',[clubId,activityId,activity('Updated Workshop',1)]);
  await command(member,'updateActivity',[clubId,activityId,activity()],403);
  // Existing timing/cancellation must block edits even when replacement input is valid/future.
  await fixture(s=>{
   const club=s.clubs.find(c=>c.id===clubId)!;
   const original=club.activities.find(a=>a.id===activityId)!;
   club.activities.push(
    {...original,id:'edit-past-guard',date:'2000-01-01T12:00:00Z',registeredStudents:[]},
    {...original,id:'edit-cancelled-guard',cancelled:true,registeredStudents:[]},
   );
  });
  for(const guardedId of ['edit-past-guard','edit-cancelled-guard']) {
   const before=(await db.select().from(S.activities).where(eq(S.activities.id,guardedId)))[0];
   await command(owner,'updateActivity',[clubId,guardedId,activity('Must not persist',10)],409);
   const after=(await db.select().from(S.activities).where(eq(S.activities.id,guardedId)))[0];
   assert.deepEqual(after,before,'rejected edit must leave persisted activity unchanged');
  }
  await fixture(s=>{const club=s.clubs.find(c=>c.id===clubId)!;club.activities=club.activities.filter(a=>!['edit-past-guard','edit-cancelled-guard'].includes(a.id));});
  const results=await Promise.all([member,outsider].map(actor=>request(app).post('/api/commands').set('Origin',origin).set('Cookie',actor.cookie).send({expectedUserId:actor.id,command:'registerForActivity',args:[activityId,clubId]})));
  exercised.add('registerForActivity');assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  let current=await state(teacher);let registered=current.clubs.find(c=>c.id===clubId)!.activities[0].registeredStudents;
  assert.equal(registered.length,1);
  const winner=registered[0]===member.student?member:outsider;
  await command(winner,'registerForActivity',[activityId,clubId]);
  await command(winner,'unregisterFromActivity',[activityId,clubId]);
  await command(member,'registerForActivity',[activityId,clubId]);
  await command(teacher,'registerForActivity',[activityId,clubId],403);
  await command(member,'registerForActivity',['missing',clubId],404);
  assert.equal((await state(member)).clubs.find(c=>c.id===clubId)!.activities[0].title,'Updated Workshop');
  assert.equal((await db.select().from(S.registrations).where(eq(S.registrations.activityId,activityId))).length,1);
 });
 await t.test('attendance requires membership and three present weeks before rating',async()=>{
  await command(member,'saveClubRating',[clubId,rating],409);
  await command(member,'setClubMemberAttendance',[clubId,'2026-11-02',member.student,'present'],403);
  await command(owner,'setClubMemberAttendance',[clubId,'2026-11-03',member.student,'present'],422);
  await command(owner,'setClubMemberAttendance',[clubId,'2026-11-02',outsider.student,'present'],409);
  for(const week of ['2026-10-19','2026-10-26','2026-11-02'])await command(owner,'setClubMemberAttendance',[clubId,week,member.student,'present']);
  await command(member,'saveClubRating',[clubId,rating]);
  await command(member,'saveClubRating',[clubId,{...rating,overall:4}]);
  const ratings=(await state(teacher)).clubRatings;assert.equal(ratings.length,1);assert.equal(ratings[0].overall,4);
  await command(owner,'setClubMemberAttendance',[clubId,'2026-11-02',member.student,'leave']);
  await command(member,'saveClubRating',[clubId,rating],409);
  assert.equal((await state(outsider)).clubAttendance.length,0);
 });
 await t.test('journal media, participant validation, replies, deletion and likes',async()=>{
  const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=';
  const journal={activityName:'Workshop',reflection:'We learned together.',participantIds:[member.student],photos:[photo],socialMediaLink:'https://example.org'};
  await command(member,'saveActivityJournal',[clubId,activityId,journal],403);
  await command(owner,'saveActivityJournal',[clubId,activityId,{...journal,participantIds:[outsider.student]}],422);
  await command(owner,'saveActivityJournal',[clubId,activityId,{...journal,photos:['data:image/png;base64,YmFk']}],422);
  const mediaBefore=(await db.select().from(S.media)).length;
  await command(owner,'saveActivityJournal',[clubId,activityId,{...journal,participantIds:[]}],409);
  assert.equal((await db.select().from(S.media)).length,mediaBefore,'failed journal transaction must roll back uploaded media');
  await command(owner,'saveActivityJournal',[clubId,activityId,journal]);
  const saved=(await state(owner)).activityJournals[0];assert.ok(saved.photos[0].startsWith('/api/media/'));
  await request(app).get(saved.photos[0]).expect(401);
  const media=await request(app).get(saved.photos[0]).set('Cookie',member.cookie).expect(200).expect('Content-Type',/image\/png/);
  assert.equal(media.body.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  await command(owner,'saveActivityJournal',[clubId,activityId,{...journal,photos:saved.photos}]);
  await fixture(s=>{const original=s.clubs.find(c=>c.id===clubId)!;s.clubs.push({...original,id:'other-photo-owner',name:'Other photo owner',founderId:member.id,activities:[{...original.activities[0],id:'other-photo-activity',clubId:'other-photo-owner'}]});});
  await command(member,'saveActivityJournal',['other-photo-owner','other-photo-activity',{...journal,photos:saved.photos}],403);
  await command(member,'postJournalThreadComment',[clubId,activityId,{body:'Great workshop',rating:5}]);
  const comment=(await state(member)).journalThreadComments[0];
  await command(owner,'postJournalThreadComment',[clubId,activityId,{body:'Thank you',parentId:comment.id}]);
  await command(member,'postJournalThreadComment',[clubId,activityId,{body:'Invalid',parentId:'missing'}],422);
  assert.ok((await state(member)).notifications.some(n=>n.type==='comment_reply'));
  await command(outsider,'deleteJournalThreadComment',[comment.id],403);
  await command(member,'toggleJournalLike',[clubId,activityId]);
  assert.equal((await state(owner)).journalLikes.length,1);
  await command(member,'toggleJournalLike',[clubId,activityId]);
  assert.equal((await state(owner)).journalLikes.length,0);
  await command(member,'deleteJournalThreadComment',[comment.id]);
  assert.equal((await state(owner)).journalThreadComments.length,0);
 });
 await t.test('notifications authorization, activity cancellation and persistent removal notices',async()=>{
  const notice=(await state(member)).notifications[0];assert.ok(notice);
  await command(outsider,'markNotificationRead',[notice.id],404);
  await command(member,'markNotificationRead',[notice.id]);await command(member,'markNotificationRead',[notice.id]);
  assert.equal((await state(member)).readNotificationIds[member.id].filter(id=>id===notice.id).length,1);
  await command(member,'cancelActivity',[clubId,activityId,{reason:'Weather makes travel unsafe'}],403);
  await command(owner,'cancelActivity',[clubId,activityId,{reason:'short'}],422);
  await command(owner,'cancelActivity',[clubId,activityId,{reason:'Weather makes travel unsafe'}]);
  const mine=await state(member);assert.equal(mine.removalNotices.length,1);assert.ok(mine.notifications.some(n=>n.type==='activity_cancelled'));
  assert.equal(mine.clubs.find(c=>c.id===clubId)!.activities.length,0);
  const canceled=await db.select().from(S.activities).where(eq(S.activities.id,activityId));
  assert.equal(canceled.length,1);assert.equal(canceled[0].data.cancelled,true);assert.equal(canceled[0].data.cancellationReason,'Weather makes travel unsafe');assert.ok(canceled[0].data.cancelledAt);
  assert.equal((await db.select().from(S.registrations).where(eq(S.registrations.activityId,activityId))).length,0);
  const journal=(await db.select().from(S.activityJournals))[0].data;
  await request(app).get(journal.photos[0]).set('Cookie',member.cookie).expect(404);
  assert.equal((await state(outsider)).removalNotices.length,0);
  await command(member,'registerForActivity',[activityId,clubId],404);
 });
 await t.test('council terms archive, assign/remove and synchronize membership',async()=>{
  await command(member,'startStudentCouncilTerm',['2026-2027',[{name:'Events',memberStudentIds:[member.student]}]],403);
  await command(teacher,'startStudentCouncilTerm',['2026-2027',[{name:'Events',memberStudentIds:['missing']}]],422);
  await command(teacher,'startStudentCouncilTerm',['2026-2027',[{name:'Events',memberStudentIds:[member.student]},{name:'Media',memberStudentIds:[]}]]);
  const term=(await state(teacher)).studentCouncilTerms[0];
  await command(teacher,'assignStudentCouncilDepartmentMember',[term.departments[0].id,outsider.student]);
  await command(teacher,'assignStudentCouncilDepartmentMember',[term.departments[1].id,outsider.student]);
  await command(teacher,'removeStudentCouncilDepartmentMember',[term.departments[0].id,outsider.student]);
  assert.ok((await state(teacher)).clubs.find(c=>c.id==='council')!.members.includes(outsider.student));
  await command(teacher,'removeStudentCouncilDepartmentMember',[term.departments[1].id,outsider.student]);
  assert.ok(!(await state(teacher)).clubs.find(c=>c.id==='council')!.members.includes(outsider.student));
  await command(teacher,'assignStudentCouncilDepartmentMember',[term.departments[0].id,'missing'],409);
  await command(teacher,'startStudentCouncilTerm',['2026-2027',[{name:'Events',memberStudentIds:[]}]],409);
  await command(teacher,'startStudentCouncilTerm',['2027-2028',[{name:'Events',memberStudentIds:[member.student]}]]);
  const terms=(await state(teacher)).studentCouncilTerms;assert.equal(terms.filter(t=>t.status==='active').length,1);assert.ok(terms.find(t=>t.id===term.id)!.archivedAt);
 });
 await t.test('event elections: required answers, scorer invitation, complete scoring and publication',async()=>{
  const today=new Date().toLocaleDateString('en-CA');
  await command(member,'createOfficialEvent',[activity('Official Event')],403);
  await command(teacher,'createOfficialEvent',[activity('Official Event')]);
  const officialActivity=(await state(teacher)).clubs.find(c=>c.id==='official')!.activities[0].id;
  const election={activityId:officialActivity,title:'Select presenters',electionType:'Presenter',standards:'Clear presentation',electionDate:today,applicationFields:[{id:'system-name',label:'Name',type:'short_text',required:true},{id:'system-class',label:'Class',type:'short_text',required:true}],scorerStudentIds:[member.student],externalScorerNames:['External judge']};
  await command(teacher,'createEventElection',[{...election,applicationFields:[]}],422);
  await command(teacher,'createEventElection',[{...election,applicationFields:[...election.applicationFields,election.applicationFields[0]]}],422);
  await command(teacher,'createEventElection',[election]);
  const current=await state(teacher);const electionId=current.eventElections[0].id;
  const external=current.electionScorerInvites.find(i=>i.electionId===electionId&&i.scorerStudentId.startsWith('external:'))!.scorerStudentId;
  await command(member,'submitEventElectionApplication',[electionId,{'system-name':'Member','system-class':'Class A'}],409);
  await command(owner,'submitEventElectionApplication',[electionId,{}],409);
  await command(owner,'submitEventElectionApplication',[electionId,{'system-name':'Spoofed','system-class':'A',unexpected:'value'}],422);
  await command(owner,'submitEventElectionApplication',[electionId,{'system-name':'Spoofed identity','system-class':'Class A'}]);
  assert.equal((await state(owner)).eventElectionApplications[0].answers['system-name'],'owner');
  await command(owner,'submitEventElectionApplication',[electionId,{'system-name':'Owner','system-class':'Class A'}],409);
  const candidate=(await state(owner)).eventElectionApplications[0].id;
  assert.equal((await state(outsider)).eventElectionApplications.length,0);
  assert.equal((await state(member)).eventElectionApplications.length,1);
  await command(outsider,'scoreEventElectionCandidate',[electionId,candidate,90,'Uninvited'],409);
  await command(teacher,'publishEventElectionResults',[electionId,'Results',[candidate]],409);
  await command(member,'scoreEventElectionCandidate',[electionId,candidate,91.25,'Good']);
  await command(member,'scoreEventElectionCandidate',[electionId,candidate,80,'Duplicate'],409);
  await command(member,'submitExternalElectionScore',[electionId,candidate,external,80,''],403);
  await command(teacher,'submitExternalElectionScore',[electionId,candidate,external,80,'Good']);
  await command(teacher,'submitExternalElectionScore',[electionId,candidate,external,80,''],409);
  await command(member,'sendEventElectionMessage',[electionId,'Please attend'],403);
  await command(teacher,'sendEventElectionMessage',[electionId,'Please attend']);
  assert.equal((await state(owner)).electionApplicantMessages.length,1);
  assert.equal((await state(outsider)).electionApplicantMessages.length,0);
  await command(teacher,'publishEventElectionResults',[electionId,'Selected presenter',[candidate]]);
  const published=(await state(owner)).eventElections[0];assert.equal(published.status,'results_published');assert.equal(published.publishedResults![0].averageScore,85.7);
  await command(teacher,'publishEventElectionResults',[electionId,'Again',[candidate]],409);
 });
 await t.test('department elections replace membership, reject stale bindings, and preserve archives',async()=>{
  const today=new Date().toLocaleDateString('en-CA');
  let current=await state(teacher);const active=current.studentCouncilTerms.find(t=>t.status==='active')!;const dept=active.departments[0].id;
  const archived=structuredClone(current.studentCouncilTerms.filter(t=>t.status==='archived'));
  await fixture(s=>{const term=s.studentCouncilTerms.find(t=>t.id===active.id)!;term.departments[0].memberStudentIds=[owner.student,member.student];term.departments.push({id:'shared-department',name:'Shared',memberStudentIds:[member.student]});s.clubs.find(c=>c.id==='council')!.members=[owner.student,member.student];});
  const input={activityId:`council-department:${dept}`,title:'Department election',electionType:'Department',standards:'Participation',electionDate:today,applicationFields:[{id:'system-name',label:'Name',type:'short_text',required:true},{id:'system-class',label:'Class',type:'short_text',required:true}],scorerStudentIds:[],externalScorerNames:['Judge']};
  const createElection=async(value:unknown)=>{const previous=new Set((await state(teacher)).eventElections.map(e=>e.id));await command(teacher,'createEventElection',[value]);return (await state(teacher)).eventElections.find(e=>!previous.has(e.id))!.id;};
  for(const type of ['file_upload','video_upload']){
   const unsupported=await createElection({...input,applicationFields:[...input.applicationFields,{id:'upload',label:'Upload',type,required:false}]});
   await command(owner,'submitEventElectionApplication',[unsupported,{'system-class':'A'}],422);
  }
  const electionId=await createElection(input);
  current=await state(teacher);const judge=current.electionScorerInvites.find(i=>i.electionId===electionId)!.scorerStudentId;
  for(const actor of [owner,outsider])await command(actor,'submitEventElectionApplication',[electionId,{'system-class':'A'}]);
  const candidates=(await state(teacher)).eventElectionApplications.filter(a=>a.electionId===electionId);
  for(const candidate of candidates)await command(teacher,'submitExternalElectionScore',[electionId,candidate.id,judge,90,'Good']);
  const winner=candidates.find(a=>a.applicantUserId===outsider.id)!;
  await command(teacher,'publishEventElectionResults',[electionId,'New department member',[winner.id]]);
  current=await state(teacher);
  assert.deepEqual(current.studentCouncilTerms.find(t=>t.id===active.id)!.departments[0].memberStudentIds,[outsider.student]);
  assert.deepEqual([...current.clubs.find(c=>c.id==='council')!.members].sort(),[member.student,outsider.student].sort(),'union must retain other departments and remove deselected members');
  await command(teacher,'teacherRemoveOfficialClubMember',['council',member.student]);
  current=await state(teacher);
  assert.ok(current.studentCouncilTerms.find(t=>t.id===active.id)!.departments.every(d=>!d.memberStudentIds.includes(member.student)));
  assert.deepEqual(current.studentCouncilTerms.filter(t=>t.status==='archived'),archived,'teacher removal must preserve archived departments');
  const stale=await createElection(input);
  const replacement=await createElection(input);
  await command(teacher,'publishEventElectionResults',[stale,'Stale',[winner.id]],409);
  await command(teacher,'startStudentCouncilTerm',['2028-2029',[{name:'Next',memberStudentIds:[]}]]);
  await command(teacher,'publishEventElectionResults',[replacement,'Archived department',[winner.id]],409);
 });
 await t.test('dormant club election workflow with explicit candidate fixture',async()=>{
  // Approval currently establishes official clubs immediately; only this fixture
  // reaches the retained legacy approved_official_candidate election workflow.
  const today=new Date().toLocaleDateString('en-CA');
  await command(teacher,'createClubElection',[today,1],409);
  await fixture(s=>{s.clubApplications.push({id:'legacy-candidate',applicantUserId:outsider.id,applicantStudentId:outsider.student,applicantName:'Outsider',applicantEmail:outsider.email,...application('Legacy Candidate',true),status:'approved_official_candidate',submittedAt:new Date().toISOString()});});
  await command(member,'createClubElection',[today,1],403);
  await command(teacher,'createClubElection',[today,1]);
  const election=(await state(teacher)).clubElections[0];
  await command(teacher,'createClubElection',[today,1],409);
  await command(member,'castClubElectionVote',[election.id,'missing'],409);
  const votes=await Promise.all([1,2].map(()=>request(app).post('/api/commands').set('Origin',origin).set('Cookie',member.cookie).send({expectedUserId:member.id,command:'castClubElectionVote',args:[election.id,'legacy-candidate']})));
  exercised.add('castClubElectionVote');succeeded.add('castClubElectionVote');assert.deepEqual(votes.map(r=>r.status).sort(),[200,409]);
  await command(teacher,'castClubElectionVote',[election.id,'legacy-candidate'],403);
  await command(member,'finalizeClubElection',[election.id],403);
  await command(teacher,'finalizeClubElection',[election.id]);
  const current=await state(teacher);assert.equal(current.clubElections[0].status,'ended');assert.ok(current.clubs.find(c=>c.sourceApplicationId==='legacy-candidate')!.isSchoolOfficial);
  assert.ok(!current.clubs.flatMap(c=>c.activities).some(a=>a.linkedElectionId===election.id));
  await command(teacher,'finalizeClubElection',[election.id],409);
 });
 await t.test('teacher provisioning initializes missing organizations and initialization is idempotent',async()=>{
  const before=await loadState(db);
  assert.ok(!before.clubs.some(c=>c.name==='School Official Events'));
  const created=spawnSync(`${root}node_modules/.bin/tsx`,['--env-file-if-exists=.env','apps/server/src/provision.ts'],{cwd:root,env:{...process.env},input:JSON.stringify({email:'provisioned-teacher@integration.example',password,name:'Provisioned Teacher',role:'founder'}),encoding:'utf8'});
  assert.equal(created.status,0,'teacher provisioning must initialize organizations');
  const initialized=await loadState(db);
  assert.equal(initialized.clubs.filter(c=>c.name==='School Official Events').length,1);
  assert.equal(initialized.clubs.filter(c=>c.name==='Student Council').length,1);
  assert.deepEqual(initialized.clubs.find(c=>c.id==='council'),before.clubs.find(c=>c.id==='council'),'existing council must retain members');
  for(let run=0;run<2;run++){
   const repeated=spawnSync(`${root}node_modules/.bin/tsx`,['--env-file-if-exists=.env','apps/server/src/seed.ts'],{cwd:root,env:{...process.env},encoding:'utf8'});
   assert.equal(repeated.status,0,'initialization CLI must succeed repeatedly');
   assert.deepEqual(await loadState(db),initialized,'repeated initialization must preserve domain records');
  }
 });
 await t.test('database round trip, rollback, and complete command coverage',async()=>{
  const persisted=await db.transaction(async tx=>{await lock(tx);return loadState(tx);});
  assert.ok(persisted.clubApplications.some(a=>a.name==='Science Society'));
  assert.equal(persisted.clubRatings.length,1);assert.equal(persisted.activityJournals.length,1);assert.equal(persisted.clubElectionVotes.length,1);
  const before=await pool.query('select count(*)::int as count from notifications');
  await assert.rejects(db.transaction(async tx=>{await lock(tx);const draft=await loadState(tx);draft.notifications=[];await saveState(tx,draft);throw new Error('intentional rollback');}),/intentional rollback/);
  assert.equal((await pool.query('select count(*)::int as count from notifications')).rows[0].count,before.rows[0].count);
  assert.deepEqual([...exercised].sort(),Object.keys(commandSchemas).sort());
  assert.deepEqual([...succeeded].sort(),Object.keys(commandSchemas).sort(),'every action must have a successful HTTP exercise');
  assert.equal(Object.keys(commandSchemas).length,31);
 });
});
