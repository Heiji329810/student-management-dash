import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { useLanguage } from '@/lib/language';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function Signup() {
  const { isAuthenticated } = useApp();
  const { language } = useLanguage();
  const zh = language !== 'en';
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));
    if (password !== form.get('confirmation')) {
      setError(zh ? '兩次輸入的密碼不一致。' : 'Passwords do not match.');
      return;
    }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/signup', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: String(form.get('name')).trim(), email: String(form.get('email')).trim(), studentId: String(form.get('studentId')).trim(), password }),
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error(zh ? '嘗試次數過多，請稍後再試。' : 'Too many attempts. Please try again later.');
        const data = await response.json();
        throw new Error(data.error?.message || 'Unable to create account. Please try again.');
      }
      setSubmitted(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <main data-i18n-managed className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">{submitted ? (zh ? '等待審核' : 'Awaiting approval') : (zh ? '建立學生帳號' : 'Create a student account')}</CardTitle>
        <CardDescription>{submitted ? (zh ? '帳號已建立。學校核准後，您才能使用儀表板和其他功能。' : 'Your account has been created. The school must approve it before you can access the dashboard or use its features.') : (zh ? '註冊後需經學校審核，才能使用各項功能。' : 'Sign up to request access. Your account will stay pending until the school approves it.')}</CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? <p role="status" className="text-sm text-muted-foreground">{zh ? '您可以稍後登入查看是否已核准。' : 'You can sign in later to check whether access has been approved.'}</p> :
        <form onSubmit={submit} className="space-y-4">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {[
            { name: 'name', label: zh ? '姓名' : 'Full name', type: 'text', autoComplete: 'name', maxLength: 100 },
            { name: 'email', label: zh ? '電子郵件' : 'Email', type: 'email', autoComplete: 'email', maxLength: 254 },
            { name: 'studentId', label: zh ? '學號' : 'Student ID', type: 'text', autoComplete: 'off', maxLength: 200 },
            { name: 'password', label: zh ? '密碼' : 'Password', type: 'password', autoComplete: 'new-password', maxLength: 128 },
            { name: 'confirmation', label: zh ? '確認密碼' : 'Confirm password', type: 'password', autoComplete: 'new-password', maxLength: 128 },
          ].map(field => <div key={field.name} className="space-y-2">
            <label htmlFor={field.name} className="text-sm font-medium">{field.label}</label>
            <Input {...field} id={field.name} required disabled={busy} minLength={field.type === 'password' ? 12 : 1} aria-describedby={field.name === 'password' ? 'password-help' : undefined} />
            {field.name === 'password' && <p id="password-help" className="text-xs text-muted-foreground">{zh ? '至少 12 個字元。' : 'Use at least 12 characters.'}</p>}
          </div>)}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? (zh ? '送出中…' : 'Submitting…') : (zh ? '申請帳號' : 'Request an account')}</Button>
        </form>}
        <p className="mt-6 text-center text-sm"><Link to="/login" className="text-primary underline underline-offset-4">{zh ? '返回登入' : 'Back to sign in'}</Link></p>
      </CardContent>
    </Card>
  </main>;
}
