import { useState } from 'react';
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const { user, login, verifyMfaLogin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  if (!loading && user) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mfaToken) {
        await verifyMfaLogin(mfaToken, mfaCode);
        navigate('/admin');
      } else {
        const result = await login(email, password);
        if (result.mfaRequired) {
          setMfaToken(result.mfaToken);
          setError('');
        } else {
          navigate('/admin');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 kente-pattern opacity-30" />

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Obotantim Cooperative" className="w-20 h-20 rounded-full object-contain bg-white p-1 mx-auto mb-4 shadow-xl" />
          <h1 className="font-sans font-bold text-2xl text-white">Obotantim Cooperative</h1>
          <p className="text-white/60 text-sm">Admin Dashboard</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="font-sans font-semibold text-xl text-dark mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to manage the cooperative platform</p>
          {location.state?.message && <p role="status" className="mb-4 text-sm text-emerald-700">{location.state.message}</p>}

          <form onSubmit={handleSubmit}>
            {mfaToken ? (
              <div className="mb-5">
                <label className="form-label">Authenticator code</label>
                <div className="relative">
                  <ShieldCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))} className="form-input pl-10" placeholder="6-digit code" />
                </div>
                <button type="button" onClick={() => { setMfaToken(''); setMfaCode(''); setError(''); }} className="mt-2 text-xs text-primary hover:underline">Back to password</button>
              </div>
            ) : <>
            <div className="mb-4">
              <label className="form-label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoFocus className="form-input pl-10"
                  placeholder="admin@obotantimcoop.com"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required className="form-input pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="-mt-3 mb-5 text-right">
              <Link to="/admin/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
            </div>
            </>}

            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
                    className="btn-gold w-full justify-center py-3.5 disabled:opacity-60">
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Checking...</> : mfaToken ? 'Verify code' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Authorized staff only. All access is logged and monitored.
        </p>
      </div>
    </div>
  );
}
