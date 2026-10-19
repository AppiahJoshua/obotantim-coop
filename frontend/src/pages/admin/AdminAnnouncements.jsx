import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../../api/axios';

const emptyForm = { title: '', content: '', is_published: false };

export default function AdminAnnouncements() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => api.get('/announcements').then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? api.put(`/announcements/${editing.id}`, data)
      : api.post('/announcements', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-announcements'] }),
  });

  const openModal = (item = null) => {
    setEditing(item);
    setForm(item ? { title: item.title, content: item.content, is_published: item.is_published } : emptyForm);
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(emptyForm); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-sans font-bold text-2xl text-dark">Announcements</h1>
          <p className="text-gray-500 text-sm mt-1">Create and publish news for members.</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary text-sm">
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {announcements?.length ? announcements.map((a) => (
            <div key={a.id} className="card p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-sans font-semibold text-dark">{a.title}</h3>
                  <span className={`status-badge ${a.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    {a.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-1">{a.content}</p>
                <p className="text-xs text-gray-400">By {a.author || 'Unknown'} · {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openModal(a)} className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-50">
                  <Pencil size={15} />
                </button>
                <button onClick={() => confirm('Delete this announcement?') && deleteMutation.mutate(a.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )) : (
            <p className="text-center py-16 text-gray-400">No announcements yet</p>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-sans font-semibold text-lg text-dark">{editing ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <label className="form-label">Title</label>
                <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="form-input" />
              </div>
              <div className="mb-4">
                <label className="form-label">Content</label>
                <textarea value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} rows={6} className="form-input resize-none" />
              </div>
              <label className="flex items-center gap-2 mb-6 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={(e) => setForm(f => ({ ...f, is_published: e.target.checked }))}
                       className="w-4 h-4 accent-primary" />
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  {form.is_published ? <Eye size={14} /> : <EyeOff size={14} />} Publish immediately
                </span>
              </label>

              {saveMutation.isError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                  {saveMutation.error?.response?.data?.error || 'Failed to save.'}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
                        className="flex-1 btn-primary justify-center text-sm disabled:opacity-60">
                  {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
