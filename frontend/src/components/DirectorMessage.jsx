import { useQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Quote } from 'lucide-react';
import api from '../api/axios';

const fallback = {
  director_name: 'The Board of Directors',
  title: 'Board of Directors',
  photo_url: null,
  message: `On behalf of the Board of Directors and the entire management of Obotantim Cooperative Mutual Support and Social Services Society Limited, I warmly welcome you to our platform. For over a decade, we have been committed to empowering individuals, families, and businesses in Techiman and the broader Bono East Region.

Our cooperative was founded on the principles of mutual support, trust, and collective growth. We believe that when communities work together, they achieve far more than any individual can alone.

We invite you to join our growing family. Together, we can build a stronger, more prosperous community for all.`,
};

export default function DirectorMessage() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  const { data } = useQuery({
    queryKey: ['director'],
    queryFn: () => api.get('/director').then(r => r.data),
    placeholderData: fallback,
  });

  const director = data || fallback;
  const paragraphs = director.message.split('\n').filter(p => p.trim());

  return (
    <section className="py-24 bg-primary relative overflow-hidden" ref={ref}>
      {/* Background pattern */}
      <div className="absolute inset-0 kente-pattern opacity-40" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">A Word From Leadership</p>
          <h2 className="font-sans font-bold text-3xl md:text-4xl text-white">Director's Message</h2>
        </div>

        <div className="grid lg:grid-cols-5 gap-10 items-center">

          {/* Image */}
          <div className={`lg:col-span-2 transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="relative max-w-sm mx-auto">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
                <img
                  src={director.photo_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80'}
                  alt={director.director_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-5 -right-5 w-20 h-20 bg-gold rounded-2xl flex items-center justify-center shadow-xl">
                <Quote size={32} className="text-dark" />
              </div>
            </div>
          </div>

          {/* Message */}
          <div className={`lg:col-span-3 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 lg:p-10 border border-white/10">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-white/90 leading-relaxed mb-4 last:mb-0">{p}</p>
              ))}
              <div className="mt-6 pt-6 border-t border-white/20">
                <p className="font-sans font-bold text-gold text-lg">{director.director_name}</p>
                <p className="text-white/60 text-sm">{director.title}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
