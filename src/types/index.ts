export interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  maxParticipants?: number;
  registeredStudents: string[]; // student IDs
  clubId: string;
  durationType?: 'one-day' | 'long-term';
  endDate?: string;
  locationUndetermined?: boolean;
  allStudentsOnCampus?: boolean;
  cancelled?: boolean;
  cancellationReason?: string;
  cancelledAt?: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  founderId: string;
  founderName: string;
  founderNames?: string[];
  activities: Activity[];
  memberCount: number;
}

export interface CreateClubInput {
  founderNames: string[];
  name: string;
  category: string;
  description: string;
}

export interface CreateActivityInput {
  title: string;
  description: string;
  startDateTime: string;
  durationType: 'one-day' | 'long-term';
  endDate?: string;
  location: string;
  locationUndetermined: boolean;
  estimatedParticipants?: number;
  allStudentsOnCampus: boolean;
}

export interface CancelActivityInput {
  reason: string;
}

export type UserRole = 'student' | 'founder';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string;
}
