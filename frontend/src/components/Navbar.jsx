import { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollFrame = useRef(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), []);

  const handleNav = (e, href) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (!el) return;

    cancelAnimationFrame(scrollFrame.current);
    const headerOffset = href === '#home' ? 0 : window.innerWidth >= 1024 ? 80 : 64;
    const target = Math.max(0, Math.min(
      el.getBoundingClientRect().top + window.scrollY - headerOffset,
      document.documentElement.scrollHeight - window.innerHeight
    ));
    const start = window.scrollY;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(target - start) < 1) {
      window.scrollTo({ top: target, behavior: 'instant' });
      return;
    }

    let startedAt;
    const duration = 360;
    const animateScroll = (timestamp) => {
      startedAt ??= timestamp;
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const eased = progress < 0.5
        ? 4 * progress ** 3
        : 1 - ((-2 * progress + 2) ** 3) / 2;

      window.scrollTo({ top: start + (target - start) * eased, behavior: 'instant' });
      if (progress < 1) scrollFrame.current = requestAnimationFrame(animateScroll);
    };

    scrollFrame.current = requestAnimationFrame(animateScroll);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-md' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">

          {/* Logo */}
          <a href="#home" onClick={(e) => handleNav(e, '#home')}
             className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Obotantim Cooperative logo"
              className={`w-11 h-11 lg:w-12 lg:h-12 rounded-full object-contain transition-shadow duration-300
                ${scrolled ? 'shadow-sm' : 'drop-shadow-lg'}`}
            />
            <div className="hidden sm:block">
              <p className={`font-sans font-bold text-sm leading-tight ${scrolled ? 'text-primary' : 'text-white'}`}>
                Obotantim Cooperative
              </p>
              <p className={`text-xs leading-tight ${scrolled ? 'text-gray-500' : 'text-white/70'}`}>
                Mutual Support Society
              </p>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ label, href }) => (
              <a key={label} href={href}
                 onClick={(e) => handleNav(e, href)}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                   ${scrolled
                     ? 'text-gray-700 hover:text-primary hover:bg-primary-50'
                     : 'text-white/90 hover:text-white hover:bg-white/10'
                   }`}>
                {label}
              </a>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden lg:flex items-center gap-3">
            <a href="#register"
               onClick={(e) => handleNav(e, '#register')}
               className="btn-gold text-sm px-5 py-2.5 shadow-lg shadow-gold/30">
              Join Us
            </a>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
                  className={`lg:hidden p-2 rounded-lg ${scrolled ? 'text-dark' : 'text-white'}`}
                  aria-label="Toggle menu">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-xl">
          <nav className="flex flex-col py-4 px-4 gap-1">
            {navLinks.map(({ label, href }) => (
              <a key={label} href={href}
                 onClick={(e) => handleNav(e, href)}
                 className="px-4 py-3 rounded-lg text-gray-700 hover:text-primary hover:bg-primary-50 font-medium text-sm transition-colors">
                {label}
              </a>
            ))}
            <a href="#register"
               onClick={(e) => handleNav(e, '#register')}
               className="btn-gold mt-3 justify-center">
              Join Us
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
