# Frontend and domain coverage review

Reviewed 2026-11-10 against the original tracked `HEAD:src/**` (read through `git show HEAD:<path>`) and the in-progress working tree. Original source is approximately 480 KB across 74 source/assets files. This is a static source review, not an end-to-end execution or a production security certification. Only this report was authored by the reviewer. Other agents are changing the application concurrently; findings below describe the snapshot inspected and require rechecking after fixes.

Path convention: original paths are `src/...`; during review the web app was under `client/src/...`, domain under `server/src/domain.ts`, and extracted helpers/types under `shared/`. The planned workspace equivalents are `apps/web/src/...`, `apps/server/src/domain.ts`, and `shared/src/...`. Screen and action names remain useful across the move. The working copy retained the original screen/router/component content; changed helper/type files re-exported shared implementations, mock data moved out, and category imports were redirected. At the snapshot inspected, AppContext still contained the original localStorage implementation; API-backed replacement was in progress elsewhere.

## Reachable screens and reads

All routes except `/login` pass `ProtectedRoute` and the shared `Layout`. That guard checks authentication only. Each restricted page or domain operation needs its own role/resource checks. Role `founder` means **teacher** in this product; a student club founder still has role `student` and owns clubs through `club.founderId === currentUser.id`.

| Route / screen | Audience and read path | Mutation / behavior |
| --- | --- | --- |
| `/login` — Login | Public; email/password form | `login` (outside domain action inventory); required fields, generic invalid-credentials result. Original mock login accepted any nonempty password for a matching mock email. |
| `/` — Home | Students read clubs, activities, registrations, students and aggregate club ratings; teachers render embedded TeacherDashboard | TeacherDashboard reads all applications, students, active council term and calls `reviewClubApplication`. Student dashboard links to browse/register/manage/rate workflows. |
| `/clubs` — Clubs | Authenticated; clubs/categories, ordinary/official groupings, member/activity counts, category tabs | Embedded ClubJoinButton calls `joinClub` / `leaveClub` for students, except category School Official Events. Teacher links expose member summaries. |
| `/clubs/:clubId` — ClubDetail | Authenticated; club, activities split upcoming/past, own registration/membership/attendance, journal presence | Students register/unregister through activity cards and join/leave. Teacher links to members and participation. UI disables full registration; past cards link to journal. |
| `/clubs/:clubId/members` — ClubMembers | Authenticated; `getClubMembers`, names/student IDs/emails | Read-only. This original page has no teacher-only or owner-only guard. |
| `/clubs/:clubId/participation` — TeacherClubParticipation | Teacher-only; members, all club attendance grouped by week, ratings and aggregate score, available students | `teacherAddOfficialClubMember` / `teacherRemoveOfficialClubMember` only for category School Official Events. Ordinary clubs still have teacher-readable participation summaries. |
| `/clubs/:clubId/activities/:activityId/journal` — ActivityJournalView | Authenticated; club/activity, journal/photos/social link, participant names, comments/likes | Embedded JournalCommentsSection: like toggle, top-level rating/comment, nested reply, author deletion with confirmation. Owning student can follow journal-edit link. Missing journal offers owner creation link. |
| `/registrations` — Registrations | Student-only; own student, clubs and registered activities, upcoming/past groupings | `unregisterFromActivity`, confirmation dialog, club/journal links. |
| `/create-club` — CreateClub | Student-only; own applications and statuses/comments | `submitClubApplication`; dynamic founder names, official request/teacher-name fields, confirmation/submitted state. |
| `/manage` — ManageClubsAndActivities | Student-only; `getMyClubs`, selected owned club | Navigation to member/check-in and activity management; no separate domain mutation. |
| `/manage/clubs` — ManageClubs | Student-only; `getMyClubs` | Owned-club selector/list and create-club link. |
| `/manage/clubs/:clubId/members` — ManageClubMembers | Owning student; `getClubMembers` | Read-only member list, tab to check-in. Teacher access redirects to public authenticated club-member page. |
| `/manage/clubs/:clubId/check-in` — ManageClubCheckIn | Owning student; members, selected week attendance, all club attendance for presence totals | `setClubMemberAttendance`; calendar/month/week controls; statuses present, absent, leave. Teacher guard redirects to member list. |
| `/manage/activities` — ManageActivities | Student-only; `getMyClubs` | Owned-club activity-management selector. |
| `/manage-activities/:clubId` — ManageActivitiesClubOptions | Owning student | Navigation to add/edit/journal/cancel. |
| `/manage-activities/:clubId/add` — ManageActivitiesAdd | Owning student | `createActivity`, shared ActivityForm. |
| `/manage-activities/:clubId/edit` — ManageActivitiesEdit list | Owning student; club activities split editable/upcoming and past | Select an activity; past activity offers journal path. |
| `/manage-activities/:clubId/edit/:activityId` — ManageActivitiesEdit form | Owning student; selected activity | `updateActivity`; past/cancelled item cannot be edited. |
| `/manage-activities/:clubId/cancel` — ManageActivitiesCancel | Owning student; upcoming activities | ActivityManageRow cancellation dialog calls `cancelActivity`, required participant message and irreversible confirmation text. |
| `/manage-activities/:clubId/journal` — ManageActivitiesJournal | Owning student; activities and `getActivityJournal` | Journal status/list and links to editor. |
| `/manage-activities/:clubId/journal/:activityId` — ManageActivitiesJournalForm | Owning student; activity, existing journal, `getRegisteredStudents` | `saveActivityJournal`; name/reflection, participant checklist, social URL, up to eight photos; shared form and validation. |
| `/rate-my-club` — RateMyClub | Student-only; all clubs and clubRatings for ranking/community feedback, own attendance/member status and `getClubRating` | `saveClubRating`; membership plus three present sessions required; eligible unsubmitted users see rating form before community feedback. Does not call `getRateableClubs`. |
| `/founder` — Founder | Teacher-only; School Official Events club excluding Student Council, events, `getRegisteredStudents` | `createOfficialEvent`; shared activity form; lists registrants with personal details. |
| `/student-council` — StudentCouncil | Teacher-only; students, active and archived terms/departments | Link to new year and archived year detail; no assign/remove UI. |
| `/student-council/new` — NewStudentCouncilYear | Teacher-only; students and existing years; school-year choice, department count/names, member search/selection | `startStudentCouncilTerm`; confirms crew, archives active year, replaces council membership with union of new departments. |
| `/student-council/years/:termId` — StudentCouncilYear | Teacher-only; one active/archive term, departments, student identity/contact details | Read-only; not-found state. |

