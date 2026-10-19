import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import api from '../api/axios';

const fallbackImages = [
  { id: 1, image_url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80', caption: 'Member training session' },
  { id: 2, image_url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80', caption: 'Techiman market traders' },
  { id: 3, image_url: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=600&q=80', caption: 'Cooperative meeting' },
  { id: 4, image_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80', caption: 'Loan disbursement day' },
  { id: 5, image_url: 'https://images.unsplash.com/photo-1521791055366-0d553872125f?w=600&q=80', caption: 'Community outreach' },
  { id: 6, image_url: 'https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=600&q=80', caption: 'Annual general meeting' },
  { id: 7, image_url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80', caption: 'Staff and members' },
  { id: 8, image_url: 'https://images.unsplash.com/photo-1607863680198-23d4b2565df0?w=600&q=80', caption: 'Financial literacy workshop' },
];

export default function Gallery() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 });
  const [activeIndex, setActiveIndex] = useState(null);

  const { data: images } = useQuery({
    queryKey: ['gallery'],
    queryFn: () => api.get('/gallery').then(r => r.data),
    placeholderData: fallbackImages,
  });

  const gallery = images?.length ? images : fallbackImages;

  const next = () => setActiveIndex((i) => (i + 1) % gallery.length);
  const prev = () => setActiveIndex((i) => (i - 1 + gallery.length) % gallery.length);

  return (
    <section id="gallery" className="py-24 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className={`text-center mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="section-subheading">Moments With Us</p>
          <h2 className="section-heading">Gallery</h2>
        </div>

        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 transition-all duration-700 delay-100 ${inView ? 'opacity-100' : 'opacity-0'}`}>
          {gallery.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className="relative aspect-square rounded-xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <img
                src={img.image_url}
                alt={img.caption || 'Gallery image'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/60 transition-colors duration-300 flex items-center justify-center">
                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" size={28} />
              </div>
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white text-xs font-medium text-left">{img.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {activeIndex !== null && (
        <div className="lightbox-overlay" onClick={() => setActiveIndex(null)}>
          <button
            onClick={() => setActiveIndex(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white p-2 z-10"
            aria-label="Close">
            <X size={28} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 sm:left-8 text-white/70 hover:text-white p-2 z-10"
            aria-label="Previous">
            <ChevronLeft size={36} />
          </button>

          <div className="max-w-3xl max-h-[80vh] px-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={gallery[activeIndex].image_url}
              alt={gallery[activeIndex].caption || ''}
              className="max-w-full max-h-[75vh] object-contain rounded-lg mx-auto"
            />
            {gallery[activeIndex].caption && (
              <p className="text-white text-center mt-4 text-sm">{gallery[activeIndex].caption}</p>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 sm:right-8 text-white/70 hover:text-white p-2 z-10"
            aria-label="Next">
            <ChevronRight size={36} />
          </button>
        </div>
      )}
    </section>
  );
}
