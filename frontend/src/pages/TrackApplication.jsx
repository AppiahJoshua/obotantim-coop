import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ClipboardCheck, Search, Loader2, PencilLine } from 'lucide-react';
import api from '../api/axios';

const emptyForm = { trackingCode: '', phone: '' };

export default function TrackApplication() {
  const [form, setForm] = useState(emptyForm);
  const [contact, setContact] = useState({ email: '', newPhone: '' });
  const [notice, setNotice] = useState('');
  const trackMutation = useMutation({
    mutationFn: () => api.post('/track-application', form).then((response) => response.data.application),
    onSuccess: () => { setNotice(''); setContact({ email: '', newPhone: '' }); },
  });
  const contactMutation = useMutation({
    mutationFn: () => api.put('/track-application/contact', {
      ...form,
      email: contact.email,
      newPhone: contact.newPhone || form.phone,
    }),
    onSuccess: () => {
      setNotice('Your contact details were updated.');
      setForm((current) => ({ ...current, phone: contact.newPhone || current.phone }));
      trackMutation.mutate();
    },
  });

  const statusClass = {
    new: 'bg-blue-50 text-blue-700', contacted: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700', completed: 'bg-gray-100 text-gray-700',
    rejected: 'bg-red-50 text-red-700',
  };

  return (
    <main className="min-h-screen bg-surface px-4 py-12">
      <div className="mx-auto max-w-xl">
        <header className="mb-7 text-center">
          <img src="/logo.png" alt="Obotantim Cooperative" className="mx-auto mb-4 h-14 w-14 object-contain" />
          <h1 className="font-sans text-2xl font-bold text-dark">Track your application</h1>
          <p className="mt-2 text-sm text-gray-600">Enter the reference code from your submission and the phone number used on the application.</p>
        </header>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <form onSubmit={(event) => { event.preventDefault(); trackMutation.mutate(); }} className="space-y-4">
            <label className="block text-sm text-gray-700">Application reference code
              <input required minLength={32} maxLength={32} value={form.trackingCode} onChange={(event) => setForm({ ...form, trackingCode: event.target.value.trim() })} className="form-input mt-1 font-mono" autoComplete="off" />
            </label>
            <label className="block text-sm text-gray-700">Phone number on application
              <input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="form-input mt-1" autoComplete="tel" />
            </label>
            <button type="submit" disabled={trackMutation.isPending} className="btn-primary w-full justify-center">
              {trackMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Check status
            </button>
          </form>

          {trackMutation.isError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{trackMutation.error?.response?.data?.error || 'Could not look up the application.'}</p>}
          {notice && <p role="status" className="mt-4 text-sm text-emerald-700">{notice}</p>}

          {trackMutation.data && <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs uppercase text-gray-500">Service</p><p className="mt-1 font-medium capitalize text-dark">{trackMutation.data.service_type}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass[trackMutation.data.status] || 'bg-gray-100 text-gray-700'}`}>{trackMutation.data.status}</span>
            </div>
            <p className="mt-4 text-sm text-gray-500">Submitted {new Date(trackMutation.data.created_at).toLocaleDateString()}</p>
            <div className="mt-6 border-t border-gray-100 pt-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-dark"><PencilLine size={15} /> Update contact details</h2>
              <p className="mt-1 text-xs text-gray-500">Only update details if you can verify the original phone number above.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} placeholder="New email (optional)" className="form-input" />
                <input value={contact.newPhone} onChange={(event) => setContact({ ...contact, newPhone: event.target.value })} placeholder="New phone (optional)" className="form-input" />
              </div>
              {contactMutation.isError && <p className="mt-3 text-sm text-red-700">{contactMutation.error?.response?.data?.error || 'Could not update contact details.'}</p>}
              <button type="button" disabled={contactMutation.isPending || (!contact.email && !contact.newPhone)} onClick={() => contactMutation.mutate()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50">
                {contactMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />} Save contact details
              </button>
            </div>
          </div>}
        </section>
        <p className="mt-5 text-center text-xs text-gray-500">Keep your reference code private. Need help? Contact the cooperative.</p>
      </div>
    </main>
  );
}
