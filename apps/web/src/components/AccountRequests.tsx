import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/useApp';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';

type AccountRequest = { id: string; name: string; email: string; studentId: string | null; createdAt: string };
export function AccountRequests() {
  const { currentUser } = useApp();
  const { language } = useLanguage();
  const zh = language !== 'en';
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const active = useRef(true);
  const writing = useRef(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/account-requests', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Unable to load account requests.');
      if (active.current) setRequests(data.requests);
    } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : 'Unable to load requests. Try again.'); }
    finally { if (active.current) setLoading(false); }
  }, []);
  useEffect(() => {
    active.current = true;
    if (currentUser?.role === 'founder') void load();
    return () => { active.current = false; };
  }, [load, currentUser?.id, currentUser?.role]);
  async function approve(request: AccountRequest) {
    if (writing.current || !currentUser || currentUser.readOnly) return;
    writing.current = true; setBusy(request.id); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/account-requests/${encodeURIComponent(request.id)}/approve`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedUserId: currentUser.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Unable to approve account.');
      if (active.current) {
        setRequests(previous => previous.filter(item => item.id !== request.id));
        setMessage(zh ? `${request.name} 的學生帳號已核准。` : `${request.name} now has student access.`);
      }
    } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : 'Unable to approve account. Try again.'); }
    finally { writing.current = false; if (active.current) setBusy(null); }
  }
  if (currentUser?.role !== 'founder') return null;
  return <section data-i18n-managed className="space-y-4" aria-labelledby="account-requests-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id="account-requests-title" className="text-2xl font-bold">{zh ? '學生帳號申請' : 'Student account requests'}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{zh ? '請先確認學生身分，再核准存取權限。未核准的帳號無法使用儀表板。' : 'Verify the student’s identity before approving access. Pending accounts cannot use the dashboard.'}</p>
      </div>
      <Button variant="outline" onClick={() => void load()} disabled={loading || !!busy}>{zh ? '重新整理' : 'Refresh requests'}</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {loading ? <p role="status" className="text-sm text-muted-foreground">{zh ? '載入申請中…' : 'Loading account requests…'}</p> :
      requests.length === 0 ? (!error && <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">{zh ? '目前沒有待審核的學生帳號。' : 'No student accounts are awaiting approval.'}</p>) :
      <ul className="divide-y rounded-md border px-4">{requests.map(request => <li key={request.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="font-medium break-words">{request.name}</p>
          <p className="text-sm text-muted-foreground break-all">{request.email}</p>
          <p className="text-sm break-words">{zh ? '學號：' : 'Student ID: '}{request.studentId}</p>
          <p className="text-xs text-muted-foreground">{zh ? '申請日期：' : 'Requested: '}{new Date(request.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en')}</p>
        </div>
        <Button className="shrink-0" disabled={!!busy || loading || currentUser.readOnly} onClick={() => void approve(request)} aria-label={`${zh ? '核准' : 'Approve'} ${request.name}`}>
          {busy === request.id ? (zh ? '核准中…' : 'Approving…') : (zh ? '核准學生帳號' : 'Approve student')}
        </Button>
      </li>)}</ul>}
  </section>;
}
