import { Link, useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ExternalLink, MapPin, Users, BookOpen } from 'lucide-react';
import { formatActivityDate, getActivityEmoji } from '@/lib/activities';
import { JournalCommentsSection } from '@/components/journal/JournalCommentsSection';

export function ActivityJournalView() {
  const { clubId, activityId } = useParams<{ clubId: string; activityId: string }>();
  const { clubs, currentUser, getActivityJournal, students } = useApp();

  if (!clubId || !activityId) return null;

  const club = clubs.find((c) => c.id === clubId);
  const activity = club?.activities.find((a) => a.id === activityId);
  const journal = getActivityJournal(clubId, activityId);
  const isOwner =
    currentUser?.role === 'student' && club && club.founderId === currentUser.id;

  const participantNames =
    journal?.participantIds?.length
      ? journal.participantIds
          .map((id) => students.find((s) => s.id === id)?.name)
          .filter(Boolean)
      : journal?.participants
        ? journal.participants
            .split(/\n/)
            .map((line) => line.trim())
            .filter(Boolean)
        : [];

  if (!club || !activity) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Not Found</h2>
        <p className="text-muted-foreground">This activity or club does not exist.</p>
        <Button asChild variant="outline">
          <Link to="/clubs">Back to Clubs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to={`/clubs/${club.id}`}>← Back to {club.name}</Link>
        </Button>

        <div className="flex items-start gap-3">
          <span className="text-4xl">{getActivityEmoji(activity.title)}</span>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline">Past Event</Badge>
              <Badge variant="secondary" className="gap-1">
                <BookOpen className="h-3 w-3" />
                Activity Journal
              </Badge>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              {journal?.activityName ?? activity.title}
            </h2>
            <p className="text-muted-foreground mt-2">
              {club.name} · {club.category}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {formatActivityDate(activity.date)}
        </span>
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {activity.location}
        </span>
      </div>

      {!journal ? (
        <Card className="border-2 border-dashed mb-0">
          <CardContent className="py-12 text-center space-y-4">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              No journal has been posted for this event yet.
            </p>
            {isOwner && (
              <Button asChild>
                <Link to={`/manage-activities/${club.id}/journal/${activity.id}`}>
                  Create Journal Entry
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 pb-0">
          {journal.photos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {journal.photos.map((photo, index) => (
                <div
                  key={index}
                  className="rounded-lg overflow-hidden border border-border aspect-video"
                >
                  <img
                    src={photo}
                    alt={`${journal.activityName} photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Experience & Reflection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {journal.reflection}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members Who Participated
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participantNames.length > 0 ? (
                <ul className="text-sm text-muted-foreground space-y-1">
                  {participantNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No participants recorded.</p>
              )}
            </CardContent>
          </Card>

          {journal.socialMediaLink && (
            <Button asChild variant="outline" className="gap-2">
              <a href={journal.socialMediaLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                View Social Media Post
              </a>
            </Button>
          )}

          {isOwner && (
            <Button asChild variant="outline">
              <Link to={`/manage-activities/${club.id}/journal/${activity.id}`}>
                Edit Journal Entry
              </Link>
            </Button>
          )}
        </div>
      )}

      <JournalCommentsSection clubId={clubId} activityId={activityId} />
    </div>
  );
}
