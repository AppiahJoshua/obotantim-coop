import { useQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { PiggyBank, Briefcase, Coins, Wallet, Banknote, Truck, GraduationCap, Users, ArrowRight } from 'lucide-react';
import api from '../api/axios';

const iconMap = {
  'piggy-bank': PiggyBank,
  'briefcase': Briefcase,
  'coins': Coins,
  'wallet': Wallet,
  'hand-coins': Banknote,
  'truck': Truck,
  'graduation-cap': GraduationCap,
  'users': Users,
};

const defaultSavings = [
  { id: 1, category: 'savings', title: 'Daakye Savings', description: 'Plan for your future with our long-term savings account. Competitive interest rates with flexible deposit options.', icon: 'piggy-bank', interest_rate: '12% p.a.' },
  { id: 2, category: 'savings', title: 'Daadaa Business', description: 'Purpose-built savings for traders and business owners. Manage working capital and earn while you save.', icon: 'briefcase', interest_rate: '10% p.a.' },
  { id: 3, category: 'savings', title: 'Mfaso & Normal Susu', description: 'Traditional susu reimagined — make daily or weekly contributions and access at cycle end.', icon: 'coins', interest_rate: 'Flexible' },
  { id: 4, category: 'savings', title: 'Nkakrankakra', description: 'Our micro-savings product for low-income members. Start with as little as GHS 5 per day.', icon: 'wallet', interest_rate: '8% p.a.' },
];

const defaultLoans = [
  { id: 5, category: 'loans', title: 'Trade & Personal Loans', description: 'Fast, accessible loans for traders and individuals with minimal documentation and quick approval.', icon: 'hand-coins', interest_rate: '2.5% p.m.' },
  { id: 6, category: 'loans', title: 'Pragia & Motor King Financing', description: 'Specialized financing for commercial vehicle operators — trotros, motor kings, and cargo trucks.', icon: 'truck', interest_rate: '2% p.m.' },
  { id: 7, category: 'loans', title: 'Education Loans', description: 'Cover tuition, boarding, and related expenses for your children\'s education at affordable rates.', icon: 'graduation-cap', interest_rate: '1.5% p.m.' },
  { id: 8, category: 'loans', title: 'Group Loans', description: 'Solidarity lending for groups of 5–20 members. Lower rates, shared accountability.', icon: 'users', interest_rate: '1.8% p.m.' },
];

function ProductCard({ product, scrollToRegister }) {
  const Icon = iconMap[product.icon] || Coins;
  const isSavings = product.category === 'savings';

  return (
    <div className="card p-6 flex flex-col group hover:border-primary/20 hover:-translate-y-1 transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300
        ${isSavings
          ? 'bg-primary/10 group-hover:bg-primary text-primary group-hover:text-white'
          : 'bg-gold/15 group-hover:bg-gold text-gold-dark group-hover:text-dark'
        }`}>
        <Icon size={22} />
      </div>

      {product.interest_rate && (
        <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full mb-3
          ${isSavings ? 'bg-primary/10 text-primary' : 'bg-gold/20 text-yellow-700'}`}>
          {product.interest_rate}
        </span>
      )}

      <h3 className="font-sans font-semibold text-dark text-base mb-2">{product.title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed flex-1 mb-5">{product.description}</p>

      <button
        onClick={scrollToRegister}
        className={`flex items-center gap-2 text-sm font-semibold transition-colors
          ${isSavings ? 'text-primary hover:text-primary-600' : 'text-yellow-700 hover:text-yellow-800'}`}>
        Apply / Register
        <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}

export default function Products() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then(r => r.data),
    placeholderData: [...defaultSavings, ...defaultLoans],
  });

  const scrollToRegister = () => {
    document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' });
  };

  const savings = products?.filter(p => p.category === 'savings') || defaultSavings;
  const loans = products?.filter(p => p.category === 'loans') || defaultLoans;

  return (
    <section id="services" className="py-24 bg-surface" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="section-subheading">What We Offer</p>
          <h2 className="section-heading mb-4">Products & Services</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Savings accounts and loan products designed specifically for the
            realities of Ghanaian households and businesses.
          </p>
        </div>

        {/* Savings */}
        <div className={`mb-14 transition-all duration-700 delay-100 ${inView ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
              <PiggyBank size={16} /> Savings Accounts
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {savings.map((p, i) => (
              <div key={p.id}
                   className={`transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                   style={{ transitionDelay: `${i * 80}ms` }}>
                <ProductCard product={p} scrollToRegister={scrollToRegister} />
              </div>
            ))}
          </div>
        </div>

        {/* Loans */}
        <div className={`transition-all duration-700 delay-200 ${inView ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="flex items-center gap-2 bg-gold/15 text-yellow-700 text-sm font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
              <Banknote size={16} /> Loan Services
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {loans.map((p, i) => (
              <div key={p.id}
                   className={`transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                   style={{ transitionDelay: `${i * 80 + 200}ms` }}>
                <ProductCard product={p} scrollToRegister={scrollToRegister} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
