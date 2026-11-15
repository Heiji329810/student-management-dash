// Run against temporary API4102/web5276 with .env.e2e. Adds only unique fictional fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { db, pool } from '../apps/server/src/db.js';
import { loadState, loadUsers, saveState, lock } from '../apps/server/src/store.js';
import { stateResponseSchema } from '@student-dash/shared/responses';
import type { ClubRatingRecord } from '@student-dash/shared/types';

if (new URL(process.env.DATABASE_URL!).pathname !== '/student_dash_browser') throw Error('Requires isolated browser database');
const base = 'http://localhost:5276';
const accounts = JSON.parse(await fs.readFile('.local/browser-accounts.json','utf8'));
const users = await loadUsers(db);
const actor = (key: string) => users.find(u=>u.email===accounts[key].email)!;
const owner = actor('owner'), member = actor('member'), outsider = actor('outsider');
const fixture = `moderation-${randomUUID()}`;
const ratingReason='OWN CLUB RATING REPORT '+fixture, journalReason='OWN CLUB JOURNAL REPORT '+fixture, replyReason='OWN CLUB REPLY REPORT '+fixture, foreignReason='FOREIGN QUEUE SENTINEL '+fixture;
const clubId=fixture, activityId=`${fixture}-activity`, foreignClub=`${fixture}-foreign`, foreignActivity=`${fixture}-foreign-activity`;
const rootId=`${fixture}-root`, replyId=`${fixture}-reply`, otherRoot=`${fixture}-second-root`;
const ratingId=`${fixture}-rating`, secondRating=`${fixture}-second-rating`;
const now = new Date().toISOString(), earlier='2026-01-01T00:00:00.000Z';
const rating: ClubRatingRecord={id:ratingId,clubId,userId:member.id,userName:member.name,overall:4,dimensions:{activities:4,community:4,organization:4,leadership:4},comment:'FICTIONAL MODERATION rating comment',createdAt:earlier,updatedAt:earlier};
const baseline=await loadState(db);
await db.transaction(async tx=>{
  await lock(tx);const s=await loadState(tx);
  const ownerRoster=s.students.find(st=>st.studentId===owner.studentId)!;
  for (const [id,activity,leader,name] of [[clubId,activityId,owner,'Moderation UI club'],[foreignClub,foreignActivity,outsider,'Foreign moderation club']] as const) {
    s.clubs.push({id,name:`${name} ${fixture.slice(-6)}`,description:'Fictional moderation verification',category:'Science',founderId:leader.id,founderName:leader.name,members:[ownerRoster.id],activities:[{id:activity,clubId:id,title:'Fictional moderation workshop',description:'Browser fixture',date:earlier,location:'Test room',registeredStudents:[]}]});
    s.activityJournals.push({id:`${id}-journal`,clubId:id,activityId:activity,activityName:'Fictional workshop journal',reflection:'Preserve this journal',participantIds:[],photos:[],createdAt:now,updatedAt:now});
  }
  for (const weekStart of ['2026-10-26','2026-11-02','2026-11-09']) s.clubAttendance.push({clubId,studentId:ownerRoster.id,weekStart,status:'present',updatedAt:now});
  s.clubRatings.push(rating,{...rating,id:secondRating,userId:outsider.id,userName:outsider.name,comment:'FICTIONAL newer rating comment',createdAt:now,updatedAt:now});
  s.journalThreadComments.push(
    {id:rootId,clubId,activityId,parentId:null,userId:member.id,userName:member.name,body:'FICTIONAL MODERATION journal parent',rating:5,createdAt:earlier},
    {id:replyId,clubId,activityId,parentId:rootId,userId:owner.id,userName:owner.name,body:'FICTIONAL MODERATION journal reply',createdAt:now},
    {id:otherRoot,clubId,activityId,parentId:null,userId:outsider.id,userName:outsider.name,body:'FICTIONAL newer journal root',rating:3,createdAt:now},
    {id:`${fixture}-foreign-comment`,clubId:foreignClub,activityId:foreignActivity,parentId:null,userId:member.id,userName:member.name,body:'FICTIONAL foreign comment',rating:2,createdAt:now},
  );
  s.clubCommentReports.push({id:`${fixture}-foreign-report`,source:'journal',commentId:`${fixture}-foreign-comment`,activityId:foreignActivity,clubId:foreignClub,ratingId:`${fixture}-foreign-comment`,ratingUpdatedAt:now,reporterUserId:member.id,reporterName:member.name,authorName:member.name,commentSnapshot:'FICTIONAL foreign comment',reason:foreignReason,createdAt:now,status:'pending'});
  await saveState(tx,s);
});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});
try {
  const sessions:Record<string,{context:Awaited<ReturnType<typeof browser.newContext>>;page:Awaited<ReturnType<Awaited<ReturnType<typeof browser.newContext>>['newPage']>>}>={};
  for(const key of ['owner','member','outsider','teacher']) {
    const context=await browser.newContext({baseURL:base});
    const response=await context.request.post('/api/auth/sign-in/email',{headers:{Origin:base,'X-Forwarded-For':`198.51.100.${10+['owner','member','outsider','teacher'].indexOf(key)}`},data:{email:accounts[key].email,password:accounts[key].password}});
    assert.equal(response.status(),200,`${key} login`);
    const page=await context.newPage();sessions[key]={context,page};
  }
  const {page:leader}=sessions.owner,{page:student}=sessions.outsider,{page:teacher}=sessions.teacher;
  const rateURL=`${base}/rate-my-club?club=${clubId}`;
  const journalURL=`${base}/clubs/${clubId}/activities/${activityId}/journal`;
  const state=async(key:string)=>stateResponseSchema.parse(await (await sessions[key].context.request.get('/api/state')).json()).state;
  const rateCard=(page:typeof leader)=>page.locator(`[data-rating-id="${ratingId}"]`);
  const journalCard=(page:typeof leader,id=rootId)=>page.locator(`[data-comment-id="${id}"]`).first();
  // Three-dot reporting, cancellation and keyboard interaction in a separate student context.
  await student.goto(rateURL);const studentCard=rateCard(student);
  await expect(studentCard.getByText(rating.comment,{exact:true})).toBeVisible();
  await studentCard.getByRole('button',{name:'Comment actions',exact:true}).focus();
  await student.keyboard.press('ArrowDown');await expect(student.getByRole('menuitem',{name:'Report inappropriate comment',exact:true})).toBeFocused();
  await student.keyboard.press('Escape');await expect(studentCard.getByRole('button',{name:'Comment actions',exact:true})).toBeFocused();
  await studentCard.getByRole('button',{name:'Comment actions',exact:true}).click();
  await student.getByRole('menuitem',{name:'Report inappropriate comment',exact:true}).click();
  await student.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(studentCard.getByText(rating.comment,{exact:true})).toBeVisible();
  await studentCard.getByRole('button',{name:'Comment actions',exact:true}).click();
  await student.getByRole('menuitem',{name:'Report inappropriate comment',exact:true}).click();
  await student.getByRole('dialog').getByLabel('Reason for reporting').fill(ratingReason);
  await student.getByRole('dialog').getByRole('button',{name:'Submit report',exact:true}).click();
  await expect(student.getByRole('dialog')).toHaveCount(0);
  await expect(studentCard.getByRole('button',{name:'Delete comment',exact:true})).toHaveCount(0);
  await leader.goto(rateURL);
  const queue=leader.getByRole('region',{name:'Report review queue',exact:true});
  await expect(queue.getByText(ratingReason,{exact:true})).toBeVisible();
  await expect(queue.getByText(foreignReason,{exact:true})).toHaveCount(0);
  const card=rateCard(leader);await expect(card.getByRole('button',{name:'Delete comment',exact:true})).toBeVisible();
  await card.getByRole('button',{name:'Unpublish comment',exact:true}).click();
  await expect(card.getByRole('button',{name:'Republish comment',exact:true})).toBeVisible();
  await student.reload();await expect(rateCard(student).getByText(rating.comment,{exact:true})).toHaveCount(0);
  assert.equal((await state('outsider')).clubCommentReports.find(r=>r.ratingId===ratingId)!.commentSnapshot,'');
  await leader.reload();await expect(rateCard(leader).getByText(rating.comment,{exact:true})).toBeVisible();
  await rateCard(leader).getByRole('button',{name:'Republish comment',exact:true}).click();
  await expect(rateCard(leader).getByRole('button',{name:'Unpublish comment',exact:true})).toBeVisible();
  await student.reload();await expect(rateCard(student).getByText(rating.comment,{exact:true})).toBeVisible();
  await rateCard(leader).getByRole('button',{name:'Pin comment',exact:true}).click();
  await expect(leader.locator('[data-rating-id]').first()).toHaveAttribute('data-rating-id',ratingId);
  await rateCard(leader).getByRole('button',{name:'Unpin comment',exact:true}).click();
  await expect(leader.locator('[data-rating-id]').first()).toHaveAttribute('data-rating-id',secondRating);
  await rateCard(leader).getByRole('button',{name:'Delete comment',exact:true}).click();
  await leader.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await state('owner')).clubRatings.find(r=>r.id===ratingId)!.comment,rating.comment);
  await leader.getByRole('button',{name:'切换到中文',exact:true}).click();
  await expect(rateCard(leader).getByRole('button',{name:'取消发布评论',exact:true})).toBeVisible();
  await expect(rateCard(leader).getByRole('button',{name:'置顶评论',exact:true})).toBeVisible();
  await rateCard(leader).getByRole('button',{name:'删除评论',exact:true}).click();
  await leader.getByRole('dialog').getByRole('button',{name:'取消',exact:true}).click();
  await leader.screenshot({path:'output/playwright/moderation-rating-zh.png',animations:'disabled'});
  await leader.getByRole('button',{name:'Switch to English',exact:true}).click();
  // Report a journal parent and reply without exposing foreign review controls.
  await student.goto(journalURL);
  await journalCard(student).getByRole('button',{name:'Comment actions',exact:true}).first().click();
  await student.getByRole('menuitem',{name:'Report inappropriate comment',exact:true}).click();
  await student.getByRole('dialog').getByLabel('Reason for reporting').fill(journalReason);
  await student.getByRole('dialog').getByRole('button',{name:'Submit report',exact:true}).click();
  await expect(student.getByRole('dialog')).toHaveCount(0);
  await sessions.member.page.goto(journalURL);
  await journalCard(sessions.member.page,replyId).getByRole('button',{name:'Comment actions',exact:true}).click();
  await sessions.member.page.getByRole('menuitem',{name:'Report inappropriate comment',exact:true}).click();
  await sessions.member.page.getByRole('dialog').getByLabel('Reason for reporting').fill(replyReason);
  await sessions.member.page.getByRole('dialog').getByRole('button',{name:'Submit report',exact:true}).click();
  await expect(sessions.member.page.getByRole('dialog')).toHaveCount(0);
  await leader.reload();
  const journalEntry=leader.getByRole('region',{name:'Report review queue',exact:true}).locator('article').filter({hasText:journalReason});
  await expect(journalEntry.getByText('Journal comment / reply',{exact:true})).toBeVisible();
  await journalEntry.getByRole('link',{name:'Review reports',exact:true}).click();
  await expect(leader).toHaveURL(`${journalURL}#comment-${rootId}`);
  await expect(journalCard(leader).getByText('FICTIONAL MODERATION journal parent',{exact:true})).toBeVisible();
  await journalCard(leader).getByRole('button',{name:'Unpublish comment',exact:true}).first().click();
  await expect(journalCard(leader).getByRole('button',{name:'Republish comment',exact:true}).first()).toBeVisible();
  await student.reload();await expect(journalCard(student).getByText('FICTIONAL MODERATION journal parent',{exact:true})).toHaveCount(0);
  await expect(journalCard(student,replyId).getByText('FICTIONAL MODERATION journal reply',{exact:true})).toBeVisible();
  assert.equal((await state('outsider')).clubCommentReports.find(r=>r.commentId===rootId)!.commentSnapshot,'');
  await leader.reload();await journalCard(leader).getByRole('button',{name:'Republish comment',exact:true}).first().click();
  await expect(journalCard(leader).getByRole('button',{name:'Unpublish comment',exact:true}).first()).toBeVisible();
  await journalCard(leader).getByRole('button',{name:'Pin comment',exact:true}).first().click();
  await expect(leader.locator('[data-comment-id]').first()).toHaveAttribute('data-comment-id',rootId);
  await journalCard(leader).getByRole('button',{name:'Unpin comment',exact:true}).first().click();
  await expect(leader.locator('[data-comment-id]').first()).toHaveAttribute('data-comment-id',otherRoot);
  await journalCard(leader,replyId).getByRole('button',{name:'Unpublish comment',exact:true}).click();
  await expect(journalCard(leader,replyId).getByRole('button',{name:'Republish comment',exact:true})).toBeVisible();
  await journalCard(leader,replyId).getByRole('button',{name:'Republish comment',exact:true}).click();
  await expect(journalCard(leader,replyId).getByRole('button',{name:'Unpublish comment',exact:true})).toBeVisible();
  await leader.getByRole('button',{name:'切换到中文',exact:true}).click();
  await expect(journalCard(leader).getByRole('button',{name:'取消发布评论',exact:true}).first()).toBeVisible();
  await leader.screenshot({path:'output/playwright/moderation-journal-zh.png',animations:'disabled'});
  await leader.getByRole('button',{name:'Switch to English',exact:true}).click();
  // Teacher sees both clubs; delete remains available even without a report.
  await teacher.goto(rateURL);
  await expect(teacher.getByRole('region',{name:'Report review queue',exact:true}).getByText(foreignReason,{exact:true})).toBeVisible();
  await expect(teacher.locator(`[data-rating-id="${secondRating}"]`).getByRole('button',{name:'Delete comment',exact:true})).toBeVisible();
  await teacher.goto(`${base}/clubs/${foreignClub}/activities/${foreignActivity}/journal`);
  await expect(journalCard(teacher,`${fixture}-foreign-comment`).getByRole('button',{name:'Delete comment',exact:true})).toBeVisible();
  // Confirm text-only deletion and retained thread/rating after reload.
  await journalCard(leader).getByRole('button',{name:'Delete comment',exact:true}).first().click();
  await leader.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await state('owner')).journalThreadComments.find(c=>c.id===rootId)!.body,'FICTIONAL MODERATION journal parent');
  await journalCard(leader).getByRole('button',{name:'Delete comment',exact:true}).first().click();
  await leader.getByRole('dialog').getByRole('button',{name:'Delete comment',exact:true}).click();
  await expect(leader.getByRole('dialog')).toHaveCount(0);
  await leader.reload();await expect(journalCard(leader,replyId).getByText('FICTIONAL MODERATION journal reply',{exact:true})).toBeVisible();
  const deleted=(await state('owner')).journalThreadComments.find(c=>c.id===rootId)!;
  assert.equal(deleted.body,'');assert.equal(deleted.rating,5);assert.equal(deleted.commentDeleted,true);
  await leader.goto(rateURL);await rateCard(leader).getByRole('button',{name:'Delete comment',exact:true}).click();
  await leader.getByRole('dialog').getByRole('button',{name:'Delete comment',exact:true}).click();
  await expect(leader.getByRole('dialog')).toHaveCount(0);await leader.reload();
  const deletedRating=(await state('owner')).clubRatings.find(r=>r.id===ratingId)!;
  assert.equal(deletedRating.comment,'');assert.equal(deletedRating.overall,4);assert.deepEqual(deletedRating.dimensions,rating.dimensions);
  const after=await loadState(db);
  for (const key of Object.keys(baseline) as (keyof typeof baseline)[]) {
    const original=baseline[key], current=after[key];
    if (Array.isArray(original) && Array.isArray(current)) {
      for (const item of original) assert.ok(current.some(candidate=>JSON.stringify(candidate)===JSON.stringify(item)),`preserve original ${key}`);
    } else assert.deepEqual(current,original);
  }
  console.log('PASS: both sources; student report menu/keyboard; own-only queue; teacher all-club queue/delete; unpublish/republish; pin ordering; EN/Chinese; delete cancellation/confirmation; score/thread/journal preservation; all pre-existing browser data retained.');
} finally {await browser.close();await pool.end();}
