import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SchedulerPage from './pages/SchedulerPage';
import AppointmentsPage from './pages/AppointmentsPage';
import BookingPage from './pages/BookingPage';
import ScheduleManagerPage from './pages/ScheduleManagerPage';
import StaffManagerPage from './pages/StaffManagerPage';
import AuditLogsPage from './pages/AuditLogsPage';

function ProtectedRoute({ children, roles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen" style={{ height: '100vh' }}>
        <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
        <span>Loading...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="scheduler" element={<SchedulerPage />} />
        <Route
          path="appointments/new"
          element={
            <ProtectedRoute roles={['super_admin', 'receptionist']}>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route
          path="admin/schedules"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <ScheduleManagerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/staff"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <StaffManagerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/logs"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
        <ToastContainer
          position="bottom-right"
          autoClose={3500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
