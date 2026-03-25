import { Link } from "react-router-dom";
import {
  MapPin,
  Phone,
  Instagram,
  Facebook,
  Twitter,
  Music2,
  Mail,
  Send,
  ShieldCheck,
  Truck,
  Headphones,
  Award,
  CreditCard,
  Lock
} from "lucide-react";
import { useState } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import { useTheme } from "../ThemeProvider";
import { motion } from "motion/react";

export default function Footer() {
  const { resolvedTheme } = useTheme();
  const settings = useSettingsStore((s) => s.settings);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const logoUrl = resolvedTheme === 'dark'
    ? (settings.store_logo_dark_url || settings.store_logo_url || '/logo.png')
    : (settings.store_logo_url || '/logo.png');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
    setEmail("");
  };

  const navLinks = [
    { name: "Accueil", path: "/" },
    { name: "La Boutique", path: "/boutique" },
    { name: "Catalogue", path: "/catalogue" },
    { name: "Guides & Config", path: "/guides" },
    { name: "Nos Produits", path: "/produits" },
    { name: "Contact", path: "/contact" },
  ];

  const infoLinks = [
    { name: "À Propos", path: "/a-propos" },
    { name: "FAQ", path: "/faq" },
    { name: "Livraison", path: "/livraison" },
    { name: "Garanties & Conformité", path: "/conformite" },
    { name: "CGV", path: "/cgv" },
    { name: "Mentions Légales", path: "/mentions-legales" },
  ];

  return (
    <footer className="relative border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)] pt-20 pb-10 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[color:var(--color-primary)]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[color:var(--color-secondary)]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-screen-xl mx-auto px-6 lg:px-8 relative z-10">

        {/* Top: Trust Signals Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20 pb-12 border-b border-[color:var(--color-border)]">
          {[
            { icon: <ShieldCheck className="w-6 h-6" />, title: "Paiement Sécurisé", desc: "Transactions 100% protégées" },
            { icon: <Truck className="w-6 h-6" />, title: "Livraison Express", desc: "Suivi en temps réel" },
            { icon: <Headphones className="w-6 h-6" />, title: "Support Expert", desc: "Conseils tech 24/7" },
            { icon: <Award className="w-6 h-6" />, title: "Garantie Premium", desc: "2 ans minimum constructeur" },
          ].map((signal, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col items-center text-center space-y-3 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-primary)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[var(--shadow-glow)] group-hover:bg-[color:var(--color-primary)]/10">
                {signal.icon}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[color:var(--color-text)]">{signal.title}</h4>
                <p className="text-xs text-[color:var(--color-text-subtle)]">{signal.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">

          {/* Column 1: Brand & Social */}
          <div className="md:col-span-4 space-y-8">
            <Link to="/" className="inline-block group" aria-label={`${settings.store_name} Accueil`}>
              <img
                src={logoUrl}
                alt={settings.store_name}
                className="h-10 w-auto object-contain transition-all duration-500 group-hover:glow-logo"
              />
            </Link>
            <p className="text-[color:var(--color-text-muted)] text-sm leading-relaxed max-w-sm">
              {settings.store_description || `Votre destination high-tech de référence à ${settings.store_city}. Expertise, innovation et service premium pour les passionnés de technologie.`}
            </p>
            <div className="flex gap-4">
              {[
                { icon: <Instagram className="w-5 h-5" />, href: settings.social_instagram, label: "Instagram" },
                { icon: <Facebook className="w-5 h-5" />, href: settings.social_facebook, label: "Facebook" },
                { icon: <Twitter className="w-5 h-5" />, href: settings.social_twitter, label: "Twitter" },
                { icon: <Music2 className="w-5 h-5" />, href: settings.social_tiktok, label: "TikTok" },
              ].map((social, idx) => social.href && (
                <a
                  key={idx}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)] transition-all"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[color:var(--color-text)]">Boutique</h3>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] transition-all flex items-center group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[color:var(--color-primary)] mr-0 opacity-0 group-hover:mr-2 group-hover:opacity-100 transition-all" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Info */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[color:var(--color-text)]">Informations</h3>
            <ul className="space-y-3">
              {infoLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] transition-all flex items-center group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[color:var(--color-primary)] mr-0 opacity-0 group-hover:mr-2 group-hover:opacity-100 transition-all" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div className="md:col-span-4 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[color:var(--color-text)]">Rejoindre la communauté</h3>
            <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed">
              Recevez nos offres exclusives et dernières innovations directement dans votre boîte mail.
            </p>
            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/25"
              >
                <CreditCard className="w-4 h-4 text-[color:var(--color-primary)] shrink-0" />
                <p className="text-sm font-semibold text-[color:var(--color-primary)]">
                  Merci ! Vous êtes maintenant inscrit(e).
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="relative group">
                <div className="absolute inset-0 bg-[color:var(--color-primary)]/8 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-text-subtle)]" />
                    <input
                      type="email"
                      placeholder="Votre email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-1 focus:ring-[color:var(--color-primary)]/30 transition-all placeholder:text-[color:var(--color-text-subtle)]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-3 bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">S'inscrire</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Contact Info Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-t border-[color:var(--color-border)] text-sm text-[color:var(--color-text-muted)]">
          <div className="flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-full bg-[color:var(--color-bg-elevated)] flex items-center justify-center text-[color:var(--color-primary)] group-hover:scale-110 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-[color:var(--color-text)]">Siège Social</p>
              <p>{settings.store_address}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-full bg-[color:var(--color-bg-elevated)] flex items-center justify-center text-[color:var(--color-primary)] group-hover:scale-110 transition-transform">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-[color:var(--color-text)]">Téléphone</p>
              <p>{settings.store_phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-full bg-[color:var(--color-bg-elevated)] flex items-center justify-center text-[color:var(--color-primary)] group-hover:scale-110 transition-transform">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-[color:var(--color-text)]">Email Support</p>
              <p>contact@{settings.store_name?.toLowerCase().replace(/\s+/g, '') || 'neurocart'}.fr</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Payments */}
        <div className="mt-12 pt-8 border-t border-[color:var(--color-border)] flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2 text-center md:text-left">
            <p className="text-xs text-[color:var(--color-text-subtle)]">
              &copy; {new Date().getFullYear()} {settings.store_name}. Tous droits réservés.
            </p>
            <div className="flex items-center gap-2 justify-center md:justify-start text-xs text-[color:var(--color-text-subtle)]">
              <Lock className="w-3 h-3 text-[color:var(--color-primary)]" />
              Navigation 256-bit SSL sécurisée
            </div>
          </div>

          {/* Payment Icons */}
          <div className="flex items-center gap-4 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <div className="px-2 py-1 border border-[color:var(--color-border)] rounded-md text-[9px] font-black tracking-tighter text-[color:var(--color-text)] bg-[color:var(--color-bg-elevated)]">VISA</div>
            <div className="px-2 py-1 border border-[color:var(--color-border)] rounded-md text-[9px] font-black tracking-tighter text-[color:var(--color-text)] bg-[color:var(--color-bg-elevated)]">MASTERCARD</div>
            <div className="px-2 py-1 border border-[color:var(--color-border)] rounded-md text-[9px] font-black tracking-tighter text-[color:var(--color-text)] bg-[color:var(--color-bg-elevated)]">AMEX</div>
            <div className="px-2 py-1 border border-[color:var(--color-border)] rounded-md text-[9px] font-black tracking-tighter text-[color:var(--color-text)] bg-[color:var(--color-bg-elevated)]">PAYPAL</div>
            <div className="px-2 py-1 border border-[color:var(--color-border)] rounded-md text-[9px] font-black tracking-tighter text-[color:var(--color-text)] bg-[color:var(--color-bg-elevated)]">APPLE PAY</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
