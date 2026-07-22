import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Power, Loader2 } from 'lucide-react';
import api from '../../api/axios';

const emptyForm = { category: 'savings', title: '', description: '', icon: 'coins', interest_rate: '', sort_order: 0 };

export default function AdminProducts() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.get('/products?active=all').then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? api.put(`/products/${editing.id}`, data)
      : api.post('/products', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => api.put(`/products/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const openModal = (product = null) => {
    setEditing(product);
    setForm(product ? { ...product } : emptyForm);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-sans font-bold text-2xl text-dark">Products & Services</h1>
          <p className="text-gray-500 text-sm mt-1">Manage savings and loan products shown on the website.</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary text-sm">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products?.map((p) => (
            <div key={p.id} className={`card p-5 ${!p.is_active && 'opacity-50'}`}>
              <div className="flex items-start justify-between mb-3">
                <span className={`status-badge ${p.category === 'savings' ? 'bg-primary/10 text-primary' : 'bg-gold/15 text-yellow-700'}`}>
                  {p.category}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => toggleMutation.mutate({ id: p.id, is_active: !p.is_active })}
                          className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-50" title="Toggle active">
                    <Power size={14} />
                  </button>
                  <button onClick={() => openModal(p)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-50">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => confirm('Delete this product?') && deleteMutation.mutate(p.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-sans font-semibold text-dark mb-1">{p.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description}</p>
              <p className="text-xs font-medium text-gray-400">{p.interest_rate}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-sans font-semibold text-lg text-dark">{editing ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label">Category</label>
                  <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="form-input">
                    <option value="savings">Savings</option>
                    <option value="loans">Loans</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Sort Order</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: +e.target.value }))} className="form-input" />
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label">Title</label>
                <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required className="form-input" />
              </div>
              <div className="mb-4">
                <label className="form-label">Description</label>
                <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="form-input resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="form-label">Icon Name</label>
                  <input value={form.icon} onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))} className="form-input" placeholder="piggy-bank" />
                </div>
                <div>
                  <label className="form-label">Rate / Terms</label>
                  <input value={form.interest_rate} onChange={(e) => setForm(f => ({ ...f, interest_rate: e.target.value }))} className="form-input" placeholder="12% p.a." />
                </div>
              </div>
              {saveMutation.isError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                  {saveMutation.error?.response?.data?.error || 'Failed to save product.'}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saveMutation.isPending} className="flex-1 btn-primary justify-center text-sm disabled:opacity-60">
                  {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
