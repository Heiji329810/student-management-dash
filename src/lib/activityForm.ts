import type { Activity, CreateActivityInput } from '@/types';

export const MAX_ACTIVITY_WORDS = 100;

export interface ActivityFormValues {
  title: string;
  description: string;
  startDateTime: string;
  durationType: 'one-day' | 'long-term';
  endDate: string;
  location: string;
  locationUndetermined: boolean;
  estimatedParticipants: string;
  allStudentsOnCampus: boolean;
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function emptyActivityFormValues(): ActivityFormValues {
  return {
    title: '',
    description: '',
    startDateTime: '',
    durationType: 'one-day',
    endDate: '',
    location: '',
    locationUndetermined: false,
    estimatedParticipants: '',
    allStudentsOnCampus: false,
  };
}

export function activityToFormValues(activity: Activity): ActivityFormValues {
  let startDateTime = activity.date;
  if (activity.date.includes('T')) {
    startDateTime = activity.date.slice(0, 16);
  } else if (activity.date) {
    startDateTime = `${activity.date}T00:00`;
  }

  const locationUndetermined =
    !!activity.locationUndetermined || activity.location === 'Undetermined';

  return {
    title: activity.title,
    description: activity.description,
    startDateTime,
    durationType: activity.durationType ?? 'one-day',
    endDate: activity.endDate ?? '',
    location: locationUndetermined ? '' : activity.location,
    locationUndetermined,
    estimatedParticipants: activity.maxParticipants?.toString() ?? '',
    allStudentsOnCampus: !!activity.allStudentsOnCampus,
  };
}

export function validateActivityForm(values: ActivityFormValues): string | null {
  const wordCount = countWords(values.description);

  if (!values.title.trim()) return 'Please enter an activity name.';
  if (!values.description.trim()) return 'Please enter an activity introduction.';
  if (wordCount > MAX_ACTIVITY_WORDS) {
    return `Introduction must be no more than ${MAX_ACTIVITY_WORDS} words.`;
  }
  if (!values.startDateTime) return 'Please select a start date and time.';
  if (values.durationType === 'long-term' && !values.endDate) {
    return 'Please enter an end date for long-term events.';
  }
  if (!values.locationUndetermined && !values.location.trim()) {
    return 'Please enter a location or select Undetermined.';
  }
  if (!values.allStudentsOnCampus) {
    const participants = parseInt(values.estimatedParticipants, 10);
    if (!participants || participants < 1) {
      return 'Please enter a valid estimated participant amount.';
    }
  }

  const start = new Date(values.startDateTime);
  if (Number.isNaN(start.getTime())) return 'Please enter a valid start date and time.';

  if (values.durationType === 'long-term' && values.endDate) {
    const end = new Date(values.endDate);
    if (Number.isNaN(end.getTime()) || end < start) {
      return 'End date must be on or after the start date.';
    }
  }

  return null;
}

export function toCreateActivityInput(values: ActivityFormValues): CreateActivityInput {
  return {
    title: values.title,
    description: values.description,
    startDateTime: values.startDateTime,
    durationType: values.durationType,
    endDate: values.durationType === 'long-term' ? values.endDate : undefined,
    location: values.location,
    locationUndetermined: values.locationUndetermined,
    estimatedParticipants: values.allStudentsOnCampus
      ? undefined
      : parseInt(values.estimatedParticipants, 10),
    allStudentsOnCampus: values.allStudentsOnCampus,
  };
}

export function buildActivityFields(input: CreateActivityInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    date: input.startDateTime,
    location: input.locationUndetermined ? 'Undetermined' : input.location.trim(),
    locationUndetermined: input.locationUndetermined,
    durationType: input.durationType,
    endDate: input.durationType === 'long-term' ? input.endDate : undefined,
    maxParticipants: input.allStudentsOnCampus ? undefined : input.estimatedParticipants,
    allStudentsOnCampus: input.allStudentsOnCampus,
  };
}
