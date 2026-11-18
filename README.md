# Student Management Dashboard

React/Vite club dashboard with an Express 5 API, shared Zod contracts, Drizzle ORM,
PostgreSQL persistence and Better Auth on both server and web. Original design,
routes, bilingual UI and theme controls are retained. No TanStack was added.

## Workspaces

- `apps/web`: existing React UI, asynchronous API/auth wiring.
- `apps/server`: authenticated command services, authorization, Drizzle schema/migrations.
- `shared`: request schemas, inferred request types, entity types, pure read selectors/form helpers.
- `docs`: frontend coverage inventory and CC handoff.

## Running local app

The local app is at **http://localhost:5275** and **http://192.168.101.93:5275**
on the LAN, backed by the dedicated `student_dash_live` PostgreSQL database.
The first real teacher account has been provisioned. The database starts with only
that account and the two required system organizations; no fictional roster,
activities or applications were imported. Private login details are in the ignored,
mode-600 `.local/live-login.json` file. Do not commit or share this file publicly.

User systemd runs `student-dash-live-api.service` and `student-dash-live-web.service`;
the API depends on `student-dash-postgres.service`. Both app services load `.env.live`.
The default `.env` also points to the live database. Stop these two app services before
running `npm run dev` on the same ports. This is a local HTTP installation, not an
internet production deployment; see the production setup guide for HTTPS hosting.

The former demo database and `.env.demo` are retained separately for rollback;
`student-dash-demo-api.service` and `student-dash-demo-web.service` are disabled and
stopped. The pre-activation `.env` backup is under `.local/activation-backup-*`.
Browser fixtures use separate ports 5274/4101 and `student_dash_browser`.
Never run fixture preparation against `.env` or `.env.live`.

## Local setup

Node 22.12+ (verified locally with Node 26) and PostgreSQL 18. Use a **dedicated**
`student_dash` database and role. Never reuse another application's database.

```sh
npm ci
cp .env.example .env
# Set DATABASE_URL and a random BETTER_AUTH_SECRET (32+ characters) in .env.
npm run db:migrate
npm run account:create  # reads account JSON from stdin; see provisioning below
npm run db:initialize  # idempotent repair/initialization of required organizations
npm run dev
```

Web: http://localhost:5275. API: http://localhost:4100. Vite proxies `/api` to
`http://127.0.0.1:4100`. Set `API_TARGET` if using a different API address.
Keep `APP_ORIGIN`, `BETTER_AUTH_URL` and browser hostname consistent (`localhost`).
Both auth and business requests use same-origin credential cookies; no broad CORS.

A private local cluster helper is also available: `npm run db:local`.
Set `STUDENT_PG_BIN` and `STUDENT_PG_SHARE` to your PostgreSQL server binaries and
share directory. It creates **only** `.local/pgdata`, listens on localhost:55439,
and stores randomly generated local credentials in ignored, mode-600 `.env`.
It needs the `psql` and `createdb` client tools on PATH. On this host, compatible
Arch PostgreSQL 18.6-2 binaries were extracted to `.local/pgsql` without installing
system packages or changing other services. Those binaries are untracked.
To stop this project's cluster:

```sh
.local/pgsql/usr/bin/pg_ctl -D "$PWD/.local/pgdata" stop
```

## Controlled account provisioning

Students can request an account at `/signup`. New requests remain pending and cannot
read dashboard data, media, or perform business actions until approved. Existing accounts
retain access. Approved teachers can review and approve requests in the Student account requests
section of their home dashboard. Students cannot list or approve requests, and
approval only grants student access. No approver account is created by signup. Direct Better Auth HTTP signup remains blocked.
Better Auth's internal signup API
is used by the local provisioning command; it hashes passwords and persists accounts.
`founder` is the **teacher** role in the original UI; students can also found clubs.
Roles/student IDs cannot be set by browser input. Provide a unique student ID for
student accounts. Do not use real student data for local demonstrations.

Use `node --env-file=.env scripts/provision-account.mjs` for interactive provisioning. It hides
the password and sends JSON to the account command through stdin. No default
password is shipped and passwords never appear in command arguments.
The first teacher provisioning automatically initializes the School Official Events
and Student Council organizations. `npm run db:initialize` repairs either missing
organization idempotently, preserving existing clubs. No demo account passwords
or secrets are committed. Demo and browser setup scripts generate
random passwords for fictional accounts and store them only in ignored local files;
the integration suite's fixed password is exclusively a disposable test fixture.

## Repository privacy

Commit source, migrations, shared contracts and project documentation only. Keep
`.env` variants (except the placeholder `.env.example`), `.local/` credentials and
database files, uploads, screenshots, browser traces/reports, and build output out
of Git. The ignore rules cover the standard locations; review `git status` before
adding files from any other location. Never commit real student data or account
exports. SQL files under `apps/server/drizzle` are schema migrations, not data dumps.

## Commands

```sh
npm run build        # shared + server type checks, web production build
npm run lint         # web/shared lint
npm test             # actual Better Auth + API + PostgreSQL integration workflows
npm run db:generate  # versioned migrations after schema edits
npm run db:migrate   # apply checked-in migrations; never schema-push production
```

See [CC handoff](docs/HANDOFF.md) and [coverage review](docs/coverage-review.md) for
feature mapping, browser verification, architecture and known limits.

## Real accounts and production setup

See [safe activation and remaining decisions](docs/PRODUCTION-SETUP.md). Production
uses a separate database and private environment; do not repoint the demo.

## Two-year account access

Every approved account (students and teachers) becomes read-only two calendar years
after its original signup timestamp. Existing accounts follow the same rule; approval,
password recovery and role changes do not restart the clock. Leap-day anniversaries
fall on February 28. Users may still sign in and read content allowed by their existing
permissions. All business mutations, including account approvals, are rejected by the
server after expiry, including for sessions already signed in. No records are deleted.
Pending approval still blocks access entirely.

### Club application attachments

Students attach a required file on **Create a Club** before submitting. The
application and its attachment save in one transaction; an invalid file cannot
leave a partial application. Teachers open **Review application file** on the
application review card. Students use **My applications → View file and feedback**.
The attachment stays linked to the application after a decision.

Supported files: XLSX, CSV, PDF, DOCX, PNG, JPG, WebP, and UTF-8 TXT. Teachers can
preview, download, and comment on a specific version. Feedback creates an in-app
notification linking to the application file. Only the applicant and teachers can
access the file; pending accounts are blocked and expired accounts are read-only.

Files are limited to 10 MB each, 100 MB per student including previous versions,
and 10 versions per attachment. Replacements retain earlier versions and comments
and restart the 10-minute recall window. Recall hides the attachment from teachers
without withdrawing the application. Uploading a replacement shares it again.
Previously downloaded copies cannot be revoked.

Spreadsheet previews show at most 10 sheets, 100 rows and 30 columns; document text
previews are capped at 100,000 characters. Download the original for omitted
content. Files and feedback are stored in PostgreSQL and included in database
backups. Format checks and limited preview processing are not antivirus scanning.
