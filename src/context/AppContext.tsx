import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  ActivityJournal,
  ActivityJournalInput,
  ActivityRemovalNotice,
  CancelActivityInput,
  Club,
  ClubApplication,
  ClubApplicationDecision,
  ClubAttendanceEntry,
  ClubElection,
  ClubElectionVote,
  AttendanceStatus,
  ClubRatingInput,
  ClubRatingRecord,
  CreateActivityInput,
  CreateClubInput,
  CreateEventElectionInput,
  ElectionApplicantMessage,
  ElectionCandidateScore,
  ElectionScorerInvite,
  EventElection,
  EventElectionApplication,
  StudentCouncilTerm,
  JournalComment,
  JournalCommentReply,
  JournalLike,
  JournalThreadComment,
  JournalThreadCommentInput,
  NotificationRecord,
  Student,
  User,
} from '@/types';
import { mockClubs, mockStudents, mockUsers } from '@/data/mockData';
import { buildActivityFields } from '@/lib/activityForm';
import { getActiveActivities, isActivityPast } from '@/lib/activities';
import { journalKey, validateActivityJournal } from '@/lib/journal';
import { journalLikeKey, validateJournalThreadComment, collectCommentTreeIds } from '@/lib/journalComments';
import { getClubMemberStudents } from '@/lib/clubs';
import {
  canRateClub,
  clubRatingKey,
  countPresentSessions,
  validateClubRatingInput,
} from '@/lib/clubRatings';
import {
  loadReadNotificationIds,
  mergeNotifications,
  notificationsFromRemovalNotices,
  userIdFromStudentId,
} from '@/lib/notifications';

function resetCreatedCouncilYears(): void {
  if (localStorage.getItem('studentCouncilYearsReset')) return;
  localStorage.removeItem('studentCouncilTerms');
  const saved = localStorage.getItem('clubs');
  if (saved) {
    try {
      const clubs = JSON.parse(saved);
      const seededMembers = mockClubs.find((club) => club.id === 'c7')?.members ?? [];
      if (Array.isArray(clubs)) {
        localStorage.setItem(
          'clubs',
          JSON.stringify(
            clubs.map((club) =>
              club.id === 'c7' || club.name === 'Student Council'
                ? { ...club, members: seededMembers }
                : club
            )
          )
        );
      }
    } catch {
      localStorage.removeItem('clubs');
    }
  }
  localStorage.setItem('studentCouncilYearsReset', '1');
}

