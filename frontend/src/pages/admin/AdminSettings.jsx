import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { FormSkeleton } from '../../components/ui/Skeleton';

const defaults = {
  contact_email: 'obotanimcoop.1@gmail.com',
  primary_phone: '0241 303 318',
  secondary_phone: '0243 141 539',
  maintenance_mode: false,
};

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(defaults);
  const [saved, setSaved] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/settings').then((response) => response.data),
  });
  useEffect(() => {
    if (data) setSettings({ ...defaults, ...data });
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => api.put('/settings', { settings }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  if (isLoading) return <FormSkeleton />;

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="font-sans text-2xl font-bold text-dark">Admin Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage public contact details and site availability.</p>
      </header>
      <section className="card space-y-4 p-5">
        <label className="block text-sm text-gray-600">Public contact email
          <input type="email" className="form-input mt-1" value={settings.contact_email} onChange={(event) => setSettings({ ...settings, contact_email: event.target.value })} />
        </label>
        <label className="block text-sm text-gray-600">Primary phone
          <input className="form-input mt-1" value={settings.primary_phone} onChange={(event) => setSettings({ ...settings, primary_phone: event.target.value })} />
        </label>
        <label className="block text-sm text-gray-600">Secondary phone
          <input className="form-input mt-1" value={settings.secondary_phone} onChange={(event) => setSettings({ ...settings, secondary_phone: event.target.value })} />
        </label>
        <label className="flex items-center gap-3 border-t border-gray-100 pt-4 text-sm text-dark">
          <input type="checkbox" checked={Boolean(settings.maintenance_mode)} onChange={(event) => setSettings({ ...settings, maintenance_mode: event.target.checked })} />
          Maintenance mode
        </label>
        {mutation.isError && <p className="text-sm text-red-600">{mutation.error?.response?.data?.error || 'Could not save settings.'}</p>}
        {saved && <p role="status" className="text-sm text-emerald-700">Settings saved.</p>}
        <button className="btn-primary text-sm" disabled={mutation.isPending} onClick={() => { setSaved(false); mutation.mutate(); }}>Save settings</button>
      </section>
    </div>
  );
}
