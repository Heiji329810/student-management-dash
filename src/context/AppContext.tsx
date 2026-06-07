import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  ActivityJournal,
  ActivityJournalInput,
  ActivityRemovalNotice,
  CancelActivityInput,
  Club,
  CreateActivityInput,
  CreateClubInput,
  Student,
  User,
} from '@/types';
import { mockClubs, mockStudents, mockUsers } from '@/data/mockData';
import { buildActivityFields } from '@/lib/activityForm';
import { getActiveActivities, isActivityPast } from '@/lib/activities';
import { journalKey, validateActivityJournal } from '@/lib/journal';

function loadClubs(): Club[] {
  const saved = localStorage.getItem('clubs');
  const clubs: Club[] = saved ? JSON.parse(saved) : mockClubs;
  return clubs.map((club) => ({
    ...club,
    activities: getActiveActivities(club.activities),
    members: club.members ?? [],
  }));
}

function loadRemovalNotices(): ActivityRemovalNotice[] {
  const saved = localStorage.getItem('removalNotices');
  return saved ? JSON.parse(saved) : [];
}

function loadActivityJournals(): ActivityJournal[] {
  const saved = localStorage.getItem('activityJournals');
  if (!saved) return [];
  const raw = JSON.parse(saved) as ActivityJournal[];
  return raw.map((j) => ({
    ...j,
    participantIds: j.participantIds ?? [],
  }));
}

interface AppContextType {
  clubs: Club[];
  students: Student[];
  removalNotices: ActivityRemovalNotice[];
  activityJournals: ActivityJournal[];
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  registerForActivity: (activityId: string, clubId: string) => void;
  unregisterFromActivity: (activityId: string, clubId: string) => void;
  getRegisteredStudents: (activityId: string, clubId: string) => Student[];
  createClub: (input: CreateClubInput) => boolean;
  createActivity: (clubId: string, input: CreateActivityInput) => boolean;
  updateActivity: (clubId: string, activityId: string, input: CreateActivityInput) => boolean;
  cancelActivity: (clubId: string, activityId: string, input: CancelActivityInput) => boolean;
  joinClub: (clubId: string) => void;
  leaveClub: (clubId: string) => void;
  isClubMember: (clubId: string) => boolean;
  getMyClubs: () => Club[];
  getMyRemovalNotices: () => ActivityRemovalNotice[];
  getActivityJournal: (clubId: string, activityId: string) => ActivityJournal | undefined;
  saveActivityJournal: (
    clubId: string,
    activityId: string,
    input: ActivityJournalInput
  ) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [clubs, setClubs] = useState<Club[]>(loadClubs);
  const [removalNotices, setRemovalNotices] = useState<ActivityRemovalNotice[]>(loadRemovalNotices);
  const [activityJournals, setActivityJournals] = useState<ActivityJournal[]>(loadActivityJournals);
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

  useEffect(() => {
    localStorage.setItem('removalNotices', JSON.stringify(removalNotices));
  }, [removalNotices]);

  useEffect(() => {
    localStorage.setItem('activityJournals', JSON.stringify(activityJournals));
  }, [activityJournals]);

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

    const student = students.find((s) => s.studentId === user.studentId);

    const newClub: Club = {
      id: `c-${Date.now()}`,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      founderId: user.id,
      founderName: founderNames.join(', '),
      founderNames,
      activities: [],
      members: student ? [student.id] : [],
    };