function loadClubs(): Club[] {
  resetCreatedCouncilYears();
  const saved = localStorage.getItem('clubs');
  const clubs: Club[] = saved ? JSON.parse(saved) : mockClubs;
  const studentCouncil = mockClubs.find((club) => club.id === 'c7');
  if (studentCouncil && !clubs.some((club) => club.id === studentCouncil.id)) {
    clubs.push(studentCouncil);
  }
  return clubs.map((club) => {
    const seeded = mockClubs.find((item) => item.id === club.id);
    return {
      ...club,
      description:
        club.id === 'c7' && seeded ? seeded.description : club.description,
      activities: getActiveActivities(club.activities),
      members: club.members ?? [],
    };
  });
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

function loadJournalThreadComments(): JournalThreadComment[] {
  const saved = localStorage.getItem('journalThreadComments');
  if (saved) return JSON.parse(saved);

  const migrated: JournalThreadComment[] = [];
  const oldComments = localStorage.getItem('journalComments');
  const oldReplies = localStorage.getItem('journalCommentReplies');

  if (oldComments) {
    const comments = JSON.parse(oldComments) as JournalComment[];
    for (const comment of comments) {
      migrated.push({
        id: comment.id,
        clubId: comment.clubId,
        activityId: comment.activityId,
        parentId: null,
        userId: comment.userId,
        userName: comment.userName,
        body: comment.comment,
        rating: comment.rating,
        createdAt: comment.createdAt,
      });
    }
  }

  if (oldReplies) {
    const replies = JSON.parse(oldReplies) as JournalCommentReply[];
    for (const reply of replies) {
      migrated.push({
        id: reply.id,
        clubId: reply.clubId,
        activityId: reply.activityId,
        parentId: reply.commentId,
        userId: reply.userId,
        userName: reply.userName,
        body: reply.reply,
        createdAt: reply.createdAt,
      });
    }
  }

  if (migrated.length > 0) {
    localStorage.setItem('journalThreadComments', JSON.stringify(migrated));
  }

  return migrated;
}

function loadJournalLikes(): JournalLike[] {
  const saved = localStorage.getItem('journalLikes');
  return saved ? JSON.parse(saved) : [];
}

function loadClubAttendance(): ClubAttendanceEntry[] {
  const saved = localStorage.getItem('clubAttendance');
  return saved ? JSON.parse(saved) : [];
}

function loadNotifications(): NotificationRecord[] {
  const saved = localStorage.getItem('notifications');
  const notifications: NotificationRecord[] = saved ? JSON.parse(saved) : [];
  return notifications.map((notification) => {
    const match = notification.href?.match(/^\/manage\/clubs\/([^/]+)\/members$/);
    if (!match) return notification;
    return { ...notification, href: `/clubs/${match[1]}/members` };
  });
}

function loadClubRatings(): ClubRatingRecord[] {
  const saved = localStorage.getItem('clubRatings');
  return saved ? JSON.parse(saved) : [];
}

function loadClubApplications(): ClubApplication[] {
  const saved = localStorage.getItem('clubApplications');
  return saved ? JSON.parse(saved) : [];
}

function loadClubElections(): ClubElection[] {
  const saved = localStorage.getItem('clubElections');
  return saved ? JSON.parse(saved) : [];
}

function loadClubElectionVotes(): ClubElectionVote[] {
  const saved = localStorage.getItem('clubElectionVotes');
  return saved ? JSON.parse(saved) : [];
}

function loadEventElections(): EventElection[] {
  const saved = localStorage.getItem('eventElections');
  const elections: EventElection[] = saved ? JSON.parse(saved) : [];
  return elections.map((election) => ({
    ...election,
    publishedResults: election.publishedResults?.map((result) => ({
      ...result,
      totalScore: result.totalScore ?? result.averageScore ?? 0,
      selected: result.selected ?? false,
    })),
  }));
}

function loadEventElectionApplications(): EventElectionApplication[] {
  const saved = localStorage.getItem('eventElectionApplications');
  return saved ? JSON.parse(saved) : [];
}

function loadElectionScorerInvites(): ElectionScorerInvite[] {
  const saved = localStorage.getItem('electionScorerInvites');
  return saved ? JSON.parse(saved) : [];
}

function loadElectionCandidateScores(): ElectionCandidateScore[] {
  const saved = localStorage.getItem('electionCandidateScores');
  return saved ? JSON.parse(saved) : [];
}

function loadElectionApplicantMessages(): ElectionApplicantMessage[] {
  const saved = localStorage.getItem('electionApplicantMessages');
  return saved ? JSON.parse(saved) : [];
}

function loadStudentCouncilTerms(): StudentCouncilTerm[] {
  const saved = localStorage.getItem('studentCouncilTerms');
  return saved ? JSON.parse(saved) : [];
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface AppContextType {
  clubs: Club[];
  clubApplications: ClubApplication[];
  clubElections: ClubElection[];
  clubElectionVotes: ClubElectionVote[];
  eventElections: EventElection[];
  eventElectionApplications: EventElectionApplication[];
  electionScorerInvites: ElectionScorerInvite[];
  electionCandidateScores: ElectionCandidateScore[];
  electionApplicantMessages: ElectionApplicantMessage[];
  studentCouncilTerms: StudentCouncilTerm[];
  students: Student[];
  removalNotices: ActivityRemovalNotice[];
  activityJournals: ActivityJournal[];
  journalThreadComments: JournalThreadComment[];
  journalLikes: JournalLike[];
  clubAttendance: ClubAttendanceEntry[];
  clubRatings: ClubRatingRecord[];
  notifications: NotificationRecord[];
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  registerForActivity: (activityId: string, clubId: string) => void;
  unregisterFromActivity: (activityId: string, clubId: string) => void;
  getRegisteredStudents: (activityId: string, clubId: string) => Student[];
  submitClubApplication: (input: CreateClubInput) => boolean;
  reviewClubApplication: (
    applicationId: string,
    decision: ClubApplicationDecision,
    teacherComment: string
  ) => boolean;
  createClubElection: (electionDate: string, minimumRequiredVotes: number) => boolean;
  finalizeClubElection: (electionId: string) => boolean;
  getActiveClubElection: () => ClubElection | undefined;
  castClubElectionVote: (electionId: string, applicationId: string) => boolean;
  createOfficialEvent: (input: CreateActivityInput) => boolean;
  createEventElection: (input: CreateEventElectionInput) => boolean;
  submitEventElectionApplication: (
    electionId: string,
    answers: Record<string, string>
  ) => boolean;
  scoreEventElectionCandidate: (
    electionId: string,
    applicationId: string,
    score: number,
    note: string
  ) => boolean;
  sendEventElectionMessage: (electionId: string, message: string) => boolean;
  publishEventElectionResults: (
    electionId: string,
    summary: string,
    selectedApplicationIds: string[]
  ) => boolean;
  startStudentCouncilTerm: (
    schoolYear: string,
    departments: { name: string; memberStudentIds: string[] }[]
  ) => boolean;
  assignStudentCouncilDepartmentMember: (
    departmentId: string,
    studentId: string
  ) => boolean;
  removeStudentCouncilDepartmentMember: (
    departmentId: string,
    studentId: string
  ) => boolean;
  submitExternalElectionScore: (
    electionId: string,
    applicationId: string,
    scorerStudentId: string,
    score: number,
    note: string
  ) => boolean;
  createActivity: (clubId: string, input: CreateActivityInput) => boolean;
  updateActivity: (clubId: string, activityId: string, input: CreateActivityInput) => boolean;
  cancelActivity: (clubId: string, activityId: string, input: CancelActivityInput) => boolean;
  joinClub: (clubId: string) => void;
  leaveClub: (clubId: string) => void;
  teacherAddOfficialClubMember: (clubId: string, studentId: string) => boolean;
  teacherRemoveOfficialClubMember: (clubId: string, studentId: string) => boolean;
  isClubMember: (clubId: string) => boolean;
  getMyClubs: () => Club[];
  getClubMembers: (clubId: string) => Student[];
  getClubAttendanceForWeek: (clubId: string, weekStart: string) => Record<string, AttendanceStatus>;
  setClubMemberAttendance: (
    clubId: string,
    weekStart: string,
    studentId: string,
    status: AttendanceStatus
  ) => boolean;
  getRateableClubs: () => { club: Club; presentCount: number }[];
  getClubRating: (clubId: string) => ClubRatingInput | undefined;
  saveClubRating: (clubId: string, input: ClubRatingInput) => boolean;
  getMyNotifications: () => NotificationRecord[];
  getUnreadNotificationCount: () => number;
  isNotificationRead: (notificationId: string) => boolean;
  markNotificationRead: (notificationId: string) => void;
  getMyRemovalNotices: () => ActivityRemovalNotice[];
  getActivityJournal: (clubId: string, activityId: string) => ActivityJournal | undefined;
  saveActivityJournal: (
    clubId: string,
    activityId: string,
    input: ActivityJournalInput
  ) => boolean;
  getJournalThreadComments: (clubId: string, activityId: string) => JournalThreadComment[];
  postJournalThreadComment: (
    clubId: string,
    activityId: string,
    input: JournalThreadCommentInput
  ) => boolean;
  deleteJournalThreadComment: (commentId: string) => boolean;
  getJournalLikes: (clubId: string, activityId: string) => JournalLike[];
  toggleJournalLike: (clubId: string, activityId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [clubs, setClubs] = useState<Club[]>(loadClubs);
  const [clubApplications, setClubApplications] =
    useState<ClubApplication[]>(loadClubApplications);
  const [clubElections, setClubElections] = useState<ClubElection[]>(loadClubElections);
  const [clubElectionVotes, setClubElectionVotes] =
    useState<ClubElectionVote[]>(loadClubElectionVotes);
  const [eventElections, setEventElections] = useState<EventElection[]>(loadEventElections);
  const [eventElectionApplications, setEventElectionApplications] =
    useState<EventElectionApplication[]>(loadEventElectionApplications);
  const [electionScorerInvites, setElectionScorerInvites] =
    useState<ElectionScorerInvite[]>(loadElectionScorerInvites);
  const [electionCandidateScores, setElectionCandidateScores] =
    useState<ElectionCandidateScore[]>(loadElectionCandidateScores);
  const [electionApplicantMessages, setElectionApplicantMessages] =
    useState<ElectionApplicantMessage[]>(loadElectionApplicantMessages);
  const [studentCouncilTerms, setStudentCouncilTerms] =
    useState<StudentCouncilTerm[]>(loadStudentCouncilTerms);
  const [removalNotices, setRemovalNotices] = useState<ActivityRemovalNotice[]>(loadRemovalNotices);
  const [activityJournals, setActivityJournals] = useState<ActivityJournal[]>(loadActivityJournals);
  const [journalThreadComments, setJournalThreadComments] =
    useState<JournalThreadComment[]>(loadJournalThreadComments);
  const [journalLikes, setJournalLikes] = useState<JournalLike[]>(loadJournalLikes);
  const [clubAttendance, setClubAttendance] = useState<ClubAttendanceEntry[]>(loadClubAttendance);
  const [notifications, setNotifications] = useState<NotificationRecord[]>(loadNotifications);
  const [clubRatings, setClubRatings] = useState<ClubRatingRecord[]>(loadClubRatings);
  const [readNotificationIds, setReadNotificationIds] = useState<Record<string, string[]>>(
    loadReadNotificationIds
  );
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
    localStorage.setItem('clubApplications', JSON.stringify(clubApplications));
  }, [clubApplications]);

  useEffect(() => {
    localStorage.setItem('clubElections', JSON.stringify(clubElections));
  }, [clubElections]);

  useEffect(() => {
    localStorage.setItem('clubElectionVotes', JSON.stringify(clubElectionVotes));
  }, [clubElectionVotes]);

  useEffect(() => {
    localStorage.setItem('eventElections', JSON.stringify(eventElections));
  }, [eventElections]);

  useEffect(() => {
    localStorage.setItem(
      'eventElectionApplications',
      JSON.stringify(eventElectionApplications)
    );
  }, [eventElectionApplications]);

  useEffect(() => {
    localStorage.setItem('electionScorerInvites', JSON.stringify(electionScorerInvites));
  }, [electionScorerInvites]);

  useEffect(() => {
    localStorage.setItem(
      'electionCandidateScores',
      JSON.stringify(electionCandidateScores)
    );
  }, [electionCandidateScores]);

  useEffect(() => {
    localStorage.setItem(
      'electionApplicantMessages',
      JSON.stringify(electionApplicantMessages)
    );
  }, [electionApplicantMessages]);

  useEffect(() => {
    localStorage.setItem('studentCouncilTerms', JSON.stringify(studentCouncilTerms));
  }, [studentCouncilTerms]);

  useEffect(() => {
    localStorage.setItem('removalNotices', JSON.stringify(removalNotices));
  }, [removalNotices]);

  useEffect(() => {
    localStorage.setItem('activityJournals', JSON.stringify(activityJournals));
  }, [activityJournals]);

  useEffect(() => {
    localStorage.setItem('journalThreadComments', JSON.stringify(journalThreadComments));
  }, [journalThreadComments]);

  useEffect(() => {
    localStorage.setItem('journalLikes', JSON.stringify(journalLikes));
  }, [journalLikes]);

  useEffect(() => {
    localStorage.setItem('clubAttendance', JSON.stringify(clubAttendance));
  }, [clubAttendance]);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('clubRatings', JSON.stringify(clubRatings));
  }, [clubRatings]);

  useEffect(() => {
    localStorage.setItem('readNotificationIds', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    const fromNotices = notificationsFromRemovalNotices(removalNotices, students, mockUsers);
    if (fromNotices.length > 0) {
      setNotifications((prev) => mergeNotifications(prev, fromNotices));
    }
  }, []);

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

  const pushNotification = (record: NotificationRecord) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === record.id)) return prev;
      return [record, ...prev].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  };

  const registerForActivity = (activityId: string, clubId: string) => {
    if (!user || user.role !== 'student' || !user.studentId) return;
    
    const club = clubs.find((c) => c.id === clubId);
    const activity = club?.activities.find((a) => a.id === activityId);
    if (!club || !activity || activity.cancelled) return;
    
    // Find the student ID that corresponds to the current user
    const student = students.find((s) => s.studentId === user.studentId);
    if (!student) return;

    const isRegistered = activity.registeredStudents.includes(student.id);
    if (!isRegistered && club.founderId !== user.id) {
      pushNotification({
        id: `reg-${activityId}-${student.id}-${Date.now()}`,
        recipientUserId: club.founderId,
        type: 'event_registration',
        title: 'New event registration',
        message: `${user.name} registered for "${activity.title}".`,
        href: `/clubs/${clubId}`,
        createdAt: new Date().toISOString(),
      });
    }
    
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

  const buildClubFromApplication = (
    application: ClubApplication,
    isSchoolOfficial: boolean
  ): Club => ({
    id: `c-app-${application.id}`,
    name: application.name,
    description: application.description,
    category: application.category,
    founderId: application.applicantUserId,
    founderName: application.founderNames.join(', '),
    founderNames: application.founderNames,
    activities: [],
    members: [application.applicantStudentId],
    isSchoolOfficial,
    sourceApplicationId: application.id,
  });

  const submitClubApplication = (input: CreateClubInput): boolean => {
    if (!user || user.role !== 'student' || !user.studentId) return false;

    const student = students.find((s) => s.studentId === user.studentId);
    const founderNames = input.founderNames.map((name) => name.trim()).filter(Boolean);
    const name = input.name.trim();
    const description = input.description.trim();
    if (!student || founderNames.length === 0 || founderNames.length > 5) return false;
    if (!name || !input.category.trim() || !description) return false;
    if (input.category === 'School Official Events') return false;

    const managingTeacherName = input.managingTeacherName?.trim() ?? '';
    if (input.wantsSchoolOfficial && !managingTeacherName) return false;

    const duplicateApplication = clubApplications.some(
      (application) =>
        application.applicantUserId === user.id &&
        application.name.toLowerCase() === name.toLowerCase() &&
        (application.status === 'pending' ||
          application.status === 'approved_official_candidate')
    );
    const duplicateClub = clubs.some((club) => club.name.toLowerCase() === name.toLowerCase());
    if (duplicateApplication || duplicateClub) return false;

    const application: ClubApplication = {
      id: `ca-${Date.now()}`,
      applicantUserId: user.id,
      applicantStudentId: student.id,
      applicantName: user.name,
      applicantEmail: user.email,
      founderNames,
      name,
      category: input.category.trim(),
      description,
      wantsSchoolOfficial: input.wantsSchoolOfficial,
      managingTeacherName: input.wantsSchoolOfficial ? managingTeacherName : undefined,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    setClubApplications((prev) => [application, ...prev]);
    return true;
  };

  const reviewClubApplication = (
    applicationId: string,
    decision: ClubApplicationDecision,
    teacherComment: string
  ): boolean => {
    if (!user || user.role !== 'founder') return false;

    const application = clubApplications.find((item) => item.id === applicationId);
    if (!application || application.status !== 'pending') return false;

    const comment = teacherComment.trim();
    if (decision === 'reject' && !comment) return false;

    const reviewedAt = new Date().toISOString();
    if (decision === 'reject') {
      setClubApplications((prev) =>
        prev.map((item) =>
          item.id === applicationId
            ? {
                ...item,
                status: 'rejected',
                teacherComment: comment,
                reviewedAt,
                reviewedByUserId: user.id,
                reviewedByName: user.name,
              }
            : item
        )
      );
      pushNotification({
        id: `application-result-${applicationId}`,
        recipientUserId: application.applicantUserId,
        type: 'club_application_result',
        title: 'Club application not approved',
        message: `Your application for "${application.name}" was not approved. ${comment}`,
        href: '/create-club',
        createdAt: reviewedAt,
      });
      return true;
    }

    const isOfficial = application.wantsSchoolOfficial;
    const newClub = buildClubFromApplication(application, isOfficial);
    setClubs((prev) =>
      prev.some((club) => club.sourceApplicationId === application.id)
        ? prev
        : [...prev, newClub]
    );
    setClubApplications((prev) =>
      prev.map((item) =>
        item.id === applicationId
          ? {
              ...item,
              status: isOfficial ? 'established_official' : 'approved_ordinary',
              teacherComment: comment,
              reviewedAt,
              reviewedByUserId: user.id,
              reviewedByName: user.name,
              resultingClubId: newClub.id,
            }
          : item
      )
    );
    pushNotification({
      id: `application-result-${applicationId}`,
      recipientUserId: application.applicantUserId,
      type: 'club_application_result',
      title: isOfficial
        ? 'Official club application approved'
        : 'Club application approved',
      message: isOfficial
        ? `"${application.name}" has been established as a School Official Club.${comment ? ` Teacher comment: ${comment}` : ''}`
        : `"${application.name}" has been established and is now open to students.${comment ? ` Teacher comment: ${comment}` : ''}`,
      href: `/clubs/${newClub.id}`,
      createdAt: reviewedAt,
    });
    return true;
  };

  const createClubElection = (
    electionDate: string,
    minimumRequiredVotes: number
  ): boolean => {
    if (!user || user.role !== 'founder') return false;
    if (!electionDate || electionDate < localDateKey()) return false;
    if (!Number.isInteger(minimumRequiredVotes) || minimumRequiredVotes < 1) return false;
    if (clubElections.some((election) => election.status === 'scheduled')) return false;

    const candidates = clubApplications.filter(
      (application) =>
        application.status === 'approved_official_candidate' && !application.electionId
    );
    const officialEventsClub = clubs.find(
      (club) => club.category === 'School Official Events'
    );
    if (candidates.length === 0 || !officialEventsClub) return false;

    const now = new Date().toISOString();
    const electionId = `ce-${Date.now()}`;
    const activityId = `a-election-${Date.now()}`;
    const election: ClubElection = {
      id: electionId,
      title: 'School Official Club Election',
      electionDate,
      minimumRequiredVotes,
      candidateApplicationIds: candidates.map((candidate) => candidate.id),
      status: 'scheduled',
      createdByUserId: user.id,
      createdAt: now,
      officialEventActivityId: activityId,
    };

    setClubElections((prev) => [election, ...prev]);
    setClubApplications((prev) =>
      prev.map((application) =>
        election.candidateApplicationIds.includes(application.id)
          ? { ...application, electionId }
          : application
      )
    );
    setClubs((prev) =>
      prev.map((club) =>
        club.id === officialEventsClub.id
          ? {
              ...club,
              activities: [
                ...club.activities,
                {
                  id: activityId,
                  title: election.title,
                  description: `Vote for one candidate club. Clubs need at least ${minimumRequiredVotes} votes to become School Official Clubs.`,
                  date: electionDate,
                  location: 'Online — Club Elections page',
                  registeredStudents: [],
                  clubId: club.id,
                  durationType: 'one-day',
                  allStudentsOnCampus: true,
                  linkedElectionId: electionId,
                },
              ],
            }
          : club
      )
    );

    for (const candidate of candidates) {
      pushNotification({
        id: `election-scheduled-${electionId}-${candidate.id}`,
        recipientUserId: candidate.applicantUserId,
        type: 'club_election_scheduled',
        title: 'Club election scheduled',
        message: `"${candidate.name}" will enter the School Official Club Election on ${new Date(`${electionDate}T00:00:00`).toLocaleDateString()}.`,
        href: '/elections',
        createdAt: now,
      });
    }
    return true;
  };

  const getActiveClubElection = (): ClubElection | undefined =>
    clubElections.find(
      (election) =>
        election.status === 'scheduled' && election.electionDate === localDateKey()
    );

  const castClubElectionVote = (
    electionId: string,
    applicationId: string
  ): boolean => {
    if (!user || user.role !== 'student' || !user.studentId) return false;
    const election = getActiveClubElection();
    const student = students.find((item) => item.studentId === user.studentId);
    if (!election || election.id !== electionId || !student) return false;
    if (!election.candidateApplicationIds.includes(applicationId)) return false;
    if (
      clubElectionVotes.some(
        (vote) => vote.electionId === electionId && vote.studentUserId === user.id
      )
    ) {
      return false;
    }

    setClubElectionVotes((prev) => [
      ...prev,
      {
        id: `cev-${electionId}-${user.id}`,
        electionId,
        applicationId,
        studentUserId: user.id,
        studentId: student.id,
        createdAt: new Date().toISOString(),
      },
    ]);
    return true;
  };

  const finalizeClubElection = (electionId: string): boolean => {
    if (!user || user.role !== 'founder') return false;
    const election = clubElections.find((item) => item.id === electionId);
    if (
      !election ||
      election.status !== 'scheduled' ||
      election.electionDate > localDateKey()
    ) {
      return false;
    }

    const candidates = clubApplications.filter((application) =>
      election.candidateApplicationIds.includes(application.id)
    );
    const now = new Date().toISOString();
    const establishedClubs = candidates.map((application) => {
      const voteCount = clubElectionVotes.filter(
        (vote) =>
          vote.electionId === election.id && vote.applicationId === application.id
      ).length;
      return {
        application,
        voteCount,
        club: buildClubFromApplication(
          application,
          voteCount >= election.minimumRequiredVotes
        ),
      };
    });

    setClubs((prev) => [
      ...prev.map((club) => ({
        ...club,
        activities: club.activities.filter(
          (activity) => activity.linkedElectionId !== electionId
        ),
      })),
      ...establishedClubs
        .map((result) => result.club)
        .filter(
          (club) =>
            !prev.some(
              (existing) => existing.sourceApplicationId === club.sourceApplicationId
            )
        ),
    ]);
    setClubApplications((prev) =>
      prev.map((application) => {
        const result = establishedClubs.find(
          (item) => item.application.id === application.id
        );
        if (!result) return application;
        return {
          ...application,
          status: result.club.isSchoolOfficial
            ? 'established_official'
            : 'established_ordinary',
          resultingClubId: result.club.id,
        };
      })
    );
    setClubElections((prev) =>
      prev.map((item) =>
        item.id === electionId ? { ...item, status: 'ended', endedAt: now } : item
      )
    );

    for (const result of establishedClubs) {
      const becameOfficial = result.club.isSchoolOfficial;
      pushNotification({
        id: `election-result-${electionId}-${result.application.id}`,
        recipientUserId: result.application.applicantUserId,
        type: 'club_election_result',
        title: becameOfficial
          ? 'Your club is now a School Official Club'
          : 'Your club has been established',
        message: becameOfficial
          ? `"${result.application.name}" received ${result.voteCount} votes and became a School Official Club.`
          : `"${result.application.name}" received ${result.voteCount} votes and has been established as an ordinary club.`,
        href: `/clubs/${result.club.id}`,
        createdAt: now,
      });
    }
    return true;
  };

  const createOfficialEvent = (input: CreateActivityInput): boolean => {
    if (!user || user.role !== 'founder') return false;
    const officialClub = clubs.find(
      (club) => club.category === 'School Official Events' && club.name !== 'Student Council'
    );
    if (!officialClub) return false;
    if (!input.title.trim() || !input.description.trim() || !input.startDateTime) return false;
    if (input.durationType === 'long-term' && !input.endDate) return false;
    if (!input.locationUndetermined && !input.location.trim()) return false;
    if (
      !input.allStudentsOnCampus &&
      (!input.estimatedParticipants || input.estimatedParticipants < 1)
    ) {
      return false;
    }

    const fields = buildActivityFields(input);
    const activity = {
      id: `a-official-${Date.now()}`,
      ...fields,
      registeredStudents: [] as string[],
      clubId: officialClub.id,
    };
    setClubs((prev) =>
      prev.map((club) =>
        club.id === officialClub.id
          ? { ...club, activities: [...club.activities, activity] }
          : club
      )
    );
    return true;
  };

  const createEventElection = (input: CreateEventElectionInput): boolean => {
    if (!user || user.role !== 'founder') return false;
    const studentCouncil = clubs.find((club) => club.name === 'Student Council');
    const councilDepartmentId = input.activityId.startsWith('council-department:')
      ? input.activityId.replace('council-department:', '')
      : undefined;
    const validCouncilDepartment =
      councilDepartmentId &&
      studentCouncilTerms
        .find((term) => term.status === 'active')
        ?.departments.some((department) => department.id === councilDepartmentId);
    const officialClub = councilDepartmentId
      ? studentCouncil
      : clubs.find(
          (club) =>
            club.category === 'School Official Events' &&
            club.activities.some((activity) => activity.id === input.activityId)
        );
    if (!officialClub || !studentCouncil || (councilDepartmentId && !validCouncilDepartment)) {
      return false;
    }
    if (
      !input.title.trim() ||
      !input.electionType.trim() ||
      !input.standards.trim() ||
      !input.electionDate ||
      input.electionDate < localDateKey()
    ) {
      return false;
    }
    if (
      input.applicationFields.length === 0 ||
      input.scorerStudentIds.length + input.externalScorerNames.length === 0
    ) {
      return false;
    }
    if (
      !input.applicationFields.some(
        (field) =>
          field.id === 'system-name' &&
          field.type === 'short_text' &&
          field.required
      ) ||
      !input.applicationFields.some(
        (field) =>
          field.id === 'system-class' &&
          field.type === 'short_text' &&
          field.required
      )
    ) {
      return false;
    }
    const invalidField = input.applicationFields.some((field) => {
      if (!field.id || !field.label.trim()) return true;
      return (
        field.type === 'choice' &&
        (!field.options || field.options.filter((option) => option.trim()).length < 2)
      );
    });
    if (invalidField) return false;

    const validScorerIds = Array.from(new Set(input.scorerStudentIds)).filter((studentId) =>
      studentCouncil.members.includes(studentId)
    );
    const scorerUsers = validScorerIds.flatMap((studentId) => {
      const scorer = students.find((student) => student.id === studentId);
      const scorerUser = scorer
        ? mockUsers.find((candidate) => candidate.studentId === scorer.studentId)
        : undefined;
      return scorer && scorerUser ? [{ studentId, userId: scorerUser.id }] : [];
    });
    const externalScorerNames = Array.from(
      new Set(input.externalScorerNames.map((name) => name.trim()).filter(Boolean))
    );
    if (scorerUsers.length + externalScorerNames.length === 0) return false;

    const now = new Date().toISOString();
    const electionId = `ee-${Date.now()}`;
    const election: EventElection = {
      id: electionId,
      activityId: input.activityId,
      officialClubId: officialClub.id,
      councilDepartmentId,
      title: input.title.trim(),
      electionType: input.electionType.trim(),
      standards: input.standards.trim(),
      electionDate: input.electionDate,
      applicationFields: input.applicationFields.map((field) => ({
        ...field,
        label: field.label.trim(),
        helpText: field.helpText?.trim() || undefined,
        options: field.options?.map((option) => option.trim()).filter(Boolean),
      })),
      status: 'published',
      createdByUserId: user.id,
      createdAt: now,
    };
    const invites: ElectionScorerInvite[] = [
      ...scorerUsers.map((scorer) => ({
        id: `esi-${electionId}-${scorer.studentId}`,
        electionId,
        scorerStudentId: scorer.studentId,
        scorerUserId: scorer.userId,
        invitedAt: now,
      })),
      ...externalScorerNames.map((name, index) => ({
        id: `esi-${electionId}-external-${index + 1}`,
        electionId,
        scorerStudentId: `external:${electionId}:${index + 1}`,
        scorerUserId: '',
        scorerName: name,
        invitedAt: now,
      })),
    ];

    setEventElections((prev) => [election, ...prev]);
    setElectionScorerInvites((prev) => [...prev, ...invites]);
    if (councilDepartmentId) {
      setStudentCouncilTerms((prev) =>
        prev.map((term) =>
          term.status === 'active'
            ? {
                ...term,
                departments: term.departments.map((department) =>
                  department.id === councilDepartmentId
                    ? { ...department, electionId }
                    : department
                ),
              }
            : term
        )
      );
    }
    for (const invite of invites.filter((item) => item.scorerUserId)) {
      pushNotification({
        id: `event-election-invite-${electionId}-${invite.scorerUserId}`,
        recipientUserId: invite.scorerUserId,
        type: 'event_election_scorer_invite',
        title: 'Student Council scoring invitation',
        message: `You were invited to score candidates for "${election.title}" on ${new Date(`${election.electionDate}T00:00:00`).toLocaleDateString()}.`,
        href: '/elections',
        createdAt: now,
      });
    }
    return true;
  };

  const submitEventElectionApplication = (
    electionId: string,
    answers: Record<string, string>
  ): boolean => {
    if (!user || user.role !== 'student' || !user.studentId) return false;
    const election = eventElections.find((item) => item.id === electionId);
    const student = students.find((item) => item.studentId === user.studentId);
    if (!election || !student || election.status !== 'published') return false;
    if (election.electionDate < localDateKey()) return false;
    if (
      electionScorerInvites.some(
        (invite) =>
          invite.electionId === electionId && invite.scorerStudentId === student.id
      )
    ) {
      return false;
    }
    if (
      eventElectionApplications.some(
        (application) =>
          application.electionId === electionId && application.applicantUserId === user.id
      )
    ) {
      return false;
    }
    const invalidAnswers = election.applicationFields.some((field) => {
      const answer = answers[field.id]?.trim() ?? '';
      if (field.required && !answer) return true;
      return field.type === 'choice' && answer
        ? !field.options?.includes(answer)
        : false;
    });
    if (invalidAnswers) return false;

    const now = new Date().toISOString();
    setEventElectionApplications((prev) => [
      ...prev,
      {
        id: `eea-${electionId}-${user.id}`,
        electionId,
        applicantUserId: user.id,
        applicantStudentId: student.id,
        applicantName: user.name,
        answers: Object.fromEntries(
          Object.entries(answers).map(([key, value]) => [key, value.trim()])
        ),
        submittedAt: now,
      },
    ]);
    pushNotification({
      id: `event-election-date-${electionId}-${user.id}`,
      recipientUserId: user.id,
      type: 'event_election_date',
      title: 'Election application received',
      message: `Your application for "${election.title}" was received. The election is on ${new Date(`${election.electionDate}T00:00:00`).toLocaleDateString()}.`,
      href: '/elections',
      createdAt: now,
    });
    return true;
  };

  const scoreEventElectionCandidate = (
    electionId: string,
    applicationId: string,
    score: number,
    note: string
  ): boolean => {
    if (!user || user.role !== 'student' || !user.studentId) return false;
    const student = students.find((item) => item.studentId === user.studentId);
    const election = eventElections.find((item) => item.id === electionId);
    if (!student || !election || election.status !== 'published') return false;
    if (election.electionDate !== localDateKey()) return false;
    if (
      !electionScorerInvites.some(
        (invite) =>
          invite.electionId === electionId && invite.scorerStudentId === student.id
      )
    ) {
      return false;
    }
    if (
      !eventElectionApplications.some(
        (application) =>
          application.id === applicationId && application.electionId === electionId
      ) ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100
    ) {
      return false;
    }

    const id = `ecs-${electionId}-${applicationId}-${student.id}`;
    if (electionCandidateScores.some((item) => item.id === id)) return false;
    const record: ElectionCandidateScore = {
      id,
      electionId,
      applicationId,
      scorerStudentId: student.id,
      score: Math.round(score * 10) / 10,
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    setElectionCandidateScores((prev) => [...prev, record]);
    return true;
  };

  const submitExternalElectionScore = (
    electionId: string,
    applicationId: string,
    scorerStudentId: string,
    score: number,
    note: string
  ): boolean => {
    if (!user || user.role !== 'founder') return false;
    const election = eventElections.find((item) => item.id === electionId);
    if (
      !election ||
      election.status !== 'published' ||
      election.electionDate > localDateKey() ||
      !scorerStudentId.startsWith('external:') ||
      !electionScorerInvites.some(
        (invite) =>
          invite.electionId === electionId &&
          invite.scorerStudentId === scorerStudentId
      ) ||
      !eventElectionApplications.some(
        (application) =>
          application.id === applicationId && application.electionId === electionId
      ) ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100
    ) {
      return false;
    }
    const id = `ecs-${electionId}-${applicationId}-${scorerStudentId}`;
    if (electionCandidateScores.some((item) => item.id === id)) return false;
    setElectionCandidateScores((prev) => [
      ...prev,
      {
        id,
        electionId,
        applicationId,
        scorerStudentId,
        score: Math.round(score * 10) / 10,
        note: note.trim() || undefined,
        updatedAt: new Date().toISOString(),
      },
    ]);
    return true;
  };

  const startStudentCouncilTerm = (
    schoolYear: string,
    departments: { name: string; memberStudentIds: string[] }[]
  ): boolean => {
    if (!user || user.role !== 'founder') return false;
    const year = schoolYear.trim();
    const drafted = departments.map((department) => ({
      name: department.name.trim(),
      memberStudentIds: Array.from(new Set(department.memberStudentIds)),
    }));
    if (!year || drafted.length === 0 || drafted.some((department) => !department.name)) {
      return false;
    }
    if (new Set(drafted.map((department) => department.name)).size !== drafted.length) {
      return false;
    }
    if (studentCouncilTerms.some((term) => term.schoolYear === year)) return false;
    if (
      drafted.some((department) =>
        department.memberStudentIds.some(
          (studentId) => !students.some((student) => student.id === studentId)
        )
      )
    ) {
      return false;
    }

    const now = new Date().toISOString();
    const termId = `council-term-${Date.now()}`;
    const councilMemberIds = Array.from(
      new Set(drafted.flatMap((department) => department.memberStudentIds))
    );
    setStudentCouncilTerms((prev) => [
      {
        id: termId,
        schoolYear: year,
        status: 'active',
        departments: drafted.map((department, index) => ({
          id: `${termId}-department-${index + 1}`,
          name: department.name,
          memberStudentIds: department.memberStudentIds,
        })),
        createdAt: now,
      },
      ...prev.map((term) =>
        term.status === 'active'
          ? { ...term, status: 'archived' as const, archivedAt: now }
          : term
      ),
    ]);
    setClubs((prev) =>
      prev.map((club) =>
        club.name === 'Student Council' ? { ...club, members: councilMemberIds } : club
      )
    );
    return true;
  };

  const assignStudentCouncilDepartmentMember = (
    departmentId: string,
    studentId: string
  ): boolean => {
    if (!user || user.role !== 'founder') return false;
    if (!students.some((student) => student.id === studentId)) return false;
    const activeTerm = studentCouncilTerms.find((term) => term.status === 'active');
    const department = activeTerm?.departments.find((item) => item.id === departmentId);
    if (!activeTerm || !department || department.memberStudentIds.includes(studentId)) {
      return false;
    }

    setStudentCouncilTerms((prev) =>
      prev.map((term) =>
        term.id !== activeTerm.id
          ? term
          : {
              ...term,
              departments: term.departments.map((item) =>
                item.id === departmentId
                  ? {
                      ...item,
                      memberStudentIds: [...item.memberStudentIds, studentId],
                    }
                  : item
              ),
            }
      )
    );
    setClubs((prev) =>
      prev.map((club) =>
        club.name === 'Student Council' && !club.members.includes(studentId)
          ? { ...club, members: [...club.members, studentId] }
          : club
      )
    );
    return true;
  };

  const removeStudentCouncilDepartmentMember = (
    departmentId: string,
    studentId: string
  ): boolean => {
    if (!user || user.role !== 'founder') return false;
    const activeTerm = studentCouncilTerms.find((term) => term.status === 'active');
    const department = activeTerm?.departments.find((item) => item.id === departmentId);
    if (!activeTerm || !department || !department.memberStudentIds.includes(studentId)) {
      return false;
    }
    const remainsInAnotherDepartment = activeTerm.departments.some(
      (item) => item.id !== departmentId && item.memberStudentIds.includes(studentId)
    );

    setStudentCouncilTerms((prev) =>
      prev.map((term) =>
        term.id !== activeTerm.id
          ? term
          : {
              ...term,
              departments: term.departments.map((item) =>
                item.id === departmentId
                  ? {
                      ...item,
                      memberStudentIds: item.memberStudentIds.filter((id) => id !== studentId),
                    }
                  : item
              ),
            }
      )
    );
    if (!remainsInAnotherDepartment) {
      setClubs((prev) =>
        prev.map((club) =>
          club.name === 'Student Council'
            ? { ...club, members: club.members.filter((id) => id !== studentId) }
            : club
        )
      );
    }
    return true;
  };

  const sendEventElectionMessage = (electionId: string, message: string): boolean => {
    if (!user || user.role !== 'founder') return false;
    const election = eventElections.find((item) => item.id === electionId);
    const text = message.trim();
    if (!election || !text) return false;
    const applicants = eventElectionApplications.filter(
      (application) => application.electionId === electionId
    );
    if (applicants.length === 0) return false;

    const now = new Date().toISOString();
    const messageRecord: ElectionApplicantMessage = {
      id: `eem-${electionId}-${Date.now()}`,
      electionId,
      message: text,
      sentAt: now,
      sentByUserId: user.id,
    };
    setElectionApplicantMessages((prev) => [messageRecord, ...prev]);
    for (const application of applicants) {
      pushNotification({
        id: `${messageRecord.id}-${application.applicantUserId}`,
        recipientUserId: application.applicantUserId,
        type: 'event_election_message',
        title: `Message about ${election.title}`,
        message: text,
        href: '/elections',
        createdAt: now,
      });
    }
    return true;
  };

  const publishEventElectionResults = (
    electionId: string,
    summary: string,
    selectedApplicationIds: string[]
  ): boolean => {
    if (!user || user.role !== 'founder') return false;
    const election = eventElections.find((item) => item.id === electionId);
    if (
      !election ||
      election.status !== 'published' ||
      election.electionDate > localDateKey()
    ) {
      return false;
    }
    const applications = eventElectionApplications.filter(
      (application) => application.electionId === electionId
    );
    if (applications.length === 0) return false;
    if (
      selectedApplicationIds.length === 0 ||
      selectedApplicationIds.some(
        (applicationId) =>
          !applications.some((application) => application.id === applicationId)
      )
    ) {
      return false;
    }
    const scorerCount = electionScorerInvites.filter(
      (invite) => invite.electionId === electionId
    ).length;
    if (
      scorerCount === 0 ||
      applications.some(
        (application) =>
          electionCandidateScores.filter(
            (score) =>
              score.electionId === electionId &&
              score.applicationId === application.id
          ).length !== scorerCount
      )
    ) {
      return false;
    }

    const results = applications
      .map((application) => {
        const scores = electionCandidateScores.filter(
          (score) =>
            score.electionId === electionId && score.applicationId === application.id
        );
        return {
          applicationId: application.id,
          applicantName: application.applicantName,
          totalScore: Math.round(
            scores.reduce((total, item) => total + item.score, 0) * 10
          ) / 10,
          averageScore:
            scores.length > 0
              ? Math.round(
                  (scores.reduce((total, item) => total + item.score, 0) /
                    scores.length) *
                    10
                ) / 10
              : null,
          selected: selectedApplicationIds.includes(application.id),
        };
      })
      .sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1));
    const now = new Date().toISOString();
    const resultSummary = summary.trim();
    setEventElections((prev) =>
      prev.map((item) =>
        item.id === electionId
          ? {
              ...item,
              status: 'results_published',
              publishedResults: results,
              resultSummary,
              resultsPublishedAt: now,
            }
          : item
      )
    );
    if (election.councilDepartmentId) {
      const selectedStudentIds = applications
        .filter((application) => selectedApplicationIds.includes(application.id))
        .map((application) => application.applicantStudentId);
      setStudentCouncilTerms((prev) =>
        prev.map((term) =>
          term.status === 'active'
            ? {
                ...term,
                departments: term.departments.map((department) =>
                  department.id === election.councilDepartmentId
                    ? { ...department, memberStudentIds: selectedStudentIds }
                    : department
                ),
              }
            : term
        )
      );
      setClubs((prev) =>
        prev.map((club) =>
          club.name === 'Student Council'
            ? {
                ...club,
                members: Array.from(new Set([...club.members, ...selectedStudentIds])),
              }
            : club
        )
      );
    }
    for (const application of applications) {
      const ownResult = results.find(
        (result) => result.applicationId === application.id
      );
      pushNotification({
        id: `event-election-result-${electionId}-${application.applicantUserId}`,
        recipientUserId: application.applicantUserId,
        type: 'event_election_result',
        title: `Results posted for ${election.title}`,
        message: `${resultSummary || 'The teacher published the final election results.'}${
          ownResult?.averageScore !== null && ownResult?.averageScore !== undefined
            ? ` Your total score is ${ownResult.totalScore} and your average is ${ownResult.averageScore}.`
            : ''
        }${ownResult?.selected ? ' You were selected.' : ' You were not selected.'}`,
        href: '/elections',
        createdAt: now,
      });
    }
    return true;
  };

  const getMyClubs = (): Club[] => {
    if (!user || user.role !== 'student') return [];
    return clubs.filter((club) => club.founderId === user.id);
  };

  const getClubMembers = (clubId: string): Student[] => {
    const club = clubs.find((c) => c.id === clubId);
    if (!club) return [];
    return getClubMemberStudents(club, students);
  };

  const getClubAttendanceForWeek = (
    clubId: string,
    weekStart: string
  ): Record<string, AttendanceStatus> => {
    const records: Record<string, AttendanceStatus> = {};
    for (const entry of clubAttendance) {
      if (entry.clubId === clubId && entry.weekStart === weekStart) {
        records[entry.studentId] = entry.status;
      }
    }
    return records;
  };

  const setClubMemberAttendance = (
    clubId: string,
    weekStart: string,
    studentId: string,
    status: AttendanceStatus
  ): boolean => {
    if (!user || user.role !== 'student') return false;

    const club = clubs.find((c) => c.id === clubId);
    if (!club || club.founderId !== user.id) return false;
    if (!club.members.includes(studentId)) return false;

    const now = new Date().toISOString();
    const existing = clubAttendance.find(
      (entry) =>
        entry.clubId === clubId &&
        entry.weekStart === weekStart &&
        entry.studentId === studentId
    );

    if (existing) {
      setClubAttendance((prev) =>
        prev.map((entry) =>
          entry.clubId === clubId &&
          entry.weekStart === weekStart &&
          entry.studentId === studentId
            ? { ...entry, status, updatedAt: now }
            : entry
        )
      );
    } else {
      setClubAttendance((prev) => [
        ...prev,
        { clubId, weekStart, studentId, status, updatedAt: now },
      ]);
    }

    return true;
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

    const club = clubs.find((c) => c.id === clubId);
    if (
      !club ||
      club.category === 'School Official Events' ||
      club.members.includes(student.id)
    ) {
      return;
    }

    if (club.founderId !== user.id) {
      pushNotification({
        id: `join-${clubId}-${student.id}-${Date.now()}`,
        recipientUserId: club.founderId,
        type: 'club_join',
        title: 'New club member',
        message: `${user.name} joined ${club.name}.`,
        href: `/clubs/${clubId}/members`,
        createdAt: new Date().toISOString(),
      });
    }

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

  const teacherAddOfficialClubMember = (
    clubId: string,
    studentId: string
  ): boolean => {
    if (!user || user.role !== 'founder') return false;
    const club = clubs.find((item) => item.id === clubId);
    if (
      !club ||
      club.category !== 'School Official Events' ||
      !students.some((student) => student.id === studentId) ||
      club.members.includes(studentId)
    ) {
      return false;
    }
    setClubs((prev) =>
      prev.map((item) =>
        item.id === clubId
          ? { ...item, members: [...item.members, studentId] }
          : item
      )
    );
    return true;
  };

  const teacherRemoveOfficialClubMember = (
    clubId: string,
    studentId: string
  ): boolean => {
    if (!user || user.role !== 'founder') return false;
    const club = clubs.find((item) => item.id === clubId);
    if (
      !club ||
      club.category !== 'School Official Events' ||
      !club.members.includes(studentId)
    ) {
      return false;
    }
    setClubs((prev) =>
      prev.map((item) =>
        item.id === clubId
          ? {
              ...item,
              members: item.members.filter((memberId) => memberId !== studentId),
            }
          : item
      )
    );
    return true;
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

    const createdAt = new Date().toISOString();
    for (const memberId of club.members) {
      const recipientUserId = userIdFromStudentId(memberId, students, mockUsers);
      if (!recipientUserId || recipientUserId === user.id) continue;
      pushNotification({
        id: `activity-${newActivity.id}-${recipientUserId}`,
        recipientUserId,
        type: 'new_activity',
        title: 'New activity',
        message: `${club.name} added "${input.title.trim()}".`,
        href: `/clubs/${clubId}`,
        createdAt,
      });
    }

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

  const getRateableClubs = (): { club: Club; presentCount: number }[] => {
    if (!user || user.role !== 'student' || !user.studentId) return [];

    const student = students.find((s) => s.studentId === user.studentId);
    if (!student) return [];

    return clubs
      .filter((club) => club.members.includes(student.id))
      .map((club) => ({
        club,
        presentCount: countPresentSessions(clubAttendance, club.id, student.id),
      }))
      .filter(({ presentCount }) => canRateClub(true, presentCount))
      .sort((a, b) => a.club.name.localeCompare(b.club.name));
  };

  const getClubRating = (clubId: string): ClubRatingInput | undefined => {
    if (!user) return undefined;

    const record = clubRatings.find((r) => r.clubId === clubId && r.userId === user.id);
    if (!record) return undefined;

    return {
      dimensions: { ...record.dimensions },
      overall: record.overall,
      comment: record.comment ?? '',
    };
  };

  const saveClubRating = (clubId: string, input: ClubRatingInput): boolean => {
    if (!user || user.role !== 'student' || !user.studentId) return false;

    const student = students.find((s) => s.studentId === user.studentId);
    if (!student) return false;

    const club = clubs.find((c) => c.id === clubId);
    if (!club || !club.members.includes(student.id)) return false;

    const presentCount = countPresentSessions(clubAttendance, clubId, student.id);
    if (!canRateClub(true, presentCount)) return false;

    if (validateClubRatingInput(input)) return false;

    const now = new Date().toISOString();
    const id = clubRatingKey(clubId, user.id);

    setClubRatings((prev) => {
      const existing = prev.find((r) => r.id === id);
      if (existing) {
        return prev.map((r) =>
          r.id === id ? { ...r, ...input, userName: user.name, updatedAt: now } : r
        );
      }
      return [
        ...prev,
        {
          id,
          clubId,
          userId: user.id,
          userName: user.name,
          ...input,
          createdAt: now,
          updatedAt: now,
        },
      ];
    });

    return true;
  };

  const getMyNotifications = (): NotificationRecord[] => {
    if (!user) return [];
    return notifications
      .filter((n) => n.recipientUserId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const isNotificationRead = (notificationId: string): boolean => {
    if (!user) return true;
    return (readNotificationIds[user.id] ?? []).includes(notificationId);
  };

  const getUnreadNotificationCount = (): number => {
    return getMyNotifications().filter((n) => !isNotificationRead(n.id)).length;
  };

  const markNotificationRead = (notificationId: string) => {
    if (!user) return;
    setReadNotificationIds((prev) => {
      const existing = prev[user.id] ?? [];
      if (existing.includes(notificationId)) return prev;
      return { ...prev, [user.id]: [...existing, notificationId] };
    });
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

  const getJournalThreadComments = (
    clubId: string,
    activityId: string
  ): JournalThreadComment[] => {
    return journalThreadComments.filter(
      (comment) => comment.clubId === clubId && comment.activityId === activityId
    );
  };

  const postJournalThreadComment = (
    clubId: string,
    activityId: string,
    input: JournalThreadCommentInput
  ): boolean => {
    if (!user) return false;

    const club = clubs.find((c) => c.id === clubId);
    if (!club) return false;

    const activity = club.activities.find((a) => a.id === activityId);
    if (!activity) return false;

    const isReply = !!input.parentId;
    const error = validateJournalThreadComment(input, isReply);
    if (error) return false;

    if (input.parentId) {
      const parent = journalThreadComments.find((comment) => comment.id === input.parentId);
      if (!parent || parent.clubId !== clubId || parent.activityId !== activityId) {
        return false;
      }
    }

    const comment: JournalThreadComment = {
      id: `jt-${clubId}-${activityId}-${user.id}-${Date.now()}`,
      clubId,
      activityId,
      parentId: input.parentId ?? null,
      userId: user.id,
      userName: user.name,
      body: input.body.trim(),
      rating: isReply ? undefined : input.rating,
      createdAt: new Date().toISOString(),
    };

    setJournalThreadComments((prev) => [...prev, comment]);

    if (input.parentId) {
      const parent = journalThreadComments.find((c) => c.id === input.parentId);
      if (parent && parent.userId !== user.id) {
        pushNotification({
          id: `reply-${comment.id}`,
          recipientUserId: parent.userId,
          type: 'comment_reply',
          title: 'New reply to your comment',
          message: `${user.name} replied to your comment on "${activity.title}".`,
          href: `/clubs/${clubId}/activities/${activityId}/journal`,
          createdAt: comment.createdAt,
        });
      }
    }

    return true;
  };

  const deleteJournalThreadComment = (commentId: string): boolean => {
    if (!user) return false;

    const target = journalThreadComments.find((comment) => comment.id === commentId);
    if (!target || target.userId !== user.id) return false;

    const idsToRemove = collectCommentTreeIds(commentId, journalThreadComments);
    setJournalThreadComments((prev) => prev.filter((comment) => !idsToRemove.has(comment.id)));
    return true;
  };

  const getJournalLikes = (clubId: string, activityId: string): JournalLike[] => {
    return journalLikes
      .filter((like) => like.clubId === clubId && like.activityId === activityId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const toggleJournalLike = (clubId: string, activityId: string): boolean => {
    if (!user) return false;

    const club = clubs.find((c) => c.id === clubId);
    if (!club) return false;

    const activity = club.activities.find((a) => a.id === activityId);
    if (!activity) return false;

    const existing = journalLikes.find(
      (like) =>
        like.clubId === clubId && like.activityId === activityId && like.userId === user.id
    );

    if (existing) {
      setJournalLikes((prev) => prev.filter((like) => like.id !== existing.id));
    } else {
      const like: JournalLike = {
        id: `jl-${journalLikeKey(clubId, activityId, user.id)}`,
        clubId,
        activityId,
        userId: user.id,
        userName: user.name,
        createdAt: new Date().toISOString(),
      };
      setJournalLikes((prev) => [...prev, like]);

      if (club.founderId !== user.id) {
        pushNotification({
          id: `like-${like.id}`,
          recipientUserId: club.founderId,
          type: 'journal_like',
          title: 'New journal like',
          message: `${user.name} liked the journal for "${activity.title}".`,
          href: `/clubs/${clubId}/activities/${activityId}/journal`,
          createdAt: like.createdAt,
        });
      }
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
    if (!activity || activity.cancelled || isActivityPast(activity)) return false;

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
      for (const notice of notices) {
        const recipientUserId = userIdFromStudentId(notice.studentId, students, mockUsers);
        if (!recipientUserId) continue;
        pushNotification({
          id: `cancel-${notice.id}`,
          recipientUserId,
          type: 'activity_cancelled',
          title: 'Activity cancelled',
          message: `"${activity.title}" at ${club.name} was cancelled.`,
          createdAt: removedAt,
          activityTitle: activity.title,
          clubName: club.name,
          cancellationMessage: reason,
          href: `/clubs/${clubId}`,
        });
      }
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
        clubApplications,
        clubElections,
        clubElectionVotes,
        eventElections,
        eventElectionApplications,
        electionScorerInvites,
        electionCandidateScores,
        electionApplicantMessages,
        studentCouncilTerms,
        students,
        removalNotices,
        activityJournals,
        journalThreadComments,
        journalLikes,
        clubAttendance,
        clubRatings,
        notifications,
        currentUser: user,
        isAuthenticated: !!user,
        login,
        logout,
        registerForActivity,
        unregisterFromActivity,
        getRegisteredStudents,
        submitClubApplication,
        reviewClubApplication,
        createClubElection,
        finalizeClubElection,
        getActiveClubElection,
        castClubElectionVote,
        createOfficialEvent,
        createEventElection,
        submitEventElectionApplication,
        scoreEventElectionCandidate,
        submitExternalElectionScore,
        sendEventElectionMessage,
        publishEventElectionResults,
        startStudentCouncilTerm,
        assignStudentCouncilDepartmentMember,
        removeStudentCouncilDepartmentMember,
        createActivity,
        updateActivity,
        cancelActivity,
        joinClub,
        leaveClub,
        teacherAddOfficialClubMember,
        teacherRemoveOfficialClubMember,
        isClubMember,
        getMyClubs,
        getClubMembers,
        getClubAttendanceForWeek,
        setClubMemberAttendance,
        getRateableClubs,
        getClubRating,
        saveClubRating,
        getMyNotifications,
        getUnreadNotificationCount,
        isNotificationRead,
        markNotificationRead,
        getMyRemovalNotices,
        getActivityJournal,
        saveActivityJournal,
        getJournalThreadComments,
        postJournalThreadComment,
        deleteJournalThreadComment,
        getJournalLikes,
        toggleJournalLike,
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
