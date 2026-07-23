import { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { Users, TrendingUp, Award, ThumbsUp } from 'lucide-react';

function useCountUp(target, duration = 2000, started = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return count;
}

const stats = [
  { icon: Users, value: 1500, suffix: '+', label: 'Active Members', note: 'Across Techiman & surroundings', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: TrendingUp, value: 2, prefix: 'GHS ', suffix: 'M+', label: 'Loans Disbursed', note: 'In total loan portfolio', color: 'text-gold-dark', bg: 'bg-gold/15' },
  { icon: Award, value: 10, suffix: '+ Yrs', label: 'Years of Service', note: 'Serving Bono East since 2015', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: ThumbsUp, value: 95, suffix: '%', label: 'Member Satisfaction', note: 'Rated excellent by members', color: 'text-gold-dark', bg: 'bg-gold/15' },
];

function StatCard({ icon: Icon, value, prefix = '', suffix = '', label, note, color, bg, started }) {
  const count = useCountUp(value, 2000, started);

  return (
    <div className="text-center group">
      <div className={`w-16 h-16 ${bg} rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={28} className={color} />
      </div>
      <p className={`font-sans font-extrabold text-3xl lg:text-4xl xl:text-5xl ${color} mb-1`}>
        {prefix}{count.toLocaleString()}{suffix}
      </p>
      <p className="font-sans font-semibold text-dark text-base mb-1">{label}</p>
      <p className="text-sm text-gray-500">{note}</p>
    </div>
  );
}

export default function Impact() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });

  return (
    <section className="py-24 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="section-subheading">Our Track Record</p>
          <h2 className="section-heading">10 Years of Real Impact</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Numbers that reflect the trust Techiman's families and businesses have placed in us.
          </p>
        </div>

        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} started={inView} />
          ))}
        </div>

        {/* Decorative divider */}
        <div className="mt-20 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
          <div className="w-3 h-3 bg-gold rounded-full" />
          <div className="w-2 h-2 bg-primary rounded-full" />
          <div className="w-3 h-3 bg-gold rounded-full" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
        </div>
      </div>
    </section>
  );
}
