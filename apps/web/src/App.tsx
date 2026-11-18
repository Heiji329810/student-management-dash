import { ApplicationFiles } from './pages/ApplicationFiles';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './components/ThemeProvider';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Clubs } from './pages/Clubs';
import { Founder } from './pages/Founder';
import { Registrations } from './pages/Registrations';
import { CreateClub } from './pages/CreateClub';
import { ManageActivities } from './pages/ManageActivities';
import { ManageClubsAndActivities } from './pages/ManageClubsAndActivities';
import { ManageClubs } from './pages/ManageClubs';
import { ManageClubMembers } from './pages/ManageClubMembers';
import { ManageClubCheckIn } from './pages/ManageClubCheckIn';
import { ManageActivitiesClubOptions } from './pages/ManageActivitiesClubOptions';
import { ManageActivitiesAdd } from './pages/ManageActivitiesAdd';
import { ManageActivitiesEdit } from './pages/ManageActivitiesEdit';
import { ManageActivitiesCancel } from './pages/ManageActivitiesCancel';
import { ManageActivitiesJournal } from './pages/ManageActivitiesJournal';
import { ManageActivitiesJournalForm } from './pages/ManageActivitiesJournalForm';
import { ActivityJournalView } from './pages/ActivityJournalView';
import { RateMyClub } from '@/pages/RateMyClub';
import { RedirectAddActivity } from './pages/RedirectAddActivity';
import { ClubDetail } from './pages/ClubDetail';
import { ClubMembers } from './pages/ClubMembers';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { TeacherClubParticipation } from './pages/TeacherClubParticipation';
import { StudentCouncil } from './pages/StudentCouncil';
import { NewStudentCouncilYear } from './pages/NewStudentCouncilYear';
import { StudentCouncilYear } from './pages/StudentCouncilYear';
import { LanguageProvider } from './components/LanguageProvider';

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="clubs" element={<Clubs />} />
              <Route path="club-elections" element={<Navigate to="/clubs" replace />} />
              <Route path="elections" element={<Navigate to="/clubs" replace />} />
              <Route path="school-official-clubs" element={<Navigate to="/clubs" replace />} />
              <Route path="clubs/:clubId/activities/:activityId/journal" element={<ActivityJournalView />} />
              <Route path="clubs/:clubId/participation" element={<TeacherClubParticipation />} />
              <Route path="clubs/:clubId/members" element={<ClubMembers />} />
              <Route path="clubs/:clubId" element={<ClubDetail />} />
              <Route path="registrations" element={<Registrations />} />
              <Route path="club-applications/:applicationId" element={<ApplicationFiles />} />
              <Route path="create-club" element={<CreateClub />} />
              <Route path="manage" element={<ManageClubsAndActivities />} />
              <Route path="manage/clubs" element={<ManageClubs />} />
              <Route path="manage/clubs/:clubId" element={<Navigate to="members" replace />} />
              <Route path="manage/clubs/:clubId/members" element={<ManageClubMembers />} />
              <Route path="manage/clubs/:clubId/check-in" element={<ManageClubCheckIn />} />
              <Route path="rate-my-club" element={<RateMyClub />} />
              <Route path="manage/activities" element={<ManageActivities />} />
              <Route path="manage-activities" element={<Navigate to="/manage/activities" replace />} />
              <Route path="manage-activities/:clubId" element={<ManageActivitiesClubOptions />} />
              <Route path="manage-activities/:clubId/add" element={<ManageActivitiesAdd />} />
              <Route path="manage-activities/:clubId/edit/:activityId" element={<ManageActivitiesEdit />} />
              <Route path="manage-activities/:clubId/edit" element={<ManageActivitiesEdit />} />
              <Route path="manage-activities/:clubId/cancel" element={<ManageActivitiesCancel />} />
              <Route path="manage-activities/:clubId/journal/:activityId" element={<ManageActivitiesJournalForm />} />
              <Route path="manage-activities/:clubId/journal" element={<ManageActivitiesJournal />} />
              <Route path="add-activity" element={<Navigate to="/manage/activities" replace />} />
              <Route path="add-activity/:clubId" element={<RedirectAddActivity />} />
              <Route path="founder" element={<Founder />} />
              <Route path="student-council" element={<StudentCouncil />} />
              <Route path="student-council/new" element={<NewStudentCouncilYear />} />
              <Route path="student-council/years/:termId" element={<StudentCouncilYear />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </AppProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App
