import { motion, useMotionValue, useSpring } from "motion/react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { applyProductImageFallback, getProductImageSrc } from "../lib/productImage";
import {
  ShieldCheck,
  HeartHandshake,
  ArrowRight,
  Package,
  Truck,
  Sparkles,
  MessageCircle,
  CheckCircle2,
  Zap,
  Award,
  Globe,
  Cpu,
  MonitorPlay,
  Wrench,
  Search,
  BadgePercent,
  Star,
  ChevronRight,
  Activity,
  Layers
} from "lucide-react";
import FAQ from "../components/FAQ";
import SEO from "../components/SEO";
import ReviewCarousel from "../components/ReviewCarousel";
import BestSellers from "../components/BestSellers";
import { useSettingsStore } from "../store/settingsStore";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";

type HeroFeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  price: number;
};

const CATEGORY_IMAGES: Record<string, string> = {
  'smartphones': '/images/cat_phones.png',
  'ordinateurs': '/images/cat_laptops.png',
  'maison-connectee': '/images/cat_smart_home.png',
  'audio': '/images/cat_audio.png',
};

const DEFAULT_CATEGORIES: { id: string; name: string; tag: string; emoji: string; img_url?: string }[] = [
  { id: 'smartphones', name: 'Smartphones', tag: 'Dernier Cri', emoji: '📱' },
  { id: 'ordinateurs', name: 'Laptops Pro', tag: 'Puissant', emoji: '💻' },
  { id: 'maison-connectee', name: 'Maison Connectée', tag: 'Futuriste', emoji: '🏠' },
  { id: 'audio', name: 'Audio Premium', tag: 'Immersif', emoji: '🎧' },
];

