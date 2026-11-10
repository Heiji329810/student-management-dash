import { Link } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { CLUB_CATEGORIES } from '@/data/categories';
import { getClubEventCount, getClubMemberCount } from '@/lib/clubs';
import { ClubJoinButton } from '@/components/ClubJoinButton';
import type { Club } from '@/types';

const categoryEmojis: Record<string, string> = {
  'School Official Events': '🏫',
  Science: '🔬',
  'Computer Science': '💻',
  'Academic/Competitions': '🏆',
  'Art and Design': '🎨',
  'Social Care/Volunteer': '🤝',
};

export function ClubCard({ club, isStudent }: { club: Club; isStudent: boolean }) {
  const memberCount = getClubMemberCount(club);
  const eventCount = getClubEventCount(club);

  return (
    <Card className="border-2 flex flex-col h-full hover:border-primary/40 transition-colors">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="w-fit text-xs">
            {categoryEmojis[club.category] ? `${categoryEmojis[club.category]} ` : ''}
            {club.category}
          </Badge>
          {club.isSchoolOfficial && (
            <Badge className="w-fit text-xs">School Official</Badge>
          )}
        </div>
        <div>
          <CardTitle className="text-lg leading-snug">{club.name}</CardTitle>
          <CardDescription className="mt-2 line-clamp-2 text-sm">
            {club.description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-4 pt-0">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {eventCount} {eventCount === 1 ? 'event' : 'events'}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">Founded by {club.founderName}</p>

        <div className="mt-auto flex flex-col gap-2">
          {isStudent && (
            <ClubJoinButton
              clubId={club.id}
              className="h-10 w-full min-w-0 px-4 text-sm font-semibold"
            />
          )}
          {!isStudent && (
            <Button asChild variant="outline" size="sm" className="w-full gap-2">
              <Link to={`/clubs/${club.id}/members`}>
                <Users className="h-4 w-4" />
                Show members
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="w-full gap-2">
            <Link to={`/clubs/${club.id}`}>
              View All Events
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function Clubs() {
  const { clubs, currentUser } = useApp();

  if (!currentUser) {
    return null;
  }

  const isStudent = currentUser.role === 'student';
  const categories = [...CLUB_CATEGORIES];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Clubs & Organizations</h2>
        <p className="text-muted-foreground mt-2">
          {isStudent
            ? 'Browse clubs and join the ones you are interested in'
            : 'Browse all student clubs and their events'}
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="!h-auto min-h-0 flex flex-wrap gap-2 w-full justify-start items-start bg-transparent p-0 mb-6">
          <TabsTrigger
            value="all"
            className="h-auto min-h-0 flex-none shrink-0 px-4 py-2 rounded-lg border border-border shadow-sm bg-background text-foreground hover:bg-accent data-[state=active]:bg-foreground data-[state=active]:text-background transition-all after:hidden text-sm"
          >
            All
          </TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="h-auto min-h-0 flex-none shrink-0 px-4 py-2 rounded-lg border border-border shadow-sm bg-background text-foreground hover:bg-accent data-[state=active]:bg-foreground data-[state=active]:text-background transition-all after:hidden text-sm"
            >
              <span className="mr-1">{categoryEmojis[category] || '📁'}</span>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {['all', ...categories].map((category) => {
          const filtered = clubs.filter(
            (club) => category === 'all' || club.category === category
          );

          return (
            <TabsContent
              key={category}
              value={category}
              className="mt-0 focus-visible:outline-none"
            >
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No clubs in this category yet.
                </p>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
                  {filtered.map((club) => (
                    <ClubCard key={club.id} club={club} isStudent={isStudent} />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
