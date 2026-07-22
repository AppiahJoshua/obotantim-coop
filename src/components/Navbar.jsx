import { useState, useEffect, useRef } from 'react';
import { Menu, X, Bell } from 'lucide-react';

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
];

// ── Synthesized Web Audio Chime Helper ───────────────────────
const playNotificationChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.15); // B5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(329.63, now); // E4

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch (e) {
    // Browsers block audio until user interaction occurs
  }
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCountRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Background Notification Poller & Audio Trigger ──────────
  useEffect(() => {
    const pollNotifications = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/admin/notifications', { 
          credentials: 'include' 
        });
        if (!res.ok) return;
        
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.notifications || data.data || []);
        const currentUnread = list.filter(n => !n.is_read || n.is_read === 0).length;

        setUnreadCount(currentUnread);

        if (lastCountRef.current === null) {
          lastCountRef.current = currentUnread;
        } else if (currentUnread > lastCountRef.current) {
          playNotificationChime();
          lastCountRef.current = currentUnread;
        } else {
          lastCountRef.current = currentUnread;
        }
      } catch (err) {
        // Suppress errors silently
      }
    };

    pollNotifications();
    const interval = setInterval(pollNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleNav = (e, href) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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

          {/* CTA & Notification Badge */}
          <div className="hidden lg:flex items-center gap-3">
            {unreadCount > 0 && (
              <div className="relative flex items-center justify-center p-2 rounded-full bg-red-100 text-red-600 animate-pulse" title={`${unreadCount} unread notifications`}>
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              </div>
            )}
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