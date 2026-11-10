import {
  canRateClub,
  countPresentSessions,
} from "@student-dash/shared/clubRatings";
import { getClubMemberStudents } from "@student-dash/shared/clubs";
import type {
  ActivityJournal,
  ActivityRemovalNotice,
  AttendanceStatus,
  Club,
  ClubElection,
  ClubRatingInput,
  JournalLike,
  JournalThreadComment,
  NotificationRecord,
  Student,
  User,
} from "@student-dash/shared/types";

import type { AppState } from "./state.js";
function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createSelectors(state: AppState, user: User | null) {
  const {
    clubs,
    clubElections,
    students,
    removalNotices,
    activityJournals,
    journalThreadComments,
    journalLikes,
    clubAttendance,
    clubRatings,
    notifications,
    readNotificationIds,
  } = state;
  const getRegisteredStudents = (
    activityId: string,
    clubId: string,
  ): Student[] => {
    const club = clubs.find((c) => c.id === clubId);
    if (!club) return [];

    const activity = club.activities.find((a) => a.id === activityId);
    if (!activity) return [];

    return students.filter((student) =>
      activity.registeredStudents.includes(student.id),
    );
  };

  const getActiveClubElection = (): ClubElection | undefined =>
    clubElections.find(
      (election) =>
        election.status === "scheduled" &&
        election.electionDate === localDateKey(),
    );

  const getMyClubs = (): Club[] => {
    if (!user || user.role !== "student") return [];
    return clubs.filter((club) => club.founderId === user.id);
  };

  const getClubMembers = (clubId: string): Student[] => {
    const club = clubs.find((c) => c.id === clubId);
    if (!club) return [];
    return getClubMemberStudents(club, students);
  };

  const getClubAttendanceForWeek = (
    clubId: string,
    weekStart: string,
  ): Record<string, AttendanceStatus> => {
    const records: Record<string, AttendanceStatus> = {};
    for (const entry of clubAttendance) {
      if (entry.clubId === clubId && entry.weekStart === weekStart) {
        records[entry.studentId] = entry.status;
      }
    }
    return records;
  };

  const isClubMember = (clubId: string): boolean => {
    if (!user || user.role !== "student" || !user.studentId) return false;
    const student = students.find((s) => s.studentId === user.studentId);
    const club = clubs.find((c) => c.id === clubId);
    if (!student || !club) return false;
    return club.members.includes(student.id);
  };

  const getRateableClubs = (): { club: Club; presentCount: number }[] => {
    if (!user || user.role !== "student" || !user.studentId) return [];

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

    const record = clubRatings.find(
      (r) => r.clubId === clubId && r.userId === user.id,
    );
    if (!record) return undefined;

    return {
      dimensions: { ...record.dimensions },
      overall: record.overall,
      comment: record.comment ?? "",
    };
  };

  const getMyNotifications = (): NotificationRecord[] => {
    if (!user) return [];
    return notifications
      .filter((n) => n.recipientUserId === user.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  };

  const isNotificationRead = (notificationId: string): boolean => {
    if (!user) return true;
    return (readNotificationIds[user.id] ?? []).includes(notificationId);
  };

  const getUnreadNotificationCount = (): number => {
    return getMyNotifications().filter((n) => !isNotificationRead(n.id)).length;
  };

  const getMyRemovalNotices = (): ActivityRemovalNotice[] => {
    if (!user || user.role !== "student" || !user.studentId) return [];
    const student = students.find((s) => s.studentId === user.studentId);
    if (!student) return [];
    return removalNotices
      .filter((notice) => notice.studentId === student.id)
      .sort(
        (a, b) =>
          new Date(b.removedAt).getTime() - new Date(a.removedAt).getTime(),
      );
  };

  const getActivityJournal = (
    clubId: string,
    activityId: string,
  ): ActivityJournal | undefined => {
    return activityJournals.find(
      (j) => j.clubId === clubId && j.activityId === activityId,
    );
  };

  const getJournalThreadComments = (
    clubId: string,
    activityId: string,
  ): JournalThreadComment[] => {
    return journalThreadComments.filter(
      (comment) =>
        comment.clubId === clubId && comment.activityId === activityId,
    );
  };

  const getJournalLikes = (
    clubId: string,
    activityId: string,
  ): JournalLike[] => {
    return journalLikes
      .filter(
        (like) => like.clubId === clubId && like.activityId === activityId,
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  };

  return {
    getRegisteredStudents,
    getActiveClubElection,
    getMyClubs,
    getClubMembers,
    getClubAttendanceForWeek,
    isClubMember,
    getRateableClubs,
    getClubRating,
    getMyNotifications,
    isNotificationRead,
    getUnreadNotificationCount,
    getMyRemovalNotices,
    getActivityJournal,
    getJournalThreadComments,
    getJournalLikes,
  };
}
