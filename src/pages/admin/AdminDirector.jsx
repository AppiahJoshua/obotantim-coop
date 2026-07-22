import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload, Check } from 'lucide-react';
import api from '../../api/axios';

export default function AdminDirector() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ director_name: '', title: '', message: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['director'],
    queryFn: () => api.get('/director').then(r => r.data),
  });

  useEffect(() => {
    if (data) {
      setForm({ director_name: data.director_name || '', title: data.title || '', message: data.message || '' });
      setPreview(data.photo_url);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('photo', file);
      return api.put('/director', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['director'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-sans font-bold text-2xl text-dark">Director's Message</h1>
        <p className="text-gray-500 text-sm mt-1">Edit the leadership message shown on the homepage.</p>
      </div>

      <div className="card p-6">
        <label className="block w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer mb-6 overflow-hidden mx-auto">
          {preview ? (
            <img src={preview} alt="Director" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <Upload size={20} className="mb-1" />
              <span className="text-xs">Upload Photo</span>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="form-label">Director's Name</label>
            <input value={form.director_name} onChange={(e) => setForm(f => ({ ...f, director_name: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label className="form-label">Title</label>
            <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="form-input" placeholder="Board Director" />
          </div>
        </div>

        <div className="mb-6">
          <label className="form-label">Message</label>
          <textarea value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} rows={10}
                    className="form-input resize-none" placeholder="Write the director's message here..." />
          <p className="text-xs text-gray-400 mt-1">Use blank lines to separate paragraphs.</p>
        </div>

        {saveMutation.isError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {saveMutation.error?.response?.data?.error || 'Failed to save.'}
          </div>
        )}

        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                className="btn-primary text-sm disabled:opacity-60">
          {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : saved ? <><Check size={16} /> Saved!</> : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
