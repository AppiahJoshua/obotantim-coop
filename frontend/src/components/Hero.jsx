import { ArrowRight, FileText } from 'lucide-react';

export default function Hero() {
  const scrollTo = (id) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1521790361441-96bbb2b26f89?w=1600&q=80"
          alt="Techiman market community"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Green overlay */}
      <div className="absolute inset-0 z-10 bg-primary/85" />

      {/* Kente pattern texture overlay */}
      <div className="absolute inset-0 z-10 kente-pattern" />

      {/* Content */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">

        {/* Eyebrow label */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full
                        px-4 py-2 mb-8 backdrop-blur-sm animate-fade-up">
          <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
          <span className="text-white/90 text-sm font-medium">
            Techiman, Bono East Region · Est. 2015
          </span>
        </div>

        {/* Main headline */}
        <h1 className="font-sans font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl
                       text-white leading-tight mb-6 animate-fade-up animation-delay-100">
          Empowering
          <span className="text-gold block sm:inline"> Techiman</span>
          <span className="block">Together</span>
        </h1>

        {/* Subtitle */}
        <p className="text-white/80 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed
                      animate-fade-up animation-delay-200">
          Building stronger businesses, supporting education, and securing
          brighter futures for families across the Bono East Region.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up animation-delay-300">
          <button
            onClick={() => scrollTo('#register')}
            className="btn-gold text-base px-8 py-4 shadow-2xl shadow-gold/40 hover:scale-105 transition-transform">
            Join Us Today
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => scrollTo('#register')}
            className="btn-outline text-base px-8 py-4 hover:scale-105 transition-transform">
            <FileText size={18} />
            Apply for Service
          </button>
        </div>

        {/* Quick stats strip */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/20 rounded-2xl overflow-hidden
                        border border-white/20 backdrop-blur-sm animate-fade-up animation-delay-400">
          {[
            { value: '1,500+', label: 'Active Members' },
            { value: 'GHS 2M+', label: 'Loans Disbursed' },
            { value: '10+ Yrs', label: 'Experience' },
            { value: '95%', label: 'Satisfaction' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white/5 hover:bg-white/10 transition-colors px-4 py-5">
              <p className="font-sans font-bold text-xl sm:text-2xl text-gold">{value}</p>
              <p className="text-white/70 text-xs sm:text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => scrollTo('#about')}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20
                   flex flex-col items-center gap-2 text-white/60 hover:text-white
                   transition-colors animate-bounce">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-2.5 bg-white/60 rounded-full animate-pulse" />
        </div>
      </button>
    </section>
  );
}