Router compatibility paths: `/club-elections`, `/elections`, `/school-official-clubs` redirect to `/clubs`; `/manage/clubs/:clubId` redirects to `members`; `/manage-activities` and `/add-activity` redirect to `/manage/activities`; `/add-activity/:clubId` uses RedirectAddActivity to options; wildcard redirects to `/`. There is no original rendered club-election/event-election/scoring/results page. Election notification links to `/elections` therefore do not open election functionality.

Shared screens and controls: Layout exposes role-dependent navigation, profile name/email, logout, theme/language switches and NotificationBell. NavSearch searches role-aware destinations and clubs, supports keyboard selection and navigation. NotificationBell reads `getMyNotifications`, `getUnreadNotificationCount`, `isNotificationRead`, incrementally reveals records on scroll, marks clicked notifications read, navigates ordinary links, and opens a cancellation-message dialog. These are local pagination/display operations over already loaded state, not independent server reads. UI primitives (badge/button/card/dialog/input/select/table/tabs), styling, emoji/date helpers and SVG assets add no domain actions.

## Complete mutation mapping to docs/action-inventory.json

Every one of the 31 action entries is listed here. Reachable means a concrete call site in the original rendered frontend; dormant means implementation/context exposure without any component call site.

| Action | Reachability / caller | Authorization and workflow in inspected domain |
| --- | --- | --- |
| `registerForActivity` | Reachable: ClubDetail | Student identity resolved from session; existing noncancelled activity; idempotent membership in registeredStudents; owner notification. Capacity/past safeguards missing. |
| `unregisterFromActivity` | Reachable: ClubDetail, Registrations | Own student only; removes own registration; no past restriction. |
| `submitClubApplication` | Reachable: CreateClub | Student; valid student, 1–5 nonblank founders, name/category/description, official managing-teacher name, duplicate pending/name check. |
| `reviewClubApplication` | Reachable: TeacherDashboard embedded in Home | Teacher; pending only; reject requires comment; approve creates ordinary or official club directly; result notification. |
| `createClubElection` | Dormant | Teacher; scheduled uniqueness, date/positive integer threshold, approved-official-candidate pool; creates linked official activity and notifications. |
| `castClubElectionVote` | Dormant | Student; election today, valid candidate, one vote per user. |
| `finalizeClubElection` | Dormant | Teacher; scheduled election date today or earlier; counts votes, establishes clubs, removes linked election activity, sends results. |
| `createOfficialEvent` | Reachable: Founder | Teacher; target official-events club; required fields, location/capacity conditions. Date validity/order missing here. |
| `createEventElection` | Dormant | Teacher; target official activity or active council department, title/type/standards/date, application fields, scorer assignments; invitation notifications. |
| `submitEventElectionApplication` | Dormant | Student; published, date not passed, not scorer, one application; required/choice answers; receipt notification. |
| `scoreEventElectionCandidate` | Dormant | Student assigned scorer; election today/published, correct application, finite score 0–100; one immutable score per scorer/application. |
| `submitExternalElectionScore` | Dormant | Teacher enters score on behalf of external invite; date today or earlier, published, correct application, finite 0–100, one score. |
| `startStudentCouncilTerm` | Reachable: NewStudentCouncilYear | Teacher; unique year, nonempty uniquely named departments, existing student IDs, deduplicated department members; archive old term and replace council membership. |
| `assignStudentCouncilDepartmentMember` | Dormant | Teacher; active term/department/existing student, no duplicate; updates council union. |
| `removeStudentCouncilDepartmentMember` | Dormant | Teacher; active department/current member; removes council member only if absent from other departments. |
| `sendEventElectionMessage` | Dormant | Teacher; existing election, nonempty message, applicants; stored message plus per-applicant notifications. |
| `publishEventElectionResults` | Dormant | Teacher; published, date reached, applicants and nonempty valid selected IDs, complete score count; records totals/averages/selections and notifies applicants. Council membership inconsistency noted below. |
| `setClubMemberAttendance` | Reachable: ManageClubCheckIn | Owning student; current member only; upsert by club/week/student. No runtime week/status constraints. |
| `joinClub` | Reachable: ClubJoinButton in browse/detail | Student; current student, existing club, category not School Official Events, no duplicate; owner notification. |
| `leaveClub` | Reachable: ClubJoinButton | Student; removes own member ID. Official category restriction missing at domain layer. |
| `teacherAddOfficialClubMember` | Reachable: TeacherClubParticipation | Teacher; School Official Events, existing student, not already member. |
| `teacherRemoveOfficialClubMember` | Reachable: TeacherClubParticipation | Teacher; School Official Events, current member. Council term synchronization missing. |
| `createActivity` | Reachable: ManageActivitiesAdd | Owning student; required fields/date validity/end order/location/positive participant estimate; member notifications. |
| `updateActivity` | Reachable: ManageActivitiesEdit | Owning student; existing upcoming/noncancelled activity; same creation checks. |
| `saveClubRating` | Reachable: RateMyClub | Student/current member/three present records; four dimensions and overall integer stars 1–5; comment ≤500; own rating upsert. |
| `markNotificationRead` | Reachable: NotificationBell | Session user’s read set only; no check ID belongs to their notification. |
| `saveActivityJournal` | Reachable: ManageActivitiesJournalForm | Owning student; activity exists; shared journal validation; upsert journal and timestamps. |
| `postJournalThreadComment` | Reachable: JournalCommentsSection | Authenticated; club/activity exists, body/rating validation, parent in same activity; reply notification. |
| `deleteJournalThreadComment` | Reachable: JournalCommentsSection | Author only; deletes entire descendant tree, including replies by others. UI confirmation reflects tree deletion. |
| `toggleJournalLike` | Reachable: JournalCommentsSection | Authenticated; club/activity exists; unique own like toggle; owner notification. |
| `cancelActivity` | Reachable: ManageActivitiesCancel → ActivityManageRow | Owning student; upcoming/noncancelled activity, nonempty reason; creates participant notices/notifications and physically removes activity. |

