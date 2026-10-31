import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2 } from 'lucide-react';
import api from '../../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to process the request right now. Please try again later.');
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
          <h2 className="font-sans text-xl font-semibold text-dark">Forgot password?</h2>
          {submitted ? (
            <p role="status" className="mt-3 text-sm leading-6 text-gray-600">
              If an account with that email exists, a reset link has been sent. Check your inbox.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-gray-500">Enter your staff email and we’ll send a password reset link if the account is active.</p>
              <form onSubmit={handleSubmit} className="mt-6">
                <label className="form-label" htmlFor="reset-email">Email address</label>
                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="reset-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="form-input pl-10" placeholder="you@example.com" />
                </div>
                {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full justify-center py-3 disabled:opacity-60">
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Send reset link'}
                </button>
              </form>
            </>
          )}
          <Link to="/admin/login" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">Back to sign in</Link>
        </section>
      </div>
    </div>
  );
}
