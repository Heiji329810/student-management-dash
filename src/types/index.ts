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
}

export interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  founderId: string;
  founderName: string;
  activities: Activity[];
  memberCount: number;
}

export type UserRole = 'student' | 'founder';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string;
}
