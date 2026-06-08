import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useTheme } from './ThemeProvider';
import { NavSearch } from './NavSearch';
import { Users, Home, User, Moon, Sun, LogOut, ClipboardList, PlusCircle, CalendarCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Layout() {
  const location = useLocation();
  const { currentUser, logout } = useApp();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!currentUser) {
    return null; // ProtectedRoute 会处理重定向
  }

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Clubs & Organizations', href: '/clubs', icon: Users },
    ...(currentUser.role === 'student'
      ? [
          { name: 'My Registrations', href: '/registrations', icon: ClipboardList },
          { name: 'Create a Club', href: '/create-club', icon: PlusCircle },
          { name: 'Manage Clubs and Activities', href: '/manage', icon: CalendarCog },
        ]
      : []),
    ...(currentUser.role === 'founder'
      ? [{ name: 'My Organizations', href: '/founder', icon: User }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background sticky top-0 z-40">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Student Management Dashboard
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Welcome back, {currentUser.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <NavSearch />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className="gap-2"
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="h-4 w-4" />
                      Light
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      Dark
                    </>
                  )}
                </Button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium capitalize">{currentUser.role}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  登出
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Right Sidebar Navigation */}
      <aside className="w-64 border-l border-border bg-background sticky top-0 h-screen overflow-y-auto">
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-1">Navigation</h2>
            <p className="text-xs text-muted-foreground">Quick access menu</p>
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
                    <span className="font-medium">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-8 border-t">
            <div className="space-y-4">
              <div className="px-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                  账户
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
                    登出
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
