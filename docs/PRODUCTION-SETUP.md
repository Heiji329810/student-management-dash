# Internet production setup

This is an internet hosting setup path, not evidence of production readiness.
The local installation was activated on 2026-11-18 using `student_dash_live`,
a separate database with one real teacher account and the two required system
organizations. Its `.env.live` uses local HTTP/development mode; it is not the
HTTPS production configuration described below. Live services replace the stopped
demo services, while the demo database is preserved. Browser login, reload and
logout were verified against the clean live database. See README for local operation.
The existing frontend has no demo autofill or password shortcut. Public signup,
user updates and deletion remain blocked at Express; Better Auth's internal signup
is used only by the operator CLI. `founder` means teacher, not platform administrator.
Teachers cannot provision users through HTTP. Host operators are the account admins.

## Decisions before activation

Choose the school/data owner and authorized account administrators; a public HTTPS
hostname and TLS reverse proxy; a PostgreSQL host and backup/restore owner; identity
verification and secure initial-password delivery; retention/deletion policies and
who may see schoolwide names, memberships, journals and activity registrations.
The existing shared school dashboard is not a separate tenant per student: public
school content is intentionally shared; private applications, contact/ID fields,
attendance, votes, reports and moderation visibility are projected by role/ownership.
Review this visibility with the school before adding real records.

No email transport, invitation UI, mailbox verification, SSO, MFA or self-service
forgot-password flow is configured. Decide whether controlled manual provisioning
and offline identity-checked recovery meet rollout needs. If email invitations or
self-service recovery are required, implement and test delivery and token handling
before rollout; do not treat emailVerified=false as verified ownership.

## Separate safe setup

Keep existing `.env`, `.env.demo`, services and PostgreSQL cluster untouched.
Create a NEW empty dedicated production database, never clone/import the demo.
Use a schema/migration owner for migrations and a separate least-privilege runtime
role for normal operation (public schema/table DML and migration-created sequences
as required; no CREATEDB, superuser or cross-database access). PostgreSQL grants,
network restrictions and TLS verification depend on the selected host. Test them.
The local demo role/cluster is not the production hosting design.

Copy `.env.production.example` to a private file outside Git (mode 600); set an
independently generated auth secret, real database URL and a single HTTPS public
origin for both web/API. Production validation rejects known fixture database
names, placeholder/low-diversity secrets and insecure/mismatched origins. It cannot
prove secret entropy or that a generically named database contains no demo data.
Review the target database explicitly before every command. Do not publish secrets
in command arguments, logs, screenshots or shell history. Do not use `npm run dev`,
local cluster setup, `verify:prepare` or demo preparation for production.

From repository root, use explicit environment loading; these commands bypass the
npm scripts' automatic demo `.env` loading. Replace `/private/school.env` with your
private configuration path. Run against the NEW database only:

```sh
npm ci
npm run build
node --env-file=/private/school.env --import tsx apps/server/src/migrate.ts
# Interactive password entry; approval is an explicit host-operator acknowledgement.
ACCOUNT_ADMIN_APPROVED=yes node --env-file=/private/school.env scripts/provision-account.mjs
node --env-file=/private/school.env --import tsx apps/server/src/seed.ts
# Only after reviewing the new environment/database and configuring TLS/proxy:
node --env-file=/private/school.env --import tsx apps/server/src/index.ts
```

Provision the first verified teacher with role `founder`; subsequent students use
role `student` and a unique school-approved student ID. Each CLI invocation creates
one account; no fabricated roster is inserted. Teacher provisioning initializes
only the two required system organizations. `seed.ts` repairs those organizations
idempotently and does not create demo users or activities. Roles and student IDs
are server controlled. CLI access is privileged: the approval variable is not an
admin authentication system; restrict OS/database access accordingly.

The interactive helper inherits the explicitly loaded environment and launches Node
directly, without loading the checkout's demo `.env`. Use the explicit env-file
command above; the interactive helper itself does not auto-load any env file.
The build serves web assets from Express; proxy the single public HTTPS origin to
the API port. Do not expose the backend directly. Current proxy trust is disabled;
IP rate limiting may group all users behind the proxy. Configure/test exact trusted
proxy hops before scaling, never blanket trust client-forwarded headers.

## Recovery and sessions

After verifying identity out of band, an authorized host operator can run:

```sh
ACCOUNT_ADMIN_APPROVED=yes node --env-file=/private/school.env scripts/provision-account.mjs --recover
```

This accepts a replacement password privately, uses Better Auth's installed password
hash implementation, and updates the credential and deletes all target sessions in
one PostgreSQL transaction. Roles, student IDs and domain records are preserved.
Deliver credentials over an approved private channel. There is no forced first-login
password change. Browser password change remains provided by Better Auth. Recovery
has no email delivery or automatic account suspension; no dedicated operator audit
log exists. Back up before administrative maintenance and record the approved action
without passwords. Rotation of the auth secret invalidates signed cookies globally.

Sessions last seven days and refresh daily; cookie cache is disabled, Secure in
production, HttpOnly and SameSite=Lax. API mutations require an exact allowed Origin
and matching authenticated expectedUserId; HTTP signup/profile mutation is blocked.
Better Auth provides auth rate limiting; the business API has its own limiter.
Rate limit state is process-local. HTTPS, backups with a tested restore, monitoring,
central rate limiting for multi-instance deployment, dependency updates and capacity
checks remain hosting work. Domain writes serialize via an advisory lock and load/
save whole state; assess scale before admitting large rosters. No security-proof
or comprehensive penetration-test claim is made.

## Verification

`npm test` creates a uniquely named disposable PostgreSQL database, applies migrations,
exercises auth, malformed inputs, role/ownership denials, private projections,
logout/expiry, provisioning compensation and persisted command results. Added recovery
coverage checks operator rejection, old-session revocation, old-password rejection
and new-password login after the separate recovery process exits. Production guard
tests execute both fixture entrypoints with production mode and an invalid database
URL to verify rejection before database access. Tests never reset the demo database.
The suite currently assumes this workstation's PostgreSQL socket, role and port;
adapt its connection harness for CI before relying on a different host.

Before rollout, perform an isolated staging browser acceptance with school-approved
identities, verify email/credential delivery policy, TLS cookies, proxy/IP behavior,
backups/restores, roles and student visibility. Keep the demo services and database
separate. Switching a public hostname/service to the new database is a later,
reviewed activation step, not part of these source changes.

Local verification on 2026-11-18: `npm test` passed 29 backend/contract tests
and 17 client tests; `npm run build`, `npm run lint` and `git diff --check`
passed. Vite retains its existing large-chunk advisory. No production hosting,
real identity delivery or staging browser validation was performed.
