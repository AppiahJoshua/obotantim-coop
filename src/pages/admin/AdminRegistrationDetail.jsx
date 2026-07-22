import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Phone, Mail, CreditCard, Briefcase, MapPin, Banknote, FileText, Loader2, Calendar } from 'lucide-react';
import api from '../../api/axios';

const statusOptions = ['new', 'contacted', 'approved', 'completed', 'rejected'];
const statusColors = {
  new: 'bg-blue-50 text-blue-600 border-blue-200',
  contacted: 'bg-amber-50 text-amber-600 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
};

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <Icon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-dark font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function AdminRegistrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [statusNote, setStatusNote] = useState('');

  const { data: reg, isLoading } = useQuery({
    queryKey: ['registration', id],
    queryFn: () => api.get(`/registrations/${id}`).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (status) => api.put(`/registrations/${id}/status`, { status, status_note: statusNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registration', id] });
      qc.invalidateQueries({ queryKey: ['registrations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!reg) return <p className="text-gray-400">Registration not found.</p>;

  // Format date of birth safely if available
  const formattedDob = reg.date_of_birth 
    ? new Date(reg.date_of_birth).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) 
    : null;

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate('/admin/registrations')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-5">
        <ArrowLeft size={16} /> Back to Registrations
      </button>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Main info */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center gap-4 mb-6">
            {reg.photo_url ? (
              <img src={reg.photo_url} alt={reg.full_name} className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <User size={24} className="text-primary" />
              </div>
            )}
            <div>
              <h2 className="font-sans font-bold text-xl text-dark">{reg.full_name}</h2>
              <p className="text-sm text-gray-500 capitalize">{reg.service_type} application</p>
            </div>
          </div>

          <InfoRow icon={Phone} label="Phone Number" value={reg.phone} />
          <InfoRow icon={Mail} label="Email" value={reg.email} />
          <InfoRow icon={Calendar} label="Date of Birth" value={formattedDob} />
          <InfoRow icon={CreditCard} label="Ghana Card" value={reg.ghana_card} />
          <InfoRow icon={Briefcase} label="Occupation" value={reg.occupation} />
          <InfoRow icon={MapPin} label="Address" value={reg.address} />
          {reg.loan_amount && <InfoRow icon={Banknote} label="Requested Loan Amount" value={`GHS ${parseFloat(reg.loan_amount).toLocaleString()}`} />}
          {reg.notes && (
            <div className="flex items-start gap-3 py-3">
              <FileText size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Additional Notes</p>
                <p className="text-sm text-dark">{reg.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Status panel */}
        <div className="card p-6 h-fit">
          <h3 className="font-sans font-semibold text-dark mb-4">Application Status</h3>

          <div className={`text-center py-3 rounded-xl border mb-5 font-medium capitalize ${statusColors[reg.status]}`}>
            {reg.status}
          </div>

          <div className="mb-4">
            <label className="form-label">Update Status</label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((s) => (
                <button key={s} onClick={() => updateMutation.mutate(s)}
                        disabled={updateMutation.isPending || s === reg.status}
                        className={`text-xs font-medium px-3 py-2 rounded-lg border capitalize transition-colors
                          ${s === reg.status ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary hover:text-primary'}
                          ${statusColors[s]}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label">Internal Note (optional)</label>
            <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} rows={3}
                      className="form-input resize-none text-sm" placeholder="Add a note for this update..." />
          </div>

          {reg.status_note && (
            <div className="bg-surface rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-400 mb-1">Last note:</p>
              <p className="text-sm text-gray-600">{reg.status_note}</p>
            </div>
          )}

          {updateMutation.isPending && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-2">
              <Loader2 size={14} className="animate-spin" /> Updating...
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 mt-4">
            <p className="text-xs text-gray-400">Submitted</p>
            <p className="text-sm text-dark">{new Date(reg.created_at).toLocaleString()}</p>
          </div>
          {reg.reviewed_by_name && (
            <div className="mt-2">
              <p className="text-xs text-gray-400">Last reviewed by</p>
              <p className="text-sm text-dark">{reg.reviewed_by_name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}