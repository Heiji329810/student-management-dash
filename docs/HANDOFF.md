# CC handoff

Repository: `Heiji329810/student-management-dash`. Implementation and documentation
are versioned together; consult Git history for publication state. Original tracked
source remains recoverable through Git. No public deployment was performed.
The source-level audit is [coverage-review.md](coverage-review.md); it explicitly
records an earlier implementation snapshot. This document describes the final
implementation and verification, and supersedes that snapshot's open findings.

## Persistent demo

Live LAN URL: **http://192.168.101.93:5275**; local URL **http://localhost:5275**; API loopback localhost:4100. Independent
`student_dash_demo` database, fictional accounts, private `.local/demo-login.txt`.
User systemd services `student-dash-demo-api` and `student-dash-demo-web` keep it
running after the worker exits. Do not stop them during user review. Browser E2E
uses localhost:5274/API4101 and `student_dash_browser` separately.

## Architecture and operating commands

`apps/web` retains React 19, Vite, React Router, Tailwind and the original screens.
`apps/server` is Express 5 + Drizzle ORM + PostgreSQL + Better Auth.
`shared` provides Zod request/response contracts, typed entities and pure selectors.
No TanStack was introduced. Auth uses the official Better Auth React client and
Drizzle/Postgres adapter. The original role name `founder` means teacher; club
owners are students related through `clubs.founderId`.

```sh
cd /home/keesee/Projects/student-management-dash
npm ci
npm run db:local          # private project PostgreSQL; see README for binaries
npm run db:migrate
node scripts/provision-account.mjs  # hidden password; provisions teacher/student
npm run db:initialize     # idempotent system-org repair, also automatic on teacher provisioning
npm run dev              # web localhost:5275, API localhost:4100
npm run build
npm test
npm run lint
# With a built web app, npm start serves web and API on localhost:4100.
```

For ordinary PostgreSQL installations, set a dedicated `DATABASE_URL` in `.env`
and skip `db:local`. See `.env.example`. No external credentials are needed for
the verified local instance. `.env`, local database/binaries, fixture credentials,
screenshots, traces and browser state are ignored. Never add them to Git.

## Service and persistence design

`GET /api/state` returns a session-specific, Zod-validated consistent snapshot.
`POST /api/commands` takes `{expectedUserId,command,args}` validated by one of 31 shared strict
schemas. Each command is a business operation, not a browser-supplied state patch.
The server derives actor identity from Better Auth, rejects a stale tab whose
expectedUserId differs before any mutation, and applies role/resource guards
before invoking the extracted domain logic. Responses also pass shared Zod schemas
before a command transaction commits. The client validates incoming snapshots.

The same snapshot supports every existing read selector and all actual dashboard
calculations. Search, category filters, ordering, calendar navigation, top-three
year records and notification incremental display remain client projections of
real server data. The original app has no server pagination requirement or generic
list-editor CRUD screens. No placeholder dashboard totals were introduced.

Core students, clubs, activities, memberships and activity registrations use
relational tables, foreign keys and unique constraints. More complex original
records use separate typed JSONB tables, **one row per entity**, with indexed
natural uniqueness for attendance, ratings, votes, applications, scores, journals,
likes and school years. Better Auth owns its user/session/account/verification
tables. Drizzle schema is `apps/server/src/schema.ts`; generated SQL migrations
and snapshots are checked in under `apps/server/drizzle`.

Writes use one project-specific transaction advisory lock to serialize cross-record
workflows (e.g. last-seat registration and election finalization). Reads use
PostgreSQL `REPEATABLE READ READ ONLY` transactions **without that advisory lock**.
Persistence skips structurally unchanged rows; roster identities are managed only
by provisioning, never deleted by a stale business snapshot. This avoids the
provisioning race found during review. The current aggregate loading/diff approach
still scans all domain tables for a command and serializes writes; it is appropriate
for the current small dashboard, not a claim of large-district scalability. Before
scaling, split command repositories and locks by club/election with explicit
cross-aggregate transaction ordering. Do not simply remove the write lock.

Provisioning holds the project lock, checks email/student-ID uniqueness, calls
Better Auth's internal signup API, and creates the domain identity. A failed domain
transaction compensates by deleting only the newly created auth account/credentials.
Tests force a database insertion failure to verify cleanup and repeat initialization
to verify idempotency. Public signup and identity-edit routes are disabled.

## Auth, privacy, media and workflow decisions

