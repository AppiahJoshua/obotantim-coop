import { useQuery } from '@tanstack/react-query';
import { ScrollText, Clock } from 'lucide-react';
import api from '../../api/axios';

export default function AdminAuditLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs-full'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data.auditLogs),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-sans font-bold text-2xl text-dark flex items-center gap-2">
          <ScrollText size={22} className="text-primary" /> Audit Logs
        </h1>
        <p className="text-gray-500 text-sm mt-1">Complete record of all administrative actions on the system.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-5 py-3 font-medium">Action</th>
                <th className="text-left px-5 py-3 font-medium">Resource</th>
                <th className="text-left px-5 py-3 font-medium">IP Address</th>
                <th className="text-left px-5 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.length ? data.map((log) => (
                <tr key={log.id} className="hover:bg-surface transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-dark">{log.user_name || log.user_email}</p>
                    <p className="text-xs text-gray-400">{log.user_role}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{log.action.replace(/_/g, ' ').toLowerCase()}</td>
                  <td className="px-5 py-3.5 text-gray-400">{log.resource ? `${log.resource} #${log.resource_id}` : '—'}</td>
                  <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{log.ip_address}</td>
                  <td className="px-5 py-3.5 text-gray-400 flex items-center gap-1.5">
                    <Clock size={12} /> {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No activity recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
