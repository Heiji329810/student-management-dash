import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { CancelActivityInput, Club, CreateActivityInput, CreateClubInput, Student, User } from '@/types';
import { mockClubs, mockStudents, mockUsers } from '@/data/mockData';

interface AppContextType {
  clubs: Club[];
  students: Student[];
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  registerForActivity: (activityId: string, clubId: string) => void;
  unregisterFromActivity: (activityId: string, clubId: string) => void;
  getRegisteredStudents: (activityId: string, clubId: string) => Student[];
  createClub: (input: CreateClubInput) => boolean;
  createActivity: (clubId: string, input: CreateActivityInput) => boolean;
  cancelActivity: (clubId: string, activityId: string, input: CancelActivityInput) => boolean;
  getMyClubs: () => Club[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [clubs, setClubs] = useState<Club[]>(() => {
    const saved = localStorage.getItem('clubs');
    return saved ? JSON.parse(saved) : mockClubs;
  });
  const [students] = useState<Student[]>(mockStudents);
  const [user, setUser] = useState<User | null>(() => {
    // 从 localStorage 恢复登录状态
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    // 保存登录状态到 localStorage
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('clubs', JSON.stringify(clubs));
  }, [clubs]);

  const login = (email: string, _password: string): boolean => {
    // 简单的登录验证（在实际应用中应该调用后端API）
    // 这里使用邮箱作为用户名，密码可以是任意值（演示用）
    const foundUser = mockUsers.find((u) => u.email === email);
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const registerForActivity = (activityId: string, clubId: string) => {
    if (!user || user.role !== 'student' || !user.studentId) return;
    
    const club = clubs.find((c) => c.id === clubId);
    const activity = club?.activities.find((a) => a.id === activityId);
    if (!activity || activity.cancelled) return;
    
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
    if (!user || user.role !== 'student' || !user.studentId) return;
    
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

  const createClub = (input: CreateClubInput): boolean => {
    if (!user || user.role !== 'student') return false;

    const founderNames = input.founderNames.map((name) => name.trim()).filter(Boolean);
    if (founderNames.length === 0 || founderNames.length > 5) return false;
    if (!input.name.trim() || !input.category.trim() || !input.description.trim()) return false;
    if (input.category === 'School Official Events') return false;

    const newClub: Club = {
      id: `c-${Date.now()}`,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      founderId: user.id,
      founderName: founderNames.join(', '),
      founderNames,
      activities: [],
      memberCount: founderNames.length,
    };

    setClubs((prev) => [...prev, newClub]);
    return true;
  };

  const getMyClubs = (): Club[] => {
    if (!user || user.role !== 'student') return [];
    return clubs.filter((club) => club.founderId === user.id);
  };

  const createActivity = (clubId: string, input: CreateActivityInput): boolean => {
    if (!user || user.role !== 'student') return false;

    const club = clubs.find((c) => c.id === clubId);
    if (!club || club.founderId !== user.id) return false;

    if (!input.title.trim() || !input.description.trim() || !input.startDateTime) return false;
    if (input.durationType === 'long-term' && !input.endDate) return false;
    if (!input.locationUndetermined && !input.location.trim()) return false;
    if (!input.allStudentsOnCampus && (!input.estimatedParticipants || input.estimatedParticipants < 1)) {
      return false;
    }

    const start = new Date(input.startDateTime);
    if (Number.isNaN(start.getTime())) return false;

    if (input.durationType === 'long-term' && input.endDate) {
      const end = new Date(input.endDate);
      if (Number.isNaN(end.getTime()) || end < start) return false;
    }

    const newActivity = {
      id: `a-${Date.now()}`,
      title: input.title.trim(),
      description: input.description.trim(),
      date: input.startDateTime,
      location: input.locationUndetermined ? 'Undetermined' : input.location.trim(),
      locationUndetermined: input.locationUndetermined,
      durationType: input.durationType,
      endDate: input.durationType === 'long-term' ? input.endDate : undefined,
      maxParticipants: input.allStudentsOnCampus ? undefined : input.estimatedParticipants,
      allStudentsOnCampus: input.allStudentsOnCampus,
      registeredStudents: [] as string[],
      clubId,
    };

    setClubs((prev) =>
      prev.map((c) =>
        c.id === clubId ? { ...c, activities: [...c.activities, newActivity] } : c
      )
    );
    return true;
  };

  const cancelActivity = (
    clubId: string,
    activityId: string,
    input: CancelActivityInput
  ): boolean => {
    if (!user || user.role !== 'student') return false;

    const reason = input.reason.trim();
    if (!reason) return false;

    const club = clubs.find((c) => c.id === clubId);
    if (!club || club.founderId !== user.id) return false;

    const activity = club.activities.find((a) => a.id === activityId);
    if (!activity || activity.cancelled) return false;

    setClubs((prev) =>
      prev.map((c) => {
        if (c.id !== clubId) return c;
        return {
          ...c,
          activities: c.activities.map((a) =>
            a.id === activityId
              ? {
                  ...a,
                  cancelled: true,
                  cancellationReason: reason,
                  cancelledAt: new Date().toISOString(),
                }
              : a
          ),
        };
      })
    );
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        clubs,
        students,
        currentUser: user,
        isAuthenticated: !!user,
        login,
        logout,
        registerForActivity,
        unregisterFromActivity,
        getRegisteredStudents,
        createClub,
        createActivity,
        cancelActivity,
        getMyClubs,
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
