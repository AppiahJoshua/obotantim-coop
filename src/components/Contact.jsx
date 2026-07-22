import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { MapPin, Phone, Mail, Clock, Send, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';

export default function Contact() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/messages', data).then(r => r.data),
    onSuccess: () => setForm({ name: '', email: '', phone: '', subject: '', message: '' }),
  });

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => { e.preventDefault(); mutation.mutate(form); };

  return (
    <section id="contact" className="py-24 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="section-subheading">Get In Touch</p>
          <h2 className="section-heading">Visit or Call Us</h2>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">

          {/* Info cards */}
          <div className={`lg:col-span-2 space-y-5 transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>

            <div className="card p-6 flex gap-4">
              <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin size={20} className="text-primary" />
              </div>
              <div>
                <h4 className="font-sans font-semibold text-dark mb-1">Our Location</h4>
                <p className="text-sm text-gray-500">Post Office Box TH 9, Techiman<br />Bono East Region, Ghana</p>
              </div>
            </div>

            <div className="card p-6 flex gap-4">
              <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone size={20} className="text-primary" />
              </div>
              <div>
                <h4 className="font-sans font-semibold text-dark mb-1">Call Us</h4>
                <p className="text-sm text-gray-500">
                  <a href="tel:0241303318" className="hover:text-primary">0241 303 318</a>
                  {' / '}
                  <a href="tel:0243141539" className="hover:text-primary">0243 141 539</a>
                </p>
              </div>
            </div>

            <div className="card p-6 flex gap-4">
              <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail size={20} className="text-primary" />
              </div>
              <div>
                <h4 className="font-sans font-semibold text-dark mb-1">Email Us</h4>
                <a href="mailto:obotanimcoop.1@gmail.com" className="text-sm text-gray-500 hover:text-primary">
                  obotanimcoop.1@gmail.com
                </a>
              </div>
            </div>

            <div className="card p-6 flex gap-4">
              <div className="w-11 h-11 bg-gold/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock size={20} className="text-yellow-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-sans font-semibold text-dark mb-2">Business Hours</h4>
                <div className="space-y-1 text-sm text-gray-500">
                  <div className="flex justify-between"><span>Monday – Friday</span><span className="font-medium text-dark">8:00 AM – 5:00 PM</span></div>
                  <div className="flex justify-between"><span>Saturday</span><span className="font-medium text-dark">9:00 AM – 2:00 PM</span></div>
                  <div className="flex justify-between"><span>Sunday</span><span className="font-medium text-red-500">Closed</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className={`lg:col-span-3 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div className="bg-surface rounded-3xl p-6 sm:p-8 h-full">
              {mutation.isSuccess ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <CheckCircle2 size={48} className="text-primary mb-4" />
                  <h4 className="font-sans font-semibold text-lg text-dark mb-2">Message Sent!</h4>
                  <p className="text-sm text-gray-500 mb-6">We'll get back to you as soon as possible.</p>
                  <button onClick={() => mutation.reset()} className="btn-primary text-sm">Send Another Message</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <h3 className="font-sans font-semibold text-lg text-dark mb-6">Send Us a Message</h3>
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="form-label">Name *</label>
                      <input name="name" value={form.name} onChange={handleChange} required className="form-input" placeholder="Your name" />
                    </div>
                    <div>
                      <label className="form-label">Phone</label>
                      <input name="phone" value={form.phone} onChange={handleChange} className="form-input" placeholder="024 XXX XXXX" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="form-label">Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} className="form-input" placeholder="you@example.com" />
                  </div>
                  <div className="mb-4">
                    <label className="form-label">Subject</label>
                    <input name="subject" value={form.subject} onChange={handleChange} className="form-input" placeholder="What is this about?" />
                  </div>
                  <div className="mb-6">
                    <label className="form-label">Message *</label>
                    <textarea name="message" value={form.message} onChange={handleChange} required rows={4}
                              className="form-input resize-none" placeholder="How can we help you?" />
                  </div>
                  {mutation.isError && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                      {mutation.error?.response?.data?.error || 'Something went wrong. Please try again.'}
                    </div>
                  )}
                  <button type="submit" disabled={mutation.isPending} className="btn-primary w-full justify-center disabled:opacity-60">
                    {mutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send Message</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
