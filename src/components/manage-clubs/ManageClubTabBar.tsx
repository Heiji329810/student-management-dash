import { NavLink, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ClipboardCheck, Users } from 'lucide-react';

export function ManageClubTabBar() {
  const { clubId } = useParams<{ clubId: string }>();
  if (!clubId) return null;

  const tabs = [
    {
      to: `/manage/clubs/${clubId}/members`,
      label: 'Members',
      icon: Users,
    },
    {
      to: `/manage/clubs/${clubId}/check-in`,
      label: 'Weekly Check-in',
      icon: ClipboardCheck,
    },
  ];

  return (
    <nav className="flex border-b border-border">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
