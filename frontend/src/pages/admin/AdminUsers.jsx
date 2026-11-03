import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Key, Power, Shield, ShieldCheck, RotateCcw, Pencil } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const emptyForm = { name: '', email: '', password: '', role: 'content_editor' };

const roleLabels = { super_admin: 'Super Admin', manager: 'Manager', content_editor: 'Content Editor' };
const roleColors = {
  super_admin: 'bg-primary/10 text-primary',
  manager: 'bg-blue-50 text-blue-600',
  content_editor: 'bg-gold/15 text-yellow-700',
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [mfaUser, setMfaUser] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [form, setForm] = useState(emptyForm);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/admin/users', data),
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

  const updateEmailMutation = useMutation({
    mutationFn: ({ id, email }) => api.put(`/admin/users/${id}`, { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users-list'] });
      setEditUser(null);
      setEditEmail('');
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, newPassword }) => api.put(`/admin/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => { setResetModal(null); setNewPassword(''); },
  });

  const mfaMutation = useMutation({
    mutationFn: ({ id, enabled, code }) => api.put(`/admin/users/${id}/mfa`, { enabled, code }),
    onSuccess: () => { setMfaUser(null); setMfaCode(''); qc.invalidateQueries({ queryKey: ['admin-users-list'] }); },
  });
  const revokeMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/users/${id}/revoke-sessions`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users-list'] }),
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
                <th className="text-left px-5 py-3 font-medium">MFA</th>
                <th className="text-left px-5 py-3 font-medium">Last Login</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-surface transition-colors">
                  <td className="px-5 py-3.5 font-medium text-dark">{u.name} {u.id === currentUser.id && <span className="text-xs text-gray-400">(you)</span>}</td>
                  <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3.5"><span className={`status-badge ${roleColors[u.role]}`}>{roleLabels[u.role]}</span></td>
                  <td className="px-5 py-3.5">
                    <span className={`status-badge ${u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5"><span className={`status-badge ${u.mfa_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{u.mfa_enabled ? 'Enabled' : 'Off'}</span></td>
                  <td className="px-5 py-3.5 text-gray-400">{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 justify-end">
                      {u.id !== currentUser.id && (
                        <button onClick={() => { setEditUser(u); setEditEmail(u.email); }} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100" title="Change staff email" aria-label={`Change email for ${u.name}`}>
                          <Pencil size={14} />
                        </button>
                      )}
                      <button onClick={() => setResetModal(u)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100" title="Reset password">
                        <Key size={14} />
                      </button>
                      <button onClick={() => u.mfa_enabled
                        ? mfaMutation.mutate({ id: u.id, enabled: false })
                        : (setMfaUser(u), setMfaCode(''))}
                        className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100" title={u.mfa_enabled ? 'Disable MFA' : 'Enable MFA'}>
                        <ShieldCheck size={14} />
                      </button>
                      <button onClick={() => revokeMutation.mutate(u.id)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-gray-100" title="Revoke all sessions">
                        <RotateCcw size={14} />
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

      {editUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-sans font-semibold text-lg text-dark">Change staff email</h3>
              <button onClick={() => { setEditUser(null); setEditEmail(''); }} className="text-gray-400 hover:text-gray-600" aria-label="Close"><X size={20} /></button>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); updateEmailMutation.mutate({ id: editUser.id, email: editEmail }); }} className="p-5">
              <p className="mb-4 text-sm text-gray-500">Update the sign-in and notification email for {editUser.name}.</p>
              <label className="form-label" htmlFor="staff-email">Email address</label>
              <input id="staff-email" type="email" required maxLength={254} autoComplete="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} className="form-input mt-1" />
              {updateEmailMutation.isError && <p role="alert" className="mt-3 text-sm text-red-600">{updateEmailMutation.error?.response?.data?.error || 'Could not update staff email.'}</p>}
              <button type="submit" disabled={updateEmailMutation.isPending || !editEmail.trim()} className="btn-primary mt-5 w-full justify-center text-sm disabled:opacity-60">
                {updateEmailMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Save email'}
              </button>
            </form>
          </div>
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
              <div className="mb-6">
                <label className="form-label">Role</label>
                <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} className="form-input">
                  <option value="content_editor">Content Editor — Manage products, gallery, content</option>
                  <option value="manager">Manager — Manage registrations & messages</option>
                  <option value="super_admin">Super Admin — Full system access</option>
                </select>
              </div>

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

      {mfaUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-dark">Enable MFA for {mfaUser.name}</h3>
              <button type="button" aria-label="Close" onClick={() => setMfaUser(null)} className="text-gray-400"><X size={18} /></button>
            </div>
            <p className="mt-2 text-sm text-gray-500">The staff member must first enroll an authenticator. Enter their current 6-digit code to enable MFA.</p>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))} className="form-input mt-4" placeholder="6-digit code" />
            {mfaMutation.isError && <p className="mt-2 text-sm text-red-600">{mfaMutation.error?.response?.data?.error || 'Could not update MFA.'}</p>}
            <button type="button" disabled={mfaCode.length !== 6 || mfaMutation.isPending} onClick={() => mfaMutation.mutate({ id: mfaUser.id, enabled: true, code: mfaCode })} className="btn-primary mt-4 w-full justify-center text-sm disabled:opacity-50">Enable MFA</button>
          </section>
        </div>
      )}
    </div>
  );
}