export default function Home() {
  const settings = useSettingsStore((s) => s.settings);
  const { user } = useAuthStore();
  const [featuredProduct, setFeaturedProduct] = useState<HeroFeaturedProduct | null>(null);

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

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('id, slug, name, image_url, price')
        .eq('is_active', true)
        .eq('is_available', true)
        .gt('stock_quantity', 0)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (isMounted && data) {
        setFeaturedProduct(data as HeroFeaturedProduct);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const marqueeItems = [
    '✦ Livraison express en France ✦',
    '✦ Leader de l\'innovation accessible ✦',
    '✦ Garantie constructeur 2 ans ✦',
    '✦ Dernières nouveautés High-Tech ✦',
    '✦ Paiement sécurisé 3x sans frais ✦',
    `✦ Showroom à ${settings.store_city || 'Paris'} — Testez le futur ✦`,
  ];

  const stats = [
    { value: "24h", label: `Expédition ${settings.store_city || 'locale'}`, icon: <Truck className="w-5 h-5" /> },
    { value: "1000+", label: "Produits Innovants", icon: <Cpu className="w-5 h-5" /> },
    { value: "2 ans", label: "Garantie Totale", icon: <ShieldCheck className="w-5 h-5" /> },
    { value: "24/7", label: "Support Expert", icon: <Wrench className="w-5 h-5" /> },
  ];

  const rawCategories = (settings.home_categories && settings.home_categories.length > 0)
    ? settings.home_categories
    : DEFAULT_CATEGORIES;
  const categories = rawCategories.map(cat => ({
    name: cat.name,
    slug: cat.id,
    img: cat.img_url || CATEGORY_IMAGES[cat.id] || '/images/products-flower.png',
    tag: cat.tag,
    emoji: cat.emoji,
  }));

  const steps = [
    { title: "Découvrez", desc: "Explorez notre sélection triée sur le volet des meilleures innovations mondiales. Smartphones, domotique, audio HD.", icon: <Search className="w-6 h-6" /> },
    { title: "Commandez", desc: "Profitez des meilleurs prix et d'un paiement ultra-sécurisé. Facturation instantanée et suivi de colis en temps réel.", icon: <ShieldCheck className="w-6 h-6" /> },
    { title: "Vivez l'Innovation", desc: `Livraison sécurisée sous 24-48h. ${settings.store_city || 'Paris'} livré le jour même pour les produits Premium.`, icon: <Zap className="w-6 h-6" /> },
  ];

  const pillars = [
    { title: "Produits Certifiés", desc: "Chaque innovation est testée et certifiée CE pour garantir sécurité et performance optimale.", icon: <ShieldCheck className="w-6 h-6" /> },
    { title: "Garantie 2 ans", desc: "Bénéficiez de la sérénité NeuroCart avec un remplacement standard en cas de défaut matériel.", icon: <Award className="w-6 h-6" /> },
    { title: "Meilleurs Prix", desc: "Nous négocions directement avec les constructeurs pour vous offrir l'innovation au prix le plus juste.", icon: <BadgePercent className="w-6 h-6" /> },
    { title: "Expertise IA", desc: "Utilisez PlayAdvisor, notre assistant intelligent, pour trouver le produit qui correspond exactement à vos besoins.", icon: <Cpu className="w-6 h-6" /> },
  ];

  const homeSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": settings.store_name,
      "url": settings.store_url,
      "logo": settings.store_logo_url || `${settings.store_url}/logo.png`,
      "sameAs": [`${settings.store_url}/catalogue`, `${settings.store_url}/guides`],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Quelle est la durée de la garantie ?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "NeuroCart offre une garantie constructeur de 2 ans sur tous les produits tech, conformément à la législation européenne.",
          },
        },
        {
          "@type": "Question",
          "name": "Les produits sont-ils déjà configurés ?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "La plupart de nos équipements sont Plug & Play. Pour les systèmes complexes, notre support est disponible pour une aide à distance gratuite.",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Innovation Tech NeuroCart",
      "brand": { "@type": "Brand", "name": settings.store_name },
      "description": "Les dernières innovations technologiques sélectionnées par nos experts, garanties 2 ans.",
      "review": {
        "@type": "Review",
        "author": { "@type": "Person", "name": "Client Tech" },
        "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
        "reviewBody": "Service impeccable, produit conforme et livraison ultra-rapide. Je recommande NeuroCart pour tout achat tech.",
      },
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#030303] text-zinc-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <SEO
        title={`Boutique High-Tech Premium | ${settings.store_name} – Livraison France Entière`}
        description={`${settings.store_name} sélectionne les meilleures innovations high-tech : smartphones, laptops, maison connectée, audio premium et accessoires intelligents. Garantie 2 ans et livraison partout en France.`}
        keywords={`high-tech premium, smartphones, laptops, maison connectée, audio premium, gadgets intelligents, ${settings.store_name}, e-commerce tech France`}
        schema={homeSchemas}
      />

      <main>
        {/* ────────── HERO SECTION (ARCHITECTURAL & STRUCTURED) ────────── */}
        <section className="relative min-h-[95vh] pt-32 pb-24 px-6 lg:px-12 flex flex-col justify-center overflow-hidden">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)] pointer-events-none" />

          <div className="max-w-[1600px] mx-auto w-full grid lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
            {/* Left Content */}
            <div className="lg:col-span-7 flex flex-col items-start gap-8 z-20">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-zinc-300 text-[10px] font-bold uppercase tracking-[0.2em]">
                  {settings.store_name} — Leader Loisirs
                </span>
                <div className="w-px h-3 bg-white/20 mx-1" />
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.1em] flex items-center gap-1.5">
                  <Truck className="w-3 h-3" /> Livraison France entière
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl sm:text-7xl lg:text-[85px] leading-[0.95] font-black tracking-tight text-white uppercase"
              >
                L'EXCELLENCE <br />
                <span className="text-emerald-400 italic block mt-2 text-4xl sm:text-6xl lg:text-[75px]">
                  RÉCRÉATIVE.
                </span>
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4 max-w-2xl"
              >
                <p className="text-xl md:text-2xl text-zinc-400 font-light leading-relaxed">
                  Importateur & distributeur officiel · Bornes d'arcade, flippers, simulateurs et équipements de bar disponibles.
                </p>
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-zinc-500 leading-relaxed font-light">
                    Certifiés CE, garantie 2 ans constructeur, installation incluse — expédiés partout en France.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
              >
                <Link
                  to="/catalogue"
                  className="group relative flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:shadow-[0_0_60px_rgba(16,185,129,0.4)]"
                >
                  Découvrir le catalogue
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.03] text-xs font-bold uppercase tracking-widest text-zinc-400 w-full sm:w-auto justify-center">
                  <Star className="w-4 h-4 text-emerald-500" />
                  +2500 Clients Satisfaits
                </div>
              </motion.div>
            </div>

            {/* Right Content (Hero Visuals) */}
            <div className="lg:col-span-5 relative h-[500px] lg:h-[700px] w-full rounded-[2.5rem] overflow-hidden border border-white/10 group mt-12 lg:mt-0 shadow-2xl">
              <div className="absolute inset-0 bg-emerald-500/10 mix-blend-color z-10" />
              <img
                src={settings.home_hero_bg_url || '/images/hero_new.png'}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
                alt="Equipement Premium"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent z-10" />

              {/* Featured product with price anchor */}
              <div className="absolute bottom-8 left-6 right-6 z-20">
                {featuredProduct ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/65 p-4 backdrop-blur-xl"
                  >
                    <img
                      src={getProductImageSrc(featuredProduct.image_url)}
                      alt={featuredProduct.name}
                      className="h-14 w-14 rounded-xl object-cover border border-white/10"
                      onError={applyProductImageFallback}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{featuredProduct.name}</p>
                      <p className="text-xs uppercase tracking-wider text-zinc-500">Prix constaté</p>
                      <p className="text-2xl font-black text-emerald-400">{featuredProduct.price.toFixed(2)} €</p>
                    </div>
                    <Link
                      to={`/catalogue/${featuredProduct.slug}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-950 transition hover:bg-emerald-400"
                    >
                      Voir
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
                    <BadgePercent className="h-4 w-4 text-emerald-400" />
                    <p className="text-xs text-zinc-300">Nouvelles offres high-tech disponibles cette semaine.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ────────── DOCK STATS ────────── */}
        <section className="relative z-30 -mt-10 px-6 max-w-[1400px] mx-auto hidden lg:block">
          <div className="rounded-3xl bg-zinc-900/80 backdrop-blur-2xl border border-white/10 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-4 divide-x divide-white/10">
              {stats.map((s, i) => (
                <div key={i} className="flex items-center gap-5 px-8 py-5 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
                    {s.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white tracking-tight">{s.value}</div>
                    <div className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-bold mt-0.5">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── MARQUEE ────────── */}
        <div className="border-y border-white/5 bg-[#050505] py-4 mt-12 lg:mt-24 overflow-hidden flex whitespace-nowrap">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex items-center"
          >
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-8 pr-12 text-zinc-500 text-xs font-black uppercase tracking-[0.3em]">
                <span className="text-emerald-500 text-xs">✦</span>
                {item}
              </span>
            ))}
          </motion.div>
        </div>

        {/* ────────── FLAGSHIP SECTION (DETAILED & EDITORIAL) ────────── */}
        <section className="py-32 px-6 lg:px-12 bg-[#030303] relative border-b border-white/5">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-20 items-start">

              {/* Left Editorial Sticky Block */}
              <div className="sticky top-32 space-y-10">
                <div>
                  <div className="flex items-center gap-3 text-emerald-500 text-[10px] font-mono tracking-[0.2em] uppercase mb-8">
                    <span>[ 01 ]</span>
                    <div className="w-12 h-px bg-emerald-500/50" />
                    <span>Notre signature</span>
                  </div>
                  <h2 className="text-5xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter uppercase">
                    L'univers du <br />
                    <span className="text-emerald-400 italic lowercase block mt-3 font-serif pr-4">
                      luxe récréatif.
                    </span>
                  </h2>
                </div>

                <p className="text-lg text-zinc-400 font-light leading-relaxed border-l border-emerald-500/30 pl-6">
                  {settings.store_name}, c'est notre engagement qualité traduit en produit. Une sélection de machines importées et distribuées avec soin, certifiées CE, testées par nos équipes pour garantir fiabilité et expérience utilisateur optimale.
                </p>

                <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 mt-12 aspect-[4/3] group">
                  <div className="absolute inset-0 bg-emerald-500/5 mix-blend-overlay z-10" />
                  <img
                    src={settings.home_section_bg_url || '/images/solution-hero-bg.png'}
                    className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-105"
                    alt={`Equipements ${settings.store_name}`}
                  />
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-3 flex items-center gap-3 z-20">
                    <Award className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-[8px] text-zinc-400 uppercase tracking-widest font-bold">Garantie</p>
                      <p className="text-white text-xs font-bold">2 Ans Constructeur</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Feature Cards Layout */}
              <div className="space-y-6">
                {[
                  { title: "Catalogue exclusif importateur", desc: "Accès direct aux meilleures marques mondiales : bornes d'arcade, flippers Stern, simulateurs haut de gamme.", icon: <Layers className="w-6 h-6" /> },
                  { title: "Certifiées CE, garanties 2 ans", desc: "Chaque machine est certifiée pour la conformité européenne avec garantie constructeur et SAV en France.", icon: <ShieldCheck className="w-6 h-6" /> },
                  { title: "Installation & maintenance incluses", desc: "Nos techniciens assurent la livraison, l'installation et la mise en service sur tout le territoire français.", icon: <Globe className="w-6 h-6" /> },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-[#080808] border border-white/5 rounded-[2rem] p-8 lg:p-12 hover:border-emerald-500/20 hover:bg-white/[0.02] transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="flex items-start gap-8 relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-emerald-400 shrink-0 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all shadow-xl">
                        {item.icon}
                      </div>
                      <div className="space-y-4">
                        <span className="text-[10px] text-zinc-500 font-mono tracking-[0.2em] uppercase">Métrique 0{i + 1}</span>
                        <h4 className="text-2xl font-bold text-white leading-tight">{item.title}</h4>
                        <p className="text-zinc-400 leading-relaxed font-light text-sm lg:text-base">{item.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                <Link
                  to="/catalogue"
                  className="mt-8 group flex items-center justify-between p-8 rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
                >
                  <div>
                    <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 block">Action immédiate</span>
                    <span className="text-xl font-bold text-white">Explorer le catalogue complet</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* ────────── BEST SELLERS ────────── */}
        {settings.home_best_sellers_enabled && <BestSellers />}

        {/* ────────── BENTO CATEGORIES ────────── */}
        <section className="py-32 px-6 lg:px-12 bg-black">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20">
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center gap-3 text-emerald-500 text-[10px] font-mono tracking-[0.2em] uppercase">
                  <span>[ 02 ]</span>
                  <div className="w-12 h-px bg-emerald-500/50" />
                  <span>Notre catalogue</span>
                </div>
                <h2 className="text-5xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter uppercase">
                  Toutes les <br />
                  <span className="text-zinc-500 stroke-text block hover:text-emerald-400 transition-colors duration-500">
                    machines de loisirs.
                  </span>
                </h2>
                <p className="text-lg text-zinc-400 font-light leading-relaxed">
                  Bornes d'arcade, flippers, simulateurs, billard — découvrez notre catalogue complet livré et installé partout en France.
                </p>
              </div>
              <Link
                to="/catalogue"
                className="group inline-flex items-center gap-3 border-b border-white/20 pb-2 text-sm font-bold uppercase tracking-widest hover:border-emerald-500 text-white transition-all whitespace-nowrap"
              >
                Voir tout le catalogue <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[350px]">
              {categories.map((cat, i) => (
                <Link
                  key={cat.slug || cat.name}
                  to={`/catalogue?category=${cat.slug}`}
                  className={`group relative overflow-hidden rounded-[2rem] bg-zinc-900 border border-white/5 
                    ${i === 0 ? 'lg:col-span-2 lg:row-span-2' : ''}
                    ${i === 1 || i === 2 ? 'lg:col-span-1 lg:row-span-1' : ''}
                    ${i === 3 ? 'lg:col-span-2 lg:row-span-1' : ''}
                    ${i > 3 ? 'lg:col-span-1 lg:row-span-1' : ''}
                  `}
                >
                  <img
                    src={cat.img}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110 opacity-60 group-hover:opacity-90 mix-blend-luminosity hover:mix-blend-normal"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  <div className="absolute inset-0 p-8 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      {cat.tag && (
                        <span className="px-4 py-1.5 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                          {cat.tag}
                        </span>
                      )}
                      <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center opacity-0 -translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 group-hover:bg-emerald-500 group-hover:text-black group-hover:border-emerald-500">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl mb-3 block opacity-80">{cat.emoji}</span>
                      <h3 className={`font-black text-white ${i === 0 ? 'text-4xl lg:text-5xl' : 'text-3xl'} tracking-tight`}>
                        {cat.name}
                      </h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── HOW IT WORKS (STRUCTURAL TIMELINE) ────────── */}
        <section className="py-32 px-6 lg:px-12 bg-[#030303] border-t border-white/5 overflow-hidden">
          <div className="max-w-[1400px] mx-auto">
            <div className="mb-20 space-y-6 text-center">
              <span className="text-emerald-500 text-[10px] font-mono tracking-[0.2em] uppercase">[ 03 — Process ]</span>
              <h2 className="text-5xl font-black text-white uppercase tracking-tighter">
                Équipez-vous en <span className="text-zinc-500 stroke-text block mt-2">3 étapes.</span>
              </h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-12 lg:gap-8 relative">
              {/* Connector */}
              <div className="hidden lg:block absolute top-[4.5rem] left-[15%] right-[15%] h-px bg-white/10">
                <div className="w-full h-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
              </div>

              {steps.map((step, i) => (
                <div key={i} className="relative z-10 flex flex-col pt-12">
                  <div className="absolute top-0 left-0 text-[120px] font-black text-white/[0.02] leading-none -z-10 -ml-6 -mt-8 select-none">
                    0{i + 1}
                  </div>
                  <div className="w-20 h-20 rounded-2xl bg-[#080808] border border-white/10 flex items-center justify-center text-emerald-400 mb-8 shadow-2xl relative">
                    <div className="absolute inset-0 bg-emerald-500/10 blur-xl opacity-0 hover:opacity-100 transition-opacity" />
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">{step.title}</h3>
                  <p className="text-zinc-400 font-light leading-relaxed text-sm md:text-base pr-8">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── BENTO PILLARS ────────── */}
        <section className="py-32 px-6 lg:px-12 bg-[#050505] border-t border-white/5 relative">
          <div className="absolute inset-0 z-0">
            <img
              src={settings.home_quality_bg_url || '/images/quality-hero-bg.png'}
              className="w-full h-full object-cover grayscale opacity-20 mix-blend-screen"
              alt="Background"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-[#050505]" />
          </div>

          <div className="relative z-10 max-w-[1400px] mx-auto">
            <div className="flex flex-col items-center text-center space-y-6 mb-20">
              <div className="flex items-center gap-3 text-emerald-500 text-[10px] font-mono tracking-[0.2em] uppercase">
                <div className="w-12 h-px bg-emerald-500/50" />
                <span>[ 04 — Engagement ]</span>
                <div className="w-12 h-px bg-emerald-500/50" />
              </div>
              <h2 className="text-5xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter uppercase max-w-4xl">
                Qualité sans <br />
                <span className="text-emerald-400 block mt-2">compromis.</span>
              </h2>
              <p className="text-zinc-400 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto">
                Chaque machine que nous proposons passe par un processus rigoureux de sélection, de test et de validation pour garantir qualité, fiabilité et satisfaction client.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pillars.map((p, i) => (
                <div key={i} className="bg-[#080808]/80 backdrop-blur-md border border-white/5 rounded-3xl p-8 hover:border-emerald-500/20 hover:bg-white/[0.02] transition-all group">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-emerald-400 mb-8 group-hover:scale-110 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
                    {p.icon}
                  </div>
                  <h4 className="text-white font-bold text-xl mb-3 tracking-tight">{p.title}</h4>
                  <p className="text-zinc-500 font-light text-sm leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── PLAYADVISOR AI INTERFACE CTA ────────── */}
        <section className="py-24 px-6 lg:px-12 bg-black border-y border-white/5">
          <div className="max-w-[1400px] mx-auto bg-[#050505] border border-white/10 rounded-[3rem] p-4 lg:p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center bg-[#080808] rounded-[2.5rem] p-8 lg:p-16 border border-white/5">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-mono text-xs uppercase tracking-[0.2em]">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Assistant Virtuel Actif
                </div>
                <h2 className="text-4xl lg:text-6xl font-black text-white leading-tight tracking-tighter uppercase">
                  Conseil IA <br />
                  <span className="text-zinc-600 block mt-1">Sur-mesure.</span>
                </h2>
                <p className="text-lg text-zinc-400 font-light leading-relaxed max-w-md">
                  Notre assistant PlayAdvisor analyse vos besoins et vous recommande les machines les plus adaptées. Un conseil d'expert, instantané.
                </p>
                {user ? (
                  <Link
                    to="/assistant"
                    className="group/btn inline-flex items-center gap-4 bg-white text-black px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-xl"
                  >
                    Démarrer l'analyse
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300 italic">
                      💬 « Je cherche un setup gaming pour mon salon, budget 1500€… »
                    </div>
                    <Link
                      to="/connexion?redirect=%2Fassistant"
                      className="group/btn inline-flex items-center gap-4 bg-emerald-500 text-slate-950 px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                    >
                      Essayer gratuitement
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                )}
              </div>

              <div className="hidden lg:flex justify-end relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
                <div className="w-80 h-80 rounded-full border border-white/10 bg-black/50 backdrop-blur-xl flex items-center justify-center relative">
                  <div className="absolute inset-4 rounded-full border border-dashed border-white/10 animate-[spin_30s_linear_infinite]" />
                  <div className="absolute inset-8 rounded-full border border-emerald-500/20 animate-[spin_20s_linear_infinite_reverse]" />
                  <MessageCircle className="w-24 h-24 text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ────────── REVIEWS ────────── */}
        {settings.home_reviews_enabled && <ReviewCarousel />}

        {/* ────────── FAQ ────────── */}
        <FAQ />

        {/* ────────── FINAL TYPOGRAPHIC CTA ────────── */}
        <section className="py-40 px-6 lg:px-12 text-center bg-black relative overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
            <div className="w-[1000px] h-[300px] bg-emerald-500/10 blur-[150px] rounded-full" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto space-y-12">
            <span className="inline-block text-emerald-500 font-mono text-xs uppercase tracking-[0.4em] mb-4">
              [ Leader Français des Machines de Loisirs ]
            </span>

            <h2 className="text-6xl md:text-[100px] leading-[0.85] font-black text-white tracking-tighter uppercase">
              VIVEZ L'EXPÉRIENCE <br />
              <span className="text-zinc-700 block mt-4 hover:text-emerald-400 transition-colors duration-[1.5s]">
                PREMIUM.
              </span>
            </h2>

            <p className="text-xl text-zinc-400 font-light max-w-2xl mx-auto border-t border-white/10 pt-12">
              Machines certifiées CE, installation incluse, garantie 2 ans constructeur.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
              <Link
                to="/catalogue"
                className="group flex items-center gap-4 px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-sm tracking-widest rounded-2xl transition-all shadow-[0_0_40px_rgba(16,185,129,0.15)]"
              >
                Accéder au catalogue
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/guides"
                className="flex items-center gap-3 px-10 py-5 bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-white/20 text-white font-bold uppercase text-sm tracking-widest rounded-2xl transition-all backdrop-blur-md"
              >
                Nos guides d'achat
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
