import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Loader2, Upload, Power } from 'lucide-react';
import api from '../../api/axios';

export default function AdminGallery() {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('general');

  const { data: images, isLoading } = useQuery({
    queryKey: ['admin-gallery'],
    queryFn: () => api.get('/gallery').then(r => r.data),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('caption', caption);
      fd.append('category', category);
      return api.post('/gallery', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-gallery'] });
      qc.invalidateQueries({ queryKey: ['gallery'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gallery/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-gallery'] });
      qc.invalidateQueries({ queryKey: ['gallery'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => api.put(`/gallery/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-gallery'] }),
  });

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFile(null);
    setPreview(null);
    setCaption('');
    setCategory('general');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-sans font-bold text-2xl text-dark">Gallery</h1>
          <p className="text-gray-500 text-sm mt-1">Upload and organize photos displayed on the website.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">
          <Plus size={16} /> Upload Image
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images?.map((img) => (
            <div key={img.id} className={`relative group rounded-xl overflow-hidden aspect-square ${!img.is_active && 'opacity-50'}`}>
              <img src={img.image_url} alt={img.caption} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button onClick={() => toggleMutation.mutate({ id: img.id, is_active: !img.is_active })}
                        className="p-2 bg-white rounded-full text-gray-700 hover:text-primary" title="Toggle visible">
                  <Power size={14} />
                </button>
                <button onClick={() => confirm('Delete this image?') && deleteMutation.mutate(img.id)}
                        className="p-2 bg-white rounded-full text-gray-700 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs truncate">{img.caption}</p>
                </div>
              )}
            </div>
          ))}
          {!images?.length && (
            <div className="col-span-full text-center py-16 text-gray-400 text-sm">No gallery images yet. Upload your first photo!</div>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-sans font-semibold text-lg text-dark">Upload Image</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5">
              <label className="block aspect-video rounded-xl border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer mb-4 overflow-hidden">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <Upload size={28} className="mb-2" />
                    <span className="text-sm">Click to select an image</span>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>

              <div className="mb-4">
                <label className="form-label">Caption</label>
                <input value={caption} onChange={(e) => setCaption(e.target.value)} className="form-input" placeholder="e.g. Annual general meeting" />
              </div>
              <div className="mb-6">
                <label className="form-label">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-input">
                  <option value="general">General</option>
                  <option value="events">Events</option>
                  <option value="members">Members</option>
                  <option value="office">Office</option>
                </select>
              </div>

              {uploadMutation.isError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                  {uploadMutation.error?.response?.data?.error || 'Upload failed.'}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={() => uploadMutation.mutate()} disabled={!file || uploadMutation.isPending}
                        className="flex-1 btn-primary justify-center text-sm disabled:opacity-60">
                  {uploadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
