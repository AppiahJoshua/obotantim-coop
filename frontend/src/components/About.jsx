import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { ChevronLeft, ChevronRight, Pause, Play, Shield, Target, Users, Heart } from 'lucide-react';

const aboutImages = [
  { src: '/images/about/cooperative-members.webp', alt: 'Obotantim Cooperative members gathered for a meeting' },
  { src: '/images/about/market-shopkeeper.webp', alt: 'A smiling shopkeeper at her colorful market stall' },
  { src: '/images/about/market-vendor.webp', alt: 'A Ghanaian market vendor surrounded by fresh produce' },
  { src: '/images/about/susu-collector.webp', alt: 'A SUSU collector serving a cooperative member' },
  { src: '/images/about/community-member.webp', alt: 'Obotantim board members meeting with a cooperative member' },
];

const values = [
  { icon: Shield, title: 'Integrity', text: 'Every transaction, every decision — conducted with complete transparency and honesty.' },
  { icon: Users, title: 'Community', text: 'We exist to uplift every member, family, and business in the Techiman community.' },
  { icon: Target, title: 'Excellence', text: 'Delivering financial services that meet the highest standards of quality and care.' },
  { icon: Heart, title: 'Compassion', text: 'Understanding the real needs behind every application, and responding with empathy.' },
];

export default function About() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [activeImage, setActiveImage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (!isPlaying || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const interval = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % aboutImages.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [isPlaying]);

  return (
    <section id="about" className="py-24 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="section-subheading">Who We Are</p>
          <h2 className="section-heading max-w-2xl mx-auto">
            A Cooperative Built on Trust, Community & Growth
          </h2>
        </div>

        {/* Split layout */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">

          {/* Image side */}
          <div className={`relative transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div
              className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl"
              role="region"
              aria-label="Obotantim Cooperative photos"
              aria-roledescription="carousel"
            >
              {aboutImages.map((image, index) => (
                <img
                  key={image.src}
                  src={image.src}
                  alt={activeImage === index ? image.alt : ''}
                  aria-hidden={activeImage !== index}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${
                    activeImage === index ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 rounded-full bg-primary/90 p-1.5 shadow-lg backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setActiveImage((current) => (current - 1 + aboutImages.length) % aboutImages.length)}
                  aria-label="Show previous photo"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  <ChevronLeft size={18} />
                </button>
                {aboutImages.map((image, index) => (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show photo ${index + 1}`}
                    aria-pressed={activeImage === index}
                    className={`h-2 w-2 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                      activeImage === index ? 'bg-gold' : 'bg-white/60 hover:bg-white'
                    }`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setIsPlaying((playing) => !playing)}
                  aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImage((current) => (current + 1) % aboutImages.length)}
                  aria-label="Show next photo"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-6 -right-6 bg-primary rounded-2xl p-6 text-white shadow-xl">
              <p className="font-sans font-bold text-3xl">10+</p>
              <p className="text-sm text-white/80">Years Serving</p>
              <p className="text-sm text-white/80">Techiman</p>
            </div>
            {/* Gold accent block */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-gold/20 rounded-2xl -z-10" />
          </div>

          {/* Text side */}
          <div className={`transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <p className="section-subheading">Our Story</p>
            <h3 className="font-sans font-bold text-2xl lg:text-3xl text-dark mb-6">
              Obotantim Cooperative Mutual Support and Social Services Society LTD
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Founded in Techiman, the commercial heart of Ghana's Bono East Region,
              Obotantim Cooperative was established with a single purpose: to provide
              accessible, affordable financial services to ordinary Ghanaians who deserve better.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              From market women and commercial drivers to students and growing businesses,
              we have supported over 1,500 active members with savings products, loans,
              and social support services — all rooted in the cooperative spirit of mutual uplift.
            </p>

            {/* Mission / Vision */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-5">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mb-3">
                  <Target size={16} className="text-white" />
                </div>
                <h4 className="font-sans font-semibold text-dark mb-2">Our Mission</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  To empower members through inclusive financial services that foster
                  economic independence and community development.
                </p>
              </div>
              <div className="bg-gold/5 border border-gold/20 rounded-xl p-5">
                <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center mb-3">
                  <Shield size={16} className="text-dark" />
                </div>
                <h4 className="font-sans font-semibold text-dark mb-2">Our Vision</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  To be the most trusted cooperative financial institution in the
                  Bono East Region and beyond.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div>
          <p className="text-center section-subheading mb-2">Our Foundation</p>
          <h3 className="text-center font-sans font-bold text-2xl text-dark mb-10">Core Values</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, title, text }, i) => (
              <div key={title}
                   className={`card p-6 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                   style={{ transitionDelay: `${i * 100 + 300}ms` }}>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={22} className="text-primary" />
                </div>
                <h4 className="font-sans font-semibold text-dark mb-2">{title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
