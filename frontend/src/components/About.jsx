import { useInView } from 'react-intersection-observer';
import { Shield, Target, Users, Heart } from 'lucide-react';

const values = [
  { icon: Shield, title: 'Integrity', text: 'Every transaction, every decision — conducted with complete transparency and honesty.' },
  { icon: Users, title: 'Community', text: 'We exist to uplift every member, family, and business in the Techiman community.' },
  { icon: Target, title: 'Excellence', text: 'Delivering financial services that meet the highest standards of quality and care.' },
  { icon: Heart, title: 'Compassion', text: 'Understanding the real needs behind every application, and responding with empathy.' },
];

export default function About() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

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
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80"
                alt="Cooperative members meeting"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-primary/10" />
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
