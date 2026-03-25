import { motion, useMotionValue, useSpring, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import {
  Gamepad2, ArrowRight, ShoppingBag, ShieldCheck,
  Zap, Layers, Star, Sparkles, CheckCircle2, Users, Package, Truck
} from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";

const CATEGORIES = [
  {
    id: "high-tech", title: "High-Tech & Électronique", highlight: "Les Dernières Innovations",
    subtitle: "Informatique · Téléphonie · Son",
    description: "Retrouvez des milliers de références en smartphones, PC portables, TV 4K et objets connectés, toujours aux prix les plus bas du marché.",
    tag: "Prix Imbattables", icon: <Zap className="h-6 w-6" />, image: "/images/cat_high_tech.png",
    gradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
    glow: "bg-blue-500/10",
    accentColor: "text-blue-400",
    features: ["Grandes Marques", "Garantie 2 ans", "Sélection d'Experts"],
    items: ["Smartphones", "PC Gamers", "Écrans OLED", "Audio Sans-Fil"],
    badge: "Nouveau Stock",
  },
  {
    id: "culture", title: "Culture & Loisirs", highlight: "L'Évasion au Quotidien",
    subtitle: "Livres · Musique · Gaming",
    description: "Plongez dans un univers culturel infini. Des derniers best-sellers aux jeux vidéo incontournables, constituez votre bibliothèque idéale sans vous ruiner.",
    tag: "Millions de Références", icon: <Gamepad2 className="h-6 w-6" />, image: "/images/cat_smart_home.png",
    gradient: "from-purple-500/20 via-pink-500/10 to-transparent",
    glow: "bg-purple-500/10",
    accentColor: "text-purple-400",
    features: ["Livres & BD", "Vinyles & CD", "Jeux Next-Gen"],
    items: ["Romans", "Consoles", "Jeux de Société", "Instruments"],
    badge: "Coup de Cœur",
  },
  {
    id: "mode", title: "Mode & Beauté", highlight: "Le Style Accessible",
    subtitle: "Vêtements · Chaussures · Cosmétiques",
    description: "Renouvelez votre garde-robe avec les dernières tendances mode et nos incontournables beauté. Un choix gigantesque de grandes marques à prix réduits.",
    tag: "Dernières Tendances", icon: <ShoppingBag className="h-6 w-6" />, image: "/images/cat_lifestyle.png",
    gradient: "from-rose-500/20 via-orange-500/10 to-transparent",
    glow: "bg-rose-500/10",
    accentColor: "text-rose-400",
    features: ["Top Marques", "Toutes Tailles", "Retours Faciles"],
    items: ["Prêt-à-porter", "Sneakers", "Soins Visage", "Parfums"],
    badge: "Tendance",
  },
];

const STATS = [
  { value: "+15 000", label: "Clients satisfaits", icon: Users },
  { value: "4.9 / 5", label: "Note moyenne", icon: Star },
  { value: "24 / 48h", label: "Livraison express", icon: Truck },
  { value: "+500 K", label: "Articles en stock", icon: Package },
];

export default function Products() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 25, stiffness: 150 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 150 });

  useEffect(() => {
    const h = (e: MouseEvent) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, [mouseX, mouseY]);

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] selection:bg-[color:var(--color-primary)]/40 selection:text-[color:var(--color-text)]">
      <SEO
        title="Des Millions d'Articles à Petits Prix — Culture, High-Tech, Mode"
        description="Le plus grand choix du web. Retrouvez des millions de produits en stock dans toutes les catégories : high-tech, culture, mode et bien plus. Prix imbattables."
        keywords="high-tech, culture, mode, petits prix, e-commerce, millions de produits"
      />

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-32 pb-20 overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <motion.img
            style={{
              scale: useTransform(scrollYProgress, [0, 0.4], [1.08, 1]),
              y: useTransform(scrollYProgress, [0, 0.4], [0, 40]),
            }}
            src="/images/presentation.png"
            className="w-full h-full object-cover opacity-70"
            alt="Hero background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-bg)] via-[color:var(--color-bg)]/60 to-[color:var(--color-bg)]/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--color-bg)]/30 via-transparent to-[color:var(--color-bg)]/30" />
        </div>

        {/* Noise texture */}
        <div className="absolute inset-0 z-10 opacity-[0.025] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* Mouse-tracked glow */}
        <motion.div
          style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
          className="absolute z-10 w-[600px] h-[600px] bg-[color:var(--color-primary)]/8 rounded-full blur-[130px] pointer-events-none mix-blend-screen"
        />

        {/* Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-5 w-full flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full space-y-8"
          >
            {/* Badge */}
            <div className="flex justify-center">
              <motion.span
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 py-2 px-5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)]/60 text-[color:var(--color-primary)] text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-md"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--color-primary)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[color:var(--color-primary)]" />
                </span>
                Des Millions de Produits
              </motion.span>
            </div>

            {/* Headline */}
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif font-bold tracking-tighter leading-[0.9] text-[color:var(--color-text)] uppercase">
              TOUT CE DONT <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--color-primary)] via-[color:var(--color-primary)] to-indigo-400 drop-shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.4)]">
                VOUS RÊVEZ.
              </span>
            </h1>

            <p className="text-[color:var(--color-text-muted)] text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
              Culture, high-tech, mode et bien plus. Retrouvez des millions de produits en stock, toujours à petits prix.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-wrap gap-4 justify-center pt-2">
              <Link
                to="/catalogue"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.3)]"
              >
                <ShoppingBag size={15} />
                Explorer le Catalogue
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/assistant"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 text-[color:var(--color-text)] font-black text-xs uppercase tracking-[0.2em] hover:border-[color:var(--color-primary)]/40 hover:bg-[color:var(--color-primary)]/5 transition-all backdrop-blur-sm"
              >
                <Sparkles size={14} className="text-[color:var(--color-primary)]" />
                Conseiller IA
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          style={{ opacity: useTransform(scrollYProgress, [0, 0.15], [1, 0]) }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-[1px] h-12 bg-gradient-to-b from-[color:var(--color-primary)] to-transparent"
          />
          <span className="text-[8px] font-black uppercase tracking-[0.5em] text-[color:var(--color-text-subtle)]">Découvrir</span>
        </motion.div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <div className="relative z-10 border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]/90 backdrop-blur-md">
        <div className="mx-auto max-w-screen-xl px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[color:var(--color-border)]">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-center gap-3 py-5 px-4"
              >
                <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                  <stat.icon size={14} />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-base font-black text-[color:var(--color-text)] tracking-tight leading-none">{stat.value}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-text-muted)] mt-0.5">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ QUALITY STRIP ═══ */}
      <section className="py-16 border-b border-[color:var(--color-border)] bg-[color:var(--color-card)]/15">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Millions d'articles", val: "Choix inégalé", icon: Layers },
              { label: "Prix imbattables", val: "Toujours plus bas", icon: Zap },
              { label: "Livraison suivie", val: "Express 24/48h", icon: Truck },
              { label: "Retours simples", val: "Garantie totale", icon: ShieldCheck },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex flex-col items-center text-center gap-4 p-6 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/20 hover:border-[color:var(--color-primary)]/20 hover:bg-[color:var(--color-primary)]/5 transition-all"
              >
                <div className="p-3 rounded-xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] group-hover:bg-[color:var(--color-primary)] group-hover:border-[color:var(--color-primary)] group-hover:text-[color:var(--color-primary-contrast)] transition-all duration-300">
                  <item.icon className="h-5 w-5 text-[color:var(--color-primary)] group-hover:text-[color:var(--color-primary-contrast)] transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-black text-[color:var(--color-text)] uppercase tracking-tight">{item.val}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-subtle)] mt-1">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COLLECTIONS ═══ */}
      <section className="py-24">
        {/* Section header */}
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-primary)]">Notre Sélection</p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Explorez nos univers</h2>
              <p className="text-[color:var(--color-text-muted)] text-sm max-w-lg">
                Chaque catégorie est une invitation à découvrir le meilleur de ce que le marché a à offrir, sélectionné et testé par nos experts.
              </p>
            </div>
            <Link
              to="/catalogue"
              className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]/80 transition-colors group shrink-0"
            >
              Voir tout le catalogue
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Category cards */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
          {CATEGORIES.map((cat, index) => (
            <div key={cat.id} className="relative group">
              {/* Giant background number */}
              <motion.div
                style={{ y: index % 2 === 0 ? y1 : y2 }}
                className={`absolute -top-20 hidden lg:block text-[20vw] font-black text-[color:var(--color-text)]/[0.025] select-none pointer-events-none leading-none ${index % 2 === 1 ? '-left-4' : '-right-4'}`}
              >
                0{index + 1}
              </motion.div>

              <div className={`flex flex-col lg:flex-row gap-16 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                {/* Image side */}
                <motion.div
                  initial={{ opacity: 0, x: index % 2 === 1 ? 40 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full lg:w-1/2"
                >
                  <div className="relative">
                    {/* Glow blob */}
                    <div className={`absolute -inset-10 ${cat.glow} blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000`} />

                    <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 backdrop-blur-sm shadow-2xl group-hover:border-[color:var(--color-primary)]/20 transition-colors duration-500">
                      <img
                        src={cat.image}
                        alt={cat.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-bg)]/60 via-transparent to-transparent" />

                      {/* Category info overlay */}
                      <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between gap-4">
                        <div className="px-5 py-3 rounded-2xl bg-[color:var(--color-bg)]/80 backdrop-blur-xl border border-[color:var(--color-border)]">
                          <p className={`text-[9px] font-black ${cat.accentColor} uppercase tracking-widest`}>{cat.subtitle.split(' · ')[0]}</p>
                          <p className="text-sm font-bold text-[color:var(--color-text)] mt-0.5">{cat.tag}</p>
                        </div>
                        {/* Badge */}
                        <span className="px-3 py-1.5 rounded-xl bg-[color:var(--color-primary)]/90 text-[color:var(--color-primary-contrast)] text-[9px] font-black uppercase tracking-widest">
                          {cat.badge}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Text side */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  className="w-full lg:w-1/2 space-y-10"
                >
                  <div className="space-y-5">
                    {/* Category label */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 text-[color:var(--color-primary)]`}>
                        {cat.icon}
                      </div>
                      <span className="font-black tracking-[0.35em] uppercase text-[9px] text-[color:var(--color-text-muted)]">{cat.subtitle}</span>
                    </div>

                    {/* Headline */}
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-black text-[color:var(--color-text)] leading-[0.9] tracking-tighter">
                      {cat.title} <br />
                      <span className="text-[color:var(--color-text-subtle)] font-light italic text-3xl md:text-4xl">{cat.highlight}</span>
                    </h2>

                    <p className="text-lg text-[color:var(--color-text-muted)] leading-relaxed font-light lg:max-w-lg">
                      {cat.description}
                    </p>
                  </div>

                  {/* Features + Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[color:var(--color-border)] pt-8">
                    <div className="space-y-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)]">Points Clés</p>
                      <ul className="space-y-3">
                        {cat.features.map((feat, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-3 text-sm font-semibold text-[color:var(--color-text)]"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--color-primary)] shrink-0" />
                            {feat}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)]">Incontournables</p>
                      <div className="flex flex-wrap gap-2">
                        {cat.items.map((item, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 rounded-xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] text-[10px] font-bold text-[color:var(--color-text-muted)] hover:border-[color:var(--color-primary)]/30 hover:text-[color:var(--color-primary)] transition-colors cursor-default"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CTA link */}
                  <div>
                    <Link
                      to={`/catalogue?category=${cat.id}`}
                      className="group inline-flex items-center gap-6 text-xs font-black uppercase tracking-[0.35em] text-[color:var(--color-text)] hover:text-[color:var(--color-primary)] transition-colors"
                    >
                      Accéder à la collection
                      <div className="flex items-center justify-center w-11 h-11 rounded-full border border-[color:var(--color-border)] group-hover:bg-[color:var(--color-primary)] group-hover:border-[color:var(--color-primary)] group-hover:text-[color:var(--color-primary-contrast)] transition-all duration-300">
                        <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="py-32 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-x-0 top-0 h-full overflow-hidden pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute top-[20%] left-[30%] w-[800px] h-[800px] bg-[color:var(--color-primary)]/5 rounded-full blur-[180px]"
          />
          <div className="absolute top-1/2 right-[10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[150px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto px-4 text-center space-y-12 relative z-10"
        >
          {/* Icon */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 mx-auto"
          >
            <ShoppingBag size={28} className="text-[color:var(--color-primary)]" />
          </motion.div>

          <div className="space-y-6">
            <h2 className="text-5xl md:text-7xl font-serif font-black text-[color:var(--color-text)] italic tracking-tighter leading-none">
              LE PLUS GRAND <br />
              <span className="not-italic text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--color-primary)] via-indigo-400 to-[color:var(--color-primary)]">
                CHOIX DU WEB.
              </span>
            </h2>
            <p className="text-xl text-[color:var(--color-text-muted)] font-light max-w-2xl mx-auto leading-relaxed">
              Il y a toujours une bonne affaire qui vous attend. Profitez de nos prix réduits et de la livraison rapide sur des millions d'articles.
            </p>
          </div>

          {/* Rating proof */}
          <div className="flex items-center justify-center gap-2 opacity-60">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-sm font-bold text-[color:var(--color-text-muted)] ml-2">4.9 / 5 · +2 400 avis vérifiés</span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              to="/catalogue"
              className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black rounded-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em] text-xs shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.3)]"
            >
              <ShoppingBag size={15} />
              Ouvrir le Catalogue
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-[color:var(--color-card)] border border-[color:var(--color-border)] text-[color:var(--color-text)] font-black rounded-2xl hover:border-[color:var(--color-primary)]/30 hover:bg-[color:var(--color-primary)]/5 transition-all uppercase tracking-[0.2em] text-xs"
            >
              Visiter le Showroom
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 opacity-30">
            <div className="flex items-center gap-2"><ShieldCheck className="h-3 w-3" /><span className="text-[10px] font-black uppercase">Paiement Sécurisé</span></div>
            <div className="flex items-center gap-2"><Truck className="h-3 w-3" /><span className="text-[10px] font-black uppercase">Livraison Rapide</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /><span className="text-[10px] font-black uppercase">Qualité Certifiée</span></div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
