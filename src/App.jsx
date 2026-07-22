import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public
import Home from './pages/Home';
import AdminLogin from './pages/admin/AdminLogin';

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
import PermissionSettings from './pages/admin/PermissionSettings';

// Initialize QueryClient with staleTime set to 5 minutes
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
    },
  },
});

const ProtectedRoute = ({ children, minRole }) => {
  const { user, loading, hasMinRole } = useAuth();
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
  return children;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ── Public ── */}
            <Route path="/" element={<Home />} />

            {/* ── Admin Auth ── */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* ── Admin Dashboard ── */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={
                <ProtectedRoute minRole="content_editor"><AdminProducts /></ProtectedRoute>
              } />
              <Route path="gallery" element={
                <ProtectedRoute minRole="content_editor"><AdminGallery /></ProtectedRoute>
              } />
              <Route path="registrations" element={
                <ProtectedRoute minRole="manager"><AdminRegistrations /></ProtectedRoute>
              } />
              <Route path="registrations/:id" element={
                <ProtectedRoute minRole="manager"><AdminRegistrationDetail /></ProtectedRoute>
              } />
              <Route path="messages" element={
                <ProtectedRoute minRole="manager"><AdminMessages /></ProtectedRoute>
              } />
              <Route path="director" element={
                <ProtectedRoute minRole="content_editor"><AdminDirector /></ProtectedRoute>
              } />
              <Route path="announcements" element={
                <ProtectedRoute minRole="content_editor"><AdminAnnouncements /></ProtectedRoute>
              } />
              <Route path="users" element={
                <ProtectedRoute minRole="super_admin"><AdminUsers /></ProtectedRoute>
              } />
              <Route path="audit-logs" element={
                <ProtectedRoute minRole="super_admin"><AdminAuditLogs /></ProtectedRoute>
              } />
              {/* ── Widget Permission Management (Super Admin Only) ── */}
              <Route path="permissions" element={
                <ProtectedRoute minRole="super_admin"><PermissionSettings /></ProtectedRoute>
              } />
            </Route>

            {/* ── 404 ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