Authentication (`login`, `logout`, session hydration), browser theme/language preferences, file-to-data-URL conversion, and navigation/search/calendar/selection/form draft state are outside those 31 domain action names. A complete migration must include authentication and preference behavior separately; action-count parity alone cannot demonstrate completion.

## Complete read/state mapping

| Selector inventory entry | Frontend consumers / status |
| --- | --- |
| `getRegisteredStudents` | Founder official-event rosters; journal editor participant choices |
| `getActiveClubElection` | Dormant; used internally by dormant voting |
| `getMyClubs` | ManageClubsAndActivities, ManageClubs, ManageActivities |
| `getClubMembers` | ClubMembers, ManageClubMembers, ManageClubCheckIn, TeacherClubParticipation |
| `getClubAttendanceForWeek` | ManageClubCheckIn |
| `isClubMember` | Dormant convenience selector; UI derives membership directly |
| `getRateableClubs` | Dormant convenience selector; RateMyClub ranks all clubs and derives eligibility directly |
| `getClubRating` | RateMyClub, own rating only |
| `getMyNotifications` | NotificationBell |
| `isNotificationRead` | NotificationBell |
| `getUnreadNotificationCount` | NotificationBell |
| `getMyRemovalNotices` | Dormant frontend selector; cancellation visibility delivered via notifications |
| `getActivityJournal` | ClubDetail, ActivityJournalView, ManageActivitiesJournal, ManageActivitiesJournalForm |
| `getJournalThreadComments` | JournalCommentsSection |
| `getJournalLikes` | JournalCommentsSection |

