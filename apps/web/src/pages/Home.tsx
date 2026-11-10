import { Link } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, GraduationCap, Sparkles, Star, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClubMemberCount } from '@/lib/clubs';
import { calculateClubRatingScore } from '@/lib/clubRatings';
import { TeacherDashboard } from '@/pages/TeacherDashboard';

export function Home() {
  const { clubs, clubRatings, currentUser, students } = useApp();
  
  if (!currentUser) {
    return null;
  }

  if (currentUser.role === 'founder') {
    return <TeacherDashboard />;
  }
  
  const largestClub = clubs.length
    ? clubs.reduce((max, club) => (getClubMemberCount(club) > getClubMemberCount(max) ? club : max))
    : null;
  const studentCouncil = clubs.find((club) => club.name === 'Student Council');
  const studentCouncilMembers = studentCouncil ? getClubMemberCount(studentCouncil) : 0;
  
  const userRegistrations = (() => {
    if (currentUser.role !== 'student' || !currentUser.studentId) return 0;
    const student = students.find((s) => s.studentId === currentUser.studentId);
    if (!student) return 0;
    
    return clubs.reduce((sum, club) => {
      return sum + club.activities.filter(activity => 
        activity.registeredStudents.includes(student.id)
      ).length;
    }, 0);
  })();

  const cardData = [
    {
      title: 'Total Clubs',
      value: clubs.length,
      description: 'Active organizations',
      icon: GraduationCap,
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
      image: '🎓',
      href: '/clubs',
    },
    {
      title: 'My Registrations',
      value: userRegistrations,
      description: 'Activities registered',
      icon: Sparkles,
      gradient: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-400',
      image: '⭐',
      href: '/registrations',
    },
  ];

  const recordYears = Array.from(
    new Set([
      ...clubRatings.map((rating) => new Date(rating.createdAt).getFullYear()),
      ...clubs.flatMap((club) =>
        club.activities.map((activity) => new Date(activity.date).getFullYear())
      ),
    ])
  )
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => b - a);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Welcome back, {currentUser.name}! Here's your overview.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {cardData.map((card, index) => {
          const Icon = card.icon;
          const cardContent = (
            <Card 
              className={cn(
                'relative overflow-hidden border-2 transition-all duration-300 group',
                card.href
                  ? 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 cursor-pointer'
                  : 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10'
              )}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className="relative">
                  <div className="text-4xl absolute -top-2 -right-2 opacity-20 group-hover:opacity-30 transition-opacity">
                    {card.image}
                  </div>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold mb-1">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
                {card.href && (
                  <p className="text-xs text-muted-foreground mt-2 underline-offset-2 group-hover:underline">
                    View details →
                  </p>
                )}
              </CardContent>
            </Card>
          );

          return card.href ? (
            <Link key={index} to={card.href} className="block">
              {cardContent}
            </Link>
          ) : (
            <div key={index}>{cardContent}</div>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <div className="mt-12">
        <h3 className="text-2xl font-bold tracking-tight mb-6">Quick Stats</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Active Club
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clubs.reduce((max, club) => 
                  club.activities.length > max.activities.length ? club : max
                , clubs[0])?.name || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {clubs.reduce((max, club) => 
                  club.activities.length > max.activities.length ? club : max
                , clubs[0])?.activities.length || 0} activities
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Largest Club
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{largestClub?.name || 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {largestClub ? getClubMemberCount(largestClub) : 0} members
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Student Council Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {studentCouncilMembers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current council crew
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-10">
        <h3 className="text-2xl font-bold tracking-tight">Year Records</h3>
        {recordYears.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            No yearly club or event records are available yet.
          </p>
        ) : (
          recordYears.map((year) => {
            const yearRatings = clubRatings.filter(
              (rating) => new Date(rating.createdAt).getFullYear() === year
            );
            const highestRatedClubs = clubs
              .map((club) => {
                const ratings = yearRatings.filter((rating) => rating.clubId === club.id);
                return {
                  club,
                  ratingCount: ratings.length,
                  average:
                    ratings.length > 0
                      ? ratings.reduce(
                          (total, rating) =>
                            total + calculateClubRatingScore(rating),
                          0
                        ) / ratings.length
                      : 0,
                };
              })
              .filter((item) => item.ratingCount > 0)
              .sort((a, b) => b.average - a.average)
              .slice(0, 3);
            const largestEvents = clubs
              .flatMap((club) =>
                club.activities
                  .filter(
                    (activity) =>
                      new Date(activity.date).getFullYear() === year &&
                      !activity.cancelled
                  )
                  .map((activity) => ({ activity, club }))
              )
              .sort(
                (a, b) =>
                  b.activity.registeredStudents.length -
                  a.activity.registeredStudents.length
              )
              .slice(0, 3);

            return (
              <section key={year} className="space-y-5">
                <h4 className="text-xl font-semibold">{year}</h4>
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Star className="h-4 w-4" />
                    Highest-rated clubs
                  </p>
                  {highestRatedClubs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No club ratings were submitted this year.
                    </p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                      {highestRatedClubs.map(({ club, average, ratingCount }, index) => (
                        <Link key={club.id} to={`/clubs/${club.id}`}>
                          <Card className="h-full border-2 transition-colors hover:border-primary/50">
                            <CardContent className="pt-6">
                              <p className="text-xs text-muted-foreground">#{index + 1}</p>
                              <p className="mt-1 font-semibold">{club.name}</p>
                              <p className="mt-3 text-2xl font-bold">{average.toFixed(1)}</p>
                              <p className="text-xs text-muted-foreground">
                                {ratingCount} rating{ratingCount === 1 ? '' : 's'}
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4" />
                    Largest student events
                  </p>
                  {largestEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No student events were posted this year.
                    </p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                      {largestEvents.map(({ activity, club }, index) => (
                        <Link key={`${club.id}-${activity.id}`} to={`/clubs/${club.id}`}>
                          <Card className="h-full border-2 transition-colors hover:border-primary/50">
                            <CardContent className="pt-6">
                              <p className="text-xs text-muted-foreground">#{index + 1}</p>
                              <p className="mt-1 font-semibold">{activity.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {club.name}
                              </p>
                              <p className="mt-3 flex items-center gap-1 text-sm font-medium">
                                <Users className="h-4 w-4" />
                                {activity.registeredStudents.length} participants
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
