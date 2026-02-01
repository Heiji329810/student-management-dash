import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Club, Student, User } from '@/types';
import { mockClubs, mockStudents, currentUser as initialUser } from '@/data/mockData';

interface AppContextType {
  clubs: Club[];
  students: Student[];
  currentUser: User;
  registerForActivity: (activityId: string, clubId: string) => void;
  unregisterFromActivity: (activityId: string, clubId: string) => void;
  getRegisteredStudents: (activityId: string, clubId: string) => Student[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [clubs, setClubs] = useState<Club[]>(mockClubs);
  const [students] = useState<Student[]>(mockStudents);
  const [user] = useState<User>(initialUser);

  const registerForActivity = (activityId: string, clubId: string) => {
    if (user.role !== 'student' || !user.studentId) return;
    
    // Find the student ID that corresponds to the current user
    const student = students.find((s) => s.studentId === user.studentId);
    if (!student) return;
    
    setClubs((prevClubs) =>
      prevClubs.map((club) => {
        if (club.id === clubId) {
          return {
            ...club,
            activities: club.activities.map((activity) => {
              if (activity.id === activityId) {
                const isRegistered = activity.registeredStudents.includes(student.id);
                if (!isRegistered) {
                  return {
                    ...activity,
                    registeredStudents: [...activity.registeredStudents, student.id],
                  };
                }
              }
              return activity;
            }),
          };
        }
        return club;
      })
    );
  };

  const unregisterFromActivity = (activityId: string, clubId: string) => {
    if (user.role !== 'student' || !user.studentId) return;
    
    // Find the student ID that corresponds to the current user
    const student = students.find((s) => s.studentId === user.studentId);
    if (!student) return;
    
    setClubs((prevClubs) =>
      prevClubs.map((club) => {
        if (club.id === clubId) {
          return {
            ...club,
            activities: club.activities.map((activity) => {
              if (activity.id === activityId) {
                return {
                  ...activity,
                  registeredStudents: activity.registeredStudents.filter(
                    (id) => id !== student.id
                  ),
                };
              }
              return activity;
            }),
          };
        }
        return club;
      })
    );
  };

  const getRegisteredStudents = (activityId: string, clubId: string): Student[] => {
    const club = clubs.find((c) => c.id === clubId);
    if (!club) return [];
    
    const activity = club.activities.find((a) => a.id === activityId);
    if (!activity) return [];
    
    return students.filter((student) => activity.registeredStudents.includes(student.id));
  };

  return (
    <AppContext.Provider
      value={{
        clubs,
        students,
        currentUser: user,
        registerForActivity,
        unregisterFromActivity,
        getRegisteredStudents,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
