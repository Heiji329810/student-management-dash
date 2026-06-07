import { Calendar, MapPin, Users } from 'lucide-react';
import { formatActivityDate, formatEndDate } from '@/lib/activities';
import type { Activity } from '@/types';

export function ActivityDetailsSummary({ activity }: { activity: Activity }) {
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <div className="flex items-start gap-2">
        <Calendar className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          {formatActivityDate(activity.date)}
          {activity.durationType === 'long-term' && activity.endDate && (
            <> · Ends {formatEndDate(activity.endDate)}</>
          )}
          {activity.durationType === 'long-term' && (
            <span className="block text-xs mt-0.5">Long-term event</span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0" />
        {activity.location}
      </div>
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 shrink-0" />
        {activity.allStudentsOnCampus
          ? 'All students on campus'
          : activity.maxParticipants
            ? `Up to ${activity.maxParticipants} participants`
            : 'Open to all'}
      </div>
    </div>
  );
}