- Same-origin `/api` proxy, credential cookies, exact trusted origins, POST Origin
  and cross-site checks, Better Auth CSRF checks, HttpOnly/SameSite=Lax cookies,
  production Secure cookies, auth/API rate limiting, session expiry and logout.
  No parallel localStorage auth or browser-owned roles. For the LAN demo,
  APP_ORIGIN is localhost:5275 and BETTER_AUTH_URL is the public LAN web origin
  http://192.168.101.93:5275, so exactly both origins are trusted. The web proxy is
  the only LAN listener; API4100 and PostgreSQL55439 bind127.0.0.1. Vite restricts
  served files to web/shared/dependencies and denies .env/.git/.local paths.
  Host LAN IP is dated2026-11-10 and may change with DHCP; update the explicit
  host/origin settings if it changes. No tunnel/router forwarding/firewall changes.
- Teachers retain the full rosters, contacts, attendance, ratings, applications and
  council records needed by existing teacher screens. Students retain their own
  identity and owned-club roster contacts; other students expose display names and
  opaque membership IDs, with email/student ID redacted. Ratings remain named and
  globally readable within the authenticated app, matching rankings/community UI.
  Notifications/read markers/removal notices are always recipient-scoped.
- Existing journal pages are readable by authenticated users across clubs; membership
  was not a requirement in the original product. Published photos share that access.
  `/api/media/:id` requires a valid session and an active activity's published journal
  reference. Unpublished, canceled and nonexistent assets are unavailable. Upload
  ownership is checked on edits; photos live in PostgreSQL, not browser storage.
- Journal images support PNG/JPEG/GIF/WebP, eight images, approximately 3 MB each,
  with MIME/signature checks and transaction rollback. SVG is intentionally excluded.
  Photo links returned to the client are `/api/media/<uuid>`; external social links
  accept HTTP(S) only. There are no external object-storage credentials to configure.
- Missing student roster identity is an explicit 403, never a false successful
  registration/membership operation. Registration capacity and duplicate handling
  are server-owned and tested concurrently. Past/closed registration follows the
  same shared `isActivityPast` policy as the UI.
- Attendance keys use local calendar Mondays, avoiding the original positive-UTC
  date shift. Set server `TZ=Asia/Taipei` for this school's local times. Current
  owner-entered attendance still allows historical/future Mondays and owner's own
  attendance, matching the original UI; there is no teacher-approval policy.
- Cancellation retains server-side activity metadata/reason/timestamp and clears
  registrations. Current snapshots hide canceled activities, preserving original
  removal behavior while retaining history in persistence. Cancellation notifications
  retain the participant message; related media becomes unavailable.
- Removing a current council club member also removes their active department seats;
  archived terms stay unchanged. Teacher-added council members can be at large
  (no department); new annual crews replace current membership. Department election
  publication checks the active term/election binding and recomputes department union
  so replaced members do not linger. Historical unregister remains permitted as in
  the original Registrations page.

## Coverage matrix

All rows require actual API/PostgreSQL persistence; **API pass** refers to the
integration suite, not the mere existence of a command. Browser evidence is recorded
in the final verification section below. `S` denotes projected `GET /api/state`;
`C(name)` denotes `POST /api/commands` with that command. Auth uses `/api/auth/*`.

