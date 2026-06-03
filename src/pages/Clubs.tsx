import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, CheckCircle2, XCircle, Sparkles, Camera, Trophy, Heart, FlaskConical, Landmark, ArrowRight } from 'lucide-react';
import { CLUB_CATEGORIES } from '@/data/mockData';
import {
  formatActivityDate,
  getActivityEmoji,
  getActiveActivities,
  getRecentActivities,
} from '@/lib/activities';
import type { Activity } from '@/types';

const categoryIcons: Record<string, { icon: typeof Sparkles; emoji: string; gradient: string }> = {
  'School Official Events': { icon: Landmark, emoji: '🏫', gradient: 'from-slate-500/20 to-zinc-500/20' },
  Science: { icon: FlaskConical, emoji: '🔬', gradient: 'from-teal-500/20 to-cyan-500/20' },
  'Computer Science': { icon: Sparkles, emoji: '💻', gradient: 'from-blue-500/20 to-cyan-500/20' },
  'Academic/Competitions': { icon: Trophy, emoji: '🏆', gradient: 'from-orange-500/20 to-red-500/20' },
  'Art and Design': { icon: Camera, emoji: '🎨', gradient: 'from-purple-500/20 to-pink-500/20' },
  'Social Care/Volunteer': { icon: Heart, emoji: '🤝', gradient: 'from-green-500/20 to-emerald-500/20' },
};

