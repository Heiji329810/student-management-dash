import {
  Camera,
  FlaskConical,
  Heart,
  Landmark,
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

export const CLUB_CATEGORIES = [
  'School Official Events',
  'Science',
  'Computer Science',
  'Academic/Competitions',
  'Art and Design',
  'Social Care/Volunteer',
] as const;

export type ClubCategory = (typeof CLUB_CATEGORIES)[number];

export const CATEGORY_CONFIG: Record<
  ClubCategory,
  { emoji: string; icon: LucideIcon; description: string }
> = {
  'School Official Events': {
    emoji: '🏫',
    icon: Landmark,
    description: 'Official campus ceremonies, orientations, and school-wide programs',
  },
  Science: {
    emoji: '🔬',
    icon: FlaskConical,
    description: 'Biology, chemistry, physics, and research activities',
  },
  'Computer Science': {
    emoji: '💻',
    icon: Sparkles,
    description: 'Coding, hackathons, and technology workshops',
  },
  'Academic/Competitions': {
    emoji: '🏆',
    icon: Trophy,
    description: 'Debates, academic contests, and competitive events',
  },
  'Art and Design': {
    emoji: '🎨',
    icon: Camera,
    description: 'Photography, visual arts, and creative design',
  },
  'Social Care/Volunteer': {
    emoji: '🤝',
    icon: Heart,
    description: 'Community service, volunteering, and social impact',
  },
};
