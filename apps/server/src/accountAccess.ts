// Two calendar years from signup, clamping leap-day anniversaries to February 28.
export function accountExpiresAt(createdAt: Date): Date {
  const expires = new Date(createdAt);
  const month = expires.getUTCMonth();
  expires.setUTCFullYear(expires.getUTCFullYear() + 2);
  if (expires.getUTCMonth() !== month) expires.setUTCDate(0);
  return expires;
}
export function isAccountReadOnly(createdAt: Date, now = new Date()): boolean {
  const expiry = accountExpiresAt(createdAt).getTime();
  return !Number.isFinite(expiry) || now.getTime() >= expiry;
}
export const READ_ONLY_MESSAGE = "Your account is now read-only because its two-year access period has ended. You can still view your records, but cannot make changes.";
