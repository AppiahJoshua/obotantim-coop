import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getNotificationPreferences, saveNotificationPreferences } from '../../api/notifications';
import { ShieldCheck } from 'lucide-react';

const eventLabels = {
  'registration.created': 'New member registrations',
  'contact_message.created': 'New contact messages',
};

export default function AdminProfile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [preferences, setPreferences] = useState([]);
  const [notice, setNotice] = useState('');
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaDisable, setMfaDisable] = useState({ currentPassword: '', code: '' });
  const profileQuery = useQuery({
    queryKey: ['staff-profile'],
    queryFn: () => api.get('/users/profile').then((response) => response.data),
  });
  const preferencesQuery = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
  });

  useEffect(() => {
    if (profileQuery.data) setProfile({ name: profileQuery.data.name, email: profileQuery.data.email });
  }, [profileQuery.data]);
  useEffect(() => {
    if (preferencesQuery.data) setPreferences(preferencesQuery.data);
  }, [preferencesQuery.data]);

  const profileMutation = useMutation({
    mutationFn: () => api.put('/users/profile', profile).then((response) => response.data),
    onSuccess: (user) => {
      updateUser(user);
      setNotice('Profile saved.');
    },
  });
  const passwordMutation = useMutation({
    mutationFn: () => api.put('/users/profile/password', password),
    onSuccess: () => {
      setPassword({ currentPassword: '', newPassword: '' });
      setNotice('Password changed.');
    },
  });
  const preferencesMutation = useMutation({
    mutationFn: () => saveNotificationPreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setNotice('Notification preferences saved.');
    },
  });
  const startMfaMutation = useMutation({
    mutationFn: () => api.post('/auth/mfa/setup').then((response) => response.data),
    onSuccess: setMfaSetup,
  });
  const verifyMfaMutation = useMutation({
    mutationFn: () => api.post('/auth/mfa/verify', { code: mfaCode }),
    onSuccess: () => {
      setMfaSetup(null);
      setMfaCode('');
      setNotice('MFA enabled. Sign in again to activate the new session policy.');
      queryClient.invalidateQueries({ queryKey: ['staff-profile'] });
    },
  });
  const disableMfaMutation = useMutation({
    mutationFn: () => api.post('/auth/mfa/disable', mfaDisable),
    onSuccess: () => {
      setMfaDisable({ currentPassword: '', code: '' });
      setNotice('MFA disabled. Your current session has been revoked; sign in again.');
      localStorage.removeItem('obotantim_token');
      localStorage.removeItem('obotantim_user');
      window.location.assign('/admin/login');
    },
  });

  const togglePreference = (eventType, channel, enabled) => {
    setPreferences((current) => current.map((preference) => preference.event_type === eventType
      ? { ...preference, [channel]: enabled }
      : preference));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-sans text-2xl font-bold text-dark">Profile & Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your staff profile, password, and alerts.</p>
      </header>
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}

      <section className="card p-5">
        <h2 className="font-semibold text-dark">Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-gray-600">Name
            <input className="form-input mt-1" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
          </label>
          <label className="text-sm text-gray-600">Email
            <input className="form-input mt-1" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
          </label>
        </div>
        {profileMutation.isError && <p className="mt-3 text-sm text-red-600">{profileMutation.error?.response?.data?.error || 'Could not save profile.'}</p>}
        <button className="btn-primary mt-4 text-sm" disabled={profileMutation.isPending} onClick={() => profileMutation.mutate()}>Save profile</button>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-dark">Change password</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-gray-600">Current password
            <input className="form-input mt-1" type="password" autoComplete="current-password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} />
          </label>
          <label className="text-sm text-gray-600">New password
            <input className="form-input mt-1" type="password" minLength={8} autoComplete="new-password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} />
          </label>
        </div>
        {passwordMutation.isError && <p className="mt-3 text-sm text-red-600">{passwordMutation.error?.response?.data?.error || 'Could not change password.'}</p>}
        <button className="btn-primary mt-4 text-sm" disabled={passwordMutation.isPending || password.newPassword.length < 8 || !password.currentPassword} onClick={() => passwordMutation.mutate()}>Update password</button>
      </section>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-semibold text-dark"><ShieldCheck size={18} /> Multi-factor authentication</h2>
        <p className="mt-2 text-sm text-gray-500">{profileQuery.data?.mfa_enabled ? 'MFA is enabled for your account.' : 'Use an authenticator app to add a second sign-in step.'}</p>
        {!profileQuery.data?.mfa_enabled && !mfaSetup && <button className="btn-primary mt-4 text-sm" disabled={startMfaMutation.isPending} onClick={() => startMfaMutation.mutate()}>Set up MFA</button>}
        {mfaSetup && <div className="mt-4 space-y-3">
          <img src={mfaSetup.qrCodeDataUrl} alt="Scan with authenticator app" className="h-44 w-44 border border-gray-200" />
          <p className="break-all text-xs text-gray-500">Manual key: {mfaSetup.manualEntryKey}</p>
          <label className="block text-sm text-gray-600">6-digit authenticator code
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))} className="form-input mt-1 max-w-xs" />
          </label>
          {verifyMfaMutation.isError && <p className="text-sm text-red-600">{verifyMfaMutation.error?.response?.data?.error || 'MFA verification failed.'}</p>}
          <button className="btn-primary text-sm" disabled={verifyMfaMutation.isPending || mfaCode.length !== 6} onClick={() => verifyMfaMutation.mutate()}>Verify and enable</button>
        </div>}
        {profileQuery.data?.mfa_enabled && <div className="mt-4 max-w-md space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-600">To disable MFA, confirm your current password and an authenticator code. This signs you out on all devices.</p>
          <label className="block text-sm text-gray-600">Current password
            <input type="password" autoComplete="current-password" value={mfaDisable.currentPassword} onChange={(event) => setMfaDisable({ ...mfaDisable, currentPassword: event.target.value })} className="form-input mt-1" />
          </label>
          <label className="block text-sm text-gray-600">Authenticator code
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaDisable.code} onChange={(event) => setMfaDisable({ ...mfaDisable, code: event.target.value.replace(/\D/g, '') })} className="form-input mt-1" />
          </label>
          {disableMfaMutation.isError && <p role="alert" className="text-sm text-red-600">{disableMfaMutation.error?.response?.data?.error || 'Could not disable MFA.'}</p>}
          <button type="button" disabled={disableMfaMutation.isPending || !mfaDisable.currentPassword || mfaDisable.code.length !== 6} onClick={() => disableMfaMutation.mutate()} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Disable MFA and sign out</button>
        </div>}
        {startMfaMutation.isError && <p className="mt-3 text-sm text-red-600">{startMfaMutation.error?.response?.data?.error || 'Could not start MFA setup.'}</p>}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-dark">Notification preferences</h2>
        {preferencesQuery.isLoading ? <p className="mt-4 text-sm text-gray-500">Loading preferences...</p> : (
          <div className="mt-4 divide-y divide-gray-100">
            {preferences.map((preference) => (
              <div key={preference.event_type} className="flex flex-wrap items-center justify-between gap-4 py-3">
                <span className="text-sm font-medium text-dark">{eventLabels[preference.event_type] || preference.event_type}</span>
                <div className="flex gap-5">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={preference.in_app_enabled} onChange={(event) => togglePreference(preference.event_type, 'in_app_enabled', event.target.checked)} /> In-app
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={preference.email_enabled} onChange={(event) => togglePreference(preference.event_type, 'email_enabled', event.target.checked)} /> Email
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
        {preferencesMutation.isError && <p className="mt-3 text-sm text-red-600">{preferencesMutation.error?.response?.data?.error || 'Could not save preferences.'}</p>}
        <button className="btn-primary mt-4 text-sm" disabled={preferencesMutation.isPending || !preferences.length} onClick={() => preferencesMutation.mutate()}>Save preferences</button>
      </section>
    </div>
  );
}