export function Clubs() {
  const { clubs, currentUser, students, registerForActivity, unregisterFromActivity } = useApp();

  if (!currentUser) {
    return null;
  }

  const categories = [...CLUB_CATEGORIES];

  const handleRegister = (activityId: string, clubId: string) => {
    registerForActivity(activityId, clubId);
  };

  const handleUnregister = (activityId: string, clubId: string) => {
    unregisterFromActivity(activityId, clubId);
  };

  const isRegistered = (activity: Activity) => {
    if (currentUser.role !== 'student' || !currentUser.studentId) return false;
    const student = students.find((s) => s.studentId === currentUser.studentId);
    return student ? activity.registeredStudents.includes(student.id) : false;
  };

  const isFull = (activity: Activity) => {
    if (activity.allStudentsOnCampus) return false;
    return activity.maxParticipants
      ? activity.registeredStudents.length >= activity.maxParticipants
      : false;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Clubs & Organizations</h2>
        <p className="text-muted-foreground mt-2">
          Explore student clubs and register for exciting activities
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full gap-0">
        <TabsList className="!h-auto min-h-0 flex flex-wrap gap-3 w-full justify-start items-start bg-transparent p-0 mb-8 relative z-10">
          <TabsTrigger
            value="all"
            className="h-auto min-h-0 flex-none shrink-0 px-5 py-2.5 rounded-lg border border-border shadow-sm bg-background text-foreground hover:bg-accent data-[state=active]:bg-foreground data-[state=active]:text-background transition-all after:hidden"
          >
            All
          </TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="h-auto min-h-0 flex-none shrink-0 px-5 py-2.5 rounded-lg border border-border shadow-sm bg-background text-foreground hover:bg-accent data-[state=active]:bg-foreground data-[state=active]:text-background transition-all after:hidden"
            >
              <span className="mr-1.5">{categoryIcons[category]?.emoji || '📁'}</span>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {['all', ...categories].map((category) => (
          <TabsContent key={category} value={category} className="space-y-6 mt-0 focus-visible:outline-none">
            {clubs
              .filter((club) => category === 'all' || club.category === category)
              .map((club) => {
                const categoryInfo = categoryIcons[club.category] || {
                  icon: Sparkles,
                  emoji: '📁',
                  gradient: 'from-gray-500/20 to-gray-600/20',
                };
                const previewActivities = getRecentActivities(club.activities, 2);
                const activeCount = getActiveActivities(club.activities).length;

                return (
                  <Card
                    key={club.id}
                    className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl group"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${categoryInfo.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    />

                    <CardHeader className="relative z-10">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-4xl">{categoryInfo.emoji}</div>
                            <div>
                              <CardTitle className="text-2xl">{club.name}</CardTitle>
                              <div className="mt-1 text-sm text-muted-foreground">
                                Founded by {club.founderName}
                              </div>
                            </div>
                          </div>
                          <CardDescription className="mt-3 text-base">{club.description}</CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Badge variant="secondary" className="text-xs">
                            {club.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {club.memberCount} members
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="relative z-10">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Latest Activities
                          </h3>
                          {activeCount > 2 && (
                            <span className="text-xs text-muted-foreground">
                              Showing 2 of {activeCount}
                            </span>
                          )}
                        </div>

                        {activeCount === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">No activities scheduled at the moment.</p>
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            {previewActivities.map((activity) => {
                              const activityEmoji = getActivityEmoji(activity.title);
                              const registered = isRegistered(activity);

                              return (
                                <Card
                                  key={activity.id}
                                  className="border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-lg relative overflow-hidden group/activity"
                                >
                                  <div className="absolute top-0 right-0 text-6xl opacity-5 group-hover/activity:opacity-10 transition-opacity">
                                    {activityEmoji}
                                  </div>

                                  <CardHeader className="pb-3 relative z-10">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2 flex-1">
                                        <span className="text-2xl">{activityEmoji}</span>
                                        <div className="flex-1">
                                          <CardTitle className="text-lg leading-tight">
                                            {activity.title}
                                          </CardTitle>
                                        </div>
                                      </div>
                                      {registered && (
                                        <Badge className="bg-green-500/90 text-white">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Registered
                                        </Badge>
                                      )}
                                    </div>
                                    <CardDescription className="mt-2 text-sm line-clamp-2">
                                      {activity.description}
                                    </CardDescription>
                                  </CardHeader>

                                  <CardContent className="space-y-3 relative z-10">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Calendar className="h-4 w-4 text-primary" />
                                      <span className="line-clamp-1">{formatActivityDate(activity.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <MapPin className="h-4 w-4 text-primary" />
                                      <span className="line-clamp-1">{activity.location}</span>
                                    </div>
                                    {currentUser.role === 'student' && (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant={registered ? 'outline' : 'default'}
                                            className="w-full mt-2"
                                            disabled={isFull(activity) && !registered}
                                          >
                                            {registered ? (
                                              <>
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Unregister
                                              </>
                                            ) : isFull(activity) ? (
                                              <>
                                                <Users className="h-4 w-4 mr-2" />
                                                Full
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Register
                                              </>
                                            )}
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>
                                              {registered
                                                ? 'Unregister from Activity'
                                                : 'Register for Activity'}
                                            </DialogTitle>
                                            <DialogDescription>
                                              {registered
                                                ? 'Are you sure you want to unregister from this activity?'
                                                : `Confirm your registration for ${activity.title}`}
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4 py-4">
                                            <div className="flex items-center gap-3">
                                              <span className="text-3xl">{activityEmoji}</span>
                                              <div>
                                                <p className="font-medium text-lg">{activity.title}</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                  {activity.description}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="space-y-2 text-sm bg-muted/50 p-4 rounded-lg">
                                              <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-primary" />
                                                {formatActivityDate(activity.date)}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-primary" />
                                                {activity.location}
                                              </div>
                                              {activity.maxParticipants && (
                                                <div className="flex items-center gap-2">
                                                  <Users className="h-4 w-4 text-primary" />
                                                  {activity.registeredStudents.length} /{' '}
                                                  {activity.maxParticipants} participants
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                              <Button
                                                onClick={() => {
                                                  if (registered) {
                                                    handleUnregister(activity.id, club.id);
                                                  } else {
                                                    handleRegister(activity.id, club.id);
                                                  }
                                                }}
                                                className="flex-1"
                                              >
                                                {registered ? 'Unregister' : 'Confirm Registration'}
                                              </Button>
                                              <DialogClose asChild>
                                                <Button variant="outline" className="flex-1">
                                                  Cancel
                                                </Button>
                                              </DialogClose>
                                            </div>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}

                        <Button asChild variant="outline" className="w-full gap-2">
                          <Link to={`/clubs/${club.id}`}>
                            View All Events
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
