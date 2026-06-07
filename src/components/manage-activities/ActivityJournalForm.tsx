import { useRef } from 'react';
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

interface ActivityJournalFormProps {
  values: JournalFormValues;
  onChange: (values: JournalFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  error?: string;
  success?: string;
  submitLabel?: string;
}

export function ActivityJournalForm({
  values,
  onChange,
  onSubmit,
  error,
  success,
  submitLabel = 'Save Journal',
}: ActivityJournalFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wordCount = countWords(values.reflection);

  const set = <K extends keyof JournalFormValues>(key: K, value: JournalFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_JOURNAL_PHOTOS - values.photos.length;
    const toRead = Array.from(files).slice(0, remaining);
    const newPhotos = [...values.photos];

    let pending = toRead.filter((f) => f.type.startsWith('image/')).length;
    if (pending === 0) return;

    toRead.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          newPhotos.push(reader.result);
        }
        pending -= 1;
        if (pending === 0) {
          onChange({ ...values, photos: newPhotos.slice(0, MAX_JOURNAL_PHOTOS) });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    set(
      'photos',
      values.photos.filter((_, i) => i !== index)
    );
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

      <div className="space-y-2">
        <label htmlFor="journal-participants" className="text-sm font-medium">
          Members Who Participated
        </label>
        <textarea
          id="journal-participants"
          value={values.participants}
          onChange={(e) => set('participants', e.target.value)}
          placeholder="List the names of members who took part in this activity..."
          rows={3}
          className="border-border w-full min-w-0 rounded-md border bg-background px-3 py-2 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm resize-y"
        />
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
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handlePhotos(e.target.files);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              Upload Photos
            </Button>
          </>
        )}
      </div>

      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
