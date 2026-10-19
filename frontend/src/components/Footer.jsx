import { Facebook, Twitter, Instagram, Linkedin, MapPin, Phone, Mail } from 'lucide-react';

const quickLinks = [
  { label: 'About Us', href: '#about' },
  { label: 'Products & Services', href: '#services' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
];

const socials = [
  { icon: Facebook, href: '#' },
  { icon: Twitter, href: '#' },
  { icon: Instagram, href: '#' },
  { icon: Linkedin, href: '#' },
];

export default function Footer() {
  const handleNav = (e, href) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#063D21] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Logo & About */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <img src="/logo.png" alt="Obotantim Cooperative logo" className="w-12 h-12 rounded-full object-contain bg-white p-0.5" />
              <div>
                <p className="font-sans font-bold text-white">Obotantim Cooperative</p>
                <p className="text-xs text-white/50">Mutual Support & Social Services Society LTD</p>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed max-w-md mb-6">
              Empowering Techiman together — building stronger businesses, supporting
              education, and securing brighter futures for our members and their families.
            </p>
            <div className="flex gap-3">
              {socials.map(({ icon: Icon, href }, i) => (
                <a key={i} href={href}
                   className="w-9 h-9 rounded-full bg-white/10 hover:bg-gold hover:text-dark flex items-center justify-center transition-colors">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-sans font-semibold text-white mb-5">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} onClick={(e) => handleNav(e, href)}
                     className="text-white/60 hover:text-gold text-sm transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-sans font-semibold text-white mb-5">Contact Info</h4>
            <ul className="space-y-4 text-sm text-white/60">
              <li className="flex gap-3">
                <MapPin size={16} className="flex-shrink-0 mt-0.5 text-gold" />
                <span>P.O. Box TH 9, Techiman, Bono East Region, Ghana</span>
              </li>
              <li className="flex gap-3">
                <Phone size={16} className="flex-shrink-0 mt-0.5 text-gold" />
                <span>0241 303 318 / 0243 141 539</span>
              </li>
              <li className="flex gap-3">
                <Mail size={16} className="flex-shrink-0 mt-0.5 text-gold" />
                <span>obotanimcoop.1@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/50 text-xs text-center sm:text-left">
            © {new Date().getFullYear()} Obotantim Cooperative Mutual Support and Social Services Society LTD. All rights reserved.
          </p>
          <p className="text-white/40 text-xs text-center sm:text-right">
            Designed by{' '}
            <span className="text-gold font-medium">Joslynch Digital</span>
            {' '}· 0593 328 077 · joeappalu@gmail.com
          </p>
        </div>
      </div>
    </footer>
  );
}
