import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActivityForm } from '@/components/manage-activities/ActivityForm';
import {
  emptyActivityFormValues,
  toCreateActivityInput,
  validateActivityForm,
} from '@/lib/activityForm';
import { ManageActivitiesClubGuard } from './manage-activities/ManageActivitiesClubGuard';

export function ManageActivitiesAdd() {
  const { createActivity } = useApp();
  const [values, setValues] = useState(emptyActivityFormValues);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  return (
    <ManageActivitiesClubGuard>
      {(club) => {
        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setError('');
          setSuccess('');

          const validationError = validateActivityForm(values);
          if (validationError) {
            setError(validationError);
            return;
          }

          const ok = await createActivity(club.id, toCreateActivityInput(values));

          if (ok) {
            setValues(emptyActivityFormValues());
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
                    <ActivityForm
                      values={values}
                      onChange={setValues}
                      onSubmit={handleSubmit}
                      submitLabel="Add Activity"
                      error={error}
                      success={success}
                    />
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
