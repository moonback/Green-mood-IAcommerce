import { motion, useMotionValue, useSpring, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import {
  MapPin,
  Clock,
  ShieldCheck,
  Users,
  Sparkles,
  Award,
  CalendarCheck,
  ArrowRightCircle,
  PlayCircle,
  Wrench,
  Star,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { useSettingsStore } from "../store/settingsStore";

const VALUES = [
  {
    icon: <ShieldCheck size={32} />,
    count: "01",
    title: "Fiabilité",
    desc: "Chaque machine est certifiée CE avant livraison. Nos constructeurs partenaires répondent aux normes les plus strictes.",
  },
  {
    icon: <Award size={32} />,
    count: "02",
    title: "Expertise",
    desc: "20 ans d'expérience en importation directe. Nous connaissons chaque constructeur, chaque référence, chaque pièce.",
  },
  {
    icon: <Users size={32} />,
    count: "03",
    title: "Accompagnement",
    desc: "Nos experts vous conseillent de A à Z : choix, livraison, installation, maintenance et pièces détachées.",
  },
  {
    icon: <Wrench size={32} />,
    count: "04",
    title: "SAV France",
    desc: "Service après-vente réactif avec techniciens certifiés. Interventions rapides partout en France métropolitaine.",
  },
];

const SHOP_STATS = [
  { value: "+15 000", label: "Clients satisfaits", icon: Users },
  { value: "4.9 / 5", label: "Note moyenne", icon: Star },
  { value: "500+", label: "Références catalogue", icon: Award },
  { value: "0", label: "Intermédiaire — importateur direct", icon: Truck },
];

export default function Shop() {
  const containerRef = useRef(null);
  const { settings } = useSettingsStore();
  const storeName = settings.store_name || 'Green Mood';
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

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

  const shopSchema = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": storeName,
    "description": `Un espace de démonstration pensé pour découvrir, tester et choisir le meilleur de la technologie innovante.`,
    "image": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop"
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] selection:bg-[color:var(--color-primary)] selection:text-[color:var(--color-primary-contrast)]">
      <SEO
        title={`L'ADN ${storeName} — Excellence & Innovation`}
        description={`Découvrez l'univers ${storeName}. Notre engagement pour la qualité, notre sélection de produits innovants et notre vision d'un futur connecté.`}
        keywords={`showroom Paris, produits innovants France, gadgets tech, domotique, wearables`}
        schema={shopSchema}
      />

      {/* LUXURY HERO SECTION */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          <motion.img
            style={{
              scale: useTransform(scrollYProgress, [0, 0.4], [1, 1.2]),
              opacity: useTransform(scrollYProgress, [0, 0.3], [1, 0.4])
            }}
            src="/images/hero-bg-shop.png"
            alt={`Showroom ${storeName}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--color-bg)]/40 via-[color:var(--color-bg)]/80 to-[color:var(--color-bg)]" />
        </div>

        {/* Grain texture */}
        <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* Mouse-follow glow */}
        <motion.div
          style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
          className="absolute z-10 w-[800px] h-[800px] bg-[color:var(--color-primary)]/10 rounded-full blur-[140px] pointer-events-none opacity-20 mix-blend-screen"
        />

        {/* Ambient glows */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <motion.div
            animate={{ y: [0, -20, 0], opacity: [0.05, 0.12, 0.05] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-72 h-72 bg-[color:var(--color-primary)]/10 rounded-full blur-[120px]"
          />
        </div>

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
                <Sparkles size={14} className="animate-pulse" />
                Manifeste de l'innovation
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-serif font-bold tracking-tighter leading-none text-[color:var(--color-text)] uppercase">
              LE FUTUR <br />
              <span className="italic bg-gradient-to-r from-[color:var(--color-primary)] via-indigo-400 to-[color:var(--color-primary)] bg-clip-text text-transparent">
                ACCESSIBLE.
              </span>
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-[color:var(--color-text-muted)] text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto font-light leading-relaxed tracking-wide"
            >
              Plongez dans un univers où chaque objet est pensé pour sublimer votre quotidien.{' '}
              Bienvenue dans la signature <span className="text-[color:var(--color-text)] font-medium italic">{storeName}</span>.
            </motion.p>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-30 z-20"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] rotate-90 mb-4">Défiler</span>
          <div className="w-px h-12 bg-gradient-to-b from-[color:var(--color-primary)] to-transparent" />
        </motion.div>
      </section>

      {/* STATS BAR */}
      <div className="relative z-10 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/90 backdrop-blur-md">
        <div className="mx-auto max-w-screen-2xl px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[color:var(--color-border)]">
            {SHOP_STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex flex-col sm:flex-row items-center gap-3 py-5 px-6 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[color:var(--color-primary)]/10 flex items-center justify-center flex-none group-hover:bg-[color:var(--color-primary)]/20 transition-colors">
                    <Icon size={16} className="text-[color:var(--color-primary)]" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-lg font-black text-[color:var(--color-text)] leading-none">{stat.value}</p>
                    <p className="text-[10px] font-semibold text-[color:var(--color-text-subtle)] uppercase tracking-wider mt-0.5">{stat.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STORY & CRAFTSMANSHIP SECTION */}
      <section className="py-40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              className="relative order-2 lg:order-1"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[3rem] border border-[color:var(--color-border)] shadow-2xl">
                <img
                  src="/images/quality-hero-bg.png"
                  alt={`Showroom ${storeName}`}
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-bg)]/80 via-transparent to-transparent" />

                {/* Floating Badge */}
                <div className="absolute bottom-8 left-8 right-8 p-8 rounded-3xl bg-[color:var(--color-overlay)]/85 backdrop-blur-xl border border-[color:var(--color-border)] transform translate-y-4">
                  <p className="text-[10px] font-black text-[color:var(--color-primary)] uppercase tracking-widest mb-2">Notre ADN</p>
                  <p className="text-lg font-serif italic text-[color:var(--color-text)] leading-relaxed">
                    "La technologie doit être au service de l'homme, pas l'inverse. Nous sélectionnons le meilleur du futur."
                  </p>
                </div>
              </div>

              {/* Decorative Geometric */}
              <div className="absolute -top-12 -left-12 w-32 h-32 border border-[color:var(--color-primary)]/20 rounded-full animate-spin-slow pointer-events-none" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-12 order-1 lg:order-2"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-[2px] bg-[color:var(--color-primary)]" />
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-[color:var(--color-text-subtle)]">Innovation 2024</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-serif font-black text-[color:var(--color-text)] leading-[0.95] tracking-tighter">
                  LA TECH <br />
                  <span className="italic font-light text-[color:var(--color-text-subtle)]">pour tous.</span>
                </h2>
                <p className="text-xl text-[color:var(--color-text-muted)] leading-relaxed font-light first-letter:text-5xl first-letter:font-serif first-letter:mr-3 first-letter:float-left first-letter:text-[color:var(--color-primary)]">
                  {storeName} est née d'une passion pour le progrès et la conviction que chaque foyer mérite des objets intelligents, innovants et accessibles. En collaborant directement avec les laboratoires et les start-ups les plus audacieuses, nous avons bâti un catalogue où la performance rencontre le juste prix.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-[color:var(--color-border)]">
                {SHOP_STATS.slice(2).map((s, i) => (
                  <div key={i} className="group">
                    <p className="text-4xl font-black text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors tracking-tighter">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-subtle)] mt-2">{s.label}</p>
                  </div>
                ))}
              </div>

              <Link
                to="/catalogue"
                className="group inline-flex items-center gap-6 text-sm font-black uppercase tracking-[0.3em] text-[color:var(--color-text)]"
              >
                Explorer le futur
                <ArrowRightCircle className="text-[color:var(--color-primary)] group-hover:translate-x-3 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CORE VALUES - THE PILLARS */}
      <section className="py-40 bg-[color:var(--color-card)]/20 relative overflow-hidden">
        {/* Background Text Overlay */}
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
          <span className="text-[30vw] font-black tracking-tighter">TECH</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-32 gap-8">
            <div className="max-w-2xl space-y-6">
              <h2 className="text-5xl md:text-8xl font-serif font-black text-[color:var(--color-text)] tracking-tighter">LES PILIERS DE <br /><span className="text-[color:var(--color-primary)] italic">L'INNOVATION.</span></h2>
              <p className="text-[color:var(--color-text-subtle)] text-lg md:text-xl font-light leading-relaxed">
                Chaque produit, chaque gadget est soumis à notre protocole de validation technologique.
              </p>
            </div>
            <div className="hidden lg:block text-right pb-4">
              <Sparkles size={40} className="text-[color:var(--color-primary)] opacity-20" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-bg-elevated)]/50 border border-[color:var(--color-border)]/50 rounded-[3rem] overflow-hidden">
            {VALUES.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[color:var(--color-bg)] p-12 lg:p-20 hover:bg-[color:var(--color-card)]/30 transition-all group relative"
              >
                <div className="absolute top-12 right-12 text-[color:var(--color-bg-elevated)] font-black text-6xl group-hover:text-[color:var(--color-primary)]/10 transition-colors pointer-events-none">
                  {v.count}
                </div>

                <div className="mb-10 text-[color:var(--color-primary)] group-hover:scale-110 transition-transform origin-left">
                  {v.icon}
                </div>
                <h3 className="text-4xl font-serif font-bold mb-6 text-[color:var(--color-text)] tracking-tight">{v.title}</h3>
                <p className="text-[color:var(--color-text-muted)] text-lg font-light leading-relaxed max-w-sm">
                  {v.desc}
                </p>

                <div className="mt-12 w-0 group-hover:w-full h-[2px] bg-[color:var(--color-primary)] transition-all duration-500" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* VISIT & CONCIERGE EXPERIENCE */}
      <section className="py-40 relative px-4 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[color:var(--color-primary)]/5 blur-[150px] -z-10 rounded-full" />

        <div className="max-w-7xl mx-auto">
          <div className="rounded-[4rem] bg-[color:var(--color-card)]/40 border border-[color:var(--color-border)] backdrop-blur-3xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Map/Visual Side */}
              <div className="relative h-[400px] lg:h-auto overflow-hidden">
                <img
                  src="/images/lifestyle-relax.png"
                  alt={`Showroom ${storeName}`}
                  className="w-full h-full object-cover opacity-60 grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--color-bg)]/80 to-transparent lg:hidden" />
                <div className="absolute inset-0 bg-[color:var(--color-bg)]/20" />

                <div className="absolute inset-x-0 bottom-0 p-12 bg-gradient-to-t from-[color:var(--color-bg)] via-[color:var(--color-bg)]/40 to-transparent">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-6"
                  >
                    <PlayCircle size={60} className="text-[color:var(--color-text)] hover:text-[color:var(--color-primary)] transition-colors cursor-pointer" />
                    <div className="text-[color:var(--color-text)]">
                      <p className="text-xs font-black uppercase tracking-[0.3em] mb-1">Démonstration High-Tech</p>
                      <p className="text-xl font-serif italic text-[color:var(--color-text-muted)]">Découvrez l'expérience {storeName}</p>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Content Side */}
              <div className="p-12 lg:p-24 space-y-16">
                <div className="space-y-6">
                  <h2 className="text-4xl md:text-7xl font-serif font-black text-[color:var(--color-text)] leading-[0.9] tracking-tighter">
                    RENCONTRER <br />
                    <span className="text-[color:var(--color-primary)]">L'INNOVATION.</span>
                  </h2>
                  <p className="text-[color:var(--color-text-muted)] font-light leading-relaxed text-lg">
                    Notre showroom est le laboratoire du futur : un espace de démonstration où vous pouvez tester les dernières nouveautés tech en conditions réelles, accompagné de nos experts.
                  </p>
                </div>

                <div className="space-y-10">
                  <div className="flex gap-8 group">
                    <div className="flex-none w-14 h-14 rounded-2xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-primary)] group-hover:bg-[color:var(--color-primary)] group-hover:text-[color:var(--color-primary-contrast)] transition-all">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] mb-2">Showroom Paris</p>
                      <p className="text-xl font-medium text-[color:var(--color-text)]">42 Avenue de l'Innovation, 75008 Paris</p>
                    </div>
                  </div>

                  <div className="flex gap-8 group">
                    <div className="flex-none w-14 h-14 rounded-2xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-primary)] group-hover:bg-[color:var(--color-primary)] group-hover:text-[color:var(--color-primary-contrast)] transition-all">
                      <Clock size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] mb-2">Horaires d'accueil</p>
                      <p className="text-xl font-medium text-[color:var(--color-text)] whitespace-pre-line">Lun–Ven 9h00–18h00</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 pt-4">
                  <Link
                    to="/contact"
                    className="px-10 py-5 bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black rounded-2xl transition-all shadow-[0_20px_40px_color:var(--color-primary)/20)] hover:shadow-[0_20px_40px_color:var(--color-primary)/40)] hover:-translate-y-1 text-center"
                  >
                    Itinéraire Showroom
                  </Link>
                  <Link
                    to="/catalogue"
                    className="px-10 py-5 bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] text-[color:var(--color-text)] font-bold rounded-2xl hover:bg-[color:var(--color-bg-elevated)]/90 transition-all flex items-center justify-center gap-3"
                  >
                    <CalendarCheck size={20} className="text-[color:var(--color-text-subtle)]" />
                    Catalogue Tech
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL MANIFESTO QUOTE */}
      <section className="py-40 border-t border-[color:var(--color-border)] overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="relative inline-block">
              <Sparkles size={40} className="text-[color:var(--color-primary)] mx-auto animate-bounce-slow" />
              <div className="absolute inset-0 bg-[color:var(--color-primary)]/20 blur-2xl rounded-full" />
            </div>
            <p className="text-3xl md:text-5xl font-serif font-light text-[color:var(--color-text-muted)] italic leading-tight tracking-tight">
              {`"L'excellence de ${storeName} réside dans la sélection rigoureuse de ce qui se fait de mieux en innovation."`}
            </p>
            <div className="flex items-center justify-center gap-4">
              <span className="w-12 h-px bg-[color:var(--color-bg-elevated)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-subtle)] leading-none">Manifeste {storeName}</span>
              <span className="w-12 h-px bg-[color:var(--color-bg-elevated)]" />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
