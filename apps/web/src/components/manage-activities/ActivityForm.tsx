import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  countWords,
  MAX_ACTIVITY_WORDS,
  type ActivityFormValues,
} from '@/lib/activityForm';

interface ActivityFormProps {
  values: ActivityFormValues;
  onChange: (values: ActivityFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  error?: string;
  success?: string;
  formId?: string;
}

export function ActivityForm({
  values,
  onChange,
  onSubmit,
  submitLabel,
  error,
  success,
  formId = 'activity-form',
}: ActivityFormProps) {
  const wordCount = countWords(values.description);

  const set = <K extends keyof ActivityFormValues>(key: K, value: ActivityFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-8">
      {error && (
        <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-md border border-border bg-muted/50 text-sm">{success}</div>
      )}

      <div className="space-y-2">
        <label htmlFor={`${formId}-title`} className="text-sm font-medium">
          Activity Name
        </label>
        <Input
          id={`${formId}-title`}
          placeholder="Enter activity name"
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor={`${formId}-description`} className="text-sm font-medium">
            Activity Introduction
          </label>
          <span
            className={cn(
              'text-xs',
              wordCount > MAX_ACTIVITY_WORDS ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {wordCount} / {MAX_ACTIVITY_WORDS} words
          </span>
        </div>
        <textarea
          id={`${formId}-description`}
          placeholder="Describe the activity in no more than 100 words..."
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={5}
          className="border-border w-full min-w-0 rounded-md border bg-background px-3 py-2 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm resize-y"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={`${formId}-startDateTime`} className="text-sm font-medium">
          Start Date & Time
        </label>
        <Input
          id={`${formId}-startDateTime`}
          type="datetime-local"
          value={values.startDateTime}
          onChange={(e) => set('startDateTime', e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Event Duration</label>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`${formId}-durationType`}
              value="one-day"
              checked={values.durationType === 'one-day'}
              onChange={() => set('durationType', 'one-day')}
              className="accent-foreground"
            />
            <span className="text-sm">One-day event</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`${formId}-durationType`}
              value="long-term"
              checked={values.durationType === 'long-term'}
              onChange={() => set('durationType', 'long-term')}
              className="accent-foreground"
            />
            <span className="text-sm">Long-term event</span>
          </label>
        </div>
      </div>

      {values.durationType === 'long-term' && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <label htmlFor={`${formId}-endDate`} className="text-sm font-medium">
            End Date
          </label>
          <Input
            id={`${formId}-endDate`}
            type="date"
            value={values.endDate}
            min={values.startDateTime ? values.startDateTime.split('T')[0] : undefined}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </div>
      )}

      <div className="space-y-3">
        <label htmlFor={`${formId}-location`} className="text-sm font-medium">
          Location
        </label>
        <Input
          id={`${formId}-location`}
          placeholder="Enter event location"
          value={values.location}
          disabled={values.locationUndetermined}
          onChange={(e) => set('location', e.target.value)}
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={values.locationUndetermined}
            onChange={(e) => {
              const checked = e.target.checked;
              onChange({
                ...values,
                locationUndetermined: checked,
                location: checked ? '' : values.location,
              });
            }}
            className="accent-foreground"
          />
          <span className="text-sm text-muted-foreground">Undetermined</span>
        </label>
      </div>

      <div className="space-y-3">
        <label htmlFor={`${formId}-participants`} className="text-sm font-medium">
          Estimated Participants
        </label>
        <Input
          id={`${formId}-participants`}
          type="number"
          min={1}
          placeholder="Enter estimated number of participants"
          value={values.estimatedParticipants}
          disabled={values.allStudentsOnCampus}
          onChange={(e) => set('estimatedParticipants', e.target.value)}
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={values.allStudentsOnCampus}
            onChange={(e) => {
              const checked = e.target.checked;
              onChange({
                ...values,
                allStudentsOnCampus: checked,
                estimatedParticipants: checked ? '' : values.estimatedParticipants,
              });
            }}
            className="accent-foreground"
          />
          <span className="text-sm text-muted-foreground">All students on campus</span>
        </label>
      </div>

      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
