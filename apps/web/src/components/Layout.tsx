import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { useTheme } from '@/context/useTheme';
import { NavSearch } from './NavSearch';
import { NotificationBell } from './NotificationBell';
import { Users, Home, User, Moon, Sun, LogOut, ClipboardList, PlusCircle, CalendarCog, Star, Languages, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language';

export function Layout() {
  const location = useLocation();
  const { currentUser, clubs, logout } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  if (!currentUser) {
    return null; // ProtectedRoute 会处理重定向
  }

  const hasOwnedClubs = clubs.some((club) => club.founderId === currentUser.id);

  const navigation = [
    { name: t('home'), href: '/', icon: Home },
    { name: t('clubs'), href: '/clubs', icon: Users },
    ...(currentUser.role === 'student'
      ? [
          { name: t('registrations'), href: '/registrations', icon: ClipboardList },
          { name: t('createClub'), href: '/create-club', icon: PlusCircle },
          ...(hasOwnedClubs
            ? [{ name: t('manageClubs'), href: '/manage', icon: CalendarCog }]
            : []),
          { name: t('rateClub'), href: '/rate-my-club', icon: Star },
        ]
      : []),
    ...(currentUser.role === 'founder'
      ? [
          { name: t('rateClub'), href: '/rate-my-club', icon: Star },
          { name: t('organizeEvents'), href: '/founder', icon: User },
          { name: t('studentCouncil'), href: '/student-council', icon: Users },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background sticky top-0 z-40">
          <div className="mx-auto w-full px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">
                  {t('dashboardTitle')}
                </h1>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {t('welcomeBack')}, {currentUser.name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
                <NavSearch />
                <NotificationBell />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleLanguage}
                  className="gap-2 px-2 sm:px-3"
                  aria-label={t('switchLanguage')}
                >
                  <Languages className="h-4 w-4" />
                  {language === 'en' ? '中文' : 'EN'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className="gap-2 px-2 sm:px-3"
                  aria-label={theme === 'dark' ? t('switchLight') : t('switchDark')}
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('light')}</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('dark')}</span>
                    </>
                  )}
                </Button>
                <div className="flex h-9 items-center gap-2 rounded-md bg-muted/50 px-2 sm:px-3">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="hidden text-sm font-medium sm:inline">
                    {currentUser.role === 'founder' ? t('teacher') : t('student')}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2 px-2 sm:px-3"
                  aria-label={t('logout')}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">{t('logout')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="xl:hidden"
                  onClick={() => setMobileNavigationOpen(true)}
                  aria-label={t('navigation')}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Right Sidebar Navigation */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-y-auto border-l border-border bg-background xl:block">
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-1">{t('navigation')}</h2>
            <p className="text-xs text-muted-foreground">{t('quickAccess')}</p>
          </div>
          
          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/manage'
                  ? location.pathname.startsWith('/manage')
                  : location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                        : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isActive && 'text-primary-foreground')} />
                    <span className="min-w-0 break-words font-medium">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-8 border-t">
            <div className="space-y-4">
              <div className="px-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                  {t('account')}
                </p>
                <div className="space-y-2">
                  <div className="px-3 py-2 rounded-md bg-muted/50">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('logout')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {mobileNavigationOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavigationOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute right-0 top-0 h-full w-80 max-w-[88vw] overflow-y-auto border-l border-border bg-background shadow-2xl">
            <div className="p-4 sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{t('navigation')}</h2>
                  <p className="text-xs text-muted-foreground">{t('quickAccess')}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileNavigationOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/manage'
                      ? location.pathname.startsWith('/manage')
                      : location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileNavigationOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-4 py-3 transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="min-w-0 break-words font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-8 border-t pt-6">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {t('account')}
                </p>
                <div className="mt-3 rounded-md bg-muted/50 px-3 py-2">
                  <p className="truncate text-sm font-medium">{currentUser.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {currentUser.email}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
