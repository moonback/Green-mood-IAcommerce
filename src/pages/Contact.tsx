import { motion, useMotionValue, useSpring } from "motion/react";
import { MapPin, Phone, Clock, Mail, MessageCircle, Send, Sparkles, Globe, ShieldCheck } from "lucide-react";
import { useSettingsStore } from "../store/settingsStore";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import SEO from "../components/SEO";

export default function Contact() {
  const { settings } = useSettingsStore();

  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "mainEntity": {
      "@type": "LocalBusiness",
      "name": settings.store_name,
      "telephone": settings.store_phone,
      "email": settings.store_email || "contact@greenmoon.fr",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": settings.store_address.split(',')[0],
        "addressLocality": settings.store_address.split(',')[1]?.trim() ?? "Paris",
        "postalCode": settings.store_address.match(/\d{5}/)?.[0] ?? "75000",
        "addressCountry": "FR"
      }
    }
  };

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pb-32">
      <SEO
        title={`Centre d'Innovation & Contact — ${settings.store_name}`}
        description={`Une question ? Besoin d'un diagnostic tech ? Contactez l'expertise ${settings.store_name} ou rendez-vous dans notre showroom connecté.`}
        keywords={`contact high-tech, innovation ${settings.store_name}, adresse showroom Paris, support technique NeuroCart, produits innovants`}
        schema={contactSchema}
      />

      {/* Hero Header */}
      <section className="relative min-h-[70vh] flex items-center justify-center pt-32 pb-20 overflow-hidden">
        {/* Grain texture */}
        <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* Background Layer with Lifestyle Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={settings.contact_bg_url || '/images/lifestyle-relax.png'}
            alt="High-Tech Showroom"
            className="w-full h-full object-cover opacity-20 filter grayscale blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--color-bg)]/20 via-[color:var(--color-bg)]/60 to-[color:var(--color-bg)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--color-bg)] via-transparent to-[color:var(--color-bg)] opacity-40" />
        </div>

        {/* Mouse-follow glow */}
        <motion.div
          style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
          className="absolute z-0 w-[600px] h-[600px] bg-[color:var(--color-primary)]/10 rounded-full blur-[140px] pointer-events-none opacity-20 mix-blend-screen"
        />

        <div className="relative z-20 max-w-7xl mx-auto px-5 w-full flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full space-y-8"
          >
            {/* Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 py-2 px-5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] text-[color:var(--color-primary)] text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-sm">
                <Sparkles className="w-4 h-4" />
                Support Innovation
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-serif font-bold tracking-tighter leading-none uppercase">
              ENTRONS EN <br />
              <span className="text-[color:var(--color-primary)] italic glow-green">
                RÉSONANCE.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[color:var(--color-text-muted)] text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto font-light leading-relaxed">
              Que vous cherchiez la prochaine révolution tech ou un conseil expert,
              notre équipe est à votre entière disposition pour un accompagnement sur-mesure.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Contact Methods (Left) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="grid grid-cols-1 gap-4">
              {/* Location Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-elevated)]/85 transition-all group"
              >
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-primary)]/10 flex items-center justify-center group-hover:bg-[color:var(--color-primary)]/20 transition-colors">
                    <MapPin className="w-7 h-7 text-[color:var(--color-primary)]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[color:var(--color-text-subtle)]">Showroom Paris</h3>
                    <p className="text-lg font-bold text-[color:var(--color-text)] leading-snug">
                      {settings.store_address.split(',')[0]}<br />
                      {settings.store_address.split(',').slice(1).join(',').trim()}
                    </p>
                    <button className="text-xs text-[color:var(--color-primary)] font-black uppercase tracking-widest pt-2 hover:underline">
                      Itinéraire Connecté
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Communication Methods */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-elevated)]/85 transition-all flex flex-col items-center text-center space-y-4"
                >
                  <Phone className="w-6 h-6 text-[color:var(--color-primary)]" />
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)]">Ligne Directe</h4>
                    <p className="font-bold text-[color:var(--color-text)] text-sm">{settings.store_phone}</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  viewport={{ once: true }}
                  className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-elevated)]/85 transition-all flex flex-col items-center text-center space-y-4"
                >
                  <Mail className="w-6 h-6 text-[color:var(--color-primary)]" />
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)]">Expertise Mail</h4>
                    <p className="font-bold text-[color:var(--color-text)] text-sm uppercase">{settings.store_email || "contact@neurocart.tech"}</p>
                  </div>
                </motion.div>
              </div>

              {/* Hours Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] space-y-6"
              >
                <div className="flex items-center gap-4">
                  <Clock className="w-5 h-5 text-[color:var(--color-primary)]" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-[color:var(--color-text-subtle)]">Ouverture Hub</h4>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[color:var(--color-text-muted)] font-medium">Lundi — Samedi</span>
                    <span className="font-bold text-[color:var(--color-text)]">{settings.store_hours.split(' ').slice(1).join(' ')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm opacity-50">
                    <span className="text-[color:var(--color-text-subtle)] font-medium">Dimanche</span>
                    <span className="font-bold uppercase">Mode Veille / Fermé</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Contact Form (Right) */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[color:var(--color-card)]/80 backdrop-blur-3xl border border-[color:var(--color-border)] rounded-[3rem] p-10 lg:p-16 space-y-10"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-serif font-black uppercase tracking-tighter">Laissez un <br /><span className="text-[color:var(--color-primary)] italic">Message.</span></h2>
                <p className="text-[color:var(--color-text-subtle)] text-sm font-light uppercase tracking-widest">Réponse sous 24h par un spécialiste tech.</p>
              </div>

              <form className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] ml-4">Votre Identité</label>
                    <input
                      type="text"
                      placeholder="Nom complet"
                      className="w-full bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-2xl px-6 py-4 text-[color:var(--color-text)] placeholder-zinc-700 focus:outline-none focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] ml-4">Courriel Personnel</label>
                    <input
                      type="email"
                      placeholder="votre@email.fr"
                      className="w-full bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-2xl px-6 py-4 text-[color:var(--color-text)] placeholder-zinc-700 focus:outline-none focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] ml-4">Objet de la Demande</label>
                  <select className="w-full bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-2xl px-6 py-4 text-[color:var(--color-text-muted)] focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer font-medium">
                    <option>Diagnostic Innovation</option>
                    <option>Question Technique</option>
                    <option>Suivi de Commande</option>
                    <option>Partenariat Tech</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] ml-4">Votre Message</label>
                  <textarea
                    rows={5}
                    placeholder="Comment pouvons-nous optimiser votre projet ?"
                    className="w-full bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-3xl px-6 py-6 text-[color:var(--color-text)] placeholder-zinc-700 focus:outline-none focus:border-emerald-500 transition-all resize-none font-medium"
                  ></textarea>
                </div>

                <button className="w-full bg-[color:var(--color-surface)] text-[color:var(--color-primary-contrast)] font-black uppercase tracking-widest py-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-[color:var(--color-primary)] transition-all group overflow-hidden relative">
                  <span className="relative z-10 flex items-center gap-2">
                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    Transmettre aux Experts
                  </span>
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Decorative Brand Bar */}
      <section className="mt-32 border-y border-[color:var(--color-border)] py-12 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-8 opacity-30 grayscale">
          <div className="flex items-center gap-3 font-serif font-black italic text-2xl uppercase">
            <Globe className="w-6 h-6" /> {settings.store_name}
          </div>
          <div className="flex items-center gap-3 font-serif font-black italic text-2xl uppercase">
            <Sparkles className="w-6 h-6" /> Next-Gen Technology
          </div>
          <div className="flex items-center gap-3 font-serif font-black italic text-2xl uppercase">
            <ShieldCheck className="w-6 h-6" /> Supreme Quality
          </div>
        </div>
      </section>
    </div>
  );
}