| Frontend feature / dependent workflow | API/service and persistence | Backend verification | Browser verification |
| --- | --- | --- | --- |
| Login, session hydration, protected routes, expiry, logout | Better Auth user/account/session; S | API pass: anonymous401, password failure, logout/expiry401, signup403, role/origin checks | Pass: login/logout, invalid password, teacher/student/owner isolation, real429 reload recovery, expired-session401 and protected-route redirect |
| Student Home totals, active/largest clubs, registrations, council count, yearly rating/event rankings | S clubs/activities/memberships/registrations/ratings/terms; real pure calculations | API pass: persisted state and privacy; selector/contract checks | Pass: real club/registration/council totals and yearly event/rating rankings (4.8 persisted rating) |
| Clubs category tabs, browse/detail, upcoming/past events, navigation search | S clubs/activities; existing filters/sort/search | API pass: round trip and closed activity guards | Pass: category tabs, detail, upcoming/past events, Search pages navigation |
| Join/leave ordinary club; owner and official membership restrictions | C(joinClub,leaveClub), memberships, owner notifications | API pass, duplicate/idempotent, official403, owner retention | Pass: member leave/rejoin; owner management and official membership controls |
| Activity register/unregister; My Registrations | C(registerForActivity,unregisterFromActivity), registrations, notifications | API pass: capacity race, duplicate, past/closed/missing/identity/role | Pass: register/unregister/re-register, full-event disabled/409, retained registrations after cancellation |
| Create Club founder names/category/introduction/official teacher form | C(submitClubApplication), club_applications | API pass: strict fields,100-word limit, duplicate, required teacher | Pass: ordinary and official applications, multiple founders and teacher requirement |
| Teacher review approve/reject and applicant result | C(reviewClubApplication), applications + club + founder membership + notification in one transaction | API pass: reject comment, pending-only, direct ordinary/official establishment, teacher-only | Pass: approve ordinary/official; reject with required reason, applicant notification navigates to persisted status/reason |
| Manage club selection/member rosters | S ownership + members/students | API pass: projected contacts and owner scope | Pass: owner selection and real member roster; nonowner denied |
| Calendar/week attendance and three-session eligibility | C(setClubMemberAttendance), club_attendance | API pass: member/owner guard, Monday/date/enum, natural uniqueness; Taiwan week unit check | Pass: previous month navigation, absent/leave/present, three distinct Mondays unlock rating |
| Create/edit activities; one-day/long-term, capacity/campus-wide/location options | C(createActivity,updateActivity), activities + member notifications | API pass: future-event title/capacity update; nonowner403; past/cancelled edit409 with unchanged persisted rows; shared input validation | Prior workflow report: creation and capacity edit. Screenshot16 verifies past-event edit guard, not completed-event editing; no upcoming edit-form capture in gallery |
| Cancel activity confirmation and participant cancellation dialog | C(cancelActivity), retained activities, cleared registrations, removal_notices, notifications | API pass: min10 reason, permission, archived metadata, notices and media404 | Pass: short-reason validation, cancellation, participant message dialog, registration removed |
| Journal create/edit, reflection, participant checklist, social link, photo add/remove | C(saveActivityJournal), journals + media | API pass: participant subset/uniqueness, URL/type/size/ownership, roundtrip, rollback | Pass: required participants, reflection/social link, two photos add/one remove, edit/reload persistence |
| Published journal read, participants, photos and social link | S + GET/api/media/:id; journals/media/students | API pass: session required, published asset/type, cancellation404 | Pass: member read, participant name, authenticated image decode and social link |
| Journal top-level star/comment, nested reply, author tree deletion, likes | C(postJournalThreadComment,deleteJournalThreadComment,toggleJournalLike), comments/likes/notifications | API pass: ratings/body/parent ownership, delete403, subtree, like toggle, reply notifications | Pass: 5-star comment, cross-author reply, like/unlike, own root deletion removes reply subtree and remains deleted after reload |
| Rate My Club eligibility/form/edit/community feedback, teacher averages | C(saveClubRating), attendance + membership + ratings; S projections | API pass: three sessions, member guard, stars, no identity overposting, upsert | Pass: locked before attendance, 4.6 create/4.8 edit, reload and teacher average |
| Notification list/unread/mark-read/incremental display/navigation | S + C(markNotificationRead), notifications + notification_reads | API pass: recipient-only read/mark, persistence, cancel/application notifications | Pass: incremental scrolling, read/navigation, cancellation dialog, reply link and rejection destination |
| Teacher official-event creation and registered student roster | C(createOfficialEvent), activities/registrations/students; automatic system org initialization | API pass: form validation, role guard, persisted roster | Pass: campus-week creation and Demo Member registration/contact roster |
| Teacher participation summaries and official organization add/remove member | S + C(teacherAddOfficialClubMember,teacherRemoveOfficialClubMember), memberships + active council term when relevant | API pass: role/category/identity, current department cleanup, archive preservation | Pass: official member add/remove, three weekly summaries and 4.8 rating |
| New Student Council year, department count/names/student search, current/archive details | S + C(startStudentCouncilTerm), terms/departments + council membership | API pass: unique year/names/existing students, rollover/archive integrity | Pass: department/student selection, rollover through 2028–2029 and archived crew |
| Dormant club election schedule/vote/finalize | C(createClubElection,castClubElectionVote,finalizeClubElection), elections/votes/apps/linked official event | API pass including concurrent duplicate vote; explicit legacy candidate fixture | No rendered UI: original routes redirect to /clubs |
| Dormant event election configuration/apply/scorer/external score/message/results and department assign/remove | C(createEventElection,submitEventElectionApplication,scoreEventElectionCandidate,submitExternalElectionScore,sendEventElectionMessage,publishEventElectionResults,assignStudentCouncilDepartmentMember,removeStudentCouncilDepartmentMember), corresponding election tables/notifications/terms | API pass: full text-field/scoring/publication workflow, binding, union, invalid fields | No rendered UI in original app |
| Dormant election file/video fields | Current frontend defines enum types but has no uploader or rendered application form | Explicit422 unsupported; never pretend string values are uploaded files | Documented gap; needs a deliberately scoped upload UI/storage workflow |
| Theme, language, transient form/search/calendar/dialog state | Browser-only cosmetic prefs `theme`, `dashboardLanguage`; no business localStorage | Source audit; no server data requirement | Pass: English/Chinese login validation, theme/language reload persistence; business localStorage absent |
| Legacy route aliases/not-found/denied states and responsive layout | Existing React Router/Layout, authenticated S | API role guards; source route inventory | Pass: aliases redirect, missing club, teacher page/student denial; separate responsive diagnostic at 360/1280/2022 reported by foreground |

