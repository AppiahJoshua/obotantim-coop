import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Key, Power, Shield } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const emptyForm = { name: '', email: '', password: '', role: 'content_editor', customRole: '' };

// Dynamic fallback: converts snake_case to Title Case cleanly
const getRoleLabel = (role) => {
  const customLabels = {
    super_admin: 'Super Admin',
    manager: 'Manager',
    content_editor: 'Content Editor'
  };
  if (customLabels[role]) return customLabels[role];
  
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Colors map with a safe fallback style for any newly added roles
const getRoleColorClass = (role) => {
  const colors = {
    super_admin: 'bg-primary/10 text-primary',
    manager: 'bg-blue-50 text-blue-600',
    content_editor: 'bg-gold/15 text-yellow-700',
  };
  return colors[role] || 'bg-gray-100 text-gray-700';
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState(emptyForm);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      // If "Other" is chosen, sanitize and send the custom string formatted as snake_case
      const finalRole = data.role === 'other' 
        ? data.customRole.trim().toLowerCase().replace(/\s+/g, '_') 
        : data.role;
      
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: finalRole
      };
      
      return api.post('/admin/users', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users-list'] });
      setModalOpen(false);
      setForm(emptyForm);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => api.put(`/admin/users/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users-list'] }),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, newPassword }) => api.put(`/admin/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => { setResetModal(null); setNewPassword(''); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-sans font-bold text-2xl text-dark">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage staff accounts and roles. Super Admin only.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">
          <Plus size={16} /> Add Staff
        </button>
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
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Role</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Last Login</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-surface transition-colors">
                  <td className="px-5 py-3.5 font-medium text-dark">{u.name} {u.id === currentUser.id && <span className="text-xs text-gray-400">(you)</span>}</td>
                  <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`status-badge ${getRoleColorClass(u.role)}`}>
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`status-badge ${u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400">{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setResetModal(u)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100" title="Reset password">
                        <Key size={14} />
                      </button>
                      {u.id !== currentUser.id && (
                        <button onClick={() => toggleMutation.mutate({ id: u.id, is_active: !u.is_active })}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100" title="Toggle active">
                          <Power size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create user modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-sans font-semibold text-lg text-dark flex items-center gap-2"><Shield size={18} className="text-primary" /> Add Staff Member</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="p-5">
              <div className="mb-4">
                <label className="form-label">Full Name</label>
                <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required className="form-input" />
              </div>
              <div className="mb-4">
                <label className="form-label">Email Address</label>
                <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required className="form-input" />
              </div>
              <div className="mb-4">
                <label className="form-label">Temporary Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} className="form-input" placeholder="Min. 8 characters" />
              </div>
              <div className="mb-4">
                <label className="form-label">Role</label>
                <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} className="form-input">
                  <option value="content_editor">Content Editor — Manage products, gallery, content</option>
                  <option value="manager">Manager — Manage registrations & messages</option>
                  <option value="super_admin">Super Admin — Full system access</option>
                  <option value="other">Other (Type a new role...)</option>
                </select>
              </div>

              {/* Conditional custom role text input */}
              {form.role === 'other' && (
                <div className="mb-6 animate-fadeIn">
                  <label className="form-label text-primary">Specify Custom Role Title</label>
                  <input 
                    type="text" 
                    value={form.customRole} 
                    onChange={(e) => setForm(f => ({ ...f, customRole: e.target.value }))} 
                    required 
                    placeholder="e.g. Loan Officer, Auditor" 
                    className="form-input border-primary focus:ring-primary" 
                  />
                </div>
              )}

              {createMutation.isError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                  {createMutation.error?.response?.data?.error || 'Failed to create user.'}
                </div>
              )}

              <button type="submit" disabled={createMutation.isPending} className="w-full btn-primary justify-center text-sm disabled:opacity-60">
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-sans font-semibold text-lg text-dark">Reset Password</h3>
              <button onClick={() => setResetModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 mb-4">Set a new password for <strong>{resetModal.name}</strong>.</p>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8}
                     className="form-input mb-4" placeholder="New password (min. 8 chars)" autoFocus />
              <button onClick={() => resetMutation.mutate({ id: resetModal.id, newPassword })}
                      disabled={newPassword.length < 8 || resetMutation.isPending}
                      className="w-full btn-primary justify-center text-sm disabled:opacity-60">
                {resetMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}