import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ManageActivitiesClubGuard } from './manage-activities/useManagedClub';

const MAX_WORDS = 100;

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function ManageActivitiesAdd() {
  const { createActivity } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [durationType, setDurationType] = useState<'one-day' | 'long-term'>('one-day');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [locationUndetermined, setLocationUndetermined] = useState(false);
  const [estimatedParticipants, setEstimatedParticipants] = useState('');
  const [allStudentsOnCampus, setAllStudentsOnCampus] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  return (
    <ManageActivitiesClubGuard>
      {(club) => {
        const wordCount = countWords(description);

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          setError('');
          setSuccess('');

          if (!title.trim()) {
            setError('Please enter an activity name.');
            return;
          }
          if (!description.trim()) {
            setError('Please enter an activity introduction.');
            return;
          }
          if (wordCount > MAX_WORDS) {
            setError(`Introduction must be no more than ${MAX_WORDS} words.`);
            return;
          }
          if (!startDateTime) {
            setError('Please select a start date and time.');
            return;
          }
          if (durationType === 'long-term' && !endDate) {
            setError('Please enter an end date for long-term events.');
            return;
          }
          if (!locationUndetermined && !location.trim()) {
            setError('Please enter a location or select Undetermined.');
            return;
          }
          if (!allStudentsOnCampus) {
            const participants = parseInt(estimatedParticipants, 10);
            if (!participants || participants < 1) {
              setError('Please enter a valid estimated participant amount.');
              return;
            }
          }

          const ok = createActivity(club.id, {
            title,
            description,
            startDateTime,
            durationType,
            endDate: durationType === 'long-term' ? endDate : undefined,
            location,
            locationUndetermined,
            estimatedParticipants: allStudentsOnCampus
              ? undefined
              : parseInt(estimatedParticipants, 10),
            allStudentsOnCampus,
          });

          if (ok) {
            setTitle('');
            setDescription('');
            setStartDateTime('');
            setDurationType('one-day');
            setEndDate('');
            setLocation('');
            setLocationUndetermined(false);
            setEstimatedParticipants('');
            setAllStudentsOnCampus(false);
            setSuccess('Activity added successfully.');
          } else {
            setError('Failed to create activity. Please check your inputs and try again.');
          }
        };

        return (
          <div className="w-full min-h-[60vh]">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to={`/manage-activities/${club.id}`}>← Back to options</Link>
            </Button>

            <div className="flex justify-center w-full pt-8">
              <div className="w-full max-w-xl space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold tracking-tight">Add Activity</h2>
                  <p className="text-muted-foreground mt-2">{club.name}</p>
                </div>

                <Card className="border-2">
                <CardHeader>
                  <CardTitle>New Activity</CardTitle>
                  <CardDescription>
                    New activities will appear on the Clubs page once submitted.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {error && (
                      <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="p-3 rounded-md border border-border bg-muted/50 text-sm">
                        {success}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="title" className="text-sm font-medium">
                        Activity Name
                      </label>
                      <Input
                        id="title"
                        placeholder="Enter activity name"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="description" className="text-sm font-medium">
                          Activity Introduction
                        </label>
                        <span
                          className={cn(
                            'text-xs',
                            wordCount > MAX_WORDS ? 'text-destructive' : 'text-muted-foreground'
                          )}
                        >
                          {wordCount} / {MAX_WORDS} words
                        </span>
                      </div>
                      <textarea
                        id="description"
                        placeholder="Describe the activity in no more than 100 words..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={5}
                        className="border-border w-full min-w-0 rounded-md border bg-background px-3 py-2 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm resize-y"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="startDateTime" className="text-sm font-medium">
                        Start Date & Time
                      </label>
                      <Input
                        id="startDateTime"
                        type="datetime-local"
                        value={startDateTime}
                        onChange={(e) => setStartDateTime(e.target.value)}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Event Duration</label>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="durationType"
                            value="one-day"
                            checked={durationType === 'one-day'}
                            onChange={() => setDurationType('one-day')}
                            className="accent-foreground"
                          />
                          <span className="text-sm">One-day event</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="durationType"
                            value="long-term"
                            checked={durationType === 'long-term'}
                            onChange={() => setDurationType('long-term')}
                            className="accent-foreground"
                          />
                          <span className="text-sm">Long-term event</span>
                        </label>
                      </div>
                    </div>

                    {durationType === 'long-term' && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label htmlFor="endDate" className="text-sm font-medium">
                          End Date
                        </label>
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          min={startDateTime ? startDateTime.split('T')[0] : undefined}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <label htmlFor="location" className="text-sm font-medium">
                        Location
                      </label>
                      <Input
                        id="location"
                        placeholder="Enter event location"
                        value={location}
                        disabled={locationUndetermined}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={locationUndetermined}
                          onChange={(e) => {
                            setLocationUndetermined(e.target.checked);
                            if (e.target.checked) setLocation('');
                          }}
                          className="accent-foreground"
                        />
                        <span className="text-sm text-muted-foreground">Undetermined</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <label htmlFor="participants" className="text-sm font-medium">
                        Estimated Participants
                      </label>
                      <Input
                        id="participants"
                        type="number"
                        min={1}
                        placeholder="Enter estimated number of participants"
                        value={estimatedParticipants}
                        disabled={allStudentsOnCampus}
                        onChange={(e) => setEstimatedParticipants(e.target.value)}
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allStudentsOnCampus}
                          onChange={(e) => {
                            setAllStudentsOnCampus(e.target.checked);
                            if (e.target.checked) setEstimatedParticipants('');
                          }}
                          className="accent-foreground"
                        />
                        <span className="text-sm text-muted-foreground">All students on campus</span>
                      </label>
                    </div>

                    <Button type="submit" className="w-full">
                      Add Activity
                    </Button>
                  </form>
                </CardContent>
              </Card>
              </div>
            </div>
          </div>
        );
      }}
    </ManageActivitiesClubGuard>
  );
}
