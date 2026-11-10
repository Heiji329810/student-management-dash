# Browser verification and presentation evidence

Verified 2026-11-10 using the installed official curated Playwright CLI skill:
`/run/user/1000/omarchy-aicontrol/native-codex/skills/playwright/SKILL.md`.
This was a sequence of actual rendered browser workflows, not an invented count of
Playwright test-runner specs. The backend integration suite separately covers all31
commands, including dormant services that have no rendered screens.

## Isolation and browser ownership

The automated browser uses `http://localhost:5274`, API4101 and
`student_dash_browser`. The persistent demo at `http://192.168.101.93:5275`
uses API4100 and `student_dash_demo`; no E2E reset targets that database.
The user's ordinary right-hand demo browser remains user-owned. Foreground launched
the watched left Chromium; the worker only issued page actions through its CLI.

The final watched session is **student-fullscreen**, with
`output/playwright/fullscreen-browser.json`, Chromium executable `/usr/bin/chromium`
and `contextOptions.viewport:null`. Actual inner/outer dimensions were2022×1137.
The older student-visible session was closed by foreground after a fixed viewport
was diagnosed. Do not reattach to it or use resize/setViewportSize in the watched session.
The worker did not control the desktop or Ava lifecycle.

## Observed workflows

- Better Auth login, wrong password, logout, teacher/student/owner access,
  protected routes, real rate-limit recovery and expired-session401/login redirect.
- Browse categories, club detail, navigation search, dashboard counts/year rankings,
  ordinary membership leave/rejoin and privacy-projected rosters.
- Ordinary/official club applications, multiple founders, managing teacher fields,
  teacher approval/rejection and applicant notification/status/comment.
- Owner event creation/editing, capacity and full-event rejection; member registration,
  unregister/re-register, past/upcoming registrations; cancellation minimum-reason
  validation and participant message/removal while other registrations persist.
- Owner weekly attendance, calendar month navigation, absent/leave/present and
  three distinct Mondays; rating eligibility, create4.6/edit4.8, reload and teacher average.
- Journal required participants, reflection/social link, two uploaded PNGs/one removed,
  saved image decoded from authenticated PostgreSQL-backed media, edit and reload.
  Member read, likes toggle, root5-star comment, self-reply, cross-author reply,
  author deletion with subtree removal and reload persistence.
- Notification incremental scrolling, unread/read persistence and activity/journal/reply
  navigation, cancellation dialog and application outcome destination.
- Teacher official event/long-term campus-week creation, actual registered-student
  roster/contact projection, official membership add/remove, participation summaries.
- Council department/student selection, three year records, rollover/current crew and
  preserved archived departments. Teacher role remains the source-compatible `founder`.
- English/Chinese login validation and cosmetic locale/theme persistence. Source audit
  and runtime storage inspection found no browser-owned business/auth source of truth.
- Aliases, missing-club and role-denied routes. Separate headless layout diagnostic
  covered Home/Clubs/Registrations/Manage at widths360,1280,2022:12 combinations,
  no horizontal overflow. Watched browser was never resized for this diagnostic.

## Bugs found and corrected during verification

- Registration confirmation stayed open and changed into withdrawal: close only after
  awaited successful mutation; retain it on failure.
- Session bookkeeping could duplicate refreshes: coalesce checks and throttle focus;
  preserve drafts during unchanged background snapshots.
- Reloading during get-session429 redirected to login: treat non401 auth errors as
  recoverable, authenticate directly through `/api/state`, retain unresolved loading
  with retry. A real429 followed by reload recovered the fixture session. Genuine
  expiry still401s and redirects. Twelve client policy regression cases accompany this.
- Login localization now uses the actual LanguageProvider with a prelogin toggle.

## Artifacts and reuse

Original evidence lives in ignored `output/playwright/`, including `visible-*.png`,
CLI snapshots/logs, `visible-auth429-recovery.png`, `visible-expired-session.png`
and `full-width-geometry.json`. Expected negative auth/permission responses appear
in logs; these are distinct from unexpected application errors. Radix emitted a
nonblocking missing-description warning on the cancellation notice dialog.

**42 high-resolution full-page PNGs** and page/role labels are in
`/home/keesee/Pictures/CC-student/index.md`. Images use only fictional fixture data,
English, consistent dark theme and native fullscreen width. Login capture has empty
credentials. Every concrete routed page is represented, with teacher/student variants
and captured expanded forms. The upcoming edit form is not captured; screenshot16
shows its past-activity guard. Guard states are labelled explicitly. Aliases and dormant election
services have no independent page and are not represented by fabricated screenshots.

Fixture account passwords remain in private ignored `.local/browser-accounts.json`.
For further verification, use `PW_SESSION=student-fullscreen node scripts/playwright-login.mjs ACTOR`
after a fresh login snapshot. Do not print the account file. The guarded
`node scripts/expire-browser-session.mjs member` utility expires only that actor's
sessions in the isolated browser database; it deliberately uses a far-past timestamp
independent of host/database timezone. Re-login afterward. `npm run verify:prepare`
resets the browser fixture: never run it while someone is using this test browser.

## Activity edit evidence correction (2026-11-10)

Visual reinspection of gallery screenshot16 (`16-owner-edit-activity-form.png`)
confirms “Activity Has Ended / Past events can no longer be edited”. This is the
original frontend's past-activity guard, also enforced by current `updateActivity`;
it does not show an editable form or a completed-event edit pass. The gallery title
and handoff matrix have been corrected. The earlier owner-edit/capacity workflow
report above is separate from this screenshot; no fresh browser-edit workflow was
run for this correction, and the gallery has no upcoming edit-form capture.
Integration evidence covers a future-event title/capacity update and now explicit
past/cancelled update409 rejection with unchanged PostgreSQL records. No demo or
browser fixture reset, user-browser interaction, or presentation change was made.

## Explicit limits

Dormant election text/scoring/publication services pass integration checks but have no
rendered UI in the original frontend. Election file/video upload fields return422;
a future upload UI/storage workflow is needed. Whole-dataset snapshots and serialized
write transactions suit this local app; larger deployments need scoped queries/writes.
LAN login/data/logout was verified from this host; another physical device was not observed.
No public deployment, commit or push was performed.
