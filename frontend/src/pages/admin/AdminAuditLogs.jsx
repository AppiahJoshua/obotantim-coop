import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Clock, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import { downloadCsv } from '../../api/downloadCsv';
import { TableSkeleton } from '../../components/ui/Skeleton';

export default function AdminAuditLogs() {
  const [filters, setFilters] = useState({ startDate: '', endDate: '', userId: '', action: '', search: '' });
  const [page, setPage] = useState(1);
  const params = { ...filters, page, limit: 25 };
  Object.keys(params).forEach((key) => { if (!params[key]) delete params[key]; });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => api.get('/admin/audit-logs', { params }).then((response) => response.data),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['audit-log-users'],
    queryFn: () => api.get('/admin/audit-logs/users').then((response) => response.data),
  });
  const { data: actions = [] } = useQuery({
    queryKey: ['audit-log-actions'],
    queryFn: () => api.get('/admin/audit-logs/actions').then((response) => response.data),
  });

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
        <h1 className="font-sans font-bold text-2xl text-dark flex items-center gap-2">
          <ScrollText size={22} className="text-primary" /> Audit Logs
        </h1>
        <p className="text-gray-500 text-sm mt-1">Search and review administrative activity.</p>
        </div>
        <button type="button" onClick={() => downloadCsv('/exports/audit-logs.csv', filters)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-white">
          <Download size={15} /> Export to CSV
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input aria-label="Start date" type="date" value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} className="form-input" />
        <input aria-label="End date" type="date" value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} className="form-input" />
        <select aria-label="Filter by user" value={filters.userId} onChange={(event) => updateFilter('userId', event.target.value)} className="form-input">
          <option value="">All staff</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
        <select aria-label="Filter by action" value={filters.action} onChange={(event) => updateFilter('action', event.target.value)} className="form-input">
          <option value="">All actions</option>
          {actions.map((action) => <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>)}
        </select>
        <input aria-label="Search audit logs" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search user or action" className="form-input" />
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
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
              {data?.data?.length ? data.data.map((log) => (
                <tr key={log.id} className="hover:bg-surface transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-dark">{log.user_name || log.user_email}</p>
                    <p className="text-xs text-gray-400">{log.user_role}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{log.action.replace(/_/g, ' ').toLowerCase()}</td>
                  <td className="px-5 py-3.5 text-gray-400">{log.resource ? `${log.resource} #${log.resource_id}` : '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-gray-400" title={log.ip_address || ''}>{log.ip_address || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-400 flex items-center gap-1.5">
                    <Clock size={12} /> {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No activity recorded yet</td></tr>
              )}
            </tbody>
          </table>
          {data?.pages > 1 && <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-500">Page {data.page} of {data.pages} · {data.total} entries</p>
            <div className="flex gap-2">
              <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded border border-gray-200 p-1.5 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button type="button" aria-label="Next page" disabled={page >= data.pages} onClick={() => setPage((value) => Math.min(data.pages, value + 1))} className="rounded border border-gray-200 p-1.5 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>}
        </div>
      )}
    </div>
  );
}