### Activity edit evidence correction (2026-11-10)

`updateActivity` in `apps/server/src/domain.ts` rejects missing, cancelled or past
existing activities. The original Git `HEAD:src/context/AppContext.tsx` has the same
rule, and both original/current `ManageActivitiesEdit.tsx` render “Activity Has
Ended” instead of a form for past activities. Screenshot16 was visually inspected
and shows this guard; its filename is not evidence of a successful edit.

Timing follows `shared/src/activities.ts:isActivityPast`: one-day timestamped events
become past after their start instant; date-only events after local day end;
long-term events after local end-date day end (so an ongoing long-term event can
still be edited). Allowed edits require the owning student and valid form input.
Past/cancelled API updates return409; the integration regression now asserts that
valid future replacement input cannot bypass these guards or change persisted rows.
The existing positive test updates a future event's title/capacity and verifies the
stored title plus capacity enforcement. This is API evidence, not a browser-form
capture. Prior “completed-event edit” and all-expanded-form gallery claims were
incorrect. No business rule or application functionality was changed; no new
upcoming edit-form screenshot was captured. Draft preservation was reported in the
earlier browser workflow; the12 client session-policy tests check authentication
verdicts, not edit-form draft persistence.

## Implementation review resolutions

Resolved: backend identity/auth; all31 action validation; shared response validation;
missing identity errors; provisioning cleanup/race; normal initialization; independent
reads; capacity/past guards; canonical attendance; club/activity word limits;
overposting; journal participant/media checks; notification ownership; soft cancellation;
active council removal and stale-election result union. The complete integration suite
exercises every command positively and every command with a malformed tuple.

Intentionally retained or limited: teacher role's original name; at-large council
membership; owner-entered attendance policy; historical unregister; source-compatible
client filtering/pagination; named ratings; aggregate write architecture; dormant election
screens and missing election upload flow. There is no automatic import of untrusted
legacy browser-local data and no destructive `studentCouncilYearsReset` startup behavior.
Original upstream demo data was removed as a runtime dependency.

### Publication review (2026-11-10)

Re-ran `npm run build`, `npm run lint`, and `npm test`: all passed, including
20 backend/contract tests and 12 client session-policy tests. Browser evidence
above remains from the earlier verification; publication review did not rerun
browser workflows or reset the demo/browser fixture databases. Build output has
nonblocking dependency/deprecation and chunk-size warnings.

Reviewed tracked files and outgoing Git blobs for private values. Environment
files, generated demo/browser account credentials, local PostgreSQL data/binaries,
screenshots, traces, reports and build artifacts remain ignored. `.env.example`
contains placeholders; the integration password is a disposable test fixture.
Ignore rules additionally exclude runtime uploads, private exports, database dumps
and common credential-key files. Presentation assets are maintained separately.

## Final verification and artifacts

Backend phase: TypeScript checks and actual isolated PostgreSQL/Better Auth integration
passed before client wiring. Additional regression tests cover review fixes.
Full shared/server/web production build and web lint pass. Root `npm test` now includes
20 backend/contracts tests and12 client session-policy cases. Watched Playwright
workflows exercised the matrix above against Better Auth and actual PostgreSQL,
using a separate browser fixture database. See [browser results](PLAYWRIGHT-RESULTS.md)
for evidence, presentation captures and operational limits.

Playwright skill installed from the official `openai/skills` curated catalogue at
`/run/user/1000/omarchy-aicontrol/native-codex/skills/playwright/SKILL.md`; available to
Ava on the next turn. The supplied CLI wrapper is invoked with `bash` because the
installation preserves a non-executable file mode. Headless Chromium is permitted;
no Ava lifecycle or desktop controls are involved. Browser output belongs under
`output/playwright/` (ignored). Use a separate `student_dash_browser` fixture database:

```sh
npm run verify:prepare  # recreates only the dedicated browser fixture database contents
# API terminal:
node --env-file=.env.e2e --import tsx apps/server/src/index.ts
# Web terminal:
node --env-file=.env.e2e node_modules/vite/bin/vite.js apps/web --host 127.0.0.1 --port 5274 --strictPort
```

Sources checked for implementation:
[Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle),
[Express integration](https://better-auth.com/docs/integrations/express),
[Better Auth client usage](https://better-auth.com/docs/basic-usage),
[Zod schemas](https://zod.dev/api),
[Drizzle migrations](https://orm.drizzle.team/docs/migrations),
[Express async error handling](https://expressjs.com/en/guide/error-handling/).
