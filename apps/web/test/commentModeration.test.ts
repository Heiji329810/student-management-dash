import assert from 'node:assert/strict';
import test from 'node:test';
import { compareClubComments, calculateClubRatingScore } from '@student-dash/shared/clubRatings';
import { clubRatingRecordSchema } from '@student-dash/shared/responses';
import type { ClubRatingRecord } from '@student-dash/shared/types';

const record: ClubRatingRecord = {id:'b',clubId:'club',userId:'student',userName:'Student',createdAt:'2026-11-15T00:00:00Z',updatedAt:'2026-11-15T00:00:00Z',comment:'Comment',overall:4,dimensions:{activities:5,community:4,organization:3,leadership:4}};

test('pinned comments precede newer comments with deterministic timestamp and id ordering', () => {
  const input = [record, {...record,id:'new',updatedAt:'2026-11-16T00:00:00Z'}, {...record,id:'a'}, {...record,id:'pin',commentPinned:true,updatedAt:'2026-11-14T00:00:00Z'}];
  assert.deepEqual(input.slice().sort(compareClubComments).map(r=>r.id), ['pin','new','a','b']);
  assert.deepEqual(input.slice().reverse().sort(compareClubComments).map(r=>r.id), ['pin','new','a','b']);
  for (const comment of input) assert.equal(calculateClubRatingScore(comment),4);
});

test('legacy records and persisted moderation flags are compatible; invalid flags rejected', () => {
  assert.deepEqual(clubRatingRecordSchema.parse(record),record);
  const hidden = {...record,commentUnpublished:true,commentPinned:true};
  assert.deepEqual(clubRatingRecordSchema.parse(hidden),hidden);
  assert.equal(clubRatingRecordSchema.safeParse({...record,commentUnpublished:'true'}).success,false);
  assert.equal(clubRatingRecordSchema.safeParse({...record,commentPinned:1}).success,false);
});

test('journal pins sort within their own sibling group and never reparent replies or change ratings', async () => {
  const {groupThreadComments} = await import('@student-dash/shared/journalComments');
  const root = {id:'root',clubId:'club',activityId:'activity',parentId:null,userId:'student',userName:'Student',body:'Root',rating:5,createdAt:'2026-11-15T00:00:00Z'};
  const items = [root,{...root,id:'root-pin',commentPinned:true,createdAt:'2026-11-14T00:00:00Z'}, {...root,id:'reply',parentId:'root',rating:undefined}, {...root,id:'reply-pin',parentId:'root',rating:undefined,commentPinned:true}];
  const grouped = groupThreadComments(items);
  assert.deepEqual(grouped.get(null)?.map(c=>c.id),['root-pin','root']);
  assert.deepEqual(grouped.get('root')?.map(c=>c.id),['reply-pin','reply']);
  assert.equal(items[0].rating,5);
  assert.equal(items[3].parentId,'root');
});
