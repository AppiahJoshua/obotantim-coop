import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Image, ClipboardList, MessageSquare,
  UserSquare2, Megaphone, Users, ScrollText, LogOut, Menu, X, ChevronDown, Settings2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/admin/NotificationBell';
import CommandSearch from '../../components/admin/CommandSearch';
import useModuleAccess from '../../hooks/useModuleAccess';

const menuItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, minRole: null, module: 'dashboard' },
  { to: '/admin/registrations', label: 'Registrations', icon: ClipboardList, minRole: 'manager', module: 'registrations' },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare, minRole: 'manager', module: 'messages' },
  { to: '/admin/products', label: 'Products', icon: Package, minRole: 'content_editor', module: 'products' },
  { to: '/admin/gallery', label: 'Gallery', icon: Image, minRole: 'content_editor', module: 'gallery' },
  { to: '/admin/director', label: "Director's Message", icon: UserSquare2, minRole: 'content_editor', module: 'director' },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone, minRole: 'content_editor', module: 'announcements' },
  { to: '/admin/users', label: 'User Management', icon: Users, minRole: 'super_admin' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, minRole: 'super_admin' },
  { to: '/admin/settings', label: 'Admin Settings', icon: Settings2, minRole: 'super_admin' },
];

const roleLabels = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  content_editor: 'Content Editor',
};

const roleColors = {
  super_admin: 'bg-primary/10 text-primary',
  manager: 'bg-blue-50 text-blue-600',
  content_editor: 'bg-gold/15 text-yellow-700',
};

export default function AdminLayout() {
  const { user, logout, hasMinRole } = useAuth();
  const { disabledModules, isLoading: accessLoading, isError: accessError } = useModuleAccess();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const visibleItems = menuItems.filter((item) =>
    (!item.minRole || hasMinRole(item.minRole))
    && (!item.module || (!accessLoading && !accessError && !disabledModules.includes(item.module)))
  );

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-surface flex">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-primary text-white flex flex-col
                        transform transition-transform duration-300 lg:translate-x-0
                        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-full object-contain bg-white p-0.5" />
            <div>
              <p className="font-sans font-semibold text-sm leading-tight">Obotantim</p>
              <p className="text-xs text-white/50 leading-tight">Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to} to={to} end={exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${isActive ? 'bg-white text-primary' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
              }>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <NavLink to="/admin/profile" onClick={() => setSidebarOpen(false)} className="mb-1 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
            <UserSquare2 size={18} /> Profile & Settings
          </NavLink>
          <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500">
            <Menu size={22} />
          </button>

          <div className="hidden lg:block"><CommandSearch /></div>

          <div className="flex items-center gap-2">
            <div className="sm:hidden"><CommandSearch /></div>
            <NotificationBell />
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-sans font-semibold text-sm">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-dark leading-tight">{user?.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded ${roleColors[user?.role]}`}>
                  {roleLabels[user?.role]}
                </span>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

              {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-dark truncate">{user?.email}</p>
                  </div>
                  <button onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
