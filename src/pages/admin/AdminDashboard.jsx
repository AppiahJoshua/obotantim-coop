import { useQuery } from '@tanstack/react-query';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Users, ClipboardList, MessageSquare, Package, Image as ImageIcon,
  ArrowUpRight, Clock, ScrollText
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const statusColors = {
  new: 'bg-blue-50 text-blue-600',
  contacted: 'bg-amber-50 text-amber-600',
  approved: 'bg-emerald-50 text-emerald-600',
  completed: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-50 text-red-600',
};

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={color} />
        </div>
      </div>
      <p className="font-sans font-bold text-2xl text-dark">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminDashboard() {
  const { user, hasMinRole } = useAuth();
  
  // Retrieve permissions passed down from AdminLayout context
  const outletContext = useOutletContext() || {};
  const contextPermissions = outletContext.permissions || {};

  // Updated useQuery with background refetching (polling every 5 seconds)
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data),
    refetchInterval: 5000, // Automatically refetch dashboard data every 5s
    refetchIntervalInBackground: true, // Keep fetching even when the tab isn't active
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Extract stats and backend allowedWidgets
  const { stats, recentRegistrations, recentMessages, auditLogs, allowedWidgets = [] } = data || {};

  const isSuper = user?.role === 'super_admin';

  // Strict check considering both layout context and backend response
  const shouldShow = (widgetKey) => {
    if (isSuper) return true;
    
    // Check AdminLayout context permission state if defined
    if (contextPermissions[widgetKey] !== undefined) {
      return contextPermissions[widgetKey] === true;
    }
    
    // Fall back to allowedWidgets array returned by backend dashboard endpoint
    return allowedWidgets.includes(widgetKey);
  };

  const showRegistrations = shouldShow('registrations');
  const showMessages = shouldShow('messages');

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-sans font-bold text-2xl text-dark">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening with Obotantim Cooperative today.</p>
      </div>

      {/* Dynamic Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {shouldShow('active_staff') && (
          <StatCard icon={Users} label="Active Staff" value={stats?.total_users ?? 0} color="text-primary" bg="bg-primary/10" />
        )}
        {showRegistrations && (
          <StatCard icon={ClipboardList} label="Registrations" value={stats?.total_registrations ?? 0} color="text-blue-600" bg="bg-blue-50" />
        )}
        {showMessages && (
          <StatCard icon={MessageSquare} label="Messages" value={stats?.total_messages ?? 0} color="text-purple-600" bg="bg-purple-50" />
        )}
        {shouldShow('products') && (
          <StatCard icon={Package} label="Products" value={stats?.total_products ?? 0} color="text-yellow-700" bg="bg-gold/15" />
        )}
        {shouldShow('gallery') && (
          <StatCard icon={ImageIcon} label="Gallery Items" value={stats?.total_gallery ?? 0} color="text-emerald-600" bg="bg-emerald-50" />
        )}
      </div>

      {/* Dynamic Content Grid */}
      {(showRegistrations || showMessages) && (
        <div className={`grid gap-6 ${showRegistrations && showMessages ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>

          {/* Recent Registrations Card */}
          {showRegistrations && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-sans font-semibold text-dark">Recent Registrations</h3>
                <Link to="/admin/registrations" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="space-y-3">
                {recentRegistrations?.length ? recentRegistrations.map((r) => (
                  <Link to={`/admin/registrations/${r.id}`} key={r.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-surface transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark truncate">{r.full_name}</p>
                      <p className="text-xs text-gray-400">{r.phone} · {r.service_type}</p>
                    </div>
                    <span className={`status-badge whitespace-nowrap ${statusColors[r.status]}`}>{r.status}</span>
                  </Link>
                )) : (
                  <p className="text-sm text-gray-400 text-center py-6">No registrations yet</p>
                )}
              </div>
            </div>
          )}

          {/* Recent Messages Card */}
          {showMessages && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-sans font-semibold text-dark">Recent Messages</h3>
                <Link to="/admin/messages" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="space-y-3">
                {recentMessages?.length ? recentMessages.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-surface transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark truncate">{m.name}</p>
                      <p className="text-xs text-gray-400 truncate">{m.subject || 'No subject'}</p>
                    </div>
                    <span className={`status-badge whitespace-nowrap ${m.is_resolved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {m.is_resolved ? 'Resolved' : 'Pending'}
                    </span>
                  </div>
                )) : (
                  <p className="text-sm text-gray-400 text-center py-6">No messages yet</p>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Audit Logs - Super Admin only */}
      {hasMinRole('super_admin') && (
        <div className="card p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sans font-semibold text-dark flex items-center gap-2">
              <ScrollText size={16} className="text-primary" /> Recent Activity
            </h3>
            <Link to="/admin/audit-logs" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {auditLogs?.slice(0, 6).map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock size={13} className="text-gray-300 flex-shrink-0" />
                  <span className="text-gray-600 truncate">
                    <span className="font-medium text-dark">{log.user_name || log.user_email}</span> {log.action.toLowerCase().replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{timeAgo(log.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}