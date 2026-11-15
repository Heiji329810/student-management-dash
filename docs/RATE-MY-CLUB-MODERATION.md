# Current moderation scope

As of 2026-11-15, club leaders can moderate their own clubs, and teachers retain cross-club moderation. This covers rating comments **and journal comments/replies**, reversible unpublish, confirmed text deletion, pin/unpin and scoped report queues. See [COMMENT-REPORTING.md](COMMENT-REPORTING.md) for current behavior, authorization, persistence and verified checks. The teacher-only and journal-exclusion statements below describe the earlier implementation and are superseded.

---

# Teacher Rate My Club moderation

Verified 2026-11-15. No Git push performed.

- `npm test`: 22 server tests and 12 client session tests passed. The integration database is explicitly isolated as `student_dash_test`.
- `npm run build`, `npm run lint`, and `git diff --check`: passed.
- API moderation coverage: teachers can clear the exact club/rating comment; students (author, unrelated student and club owner) receive 403. Wrong club/rating combinations and unknown ratings receive 404; already cleared comments receive 409. Fresh API/database reads retain scores and unrelated comments. Teacher rating submissions and student attendance commands remain forbidden.
- Browser verification at `http://localhost:5274/rate-my-club` used existing isolated `student_dash_browser` accounts/data without a fixture reset. Teacher view showed rankings and a 4.8 student rating. Confirmation identified the author and quoted the comment, explained score retention, and offered Cancel. Cancel preserved the comment; confirmation removed it, retained 4.8 and one rating, and remained cleared after reload. Screenshot: `output/playwright/teacher-comment-deleted.png` (ignored artifact).
- Eligible student: three present check-ins still showed the rating form; the moderated comment loaded empty. The student updated the comment through the existing form and the update persisted after reload. No teacher delete control was available.
- Ineligible student: nonmember could read existing feedback, saw the membership restriction, and received neither a rating form nor moderation controls.
- Persistent demo: `http://localhost:5275/rate-my-club` authenticated successfully as teacher, displayed rankings/feedback and teacher guidance; sidebar and page search exposed Rate My Club. The current demo has zero ratings, so destructive moderation was exercised only against isolated test/browser data.
- Demo health through `http://localhost:5275/api/health` returned `{"ok":true}`. LAN route `http://192.168.101.93:5275/rate-my-club` returned HTTP 200. Demo API service was restarted to load the new command; the web service remains usable.

Teachers use role `founder`; student club ownership uses `founderId` and grants no moderation permission. Teacher-authored ratings are unsupported. Student membership, attendance and submit-before-view behavior are preserved. Deleting a comment clears its text only; a student who remains eligible can subsequently edit their own rating/comment. Journal thread comments and their existing author-only deletion are separate from Rate My Club comments.

Existing Clubs, Registrations, RateMyClub wording and 100-character introduction work were preserved. No edits were made to `uiTranslation.ts` for this feature.
