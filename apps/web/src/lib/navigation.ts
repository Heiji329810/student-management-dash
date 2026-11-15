import type { Club, User } from '@/types';

export interface NavDestination {
  id: string;
  label: string;
  description?: string;
  href: string;
  group: string;
  keywords?: string[];
}

const MAIN_PAGES: NavDestination[] = [
  {
    id: 'home',
    label: 'Home',
    description: 'Dashboard overview',
    href: '/',
    group: 'Pages',
    keywords: ['dashboard', 'overview'],
  },
  {
    id: 'clubs',
    label: 'Clubs & Organizations',
    description: 'Browse all clubs and events',
    href: '/clubs',
    group: 'Pages',
    keywords: ['organizations', 'events', 'activities'],
  },
];

const STUDENT_PAGES: NavDestination[] = [
  {
    id: 'registrations',
    label: 'My Registrations',
    description: 'View your registered activities',
    href: '/registrations',
    group: 'Pages',
    keywords: ['registered', 'sign up', 'events'],
  },
  {
    id: 'create-club',
    label: 'Create a Club',
    description: 'Start a new student organization',
    href: '/create-club',
    group: 'Pages',
    keywords: ['new club', 'organization', 'found'],
  },
  {
    id: 'manage',
    label: 'Manage Clubs and Activities',
    description: 'Manage club members, check-in, and activities',
    href: '/manage',
    group: 'Pages',
    keywords: ['manage', 'clubs', 'activities', 'check-in', 'members'],
  },
  {
    id: 'rate-my-club',
    label: 'Rate My Club',
    description: 'Rate clubs you actively participate in',
    href: '/rate-my-club',
    group: 'Pages',
    keywords: ['rate', 'rating', 'review', 'feedback', 'club'],
  },
  {
    id: 'manage-clubs',
    label: 'Manage Clubs',
    description: 'View members and weekly check-in',
    href: '/manage/clubs',
    group: 'Pages',
    keywords: ['members', 'attendance', 'check-in'],
  },
  {
    id: 'manage-activities',
    label: 'Manage Activities',
    description: 'Add, edit, or cancel club activities',
    href: '/manage/activities',
    group: 'Pages',
    keywords: ['add activity', 'cancel', 'edit', 'events'],
  },
];

const FOUNDER_PAGES: NavDestination[] = [
  {
    id: 'rate-my-club',
    label: 'Rate My Club',
    description: 'View club rankings and moderate student comments',
    href: '/rate-my-club',
    group: 'Pages',
    keywords: ['rate', 'rating', 'review', 'feedback', 'club', 'comments'],
  },
  {
    id: 'founder',
    label: 'Organize Official Events',
    description: 'Create school events and view registrations',
    href: '/founder',
    group: 'Pages',
    keywords: ['official events', 'registrations'],
  },
  {
    id: 'student-council',
    label: 'Student Council',
    description: 'Configure annual departments and crew records',
    href: '/student-council',
    group: 'Pages',
    keywords: ['council', 'departments', 'annual crew'],
  },
  {
    id: 'student-council-new',
    label: 'New school year',
    description: 'Add a Student Council crew for a school year',
    href: '/student-council/new',
    group: 'Pages',
    keywords: ['council', 'departments', 'school year', 'crew'],
  },
];

export function getNavDestinations(user: User, clubs: Club[]): NavDestination[] {
  const destinations: NavDestination[] = [...MAIN_PAGES];
  const myClubs =
    user.role === 'student' ? clubs.filter((club) => club.founderId === user.id) : [];

  if (user.role === 'student') {
    destinations.push(
      ...STUDENT_PAGES.filter(
        (page) => myClubs.length > 0 || !page.id.startsWith('manage')
      )
    );

    for (const club of myClubs) {
      destinations.push(
        {
          id: `manage-club-${club.id}`,
          label: `Manage Club: ${club.name}`,
          description: 'Members and weekly check-in',
          href: `/manage/clubs/${club.id}/members`,
          group: 'Manage Clubs',
          keywords: [club.name, 'members', 'check-in', 'attendance'],
        },
        {
          id: `manage-${club.id}`,
          label: `Manage Activities: ${club.name}`,
          description: 'Add, edit, or cancel activities',
          href: `/manage-activities/${club.id}`,
          group: 'Manage Activities',
          keywords: [club.name, club.category, 'manage', 'add', 'edit', 'cancel'],
        },
        {
          id: `manage-add-${club.id}`,
          label: `Add Activity: ${club.name}`,
          description: 'Create a new event',
          href: `/manage-activities/${club.id}/add`,
          group: 'Manage Activities',
          keywords: [club.name, 'add', 'create', 'new event'],
        },
        {
          id: `manage-edit-${club.id}`,
          label: `Edit Activities: ${club.name}`,
          description: 'Change activity information',
          href: `/manage-activities/${club.id}/edit`,
          group: 'Manage Activities',
          keywords: [club.name, 'edit', 'change', 'update'],
        },
        {
          id: `manage-cancel-${club.id}`,
          label: `Cancel Activities: ${club.name}`,
          description: 'Cancel scheduled activities',
          href: `/manage-activities/${club.id}/cancel`,
          group: 'Manage Activities',
          keywords: [club.name, 'cancel'],
        },
        {
          id: `manage-journal-${club.id}`,
          label: `Journal Activities: ${club.name}`,
          description: 'Write journals for past events',
          href: `/manage-activities/${club.id}/journal`,
          group: 'Manage Activities',
          keywords: [club.name, 'journal', 'past', 'photos'],
        }
      );
    }
  }

  if (user.role === 'founder') {
    destinations.push(...FOUNDER_PAGES);
  }

  for (const club of clubs) {
    destinations.push({
      id: `club-${club.id}`,
      label: club.name,
      description: `${club.category} · View club events`,
      href: `/clubs/${club.id}`,
      group: 'Clubs',
      keywords: [club.category, club.description, 'club', 'organization', 'events'],
    });
  }

  return destinations;
}

export function filterNavDestinations(
  destinations: NavDestination[],
  query: string
): NavDestination[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return destinations;

  return destinations.filter((item) => {
    const haystack = [
      item.label,
      item.description ?? '',
      item.group,
      ...(item.keywords ?? []),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(trimmed);
  });
}

export function groupNavDestinations(
  destinations: NavDestination[]
): { group: string; items: NavDestination[] }[] {
  const groups = new Map<string, NavDestination[]>();

  for (const item of destinations) {
    const existing = groups.get(item.group) ?? [];
    existing.push(item);
    groups.set(item.group, existing);
  }

  const order = ['Pages', 'Clubs', 'Manage Clubs', 'Manage Activities'];
  return order
    .filter((group) => groups.has(group))
    .map((group) => ({ group, items: groups.get(group)! }));
}
