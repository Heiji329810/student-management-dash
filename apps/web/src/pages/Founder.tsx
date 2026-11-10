import { useState } from 'react';
import { Calendar, MapPin, Plus, Users } from 'lucide-react';
import { useApp } from '@/context/useApp';
import { ActivityForm } from '@/components/manage-activities/ActivityForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  emptyActivityFormValues,
  toCreateActivityInput,
  validateActivityForm,
} from '@/lib/activityForm';
import { formatActivityDate } from '@/lib/activities';

export function Founder() {
  const {
    clubs,
    currentUser,
    createOfficialEvent,
    getRegisteredStudents,
  } = useApp();
  const [values, setValues] = useState(emptyActivityFormValues);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);

  if (!currentUser) return null;
  if (currentUser.role !== 'founder') {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground">This page is only accessible to teachers.</p>
      </div>
    );
  }

  const officialEventsClub = clubs.find(
    (club) => club.category === 'School Official Events' && club.name !== 'Student Council'
  );
  const events = [...(officialEventsClub?.activities ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const submitEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const validationError = validateActivityForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (await createOfficialEvent(toCreateActivityInput(values))) {
      setValues(emptyActivityFormValues());
      setSuccess('Official event published successfully.');
      setShowEventForm(false);
    } else {
      setError('Unable to publish the official event.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Organize Official Events</h2>
          <p className="mt-2 text-muted-foreground">
            Publish school events and view student registrations.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowEventForm((open) => !open)}>
          <Plus className="h-4 w-4" />
          Create official event
        </Button>
      </div>

      {success && (
        <p className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">
          {success}
        </p>
      )}

      {showEventForm && (
        <Card className="mx-auto max-w-2xl border-2">
          <CardHeader>
            <CardTitle>New School Official Event</CardTitle>
            <CardDescription>
              Use the same event details available to student club founders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityForm
              values={values}
              onChange={setValues}
              onSubmit={submitEvent}
              submitLabel="Publish Official Event"
              error={error}
            />
          </CardContent>
        </Card>
      )}

      <section className="space-y-5">
        <div>
          <h3 className="text-2xl font-bold">Published Official Events</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Every posted official event is listed here with its registrations.
          </p>
        </div>

        {events.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No official events have been posted.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {events.map((event) => {
              const registeredStudents = officialEventsClub
                ? getRegisteredStudents(event.id, officialEventsClub.id)
                : [];

              return (
                <Card key={event.id} className="border-2">
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>{event.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {event.description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {registeredStudents.length} registered
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatActivityDate(event.date)}
                      </span>
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <Users className="h-4 w-4" />
                        Registered students
                      </p>
                      {registeredStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No students have registered for this event.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {registeredStudents.map((student) => (
                            <div key={student.id} className="rounded-md border px-3 py-2 text-sm">
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {student.studentId} · {student.email}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