All 19 state entries in the inventory: `clubs` drives nearly all screens (activities, registration/member IDs nested within it); `clubApplications` drives CreateClub and TeacherDashboard; `clubElections` / `clubElectionVotes` are dormant election state; `eventElections` / `eventElectionApplications` / `electionScorerInvites` / `electionCandidateScores` / `electionApplicantMessages` are dormant election state; `studentCouncilTerms` drives teacher home and council pages; `students` supplies identity resolution and rosters; `removalNotices` feeds cancellation notification migration but has no rendered direct selector caller; `activityJournals` drives journal views/editors; `journalThreadComments` and `journalLikes` drive embedded discussions; `clubAttendance` drives member attendance, own joined count and rating eligibility; `clubRatings` drives Home/RateMyClub/teacher summaries; `notifications` and `readNotificationIds` drive NotificationBell. Dormant collections remain persisted and need authorization if exposed through API.

The new domain factory returns mutations only, although it contains internal selector implementations. The replacement client must keep the 15 selector methods through projected-state derivation or explicit read endpoints. In particular selectors must not run on unrestricted global data in a request and bypass projection.

## Validation, files and browser persistence

- Club application UI: 1–5 founder names, name/category/introduction, introduction maximum 100 words, managing teacher required for official request, category dropdown excludes School Official Events. Domain lacks word limit/category allowlist and trusts TypeScript field shapes.
- Activity UI: name/introduction, introduction ≤100 words, valid start timestamp, long-term end date on/after start, required location unless undetermined, participant estimate ≥1 unless campus-wide. Domain creation/update repeat only part of this validation; official-event creation repeats less. There is no original blanket future-date requirement for creation. Existing past activities cannot be updated/cancelled.
- Journal: nonempty activity name/reflection, reflection ≤1000 words, at least one participant if there are registrants, parseable URL if supplied, ≤8 photos. Participant checklist only offers registered students. File input is multiple `image/*`; FileReader reads each browser file into a data URL, appends/removes previews. There is no original upload endpoint, file object persistence, storage key, size/compression check or download/export flow. MIME prefix checking is browser-side only. Election `video_upload` / `file_upload` are dormant field types with string answers, not implemented file workflows.
- Comments: trimmed nonempty body ≤500 characters; top-level requires rating in range 1–5; reply carries parent ID and no rating. Rating integer/finite checks are incomplete for journal comments (unlike club rating validation). Author delete removes descendants. All authenticated users can interact; club membership is not an original requirement.
- Club rating: member with ≥3 present records; four dimensions plus overall must be integers 1–5; comment ≤500. Ratings are named, and rankings/community feedback intentionally read all club ratings. UI feedback reveal before submitting is not enforced as server confidentiality.
- Cancel UI requires reason ≥10 trimmed characters; domain only checks nonempty. Attendance UI only emits three enum values and derives a week key from a calendar; domain accepts unchecked strings.
- Original AppContext stores domain collections in same-named localStorage keys, restores `currentUser`, and uses mockUsers/mockStudents/mockClubs as seed identity/data. It migrates old `journalComments` and `journalCommentReplies` to threaded comments; fills missing journal participantIds; filters cancelled activities; ensures seeded Student Council; normalizes election result total/selected fields and historical notification paths; derives cancellation notifications from removal notices. These are migration behaviors, not user-facing mutations. Most JSON reads lack malformed-data recovery.
- `studentCouncilYearsReset` is an original one-time reset marker that clears saved council terms and restores seeded council membership. It must not be carried over as a server startup behavior that destroys real years. New persistence needs an explicit decision on importing existing browser-local records rather than silently treating them as authoritative server data.
- ThemeProvider persists `theme` (dark default) and toggles root theme class. LanguageProvider persists `dashboardLanguage` (English/Chinese), provides UI dictionary lookup and DOM translation behavior. These are device/browser preferences, not domain state or student records. Shared form drafts, selected club, calendar month/week, search query, dialog state and notification page-size window are transient React state.

