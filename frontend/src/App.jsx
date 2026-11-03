import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import useModuleAccess from './hooks/useModuleAccess';

// Public
import PublicSite from './components/PublicSite';
import TrackApplication from './pages/TrackApplication';
import AdminLogin from './pages/admin/AdminLogin';
import ForgotPassword from './pages/admin/ForgotPassword';
import ResetPassword from './pages/admin/ResetPassword';

// Admin
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminGallery from './pages/admin/AdminGallery';
import AdminRegistrations from './pages/admin/AdminRegistrations';
import AdminRegistrationDetail from './pages/admin/AdminRegistrationDetail';
import AdminMessages from './pages/admin/AdminMessages';
import AdminDirector from './pages/admin/AdminDirector';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminProfile from './pages/admin/AdminProfile';
import AdminSettings from './pages/admin/AdminSettings';

const ProtectedRoute = ({ children, minRole, module }) => {
  const { user, loading, hasMinRole } = useAuth();
  const { disabledModules, isLoading: accessLoading, isError: accessError } = useModuleAccess();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/admin/login" replace />;
  if (minRole && !hasMinRole(minRole)) return <Navigate to="/admin" replace />;
  if (module && user.role !== 'super_admin') {
    if (accessLoading) return <div className="min-h-screen bg-surface" />;
    if (accessError) return <p role="alert" className="p-8 text-sm text-red-700">Could not verify dashboard access. Refresh and try again.</p>;
    if (disabledModules.includes(module)) return <p role="status" className="p-8 text-sm text-gray-600">This dashboard section is unavailable for your account.</p>;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/" element={<PublicSite />} />
          <Route path="/track-application" element={<TrackApplication />} />

          {/* ── Admin Auth ── */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/reset-password" element={<ResetPassword />} />

          {/* ── Admin Dashboard ── */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ProtectedRoute module="dashboard"><AdminDashboard /></ProtectedRoute>} />
            <Route path="products" element={
              <ProtectedRoute minRole="content_editor" module="products"><AdminProducts /></ProtectedRoute>
            } />
            <Route path="gallery" element={
              <ProtectedRoute minRole="content_editor" module="gallery"><AdminGallery /></ProtectedRoute>
            } />
            <Route path="registrations" element={
              <ProtectedRoute minRole="manager" module="registrations"><AdminRegistrations /></ProtectedRoute>
            } />
            <Route path="registrations/:id" element={
              <ProtectedRoute minRole="manager" module="registrations"><AdminRegistrationDetail /></ProtectedRoute>
            } />
            <Route path="messages" element={
              <ProtectedRoute minRole="manager" module="messages"><AdminMessages /></ProtectedRoute>
            } />
            <Route path="director" element={
              <ProtectedRoute minRole="content_editor" module="director"><AdminDirector /></ProtectedRoute>
            } />
            <Route path="announcements" element={
              <ProtectedRoute minRole="content_editor" module="announcements"><AdminAnnouncements /></ProtectedRoute>
            } />
            <Route path="users" element={
              <ProtectedRoute minRole="super_admin"><AdminUsers /></ProtectedRoute>
            } />
            <Route path="audit-logs" element={
              <ProtectedRoute minRole="super_admin"><AdminAuditLogs /></ProtectedRoute>
            } />
            <Route path="profile" element={<ProtectedRoute><AdminProfile /></ProtectedRoute>} />
            <Route path="settings" element={
              <ProtectedRoute minRole="super_admin"><AdminSettings /></ProtectedRoute>
            } />
          </Route>

          {/* ── 404 ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
