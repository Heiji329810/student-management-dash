import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  countWords,
  MAX_JOURNAL_PHOTOS,
  MAX_JOURNAL_WORDS,
} from '@/lib/journal';
import type { ActivityJournalInput } from '@/types';
import { ImagePlus, X } from 'lucide-react';

export type JournalFormValues = ActivityJournalInput;

interface RegisteredStudentOption {
  id: string;
  name: string;
}

interface ActivityJournalFormProps {
  values: JournalFormValues;
  onChange: (values: JournalFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  registeredStudents: RegisteredStudentOption[];
  error?: string;
  success?: string;
  submitLabel?: string;
}

export function ActivityJournalForm({
  values,
  onChange,
  onSubmit,
  registeredStudents,
  error,
  success,
  submitLabel = 'Save Journal',
}: ActivityJournalFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState('');
  const [readingPhotos, setReadingPhotos] = useState(false);
  const readInProgress = useRef(false);
  const latestValues = useRef(values);
  const alive = useRef(true);
  useEffect(() => { latestValues.current = values; }, [values]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const wordCount = countWords(values.reflection);

  const set = <K extends keyof JournalFormValues>(key: K, value: JournalFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  const handlePhotos = async (files: FileList | null) => {
    if (!files || readInProgress.current) return;
    setPhotoError('');
    const selected = Array.from(files);
    const remaining = MAX_JOURNAL_PHOTOS - values.photos.length;
    if (selected.length > remaining) {
      setPhotoError(`You can upload up to ${MAX_JOURNAL_PHOTOS} photos.`);
      return;
    }
    if (selected.some(file => !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type))) {
      setPhotoError('Choose PNG, JPEG, GIF, or WebP images.');
      return;
    }
    if (selected.some(file => file.size > 2_999_970)) {
      setPhotoError('Each photo must be smaller than 3 MB.');
      return;
    }
    readInProgress.current = true;
    setReadingPhotos(true);
    try {
      const photos = await Promise.all(selected.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string'
          ? resolve(reader.result) : reject(new Error('Unable to read the image.'));
        reader.onerror = () => reject(new Error('Unable to read the image. Please choose it again.'));
        reader.readAsDataURL(file);
      })));
      if (alive.current) onChange({ ...latestValues.current, photos: [...latestValues.current.photos, ...photos] });
    } catch (cause) {
      if (alive.current) setPhotoError(cause instanceof Error ? cause.message : 'Unable to read the image.');
    } finally {
      readInProgress.current = false;
      if (alive.current) setReadingPhotos(false);
    }
  };

  const removePhoto = (index: number) => {
    set(
      'photos',
      values.photos.filter((_, i) => i !== index)
    );
  };

  const toggleParticipant = (studentId: string) => {
    const participantIds = values.participantIds.includes(studentId)
      ? values.participantIds.filter((id) => id !== studentId)
      : [...values.participantIds, studentId];
    set('participantIds', participantIds);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-md border border-border bg-muted/50 text-sm">{success}</div>
      )}

      <div className="space-y-2">
        <label htmlFor="journal-activity-name" className="text-sm font-medium">
          Activity Name
        </label>
        <Input
          id="journal-activity-name"
          value={values.activityName}
          onChange={(e) => set('activityName', e.target.value)}
          placeholder="Enter the activity name"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="journal-reflection" className="text-sm font-medium">
            What Was Done & Overall Experience
          </label>
          <span
            className={cn(
              'text-xs',
              wordCount > MAX_JOURNAL_WORDS ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {wordCount} / {MAX_JOURNAL_WORDS} words
          </span>
        </div>
        <textarea
          id="journal-reflection"
          value={values.reflection}
          onChange={(e) => set('reflection', e.target.value)}
          placeholder="Describe what happened at the event, the overall experience, and your feelings about it..."
          rows={8}
          className="border-border w-full min-w-0 rounded-md border bg-background px-3 py-2 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm resize-y"
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Members Who Participated</label>
        {registeredStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-md border border-dashed border-border p-4">
            No students registered for this event. Participants can only be selected from the
            registration list.
          </p>
        ) : (
          <div className="rounded-md border border-border divide-y divide-border">
            {registeredStudents.map((student) => (
              <label
                key={student.id}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={values.participantIds.includes(student.id)}
                  onChange={() => toggleParticipant(student.id)}
                  className="accent-foreground"
                />
                <span className="text-sm">{student.name}</span>
              </label>
            ))}
          </div>
        )}
        {registeredStudents.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Select the students who actually attended from those who registered.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="journal-social-link" className="text-sm font-medium">
          Social Media Link <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          id="journal-social-link"
          type="url"
          value={values.socialMediaLink ?? ''}
          onChange={(e) => set('socialMediaLink', e.target.value)}
          placeholder="https://mp.weixin.qq.com/... or other platform link"
        />
        <p className="text-xs text-muted-foreground">
          Link to a 微信公众号 post or other social media coverage of this event.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Activity Photos</label>
          <span className="text-xs text-muted-foreground">
            {values.photos.length} / {MAX_JOURNAL_PHOTOS}
          </span>
        </div>

        {values.photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {values.photos.map((photo, index) => (
              <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-border">
                <img src={photo} alt={`Activity photo ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 rounded-full bg-background/90 p-1 border border-border hover:bg-destructive hover:text-white transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {values.photos.length < MAX_JOURNAL_PHOTOS && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              className="hidden"
              disabled={readingPhotos}
              onChange={async (e) => {
                const input = e.currentTarget;
                await handlePhotos(input.files);
                input.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={readingPhotos}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {readingPhotos ? 'Reading photos…' : 'Upload Photos'}
            </Button>
          </>
        )}
      </div>

      {photoError && <p role="alert" className="text-sm text-destructive">{photoError}</p>}
      <Button type="submit" disabled={readingPhotos} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