## Important backend security/workflow gaps in inspected snapshot

These are concrete domain/projection observations; request-schema validation, transaction handling and final API handlers were not complete in this snapshot. A future handler may close some gaps, but TypeScript types alone do not validate untrusted JSON.

1. **Registration can bypass full/past activity UI.** `registerForActivity` verifies noncancelled activity and own student, but never `isActivityPast`, `maxParticipants` or all-campus capacity rules. Parallel requests also need transactional capacity/unique-registration enforcement. `unregisterFromActivity` can modify historical registration as well. Decide historical unregister policy explicitly.
2. **Official membership restriction is one-sided.** `joinClub` rejects category School Official Events, but `leaveClub` removes the student from any club, including teacher-managed Student Council/official events. The hidden button is insufficient for an API. Official-member add/remove can also change Student Council club membership without updating active council departments. Guard the forbidden leave and synchronize or separately model council membership.
3. **Attendance keys can fabricate eligibility.** `setClubMemberAttendance` checks owner/member but does not validate status, canonical Monday week key, valid date, duplicate semantic week, or allowed reporting period. An owner can submit three different arbitrary present keys for their own membership and meet rating eligibility. Current shared week helpers convert local midnight via `toISOString()`, which can shift the calendar date in positive UTC offsets; browser/server time zones also differ. Define one school timezone and canonical calendar keys.
4. **Input schemas/limits are incomplete.** Domain methods assume object/array/string shapes and call `.trim()` / `.map()` without guards. Malformed API JSON can throw. Activity duration/status/decision/field types need enum checking; dates must parse as real dates rather than lexical strings; capacities must be finite positive integers. `reviewClubApplication` treats every non-`reject` decision as approval. Club application category allowlist and 100-word limits are absent; activity 100-word cap is absent. `createOfficialEvent` accepts invalid start/end dates and reversed date order that student creation rejects.
5. **Journal input can reference arbitrary people/assets.** `saveActivityJournal` only validates participant count, not distinct participant IDs drawn from that activity’s registered set. It stores unchecked photo strings, without server-side MIME/byte/count-per-request controls, content verification or ownership of uploads. `new URL` accepts schemes beyond HTTP(S), including executable/custom schemes; rendered social links need protocol allowlisting. Comment/like endpoints only require an activity, so direct API callers can create discussion records even if no journal exists; decide whether that matches intended journal workflow.
6. **Overposting can overwrite rating identity.** `saveClubRating` spreads the entire supplied `input` into existing/new records. Runtime extra fields such as `userId`, `clubId`, `id`, or timestamps can override generated identity fields (and later overwrite an existing record) unless handlers strip unknown keys. Persist only explicitly selected dimensions/overall/comment. Journal comments also need integer/finite star validation. `markNotificationRead` should accept only IDs addressed to the session user to avoid arbitrary read-set growth.
7. **Cancellation removes the source record.** `cancelActivity` deletes activity from its club after sending notices; journals/comments/likes referencing it remain. The activity/journal view then cannot resolve those references, and audit/history is lost. Reason parity (10 characters) and a deliberate soft-cancellation/history policy are needed. Notifications preserve title/reason but do not substitute for an auditable activity record.
8. **Dormant election workflow is internally stale.** Approval directly produces `established_official`, whereas club elections only accept `approved_official_candidate`; no current reachable action produces that status. Club/event election notifications lead to redirect-only `/elections`. These services should be documented as dormant capabilities, not claimed as functioning frontend flows. Finalization can happen at the beginning of election day while votes could otherwise still be cast that day; explicit close-time policy is missing.
9. **Dormant event election consistency.** Field IDs/types/options and answer keys need schemas/uniqueness/length limits, upload-like fields need actual file semantics, and input answers may spoof system name/class rather than deriving identity. Publishing council department results replaces that department list but only unions selected students into club.members, leaving deselected members behind. Creating multiple elections for one department can overwrite electionId; publishing old elections after a new term starts can affect global council membership. Bind results to the specific term/department and recompute membership union. Scorer completion should verify each invited scorer exactly once, backed by constraints rather than record count alone. External scoring and internal scoring use different closing-day policies.
10. **Read privacy needs explicit product policy.** Original ClubMembers exposes contact details to any authenticated visitor; new projection redacts nonmanaged students’ email/studentId, which changes that screen’s data. That is preferable to accidental disclosure but needs acceptance coverage. Projection still exposes club member/registered student IDs, journal participant IDs, club ratings/author identity and club application fields such as managingTeacherName to the projected audience. Treat these as explicit access decisions. Raw domain selectors contain no read authorization; expose projected data only. Notifications/read IDs/removal notices are scoped in inspected projection; assigned scorers see relevant applications and their own scores. Confirm any newly added endpoints preserve this scope.

