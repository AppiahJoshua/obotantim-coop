import { useState, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { Calculator, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';

export default function LoanCalculator() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [amount, setAmount] = useState(5000);
  const [rate, setRate] = useState(2.5);
  const [months, setMonths] = useState(12);

  const calc = useMemo(() => {
    const monthlyRate = rate / 100;
    if (monthlyRate === 0) {
      return {
        monthly: amount / months,
        totalInterest: 0,
        totalRepayment: amount,
      };
    }
    const monthly = (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
                    (Math.pow(1 + monthlyRate, months) - 1);
    const totalRepayment = monthly * months;
    const totalInterest = totalRepayment - amount;
    return { monthly, totalInterest, totalRepayment };
  }, [amount, rate, months]);

  const fmt = (v) => `GHS ${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <section id="calculator" className="py-24 bg-surface" ref={ref}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className={`text-center mb-12 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="section-subheading">Plan Your Loan</p>
          <h2 className="section-heading">Loan Calculator</h2>
          <p className="text-gray-500 mt-4">
            Estimate your monthly repayments before you apply.
          </p>
        </div>

        <div className={`bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid lg:grid-cols-2">

            {/* Inputs */}
            <div className="p-8 lg:p-10">
              <h3 className="font-sans font-semibold text-dark text-lg mb-8 flex items-center gap-2">
                <Calculator size={20} className="text-primary" />
                Enter Loan Details
              </h3>

              <div className="space-y-7">
                {/* Loan Amount */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="form-label mb-0">Loan Amount</label>
                    <span className="font-sans font-bold text-primary text-sm">GHS {amount.toLocaleString()}</span>
                  </div>
                  <input
                    type="range" min={500} max={100000} step={500}
                    value={amount} onChange={(e) => setAmount(+e.target.value)}
                    className="w-full accent-primary h-2 rounded-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>GHS 500</span><span>GHS 100,000</span>
                  </div>
                </div>

                {/* Interest Rate */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="form-label mb-0">Monthly Interest Rate</label>
                    <span className="font-sans font-bold text-primary text-sm">{rate}% p.m.</span>
                  </div>
                  <input
                    type="range" min={1} max={5} step={0.5}
                    value={rate} onChange={(e) => setRate(+e.target.value)}
                    className="w-full accent-primary h-2 rounded-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1% p.m.</span><span>5% p.m.</span>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="form-label mb-0">Loan Duration</label>
                    <span className="font-sans font-bold text-primary text-sm">{months} months</span>
                  </div>
                  <input
                    type="range" min={1} max={36} step={1}
                    value={months} onChange={(e) => setMonths(+e.target.value)}
                    className="w-full accent-primary h-2 rounded-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1 month</span><span>36 months</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-primary p-8 lg:p-10 text-white">
              <h3 className="font-sans font-semibold text-lg mb-8 flex items-center gap-2 opacity-90">
                <TrendingUp size={20} />
                Repayment Summary
              </h3>

              <div className="space-y-5">
                <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm">
                  <p className="text-white/70 text-sm mb-1">Monthly Repayment</p>
                  <p className="font-sans font-extrabold text-3xl text-gold">{fmt(calc.monthly)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-2xl p-4">
                    <p className="text-white/70 text-xs mb-1">Total Interest</p>
                    <p className="font-sans font-bold text-lg">{fmt(calc.totalInterest)}</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4">
                    <p className="text-white/70 text-xs mb-1">Total Repayment</p>
                    <p className="font-sans font-bold text-lg">{fmt(calc.totalRepayment)}</p>
                  </div>
                </div>

                {/* Visual bar */}
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex justify-between text-xs text-white/60 mb-2">
                    <span>Principal</span>
                    <span>Interest</span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full transition-all duration-500"
                      style={{ width: `${(amount / calc.totalRepayment) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-gold font-medium">{((amount / calc.totalRepayment) * 100).toFixed(0)}% principal</span>
                    <span className="text-white/60">{(100 - (amount / calc.totalRepayment) * 100).toFixed(0)}% interest</span>
                  </div>
                </div>

                <button
                  onClick={() => document.querySelector('#register')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full btn-gold justify-center mt-4">
                  Apply for This Loan
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          * This calculator provides estimates only. Actual rates may vary. Contact us for a personalized assessment.
        </p>
      </div>
    </section>
  );
}