    setClubs((prev) => [...prev, newClub]);
    return true;
  };

  const getMyClubs = (): Club[] => {
    if (!user || user.role !== 'student') return [];
    return clubs.filter((club) => club.founderId === user.id);
  };

  const isClubMember = (clubId: string): boolean => {
    if (!user || user.role !== 'student' || !user.studentId) return false;
    const student = students.find((s) => s.studentId === user.studentId);
    const club = clubs.find((c) => c.id === clubId);
    if (!student || !club) return false;
    return club.members.includes(student.id);
  };

  const joinClub = (clubId: string) => {
    if (!user || user.role !== 'student' || !user.studentId) return;
    const student = students.find((s) => s.studentId === user.studentId);
    if (!student) return;

    setClubs((prev) =>
      prev.map((club) => {
        if (club.id !== clubId || club.members.includes(student.id)) return club;
        return { ...club, members: [...club.members, student.id] };
      })
    );
  };

  const leaveClub = (clubId: string) => {
    if (!user || user.role !== 'student' || !user.studentId) return;
    const student = students.find((s) => s.studentId === user.studentId);
    if (!student) return;

    setClubs((prev) =>
      prev.map((club) => {
        if (club.id !== clubId) return club;
        return { ...club, members: club.members.filter((id) => id !== student.id) };
      })
    );
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

    const fields = buildActivityFields(input);
    const newActivity = {
      id: `a-${Date.now()}`,
      ...fields,
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

  const updateActivity = (
    clubId: string,
    activityId: string,
    input: CreateActivityInput
  ): boolean => {
    if (!user || user.role !== 'student') return false;

    const club = clubs.find((c) => c.id === clubId);
    if (!club || club.founderId !== user.id) return false;

    const activity = club.activities.find((a) => a.id === activityId);
    if (!activity || activity.cancelled || isActivityPast(activity)) return false;

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

    const fields = buildActivityFields(input);

    setClubs((prev) =>
      prev.map((c) => {
        if (c.id !== clubId) return c;
        return {
          ...c,
          activities: c.activities.map((a) =>
            a.id === activityId
              ? {
                  ...a,
                  ...fields,
                }
              : a
          ),
        };
      })
    );
    return true;
  };

  const getMyRemovalNotices = (): ActivityRemovalNotice[] => {
    if (!user || user.role !== 'student' || !user.studentId) return [];
    const student = students.find((s) => s.studentId === user.studentId);
    if (!student) return [];
    return removalNotices
      .filter((notice) => notice.studentId === student.id)
      .sort((a, b) => new Date(b.removedAt).getTime() - new Date(a.removedAt).getTime());
  };

  const getActivityJournal = (clubId: string, activityId: string): ActivityJournal | undefined => {
    return activityJournals.find(
      (j) => j.clubId === clubId && j.activityId === activityId
    );
  };

  const saveActivityJournal = (
    clubId: string,
    activityId: string,
    input: ActivityJournalInput
  ): boolean => {
    if (!user || user.role !== 'student') return false;

    const club = clubs.find((c) => c.id === clubId);
    if (!club || club.founderId !== user.id) return false;

    const activity = club.activities.find((a) => a.id === activityId);
    if (!activity) return false;

    const error = validateActivityJournal(input, activity.registeredStudents.length);
    if (error) return false;

    const now = new Date().toISOString();
    const existing = getActivityJournal(clubId, activityId);

    if (existing) {
      setActivityJournals((prev) =>
        prev.map((j) =>
          j.id === existing.id
            ? {
                ...j,
                activityName: input.activityName.trim(),
                reflection: input.reflection.trim(),
                participantIds: input.participantIds,
                socialMediaLink: input.socialMediaLink?.trim() || undefined,
                photos: input.photos,
                updatedAt: now,
              }
            : j
        )
      );
    } else {
      const journal: ActivityJournal = {
        id: `j-${journalKey(clubId, activityId)}`,
        clubId,
        activityId,
        activityName: input.activityName.trim(),
        reflection: input.reflection.trim(),
        participantIds: input.participantIds,
        socialMediaLink: input.socialMediaLink?.trim() || undefined,
        photos: input.photos,
        createdAt: now,
        updatedAt: now,
      };
      setActivityJournals((prev) => [...prev, journal]);
    }

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

    const removedAt = new Date().toISOString();
    const notices: ActivityRemovalNotice[] = activity.registeredStudents.map((studentId) => ({
      id: `rn-${Date.now()}-${studentId}`,
      studentId,
      activityTitle: activity.title,
      clubName: club.name,
      clubId,
      activityDate: activity.date,
      message: reason,
      removedAt,
    }));

    if (notices.length > 0) {
      setRemovalNotices((prev) => [...prev, ...notices]);
    }

    setClubs((prev) =>
      prev.map((c) => {
        if (c.id !== clubId) return c;
        return {
          ...c,
          activities: c.activities.filter((a) => a.id !== activityId),
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
        removalNotices,
        activityJournals,
        currentUser: user,
        isAuthenticated: !!user,
        login,
        logout,
        registerForActivity,
        unregisterFromActivity,
        getRegisteredStudents,
        createClub,
        createActivity,
        updateActivity,
        cancelActivity,
        joinClub,
        leaveClub,
        isClubMember,
        getMyClubs,
        getMyRemovalNotices,
        getActivityJournal,
        saveActivityJournal,
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