Recommended acceptance checks: unauthenticated denial; teacher/student cross-role attempts; nonowner writes; full/past registration; concurrent duplicate/capacity requests; official leave; invalid attendance date/status; forged participant IDs and oversized/nonimage photos; invalid/extra JSON fields including rating identity overposting; invalid official-event dates; cancellation/history; two independent sessions and reload persistence; all 15 selectors against projected data; all reachable routes in the table; preference toggles; council rollover and archive reads; correct failure feedback when API operations reject or fail. Exercise dormant actions at domain/API level separately and label them as such.

## Follow-up: API boundary and projection inspected after workspace move

The implementation advanced during this review. The preceding numbered findings describe the extracted **domain alone**; the HTTP command path now goes through `apps/server/src/service.ts` and `shared/src/contracts.ts`, which address many of them. Do not report those boundary mitigations as still missing from the API.

Verified by reading the new code: all command tuples have Zod schemas; strict payloads reject unknown rating identity fields; activity input validates dates/order/capacity/100-word description; club category is an allowlist; comments use integer star schema; cancellation requires 10 characters; journal social URLs allow HTTP(S) only; photos have bounded strings/count, supported data-URL MIME schema, basic signature checks and stored-media ownership checks. Service enforces teacher/student/owner roles, registration capacity/closed activity, official membership restrictions (also keeps founders as members), recipient ownership for notification reads, registered participant membership, reply belongs to same activity, and Monday attendance keys. Store has an advisory transaction lock helper intended to serialize state writes; final route transaction integration still needs verification.

Remaining concrete checks/recommendations after these mitigations:

- **Positive-timezone attendance regression:** shared `getWeekStart` and `shiftWeekStart` serialize local midnight with `toISOString().split('T')[0]`. In Asia/Taipei a local Monday becomes the previous UTC Sunday, and the new Monday-only service rejects the UI's valid choice. Produce calendar date keys directly, consistently across browser/server, and verify in a positive UTC offset.
- **Registration timing mismatch:** service uses `new Date(activity.endDate ?? activity.date).getTime() < Date.now()`, while shared `isActivityPast` treats date-only activities and long-term end dates as open through the end of that local date. Use the shared policy (with explicit school timezone) to avoid closing events at midnight at the beginning of their final day.
- **Club introduction parity:** `clubInput.description` has a 1000-character bound but not CreateClub's 100-word bound. This is stricter for some legitimate 100-word introductions and weaker for 101+ short-word introductions. Align semantic limits or document the intentional change.
- **Council consistency/history:** teacher-managed council membership vs department union, stale department elections, result-union behavior and cancellation orphan/history behavior remain domain concerns unless separately fixed. Monday validation alone does not prevent future attendance or owner self-awarded presence; that reporting-period policy is a product decision.
- **Service journal conversion:** photos are inserted before domain validation completes; keep command execution/media writes inside the same transaction so failure rolls back assets. Owner checks stop reusing another user's private upload even if a URL is known. Verify media GET authorization against the intended journal visibility separately.
- **Dormant election recommendation:** preserve original direct official-approval behavior. Changing it to `approved_official_candidate` would strand approved clubs because original `/elections` redirects and provides no election UI. Keep dormant endpoints documented/tested separately, or implement a deliberate election UI/workflow in a separately scoped change. Do not claim dormant services as completed reachable screens.

