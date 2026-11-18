import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commandSchemas,activityInput } from '@student-dash/shared/contracts';
import { getWeekStart,shiftWeekStart } from '@student-dash/shared/attendance';
import { isActivityPast } from '@student-dash/shared/activities';

test('Taiwan calendar weeks remain Monday without a UTC date shift',()=>{
 const prior=process.env.TZ;process.env.TZ='Asia/Taipei';
 try {
  assert.equal(getWeekStart(new Date('2026-11-10T12:00:00+08:00')),'2026-11-09');
  assert.equal(shiftWeekStart('2026-11-09',-1),'2026-11-02');
 }finally{process.env.TZ=prior;}
});
test('activity contracts reject impossible dates, malformed time and overposting',()=>{
 const activity={title:'Workshop',description:'Learn together',startDateTime:'2099-06-01T12:00',durationType:'one-day',location:'Room',locationUndetermined:false,estimatedParticipants:1,allStudentsOnCampus:false};
 assert.ok(activityInput.safeParse(activity).success);
 for(const value of ['2099-02-30T12:00','2099-02-29T12:00','2099-01-01T25:00','2099-01-01T12:99'])assert.ok(!activityInput.safeParse({...activity,startDateTime:value}).success,value);
 assert.ok(!commandSchemas.createActivity.safeParse(['club',{...activity,clubId:'other'}]).success);
 assert.ok(!commandSchemas.saveClubRating.safeParse(['club',{dimensions:{activities:5,community:5,organization:5,leadership:5},overall:5,comment:'',userId:'other'}]).success);
});
test('date-only long-term final day uses shared closing policy',()=>{
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
 const end=`${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
 assert.equal(isActivityPast({id:'future',clubId:'club',title:'Long',description:'Long-term',date:'2020-01-01',endDate:end,durationType:'long-term',location:'Room',registeredStudents:[]}),false);
});


test('club introduction uses a 100 Unicode character limit including spaces', () => {
 const application = {attachment:{name:'proposal.txt',base64:'dGVzdA=='},founderNames:['Owner'],name:'Club',category:'Science',wantsSchoolOfficial:false};
 for (const description of ['中'.repeat(100), 'a'.repeat(100), '😀'.repeat(100), 'a '.repeat(50)]) {
  assert.ok(commandSchemas.submitClubApplication.safeParse([{...application,description}]).success);
 }
 for (const description of ['中'.repeat(101), 'a'.repeat(101), '😀'.repeat(101), 'a '.repeat(50)+'a', ' '+ 'a'.repeat(100), 'a'.repeat(100)+' ']) {
  const result = commandSchemas.submitClubApplication.safeParse([{...application,description}]);
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.error.issues.some(issue => issue.message === 'Introduction must be no more than 100 characters.'));
 }
 assert.equal(commandSchemas.submitClubApplication.safeParse([{...application,description:'   '}]).success, false);
});
