import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Send, Check, Loader2, X } from 'lucide-react';
import api from '../../api/axios';

export default function AdminMessages() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['messages', filter],
    queryFn: () => api.get('/messages', { params: { resolved: filter || undefined, limit: 50 } }).then(r => r.data),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }) => api.put(`/messages/${id}/reply`, { reply }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      setSelected(null);
      setReplyText('');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, is_resolved }) => api.put(`/messages/${id}/resolve`, { is_resolved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-sans font-bold text-2xl text-dark">Contact Messages</h1>
          <p className="text-gray-500 text-sm mt-1">Respond to inquiries submitted through the website.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-input w-auto">
          <option value="">All Messages</option>
          <option value="false">Pending</option>
          <option value="true">Resolved</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data?.length ? data.data.map((m) => (
            <div key={m.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-sans font-semibold text-dark">{m.name}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                    {m.email && <span className="flex items-center gap-1"><Mail size={12} /> {m.email}</span>}
                    {m.phone && <span className="flex items-center gap-1"><Phone size={12} /> {m.phone}</span>}
                    <span>{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`status-badge whitespace-nowrap ${m.is_resolved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {m.is_resolved ? 'Resolved' : 'Pending'}
                </span>
              </div>

              {m.subject && <p className="text-sm font-medium text-dark mb-1">{m.subject}</p>}
              <p className="text-sm text-gray-600 mb-3">{m.message}</p>

              {m.reply && (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mb-3">
                  <p className="text-xs text-primary font-medium mb-1">Your reply:</p>
                  <p className="text-sm text-gray-700">{m.reply}</p>
                </div>
              )}

              <div className="flex gap-2">
                {!m.reply && (
                  <button onClick={() => setSelected(m)} className="text-xs font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <Send size={12} /> Reply
                  </button>
                )}
                {!m.is_resolved && (
                  <button onClick={() => resolveMutation.mutate({ id: m.id, is_resolved: true })}
                          className="text-xs font-medium text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <Check size={12} /> Mark Resolved
                  </button>
                )}
              </div>
            </div>
          )) : (
            <p className="text-center py-16 text-gray-400">No messages found</p>
          )}
        </div>
      )}

      {/* Reply modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-sans font-semibold text-lg text-dark">Reply to {selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5">
              <div className="bg-surface rounded-lg p-3 mb-4 text-sm text-gray-600">{selected.message}</div>
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={4}
                        className="form-input resize-none mb-4" placeholder="Type your reply..." autoFocus />
              <button onClick={() => replyMutation.mutate({ id: selected.id, reply: replyText })}
                      disabled={!replyText.trim() || replyMutation.isPending}
                      className="w-full btn-primary justify-center text-sm disabled:opacity-60">
                {replyMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
