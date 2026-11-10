import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { AppContext } from './useApp';
import { sessionVerdict } from './sessionVerdict';
import { createAuthClient } from 'better-auth/react';
import { commandSchemas, loginInput } from '@student-dash/shared/contracts';
import type { CommandName, CommandArgs } from '@student-dash/shared/contracts';
import { apiErrorSchema, stateResponseSchema, commandResponseSchema } from '@student-dash/shared/responses';
import { emptyState } from '@student-dash/shared/state';
import type { AppState } from '@student-dash/shared/state';
import { createSelectors } from '@student-dash/shared/selectors';
import type { AppContextType } from '@student-dash/shared/context-types';
import type { User } from '@/types';
import { useLanguage } from '@/lib/language';

// This provider owns focus checks; avoid a second automatic auth request per focus.
const authClient = createAuthClient({ sessionOptions: { refetchOnWindowFocus: false } });

async function responseBody(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new Error(parsed.success ? parsed.data.error.message : `Request failed (${response.status}). Please retry.`);
  }
  return body;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const session = authClient.useSession();
  const { t } = useLanguage();
  const identity = useRef<string | null>(null);
  const generation = useRef(0);
  const requestSequence = useRef(0);
  const writing = useRef(false);
  const authenticating = useRef(false);
  const mounted = useRef(true);
  const observedSessionId = useRef<string | null | undefined>(undefined);
  const refreshInFlight = useRef<{ epoch: number; sequence: number; promise: Promise<boolean> } | null>(null);
  const lastFocusRefresh = useRef(0);
  const stateJson = useRef('');
  const userJson = useRef('');

  const clearSession = useCallback((message = '') => {
    identity.current = null;
    generation.current += 1;
    requestSequence.current += 1;
    stateJson.current = '';
    userJson.current = '';
    setState(emptyState());
    setCurrentUser(null);
    setLoading(false);
    setError(message);
  }, []);

  const applyState = useCallback((next: AppState) => {
    const serialized = JSON.stringify(next);
    if (serialized !== stateJson.current) {
      stateJson.current = serialized;
      setState(next);
    }
  }, []);

  const refresh = useCallback((knownSessionId?: string, recoverSession = false): Promise<boolean> => {
    if (writing.current) return Promise.resolve(false);
    const active = refreshInFlight.current;
    if (active && active.epoch === generation.current && active.sequence === requestSequence.current) return active.promise;
    const sequence = ++requestSequence.current;
    const epoch = generation.current;
    const promise = (async () => {
      try {
        // /api/state independently authenticates the cookie. If the public auth
        // endpoint is temporarily unavailable, it can still establish the session
        // after a reload without treating a rate limit as a signed-out result.
        let checkedSessionId = knownSessionId;
        if (!knownSessionId && !recoverSession) {
          const verdict = sessionVerdict(await authClient.getSession({ query: { disableCookieCache: true } }));
          if (!mounted.current || epoch !== generation.current || sequence !== requestSequence.current) return false;
          if (verdict.kind === 'unauthenticated') {
            clearSession(identity.current ? 'Your session expired. Please sign in again.' : '');
            return false;
          }
          if (verdict.kind === 'authenticated') checkedSessionId = verdict.userId;
        }
        if (identity.current && checkedSessionId && identity.current !== checkedSessionId) {
          clearSession('Your session changed. Please retry.');
          return false;
        }
        const response = await fetch('/api/state', { credentials: 'same-origin', cache: 'no-store' });
        if (!mounted.current || epoch !== generation.current || sequence !== requestSequence.current) return false;
        if (response.status === 401) {
          clearSession('Your session expired. Please sign in again.');
          return false;
        }
        const result = stateResponseSchema.parse(await responseBody(response));
        if (!mounted.current || epoch !== generation.current || sequence !== requestSequence.current) return false;
        const expectedIdentity = checkedSessionId ?? identity.current;
        if (expectedIdentity && result.user.id !== expectedIdentity) {
          clearSession('Your session changed. Please retry.');
          return false;
        }
        identity.current = result.user.id;
        applyState(result.state);
        const serialized = JSON.stringify(result.user);
        if (serialized !== userJson.current) {
          userJson.current = serialized;
          setCurrentUser(result.user);
        }
        setError('');
        return true;
      } catch (cause) {
        if (mounted.current && epoch === generation.current && sequence === requestSequence.current) {
          setError(cause instanceof Error ? cause.message : 'Unable to load data. Please retry.');
        }
        return false;
      } finally {
        if (mounted.current && epoch === generation.current && sequence === requestSequence.current) setLoading(!userJson.current);
      }
    })();
    refreshInFlight.current = { epoch, sequence, promise };
    void promise.finally(() => {
      if (refreshInFlight.current?.promise === promise) refreshInFlight.current = null;
    });
    return promise;
  }, [applyState, clearSession]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current += 1; };
  }, []);

  const sessionId = session.data?.user.id;
  const sessionErrorMessage = session.error?.message;
  const sessionErrorStatus = session.error?.status;
  useEffect(() => {
    if (session.isPending || authenticating.current) return;
    if (sessionErrorMessage || sessionErrorStatus) {
      void Promise.resolve().then(() => {
        if (!mounted.current || authenticating.current) return;
        if (sessionErrorStatus === 401) {
          clearSession('Your session expired. Please sign in again.');
        } else {
          // Preserve the current account/drafts and recover directly through the
          // authenticated state endpoint; never retry get-session in this effect.
          void refresh(sessionId, true);
        }
      });
      return;
    }
    const nextSessionId = sessionId ?? null;
    // Ignore pending/error bookkeeping when the authenticated identity is unchanged.
    if (observedSessionId.current === nextSessionId) return;
    observedSessionId.current = nextSessionId;
    void Promise.resolve().then(() => {
      if (!mounted.current || authenticating.current) return;
      if (!nextSessionId) {
        if (identity.current) clearSession('Your session expired. Please sign in again.');
        else setLoading(false);
        return;
      }
      if (identity.current && identity.current !== nextSessionId) clearSession();
      void refresh(nextSessionId);
    });
  }, [sessionId, session.isPending, sessionErrorMessage, sessionErrorStatus, clearSession, refresh]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastFocusRefresh.current < 5_000) return;
      lastFocusRefresh.current = Date.now();
      void refresh();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 60_000);
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  const execute = useCallback(async <K extends CommandName>(command: K, args: CommandArgs<K>): Promise<boolean> => {
    if (writing.current) return false;
    if (!identity.current) { setError('Please sign in to continue.'); return false; }
    const validated = commandSchemas[command].safeParse(args);
    if (!validated.success) {
      setError(validated.error.issues.map(issue => issue.message).join(' '));
      return false;
    }
    writing.current = true;
    setBusy(true);
    setError('');
    const epoch = generation.current;
    const userId = identity.current;
    ++requestSequence.current;
    try {
      const response = await fetch('/api/commands', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, args: validated.data, expectedUserId: userId }),
      });
      if (response.status === 401) {
        if (epoch === generation.current) clearSession('Your session expired. Please sign in again.');
        return false;
      }
      const result = commandResponseSchema.parse(await responseBody(response));
      if (!mounted.current || epoch !== generation.current || identity.current !== userId) return false;
      applyState(result.state);
      if (!result.result) setError('The change was not accepted. Check the latest data and try again.');
      return result.result;
    } catch (cause) {
      if (mounted.current && epoch === generation.current) setError(cause instanceof Error ? cause.message : 'Unable to save. Please retry.');
      return false;
    } finally {
      writing.current = false;
      if (mounted.current) {
        setBusy(false);
        // A cross-tab account switch can invalidate an in-flight command.
        if (epoch !== generation.current) void refresh();
      }
    }
  }, [applyState, clearSession, refresh]);

  const commands = useMemo(() => Object.fromEntries(
    (Object.keys(commandSchemas) as CommandName[]).map(command => [command, (...args: CommandArgs<typeof command>) => execute(command, args)]),
  ) as Pick<AppContextType, CommandName>, [execute]);

  const login = useCallback(async (email: string, password: string) => {
    if (writing.current) return false;
    const input = loginInput.safeParse({ email, password });
    if (!input.success) { setError('Enter a valid email and password.'); return false; }
    writing.current = true;
    authenticating.current = true;
    setBusy(true);
    setError('');
    generation.current += 1;
    requestSequence.current += 1;
    try {
      const result = await authClient.signIn.email(input.data);
      if (result.error) throw new Error(result.error.message ?? 'Sign in failed.');
      observedSessionId.current = result.data.user.id;
      writing.current = false;
      const loaded = await refresh(result.data.user.id);
      return loaded;
    } catch {
      setError('Unable to sign in. Check your credentials or try again.');
      return false;
    } finally {
      authenticating.current = false;
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    if (writing.current) return;
    writing.current = true;
    authenticating.current = true;
    setBusy(true);
    ++requestSequence.current;
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message ?? 'Sign out failed.');
      observedSessionId.current = null;
      clearSession();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign out. Please retry.');
    } finally {
      authenticating.current = false;
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [clearSession]);

  // Keep selector identities stable while requests and banners change.
  const selectors = useMemo(() => createSelectors(state, currentUser), [state, currentUser]);
  const value = useMemo<AppContextType>(() => ({
    ...state, ...selectors, ...commands, currentUser, isAuthenticated: !!currentUser,
    loading, busy, error, login, logout,
  }), [state, selectors, commands, currentUser, loading, busy, error, login, logout]);

  const displayedError = error === 'Unable to sign in. Check your credentials or try again.'
    ? t('loginFailed') : error === 'Enter a valid email and password.' ? t('loginRequired') : error;

  return (
    <AppContext.Provider value={value}>
      {error && <div data-i18n-managed role="alert" className="sticky top-0 z-[100] flex items-center justify-between gap-3 border-b bg-destructive/10 p-3 text-sm text-destructive">
        <span>{displayedError}</span>
        <button type="button" disabled={busy} onClick={async () => { await refresh(); }} className="underline">{t('retryLoading')}</button>
      </div>}
      {busy && <div data-i18n-managed role="status" aria-live="polite" className="fixed bottom-4 right-4 z-[100] rounded-md border bg-background px-4 py-2 shadow">{!currentUser ? t('loginPending') : t('requestPending')}</div>}
      <fieldset disabled={busy} className="contents" aria-busy={busy}>{children}</fieldset>
    </AppContext.Provider>
  );
}