`apps/server/src/projection.ts` preserves all students, attendance, ratings, terms, application data and election management data for `founder` teachers, so original TeacherDashboard, Founder registrant rosters, participation reports and council archive reports retain their reads. User-specific notifications/read markers/removal notices remain scoped even for teachers, which matches their personal inbox semantics.

For students, own identity is preserved and owned-club members/registrants retain contact details needed by management. Other students retain `id` and `name` but have email/studentId blanked. This supports browse/member counts, public journal participant names, own registrations, owner journal participant selection, ratings and own attendance eligibility. It deliberately changes the authenticated public ClubMembers display, which originally printed every member's email/student ID. Prefer this privacy reduction with clear UI handling of absent contact values. Ratings remain global because Home rankings/RateMyClub/community comments depend on them. Club applications outside the user's ownership remain visible only as candidates/established status, with applicant email/teacher comment redacted; additional applicant/teacher metadata visibility should be an explicit policy. Student council term objects still contain department member IDs globally, but the rendered council screens deny students; if those records should be teacher-only, filter them as defense in depth after checking no dormant student election client requires them.

## Original source coverage manifest

All original source/assets files were loaded using `git show HEAD:<path>` for content comparison/call-site analysis. Screen details, domain mappings and cross-cutting files are described above. This manifest includes render-only primitives and assets so the review boundary is auditable.

- `src/App.css`
- `src/App.tsx`
- `src/assets/react.svg`
- `src/components/ClubJoinButton.tsx`
- `src/components/LanguageProvider.tsx`
- `src/components/Layout.tsx`
- `src/components/NavSearch.tsx`
- `src/components/NotificationBell.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/ThemeProvider.tsx`
- `src/components/journal/CommentThreadItem.tsx`
- `src/components/journal/JournalCommentsSection.tsx`
- `src/components/journal/StarRating.tsx`
- `src/components/manage-activities/ActivityDetailsSummary.tsx`
- `src/components/manage-activities/ActivityForm.tsx`
- `src/components/manage-activities/ActivityJournalForm.tsx`
- `src/components/manage-clubs/AttendanceStatusMenu.tsx`
- `src/components/manage-clubs/ManageClubTabBar.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/tabs.tsx`
- `src/context/AppContext.tsx`
- `src/data/categories.ts`
- `src/data/mockData.ts`
- `src/index.css`
- `src/lib/activities.ts`
- `src/lib/activityForm.ts`
- `src/lib/attendance.ts`
- `src/lib/clubRatings.ts`
- `src/lib/clubs.ts`
- `src/lib/journal.ts`
- `src/lib/journalComments.ts`
- `src/lib/language.ts`
- `src/lib/navigation.ts`
- `src/lib/notifications.ts`
- `src/lib/uiTranslation.ts`
- `src/lib/utils.ts`
- `src/main.tsx`
- `src/pages/ActivityJournalView.tsx`
- `src/pages/ClubDetail.tsx`
- `src/pages/ClubMembers.tsx`
- `src/pages/Clubs.tsx`
- `src/pages/CreateClub.tsx`
- `src/pages/Founder.tsx`
- `src/pages/Home.tsx`
- `src/pages/Login.tsx`
- `src/pages/ManageActivities.tsx`
- `src/pages/ManageActivitiesAdd.tsx`
- `src/pages/ManageActivitiesCancel.tsx`
- `src/pages/ManageActivitiesClubOptions.tsx`
- `src/pages/ManageActivitiesEdit.tsx`
- `src/pages/ManageActivitiesJournal.tsx`
- `src/pages/ManageActivitiesJournalForm.tsx`
- `src/pages/ManageClubCheckIn.tsx`
- `src/pages/ManageClubMembers.tsx`
- `src/pages/ManageClubs.tsx`
- `src/pages/ManageClubsAndActivities.tsx`
- `src/pages/NewStudentCouncilYear.tsx`
- `src/pages/RateMyClub.tsx`
- `src/pages/RedirectAddActivity.tsx`
- `src/pages/Registrations.tsx`
- `src/pages/StudentCouncil.tsx`
- `src/pages/StudentCouncilYear.tsx`
- `src/pages/TeacherClubParticipation.tsx`
- `src/pages/TeacherDashboard.tsx`
- `src/pages/manage-activities/ActivityManageRow.tsx`
- `src/pages/manage-activities/useManagedClub.tsx`
- `src/pages/manage-clubs/useManageClubGuard.tsx`
- `src/types/index.ts`
