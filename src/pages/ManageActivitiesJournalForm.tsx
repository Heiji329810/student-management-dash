import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActivityJournalForm, type JournalFormValues } from '@/components/manage-activities/ActivityJournalForm';
import { isActivityPast } from '@/lib/activities';
import { validateActivityJournal } from '@/lib/journal';
import { ManageActivitiesClubGuard } from './manage-activities/useManagedClub';
import type { Activity, Club } from '@/types';

function emptyJournalValues(activityTitle: string): JournalFormValues {
  return {
    activityName: activityTitle,
    reflection: '',
    participantIds: [],
    socialMediaLink: '',
    photos: [],
  };
}

function JournalFormPage({ club, activity }: { club: Club; activity: Activity }) {
  const navigate = useNavigate();
  const { getActivityJournal, saveActivityJournal, getRegisteredStudents } = useApp();
  const [values, setValues] = useState<JournalFormValues>(emptyJournalValues(activity.title));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const registeredStudents = getRegisteredStudents(activity.id, club.id);

  useEffect(() => {
    const existing = getActivityJournal(club.id, activity.id);
    if (existing) {
      setValues({
        activityName: existing.activityName,
        reflection: existing.reflection,
        participantIds: existing.participantIds ?? [],
        socialMediaLink: existing.socialMediaLink ?? '',
        photos: existing.photos,
      });
    } else {
      setValues(emptyJournalValues(activity.title));
    }
    setError('');
    setSuccess('');
  }, [activity.id, club.id, getActivityJournal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateActivityJournal(values, registeredStudents.length);
    if (validationError) {
      setError(validationError);
      return;
    }

    const ok = saveActivityJournal(club.id, activity.id, {
      ...values,
      socialMediaLink: values.socialMediaLink?.trim() || undefined,
    });

    if (ok) {
      setSuccess('Journal saved successfully.');
      navigate(`/clubs/${club.id}/activities/${activity.id}/journal`);
    } else {
      setError('Failed to save journal. Please try again.');
    }
  };

  return (
    <div className="w-full min-h-[60vh]">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={`/manage-activities/${club.id}/journal`}>← Back to journal list</Link>
      </Button>

      <div className="flex justify-center w-full pt-8">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Journal My Activities</h2>
            <p className="text-muted-foreground mt-2">{club.name}</p>
          </div>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Activity Journal</CardTitle>
              <CardDescription>
                Document photos, reflections, and participants for this past event.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityJournalForm
                values={values}
                onChange={setValues}
                onSubmit={handleSubmit}
                registeredStudents={registeredStudents}
                error={error}
                success={success}
                submitLabel="Save & View Journal"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ManageActivitiesJournalForm() {
  const { activityId } = useParams<{ activityId: string }>();

  return (
    <ManageActivitiesClubGuard>
      {(club) => {
        const activity = club.activities.find((a) => a.id === activityId);

        if (!activityId || !activity) {
          return (
            <div className="space-y-4">
              <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link to={`/manage-activities/${club.id}/journal`}>← Back to journal list</Link>
              </Button>
              <p className="text-muted-foreground">This activity was not found.</p>
            </div>
          );
        }

        if (!isActivityPast(activity)) {
          return (
            <div className="space-y-4">
              <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link to={`/manage-activities/${club.id}/journal`}>← Back to journal list</Link>
              </Button>
              <p className="text-muted-foreground">
                Journals can only be created after an event has ended.
              </p>
            </div>
          );
        }

        return <JournalFormPage club={club} activity={activity} />;
      }}
    </ManageActivitiesClubGuard>
  );
}
