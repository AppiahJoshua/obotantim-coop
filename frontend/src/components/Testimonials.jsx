import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios';

const fallback = [
  { id: 1, name: 'Akosua Mensah', location: 'Techiman Market', message: 'I started with the Daakye Savings account two years ago. Today, I have a proper shop and I\'m supporting my children\'s education. Obotantim changed my life.', photo_url: null },
  { id: 2, name: 'Kwame Asante', location: 'Nkoranza Road', message: 'The group loan helped our market women association buy goods in bulk. We saved 30% on costs and our profits doubled. Truly a blessing.', photo_url: null },
  { id: 3, name: 'Abena Frimpong', location: 'Techiman New Town', message: 'When I needed money urgently for my son\'s BECE fees, Obotantim processed my education loan in two days. God bless them.', photo_url: null },
];

export default function Testimonials() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });
  const [index, setIndex] = useState(0);

  const { data } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => api.get('/testimonials').then(r => r.data),
    placeholderData: fallback,
  });

  const items = data?.length ? data : fallback;

  useEffect(() => {
    const interval = setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(interval);
  }, [items.length]);

  const current = items[index];

  return (
    <section className="py-24 bg-white relative overflow-hidden" ref={ref}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">

        <div className={`mb-12 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="section-subheading">In Their Words</p>
          <h2 className="section-heading">What Our Members Say</h2>
        </div>

        <div className={`relative transition-all duration-700 delay-100 ${inView ? 'opacity-100' : 'opacity-0'}`}>
          <Quote size={64} className="text-primary/10 mx-auto mb-2" />

          <div className="min-h-[160px] flex flex-col items-center justify-center transition-opacity duration-500">
            <p key={current.id} className="text-lg sm:text-xl text-dark leading-relaxed mb-8 max-w-2xl mx-auto animate-fade-in">
              "{current.message}"
            </p>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                {current.photo_url ? (
                  <img src={current.photo_url} alt={current.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-sans font-bold text-primary text-lg">
                    {current.name.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
              </div>
              <div className="text-left">
                <p className="font-sans font-semibold text-dark">{current.name}</p>
                <p className="text-sm text-gray-500">{current.location}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-6 mt-10">
            <button
              onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors"
              aria-label="Previous testimonial">
              <ChevronLeft size={18} />
            </button>

            <div className="flex gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-primary' : 'w-2 bg-gray-300'}`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => setIndex((i) => (i + 1) % items.length)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors"
              aria-label="Next testimonial">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
