import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import api from '../../api/axios';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email] = useState(() => searchParams.get('email') || '');
  const [token] = useState(() => searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token || email) navigate('/admin/reset-password', { replace: true });
  }, [email, navigate, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!token || !email) {
      setError('This reset link is incomplete. Request a new password reset link.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { email, token, newPassword });
      navigate('/admin/login', { replace: true, state: { message: 'Password reset. Sign in with your new password.' } });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to reset the password. Request a new link and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 kente-pattern opacity-30" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Obotantim Cooperative" className="w-20 h-20 rounded-full object-contain bg-white p-1 mx-auto mb-4 shadow-xl" />
          <h1 className="font-sans font-bold text-2xl text-white">Obotantim Cooperative</h1>
          <p className="text-white/60 text-sm">Admin Dashboard</p>
        </div>
        <section className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="font-sans text-xl font-semibold text-dark">Set a new password</h2>
          <p className="mt-2 truncate text-sm text-gray-500">{email || 'Use the email address that received your reset link.'}</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="form-label">New password</span>
              <span className="relative mt-1 block">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="form-input pl-10" />
              </span>
            </label>
            <label className="block">
              <span className="form-label">Confirm new password</span>
              <span className="relative mt-1 block">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="form-input pl-10" />
              </span>
            </label>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Resetting...</> : 'Reset password'}
            </button>
          </form>
          <Link to="/admin/login" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">Back to sign in</Link>
        </section>
      </div>
    </div>
  );
}
