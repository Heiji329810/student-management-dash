import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyState } from '@student-dash/shared/state';
import { commandResponseSchema, stateResponseSchema } from '@student-dash/shared/responses';

const user = {id:'teacher',name:'Teacher',email:'teacher@fixture.example',role:'founder'};

test('rolling API deployment: an older bootstrap missing reports still loads the teacher home', () => {
  const olderState: Partial<ReturnType<typeof emptyState>> = emptyState();
  delete olderState.clubCommentReports;
  assert.deepEqual(stateResponseSchema.parse({user,state:olderState}).state.clubCommentReports, []);
  assert.deepEqual(commandResponseSchema.parse({result:true,state:olderState}).state.clubCommentReports, []);
});

test('new bootstrap preserves reports and rejects malformed collections', () => {
  const report = {id:'report',clubId:'club',ratingId:'rating',reporterUserId:'student',reporterName:'Student',authorName:'Author',commentSnapshot:'Comment',ratingUpdatedAt:'2026-11-15T00:00:00.000Z',reason:'Reason',createdAt:'2026-11-15T00:00:00.000Z',status:'pending' as const};
  const state = {...emptyState(),clubCommentReports:[report]};
  assert.deepEqual(stateResponseSchema.parse({user,state}).state.clubCommentReports,[report]);
  for (const invalid of [null,{},'reports',[{id:'incomplete'}]]) {
    assert.equal(stateResponseSchema.safeParse({user,state:{...state,clubCommentReports:invalid}}).success,false);
  }
  const missingExistingCollection: Partial<ReturnType<typeof emptyState>> = {...state};
  delete missingExistingCollection.clubRatings;
  assert.equal(stateResponseSchema.safeParse({user,state:missingExistingCollection}).success,false);
});
