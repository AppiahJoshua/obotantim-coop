import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { User, Phone, Mail, CreditCard, Briefcase, MapPin, Calendar, Upload, CheckCircle2, Loader2, Users } from 'lucide-react';
import api from '../api/axios';

const services = [
  { value: 'savings', label: 'Open a Savings Account' },
  { value: 'loan', label: 'Apply for a Loan' },
  { value: 'membership', label: 'General Membership' },
];

const initialForm = {
  full_name: '', phone: '', email: '', gender: '', date_of_birth: '', ghana_card: '',
  occupation: '', address: '', service_type: 'membership',
  loan_amount: '', notes: '',
};

export default function RegisterForm() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: async (data) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (photo) fd.append('photo', photo);
      return api.post('/registrations', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
    },
    onSuccess: () => {
      setForm(initialForm);
      setPhoto(null);
      setPhotoPreview(null);
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: null }));
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^[0-9+\s-]{9,15}$/.test(form.phone)) errs.phone = 'Enter a valid phone number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.gender) errs.gender = 'Gender is required';
    if (!form.date_of_birth) errs.date_of_birth = 'Date of birth is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) mutation.mutate(form);
  };

  if (mutation.isSuccess) {
    return (
      <section id="register" className="py-24 bg-primary">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl p-10 lg:p-14 shadow-2xl animate-fade-up">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-primary" />
            </div>
            <h3 className="font-sans font-bold text-2xl text-dark mb-3">Registration Received!</h3>
            <p className="text-gray-500 mb-8">
              Thank you for reaching out to Obotantim Cooperative. Our team will review your
              submission and contact you within 1–2 business days.
            </p>
            <button onClick={() => mutation.reset()} className="btn-primary">
              Submit Another Application
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="register" className="py-24 bg-primary relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 kente-pattern opacity-30" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <div className={`text-center mb-12 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">Get Started</p>
          <h2 className="font-sans font-bold text-3xl md:text-4xl text-white mb-4">
            Register for a Service
          </h2>
          <p className="text-white/70 max-w-xl mx-auto">
            Fill the form below to apply for membership, savings, or a loan. Our team will be in touch shortly.
          </p>
        </div>

        <form onSubmit={handleSubmit}
              className={`bg-white rounded-3xl p-6 sm:p-10 shadow-2xl transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Service selection */}
          <div className="mb-6">
            <label className="form-label">I want to...</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {services.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, service_type: s.value }))}
                  className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all
                    ${form.service_type === s.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="form-label">Full Name *</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="full_name" value={form.full_name} onChange={handleChange}
                       className="form-input pl-10" placeholder="Kwame Mensah" />
              </div>
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label className="form-label">Phone Number *</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="phone" value={form.phone} onChange={handleChange}
                       className="form-input pl-10" placeholder="024 XXX XXXX" />
              </div>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="email" type="email" value={form.email} onChange={handleChange}
                       className="form-input pl-10" placeholder="you@example.com" />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="form-label">Gender *</label>
              <div className="relative">
                <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select name="gender" value={form.gender} onChange={handleChange}
                        className="form-input pl-10 appearance-none bg-white">
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
            </div>

            <div>
              <label className="form-label">Date of Birth *</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange}
                       className="form-input pl-10" />
              </div>
              {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth}</p>}
            </div>

            <div>
              <label className="form-label">Ghana Card Number</label>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="ghana_card" value={form.ghana_card} onChange={handleChange}
                       className="form-input pl-10" placeholder="GHA-XXXXXXXXX-X" />
              </div>
            </div>

            <div>
              <label className="form-label">Occupation</label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="occupation" value={form.occupation} onChange={handleChange}
                       className="form-input pl-10" placeholder="e.g. Trader, Driver, Teacher" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Address</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="address" value={form.address} onChange={handleChange}
                       className="form-input pl-10" placeholder="Your residential address" />
              </div>
            </div>
          </div>

          {form.service_type === 'loan' && (
            <div className="mb-5">
              <label className="form-label">Loan Amount (GHS)</label>
              <input name="loan_amount" type="number" min="0" value={form.loan_amount} onChange={handleChange}
                     className="form-input" placeholder="e.g. 5000" />
            </div>
          )}

          <div className="mb-5">
            <label className="form-label">Additional Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
                      className="form-input resize-none" placeholder="Tell us anything else we should know..." />
          </div>

          {/* Photo upload */}
          <div className="mb-8">
            <label className="form-label">Photo (Optional)</label>
            <label className="flex items-center gap-4 border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-primary transition-colors">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Upload size={18} className="text-gray-400" />
                </div>
              )}
              <span className="text-sm text-gray-500">
                {photo ? photo.name : 'Click to upload a passport photo'}
              </span>
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>

          {mutation.isError && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {mutation.error?.response?.data?.error || 'Something went wrong. Please try again.'}
            </div>
          )}

          <button type="submit" disabled={mutation.isPending}
                  className="btn-gold w-full justify-center text-base py-4 disabled:opacity-60">
            {mutation.isPending ? (
              <><Loader2 size={18} className="animate-spin" /> Submitting...</>
            ) : (
              'Submit Registration'
            )}
          </button>
        </form>
      </div>
    </section>
  );
}