import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, ChevronLeft } from 'lucide-react';
import api from '../../api/axios';

const statusColors = {
  new: 'bg-blue-50 text-blue-600',
  contacted: 'bg-amber-50 text-amber-600',
  approved: 'bg-emerald-50 text-emerald-600',
  completed: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-50 text-red-600',
};

const serviceLabels = { loan: 'Loan', savings: 'Savings', membership: 'Membership' };

export default function AdminRegistrations() {
  const [status, setStatus] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Added refetchInterval & refetchIntervalInBackground to trigger auto-fetching
  const { data, isLoading } = useQuery({
    queryKey: ['registrations', status, serviceType, page],
    queryFn: () => api.get('/registrations', {
      params: { status: status || undefined, service_type: serviceType || undefined, page, limit: 15 }
    }).then(r => r.data),
    refetchInterval: 5000, // Refetch registrations list every 5 seconds
    refetchIntervalInBackground: true, // Keep fetching in the background
  });

  const filtered = data?.data?.filter(r =>
    !search || r.full_name.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-sans font-bold text-2xl text-dark">Registrations</h1>
        <p className="text-gray-500 text-sm mt-1">Review and manage member applications.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..."
                 className="form-input pl-10" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="form-input w-auto">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={serviceType} onChange={(e) => { setServiceType(e.target.value); setPage(1); }} className="form-input w-auto">
          <option value="">All Services</option>
          <option value="loan">Loan</option>
          <option value="savings">Savings</option>
          <option value="membership">Membership</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Phone</th>
                  <th className="text-left px-5 py-3 font-medium">Service</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered?.length ? filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-surface transition-colors">
                    <td className="px-5 py-3.5 font-medium text-dark">{r.full_name}</td>
                    <td className="px-5 py-3.5 text-gray-500">{r.phone}</td>
                    <td className="px-5 py-3.5 text-gray-500">{serviceLabels[r.service_type]}</td>
                    <td className="px-5 py-3.5">
                      <span className={`status-badge ${statusColors[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link to={`/admin/registrations/${r.id}`} className="text-primary hover:bg-primary/10 p-1.5 rounded-lg inline-flex">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">No registrations found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">Page {data.page} of {data.pages} · {data.total} total</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}