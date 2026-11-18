# Security review — 2026-11-18

This is a focused code/configuration review and automated verification, not a
penetration test or a guarantee of security. The current installation remains a
local HTTP test deployment and is not cleared for real student data or internet hosting.

## Fixes applied

- Public signup always creates an unapproved student account. It no longer adds a
  student to the shared roster until an authorized teacher approves the request.
  Approval and roster creation commit in the same transaction.
- Authentication HTTP routes use an explicit method/path allowlist. Signup,
  profile/role changes, email changes, account linking and deletion are not exposed.
- Business mutations recheck approval, account age and current role/student identity
  after acquiring the transaction lock; pending or read-only accounts cannot write.
- Browser responses deny framing, disable unneeded device permissions, prevent MIME
  sniffing and suppress referrers. Production Express adds a restrictive content
  security policy and HSTS; these do not turn local HTTP into HTTPS.
- `.local/` is owner-only (0700); environment and credential files inspected were
  owner-only (0600). Secret environments and local data are excluded from Git.
- Compatible dependency updates were applied without forced major-version changes.

## Verified protections

The integration suite checks password login, role/ownership denials, student data
projection, session expiry/logout, recovery session revocation, CSRF/origin checks,
rate limiting, pending account isolation, approval authorization, prohibited auth
routes, and two-year read-only behavior. Build, lint and all 50 tests passed.
Student contact/ID fields are redacted outside the existing authorized scopes;
schoolwide names, clubs and public school content remain intentionally shared.
Approval is a teacher identity check, not verified ownership of an email address.
The runtime PostgreSQL role is not superuser and cannot create databases or roles.

A private custom-format backup was created under `.local/backups/` (0700 directory,
0600 file), restored into a new isolated database and checked successfully. The
restore-check database was then deleted. This is a local recovery snapshot, not
scheduled, off-device, or independently encrypted backup coverage.

## Remaining release blockers and limits

1. The app is available over plain HTTP on the LAN. Passwords and cookies lack
   transport encryption there. Use HTTPS and secure cookies before real student use.
2. The LAN frontend still runs Vite's development server. Internet hosting must use
   the built frontend behind a production HTTPS service, not Vite's dev server.
3. Dependency scanning still reports tooling advisories (14 total: 10 high and
   4 moderate; even `npm audit --omit=dev` reports 8 because some tooling is pulled
   into the installed production dependency tree), including
   [picomatch ReDoS](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), for which the
   advisory currently lists no patched release, and the older esbuild nested under
   Drizzle's development tooling. Do not expose tooling servers. A clean dependency
   scan cannot be claimed, and a forced downgrade was not applied.
4. Set up scheduled protected backups, off-device retention and recurring restore
   checks before relying on the app for important school records.
5. No mailbox verification, MFA, self-service recovery, dedicated approval audit
   history or production monitoring is configured. School-approved identity and
   credential-delivery procedures are still needed.
6. Rate limits are process-local; proxy trust, multi-instance scaling, retention and
   intended schoolwide visibility require deployment-specific review.
