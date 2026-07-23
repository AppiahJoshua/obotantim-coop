import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Image, ClipboardList, MessageSquare,
  UserSquare2, Megaphone, Users, ScrollText, LogOut, Menu, X, ChevronDown,
  Sliders, Bell, Check, CheckCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const menuItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, minRole: null },
  { to: '/admin/registrations', label: 'Registrations', icon: ClipboardList, minRole: 'manager', permKey: 'registrations' },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare, minRole: 'manager', permKey: 'messages' },
  { to: '/admin/products', label: 'Products', icon: Package, minRole: 'content_editor', permKey: 'products' },
  { to: '/admin/gallery', label: 'Gallery', icon: Image, minRole: 'content_editor', permKey: 'gallery' },
  { to: '/admin/director', label: "Director's Message", icon: UserSquare2, minRole: 'content_editor', permKey: 'director' },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone, minRole: 'content_editor', permKey: 'announcements' },
  { to: '/admin/users', label: 'User Management', icon: Users, minRole: 'super_admin' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, minRole: 'super_admin' },
  { to: '/admin/permissions', label: 'Widget Permissions', icon: Sliders, minRole: 'super_admin' },
];

const roleLabels = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  customer_attender: 'Customer Attender',
  content_editor: 'Content Editor',
};

const roleColors = {
  super_admin: 'bg-primary/10 text-primary',
  manager: 'bg-blue-50 text-blue-600',
  customer_attender: 'bg-emerald-50 text-emerald-600',
  content_editor: 'bg-gold/15 text-yellow-700',
};

// Helper function to play a pleasant audio chime using Web Audio API
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Pleasant high-pitch chime frequency (D5 note)
    osc.frequency.setValueAtTime(587.43, ctx.currentTime);
    // Quick fade out
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('Audio play blocked or unsupported:', e);
  }
};

export default function AdminLayout() {
  const { user, logout, hasMinRole } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [permissions, setPermissions] = useState({});

  // Notification states
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const prevUnreadCountRef = useRef(0);

  // Fetch dynamic permissions matrix for the active user
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user || user.role === 'super_admin') return;
      try {
        const res = await api.get('/admin/permissions');
        const rawData = Array.isArray(res.data) 
          ? res.data 
          : (res.data?.permissions || res.data?.data || []);
        
        const userRolePermissions = rawData.filter(p => p.role_name === user.role);
        const permMap = {};
        userRolePermissions.forEach(p => {
          permMap[p.widget_key] = Number(p.is_visible) === 1 || p.is_visible === true;
        });

        setPermissions(permMap);
      } catch (err) {
        console.error('Failed to load user permissions in AdminLayout:', err);
      }
    };

    fetchPermissions();
  }, [user]);

  // Fetch notifications with polling and sound trigger
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/admin/notifications');
        const newNotifs = res.data || [];
        
        // Calculate current unread count
        const currentUnread = newNotifs.filter(n => !n.is_read || n.is_read === 0).length;

        // Play sound if unread count increases after initial load
        if (prevUnreadCountRef.current > 0 && currentUnread > prevUnreadCountRef.current) {
          playNotificationSound();
        }

        prevUnreadCountRef.current = currentUnread;
        setNotifications(newNotifs);
      } catch (err) {
        console.error('Failed to fetch admin notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/admin/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/admin/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read || n.is_read === 0).length;

  // Filter sidebar items strictly according to both static role and dynamic widget permission
  const visibleItems = menuItems.filter((item) => {
    if (user?.role === 'super_admin') return true;
    if (item.minRole && !hasMinRole(item.minRole)) return false; 
    if (item.permKey && permissions[item.permKey] === false) return false;
    return true;
  });

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

          <div className="hidden lg:block" />

          {/* Right Header Area (Notifications & Profile) */}
          <div className="flex items-center gap-4">
            
            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Notifications">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50">
                  <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <h3 className="font-sans font-semibold text-sm text-dark">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`p-3.5 transition-colors flex items-start justify-between gap-3 ${!n.is_read || n.is_read === 0 ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-dark">{n.title || 'System Notification'}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{n.message || n.content}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(n.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {(!n.is_read || n.is_read === 0) && (
                            <button 
                              onClick={() => markAsRead(n.id)}
                              title="Mark as read"
                              className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors flex-shrink-0">
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-sm text-gray-400">
                        No notifications found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-sans font-semibold text-sm">
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-dark leading-tight">{user?.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${roleColors[user?.role] || 'bg-gray-100 text-gray-600'}`}>
                    {roleLabels[user?.role] || user?.role}
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
          <Outlet context={{ user, permissions }} />
        </main>
      </div>
    </div>
  );
}