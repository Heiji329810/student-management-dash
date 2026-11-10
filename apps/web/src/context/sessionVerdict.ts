/** Only an explicit unauthenticated response may discard an existing session. */
export function sessionVerdict(result: {
  data: { user: { id: string } } | null;
  error: { status?: number; message?: string } | null;
}): { kind: 'authenticated'; userId: string } | { kind: 'unauthenticated' | 'unavailable' } {
  if (result.error) return { kind: result.error.status === 401 ? 'unauthenticated' : 'unavailable' };
  if (!result.data) return { kind: 'unauthenticated' };
  return { kind: 'authenticated', userId: result.data.user.id };
}
