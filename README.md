# Student Management Dashboard

React/Vite club dashboard with an Express 5 API, shared Zod contracts, Drizzle ORM,
PostgreSQL persistence and Better Auth on both server and web. Original design,
routes, bilingual UI and theme controls are retained. No TanStack was added.

## Workspaces

- `apps/web`: existing React UI, asynchronous API/auth wiring.
- `apps/server`: authenticated command services, authorization, Drizzle schema/migrations.
- `shared`: request schemas, inferred request types, entity types, pure read selectors/form helpers.
- `docs`: frontend coverage inventory and CC handoff.

## Running local demo

The persistent demo is at **http://192.168.101.93:5275** on the LAN and
**http://localhost:5275** locally (API loopback localhost:4100), backed by
its own `student_dash_demo` database. Fictional account credentials are in the
private, ignored `.local/demo-login.txt` file. Demo services are enabled as
`student-dash-demo-api.service` and `student-dash-demo-web.service` in user systemd.
Do not run `npm run dev` on those ports while the demo services are running.
To develop in the foreground, first stop only those two services, then run the
commands below; re-enable the demo with `systemctl --user start` for those units.
Browser verification uses separate ports 5274/4101 and `student_dash_browser`, so
resetting its fixtures never changes demo data. `scripts/prepare-demo.ts` is
idempotent and never truncates demo tables.

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

There is no public signup screen or API signup. Better Auth's internal signup API
is used by the local provisioning command; it hashes passwords and persists accounts.
`founder` is the **teacher** role in the original UI; students can also found clubs.
Roles/student IDs cannot be set by browser input. Provide a unique student ID for
student accounts. Do not use real student data for local demonstrations.

Use `node scripts/provision-account.mjs` for interactive provisioning. It hides
the password and sends JSON to the account command through stdin. No default
password is shipped and passwords never appear in command arguments.
The first teacher provisioning automatically initializes the School Official Events
and Student Council organizations. `npm run db:initialize` repairs either missing
organization idempotently, preserving existing clubs. No sample students, events,
passwords or secrets are committed.

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
