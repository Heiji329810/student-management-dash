import type {
  ClubAttendanceEntry,
  ClubRatingInput,
  ClubRatingScores,
} from "./types.js";

export const MIN_PRESENT_SESSIONS_TO_RATE = 3;

export const CLUB_RATING_DIMENSIONS: {
  key: keyof ClubRatingScores;
  label: string;
  description: string;
}[] = [
  {
    key: "activities",
    label: "Activities & Events",
    description: "Quality and variety of club activities and events",
  },
  {
    key: "community",
    label: "Community & Atmosphere",
    description: "Welcoming environment and member engagement",
  },
  {
    key: "organization",
    label: "Organization & Planning",
    description: "How well meetings and events are organized",
  },
  {
    key: "leadership",
    label: "Leadership & Communication",
    description: "Clarity and responsiveness from club leaders",
  },
];

export function countPresentSessions(
  attendance: ClubAttendanceEntry[],
  clubId: string,
  studentId: string,
): number {
  return attendance.filter(
    (entry) =>
      entry.clubId === clubId &&
      entry.studentId === studentId &&
      entry.status === "present",
  ).length;
}

export function canRateClub(isMember: boolean, presentCount: number): boolean {
  return isMember && presentCount >= MIN_PRESENT_SESSIONS_TO_RATE;
}

export function clubRatingKey(clubId: string, userId: string): string {
  return `${clubId}:${userId}`;
}

export function calculateClubRatingScore(input: ClubRatingInput): number {
  const scores = [
    input.dimensions.activities,
    input.dimensions.community,
    input.dimensions.organization,
    input.dimensions.leadership,
    input.overall,
  ];
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

function isValidScore(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function validateClubRatingInput(input: ClubRatingInput): string | null {
  for (const dimension of CLUB_RATING_DIMENSIONS) {
    const score = input.dimensions[dimension.key];
    if (!isValidScore(score)) {
      return `Please rate ${dimension.label} from 1 to 5 stars.`;
    }
  }

  if (!isValidScore(input.overall)) {
    return "Please select an overall rating from 1 to 5 stars.";
  }

  if (input.comment.trim().length > 500) {
    return "Your comment must be 500 characters or fewer.";
  }

  return null;
}

export function emptyClubRatingInput(): ClubRatingInput {
  return {
    dimensions: {
      activities: 0,
      community: 0,
      organization: 0,
      leadership: 0,
    },
    overall: 0,
    comment: "",
  };
}
