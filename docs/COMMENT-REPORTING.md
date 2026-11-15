# Current club comment moderation — 2026-11-15

This section supersedes the teacher-only scope and journal exclusion in the historical notes below.

- Applies to **Rate My Club comments and student journal comments/replies**. Teachers (`founder` role) moderate across clubs; student leaders moderate only clubs whose authoritative `founderId` matches their session identity. Membership alone grants no moderation. Leaders can review before submitting their own club rating.
- The **Report review queue** on Rate My Club combines both sources and is scoped to all clubs led by the current student, or all clubs for teachers. Journal pages also show the queue scoped to that club. Each entry identifies source, club, activity/journal where applicable, author, reporter, reason, timestamp, and a Review reports link to the specific item. Dismissal is separately authorized; the linked item offers unpublish, delete and pin controls. Pending badges remain until reports are dismissed or the comment is deleted.
- **Unpublish** retains text and all scores in storage, replaces the public/student text with an empty value in API responses (including the author's response), and redacts hidden text from report snapshots delivered to reporters. Only the owning club leader and teachers retain that text. Journal placeholders retain thread structure and independently visible replies. **Republish** restores visibility. Unpublishing does not resolve pending reports or edit comment timestamps.
- **Delete comment** always remains visible to authorized moderators for any nonempty comment, independent of reports, and uses a dialog quoting author/text with Cancel and confirmation. Rate My Club deletion clears only text, following existing policy; eligible authors can later submit a new comment. Journal moderator deletion leaves a text tombstone, numerical event rating, parent ID and all replies intact. Journals, media, likes, dimensions, overall scores, ranking averages and rating counts are unchanged by moderation. Existing journal author **Delete** remains a separate confirmed subtree-removal action with its existing explicit warning; that author action is not the new moderator delete.
- **Pin / Unpin** is available for both sources with the same server authorization. Rate My Club sorts pinned first, then updated time descending, then ID. Journal comments sort pinned first **within each sibling group**; roots retain newest-first order and replies oldest-first order, with ID as tie-breaker. A pinned reply stays under its parent. Pinning never changes scores or club ranking order. No arbitrary push-down control was added.
- Students retain the bottom-right keyboard-accessible three-dot report menu, including student leaders when reporting another author's visible comment. Teachers have no report menu. Required reasons are 1–500 trimmed characters. Journal reports cover both parents and replies, reject own/hidden/deleted/nonstudent comments, persist independently of journals/ratings, and remain deduplicated after dismissal. Controls, dialogs, feedback and source labels support English/Chinese.

## Authorization and persistence

All command tuples are strict and identities come from authenticated sessions. Journal moderation/reporting commands accept only a comment ID (plus the action value/reason), never caller-provided club/activity/journal IDs. The server resolves the persisted comment's activity to its real club and verifies the comment's stored club matches it. Forged extra parent IDs, mismatched stored relationships and other-club commands are rejected. Report review and report projection also validate that relationship. Existing serialized database transactions and report uniqueness index protect duplicate races.

New commands: `setClubCommentPublished`, `setClubCommentPinned`, `reportJournalThreadComment`, `setJournalCommentPublished`, `setJournalCommentPinned`, `deleteJournalCommentText`. Existing `deleteClubRatingComment` and `dismissClubCommentReport` now allow the owning club leader as well as teachers. The existing author-only `deleteJournalThreadComment` remains separate.

No new migration is required: optional moderation flags are stored in existing JSONB comment/rating records, and journal reports use the existing report table with `source: "journal"`, `commentId` and `activityId`. Its legacy `ratingId`/version uniqueness key stores the journal comment ID/creation timestamp for immutable journal comments. Existing rating reports omit `source`. Older records omit moderation flags and remain published/unpinned. Fresh environments still need the existing additive `0002_powerful_zombie.sql`; never reset a database to install this feature.

## Current verification

- `npm test`: **25 backend tests and 17 client tests passed**. All 40 commands receive successful HTTP exercises and malformed tuples are rejected. New tests cover own/other-club permissions, ordinary members, teacher access, forged IDs, malformed stored journal ownership, hidden comment/report privacy, republish, persistence, delete score/thread/journal preservation, and deterministic pin ordering. Disposable integration databases are uniquely created and removed; production/demo/browser data is never reset.
- `npm run build`, `npm run lint`, and `git diff --check` pass. Existing dependency annotation, Node deprecation and bundle-size warnings remain.
- Repeatable browser verification: run temporary API4102/web5276 using `.env.e2e`, `APP_ORIGIN=http://localhost:5276`, and `API_TARGET=http://127.0.0.1:4102`; execute `node --env-file=.env.e2e --import tsx scripts/verify-comment-moderation.ts`. It requires `student_dash_browser`, adds uniquely named fictional fixtures, and asserts every pre-existing domain record remains unchanged. It verifies real three-dot keyboard reporting, queue scoping/source links, teacher controls, unpublish/republish, sibling pin ordering, English/Chinese controls, cancellation/confirmed deletion and retained numerical ratings/replies/journals. Screenshots: ignored `output/playwright/moderation-rating-zh.png` and `moderation-journal-zh.png`.
- Live **localhost:5275**: reloaded only the demo API; demo web/API services remain active. Separate headless teacher, leader and ordinary student contexts parsed full bootstrap responses, verified actual English/Chinese controls, and cancelled deletion dialogs. Direct API4100 health, proxied health and Rate My Club return HTTP 200. A complete database-domain comparison against the pre-change baseline retained every existing collection and both original live demo comments; no live report/hide/pin/delete was submitted. Existing user browser/login was untouched. Evidence: ignored `output/playwright/live-moderation-{teacher,owner,member}-zh.png`.

No reset, commit or push.

---

# Rate My Club comment reporting

Implemented and verified 2026-11-15. Existing uncommitted introduction, navigation, wording and teacher moderation work was preserved. No commit or push.

Authenticated students, including student club owners, can report visible, nonempty comments authored by other students. Teachers cannot report comments; both the command authorization boundary and domain reject teacher reporting. The Radix confirmation dialog quotes the author/comment, requires a reason (1–500 trimmed characters), supports Cancel, and explains that reporting leaves comments and scores unchanged. English and Chinese labels, feedback and errors are provided. Dialogs scroll within the viewport. Students retain the existing membership/attendance/submit-before-view rules and never receive teacher moderation controls.

Reports persist in `club_comment_reports`, separately from ratings. Identity comes from the authenticated session. Server checks the exact club/rating pair, student author, visibility and rating update timestamp, rejects empty/stale comments and duplicate submissions. The existing transaction/advisory lock serializes races; a unique database index enforces one report per reporter/rating version even after dismissal. A subsequent edited rating version can be reported again. Students receive only their own reports; teachers receive all reports. Club ownership does not grant review permission.

The teacher queue lists clubs with pending reports. Selecting a club exposes the report snapshot, author, reporter, reason and submission date. Teachers can dismiss individual reports without touching feedback, or open the existing confirmed delete action, quoting the current comment. Changed comment text is marked for review. Comment deletion clears only text, retains numeric dimensions/overall score/ranking counts, and resolves pending reports for that rating. Resolutions retain timestamp and teacher identity. Journal thread comments remain separate.

## Corrected controls and live verification (2026-11-15)

Student reporting is in the three-dot **Comment actions** menu at the bottom right of each community comment, with **Report inappropriate comment** as the menu item. Already reported rating versions expose a disabled **Comment reported** item. The menu has an accessible name, expanded state, menu/menuitem semantics, keyboard focus, arrow navigation and Escape focus return. English and Chinese labels are translated, including accessibility labels.

Teachers always have a visible **Delete comment** button on each existing nonempty comment, independently of reports. They have no report menu. Pending reports produce a flag icon and **Reported / 已举报** status badge directly on the corresponding comment, alongside Delete comment. Any pending report for that rating keeps the badge visible, including a report against an earlier edited version. The existing queue, report details, stale-version notice, dismissal and confirmed deletion remain. Dismissing all pending reports removes the badge and retains text, scores and Delete comment.

Reloaded only `student-dash-demo-api.service` and `student-dash-demo-web.service`; localhost:5275 serves the corrected client and student-only API permission. Separate headless sessions verified the actual live teacher Delete button, absent teacher report controls, HTTP 403 for a teacher report, and the actual live student club-owner bottom-right menu, keyboard behavior and English/Chinese dialogs. Cancellation and the rejected teacher report left all application state unchanged. Full current teacher/student bootstrap responses parse with `stateResponseSchema`; API health and web/proxy requests return HTTP 200. Both services remain active.

Isolated browser verification used additive fictional data in `student_dash_browser` through temporary web5276/API4102 servers. A student club owner submitted a report, with unchanged ratings/comments; duplicate controls persisted after reload and the API returned 409 for a duplicate. Teacher UI showed the flag on that exact comment in English and Chinese. Dismissal removed the flag and retained the visible Delete button. Cancel preserved text; confirmed deletion cleared only that fixture's text and retained all numerical dimensions, overall score and other ratings after reload. No original browser records were reset or removed.

At the user's subsequent explicit request, added a live **FICTIONAL REPORT DEMO** comment authored by **Demo Club Owner** in **Demo Science Club**, reportable by **Demo Student (student@demo.example)**. Used only supported authenticated commands: three demo-owner present-week records (2026-10-26, 2026-11-02, 2026-11-09) for the required eligibility, then one new rating with all scores 4. No existing rating was overwritten. The new rating ID is `c-app-ca-38fde226-f1c8-438f-96fa-f9939ce6fdfb:632XWnzqNRPr3IGBS2Ti9WHUtfWdqzcG`. Verified the actual Demo Student UI displays its menu and enabled report item. Left this sample unreported and undeleted. The previous Demo Student sample, all existing records and the user's browser login are preserved. Club average remains 4.0 with two ratings. No reset, commit or push.

Latest checks: `npm test` passed (23 backend/integration tests plus 14 client tests), `npm run build` passed and `npm run lint` passed. Build emits existing annotation/bundle-size warnings. Backend regression now explicitly asserts a teacher receives 403 and creates no report; student club-owner reporting and duplicate serialization remain covered. Evidence in ignored `output/playwright/`: `corrected-live-teacher.png`, `corrected-live-student-zh.png`, `corrected-teacher-flag-zh.png`, `live-student-report-demo-ready.png`.

## Migration and live compatibility fix

Apply additive migration `apps/server/drizzle/0002_powerful_zombie.sql` with `npm run db:migrate` under the target environment, then reload the API before exposing reporting controls. This creates only a report table/index; it does not rewrite existing data. Already applied to this host's demo and isolated browser databases. Other environments still need the migration.

The reported localhost:5275 teacher-home failure was reproduced against the live authenticated API: HTTP 200 lacked `state.clubCommentReports` because the long-running API process predated the new frontend schema. Applied the migration using `.env.demo`, then restarted only `student-dash-demo-api.service`. A fresh authenticated response contained the report array and parsed with the full frontend response schema. Added a default empty array for this additive field so a temporarily older API process cannot break bootstrap; malformed report collections are still rejected. Regression tests cover state and command responses.

Live headless Chromium verification confirmed the teacher home and Rate My Club page rendered without the validation error. English and Chinese report dialogs opened and cancelled successfully. Complete pre/post state comparisons retained all pre-existing collections. The sample-demo task `5a1cf3ae-51a2-4071-9f36-8badbdfbd635` comment remained present, with score 4.0 and one rating; it was never deleted or reported during these checks.

## Verification

- Backend HTTP/database tests cover anonymous requests, session-owned identity, malformed/oversized/blank reason, wrong parent/unknown rating, own/hidden feedback, stale versions, student/club-owner review denial, report privacy, concurrent duplicate requests, direct database uniqueness, dismissal persistence, score/comment invariance and resolution through teacher deletion.
- Integration runs create a fresh uniquely named `student_dash_test_<pid>_<timestamp>` database and remove only that disposable database afterward. They no longer truncate any pre-existing database. Demo and browser fixtures are never reset.
- Client response tests cover the missing-array rollout regression, valid reports and malformed collections.
- Headless Chromium workflow used temporary verification servers on 5276/4102 with `student_dash_browser`, adding a uniquely identified fictional club/rating. Student cancellation, required reason, submission, duplicate prevention, reload persistence and absence of delete controls passed. Teacher review, dismissal, Chinese reporting and confirmed deletion passed; the fixture retained its 4.0 score and one rating after deletion. Existing browser fixture comments were preserved.
- Ignored screenshot evidence: `output/playwright/comment-report-review.png`, `live-report-dialog-en.png`, `live-report-dialog-zh.png`. The live dialog screenshots disable transition animations for readable evidence.

Check results are recorded in the completion report. Standard build warnings about dependency annotations and bundle size are pre-existing.


## Publication verification — 2026-11-15

Re-ran `npm test` (25 backend and 17 client tests), `npm run build`,
`npm run lint`, and `git diff --check`; all passed. Build retains the existing
dependency annotation and bundle-size warnings. Reviewed the completed CC wording,
100-character club introduction, rating/journal reporting and leader/teacher
moderation changes together, including migration 0002 and its schema snapshot.
Private environment files, account exports, runtime data and browser/build artifacts
remain ignored and excluded from publication. Tests created and removed only their
unique disposable databases; this review did not run browser fixture scripts, apply
live migrations, change live data or reset any existing database. Earlier browser
verification remains the evidence recorded above. See Git history for publication.
