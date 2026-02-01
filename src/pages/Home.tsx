import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, GraduationCap, Sparkles, Trophy } from 'lucide-react';

export function Home() {
  const { clubs, currentUser, students } = useApp();
  
  const totalActivities = clubs.reduce((sum, club) => sum + club.activities.length, 0);
  const totalMembers = clubs.reduce((sum, club) => sum + club.memberCount, 0);
  
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
    },
    {
      title: 'Total Activities',
      value: totalActivities,
      description: 'Available events',
      icon: Activity,
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
      image: '✨',
    },
    {
      title: currentUser.role === 'student' ? 'My Registrations' : 'Total Members',
      value: currentUser.role === 'student' ? userRegistrations : totalMembers,
      description: currentUser.role === 'student' 
        ? 'Activities registered' 
        : 'Across all clubs',
      icon: currentUser.role === 'student' ? Sparkles : Trophy,
      gradient: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-400',
      image: currentUser.role === 'student' ? '⭐' : '🏆',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Welcome back, {currentUser.name}! Here's your overview.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {cardData.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card 
              key={index} 
              className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group"
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <div className="mt-12">
        <h3 className="text-2xl font-bold tracking-tight mb-6">Quick Stats</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <div className="text-2xl font-bold">
                {clubs.reduce((max, club) => 
                  club.memberCount > max.memberCount ? club : max
                , clubs[0])?.name || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {clubs.reduce((max, club) => 
                  club.memberCount > max.memberCount ? club : max
                , clubs[0])?.memberCount || 0} members
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(clubs.map(c => c.category)).size}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Different categories
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(clubs.reduce((sum, club) => sum + club.memberCount, 0) / clubs.length) || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per organization
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
