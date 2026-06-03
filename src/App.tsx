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
import { ManageActivitiesClubOptions } from './pages/ManageActivitiesClubOptions';
import { ManageActivitiesAdd } from './pages/ManageActivitiesAdd';
import { ManageActivitiesCancel } from './pages/ManageActivitiesCancel';
import { RedirectAddActivity } from './pages/RedirectAddActivity';
import { ClubDetail } from './pages/ClubDetail';
import { Login } from './pages/Login';

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
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
              <Route path="clubs/:clubId" element={<ClubDetail />} />
              <Route path="registrations" element={<Registrations />} />
              <Route path="create-club" element={<CreateClub />} />
              <Route path="manage-activities" element={<ManageActivities />} />
              <Route path="manage-activities/:clubId" element={<ManageActivitiesClubOptions />} />
              <Route path="manage-activities/:clubId/add" element={<ManageActivitiesAdd />} />
              <Route path="manage-activities/:clubId/cancel" element={<ManageActivitiesCancel />} />
              <Route path="add-activity" element={<Navigate to="/manage-activities" replace />} />
              <Route path="add-activity/:clubId" element={<RedirectAddActivity />} />
              <Route path="founder" element={<Founder />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App
