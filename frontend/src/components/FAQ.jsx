import { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'Who can become a member of Obotantim Cooperative?',
    a: 'Any adult resident of Techiman and the Bono East Region with a valid Ghana Card can apply for membership. Traders, drivers, students\' parents, business owners, and salaried workers are all welcome.',
  },
  {
    q: 'What documents do I need to register?',
    a: 'You will need your Ghana Card, a passport photo, proof of address, and — for loan applications — evidence of income or business activity (e.g. trading permit, payslip, or invoices).',
  },
  {
    q: 'How long does loan approval take?',
    a: 'Trade and personal loans for existing members are typically processed within 2–5 working days. New member applications may take slightly longer as we complete verification.',
  },
  {
    q: 'What interest rates do you charge?',
    a: 'Our rates vary by product, from competitive annual rates on savings accounts to monthly rates of 1.5%–2.5% on loans depending on the product and risk profile. Use our Loan Calculator above for an estimate.',
  },
  {
    q: 'Can I withdraw my susu savings before the cycle ends?',
    a: 'Susu products are designed for disciplined saving over a fixed cycle. Early withdrawal is possible in genuine emergencies, subject to approval and applicable terms — please speak with our staff.',
  },
  {
    q: 'Do you offer group loans for market associations?',
    a: 'Yes. Our Group Loans product supports solidarity groups of 5–20 members with shared accountability and lower individual rates. Contact us to set up a group application.',
  },
];

function FaqItem({ q, a, isOpen, onClick }) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group focus:outline-none">
        <span className={`font-sans font-medium text-base transition-colors ${isOpen ? 'text-primary' : 'text-dark group-hover:text-primary'}`}>
          {q}
        </span>
        <ChevronDown
          size={20}
          className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-gray-400'}`}
        />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <p className="text-gray-500 text-sm leading-relaxed pb-5 pr-8">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="py-24 bg-surface" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className={`text-center mb-12 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="section-subheading">Got Questions?</p>
          <h2 className="section-heading">Frequently Asked Questions</h2>
        </div>

        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 px-6 sm:px-8 transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {faqs.map((faq, i) => (
            <FaqItem
              key={i}
              {...faq}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Still have questions?{' '}
          <a href="#contact" className="text-primary font-semibold hover:underline">Reach out to our team</a>
        </p>
      </div>
    </section>
  );
}
