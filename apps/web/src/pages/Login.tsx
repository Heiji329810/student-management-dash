import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, Mail, Lock, Moon, Sun, Languages } from 'lucide-react';
import { useLanguage, type TranslationKey } from '@/lib/language';
import { useTheme } from '@/context/useTheme';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<TranslationKey | ''>('');
  const { login, busy, loading, isAuthenticated, error: accountError } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('loginRequired');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('loginInvalidEmail');
      return;
    }

    const success = await login(email.trim(), password);
    if (success) {
      navigate('/');
    } else {
      setError('loginFailed');
    }
  };

  if (isAuthenticated && !loading) return <Navigate to="/" replace />;

  return (
    <div data-i18n-managed className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="gap-2"
          aria-label={t('switchLanguage')}
        >
          <Languages className="h-4 w-4" />
          {language === 'en' ? '中文' : 'EN'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="gap-2"
          aria-label={theme === 'dark' ? t('switchLight') : t('switchDark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? t('light') : t('dark')}
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <LogIn className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">{t('loginTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('loginDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            {(error || accountError) && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {accountError || (error ? t(error) : '')}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('loginEmail')}
              </label>
              <Input
                id="email"
                type="email"
                placeholder={t('loginEmailPlaceholder')}
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {t('loginPassword')}
              </label>
              <Input
                id="password"
                type="password"
                placeholder={t('loginPasswordPlaceholder')}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />
            </div>

            {loading && <p role="status" className="text-sm text-muted-foreground">{t('loginLoading')}</p>}
            <Button
              type="submit"
              disabled={busy || loading}
              className="w-full"
              size="lg"
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? t('loginLoading') : busy ? t('loginPending') : t('loginTitle')}
            </Button>


          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link className="text-primary underline underline-offset-4" to="/signup">{language === 'en' ? 'Create a student account' : '建立學生帳號'}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
