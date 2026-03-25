import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useSettingsStore } from '../store/settingsStore';
import { allGuideContent } from './guides/GuidePage';
import { breadcrumbSchema } from '../lib/seo/schemaBuilder';
import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";
import { BookOpen, ArrowRight, Clock, Sparkles, ChevronRight } from "lucide-react";

// Estimated reading times per guide (fallback to 5 min)
const READ_TIMES: Record<string, number> = {};

export default function Guides() {
  const settings = useSettingsStore((s) => s.settings);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 25, stiffness: 150 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 150 });

  useEffect(() => {
    const h = (e: MouseEvent) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, [mouseX, mouseY]);

  const guideEntries = Object.entries(allGuideContent);
  const totalGuides = guideEntries.length;

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pb-32">
      <SEO
        title={`Guides Experts | ${settings.store_name}`}
        description="Guides complets sur nos produits : conseils d'experts, comparatifs et tutoriels pour faire le meilleur choix."
        canonical="/guides"
        schema={breadcrumbSchema([
          { name: 'Accueil', path: '/' },
          { name: 'Guides', path: '/guides' },
        ])}
      />

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[65vh] flex items-center justify-center pt-32 pb-16 overflow-hidden">
        {/* Noise */}
        <div className="absolute inset-0 z-10 opacity-[0.025] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[300px] bg-[color:var(--color-primary)]/6 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/3 w-64 h-64 bg-[color:var(--color-primary)]/8 rounded-full blur-[100px] pointer-events-none"
        />

        {/* Mouse glow */}
        <motion.div
          style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
          className="absolute z-0 w-[500px] h-[500px] bg-[color:var(--color-primary)]/8 rounded-full blur-[130px] pointer-events-none mix-blend-screen"
        />

        <div className="relative z-20 max-w-4xl mx-auto px-5 w-full flex flex-col items-center text-center">
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
                Savoir & Expertise
              </motion.span>
            </div>

            {/* H1 */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold tracking-tighter leading-none text-[color:var(--color-text)] uppercase">
              GUIDES <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--color-primary)] via-[color:var(--color-primary)] to-indigo-400 drop-shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.3)]">
                EXPERTS.
              </span>
            </h1>

            <p className="text-[color:var(--color-text-muted)] text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
              Tout ce que vous devez savoir pour choisir, configurer et tirer le meilleur de vos équipements.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 opacity-50">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">{totalGuides} guide{totalGuides !== 1 ? "s" : ""}</span>
              <span className="w-1 h-1 rounded-full bg-[color:var(--color-text-subtle)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">Mis à jour régulièrement</span>
              <span className="w-1 h-1 rounded-full bg-[color:var(--color-text-subtle)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">Par nos experts</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ GUIDES GRID ═══ */}
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-primary)] mb-1">Notre bibliothèque</p>
            <h2 className="text-2xl font-black tracking-tight">
              {totalGuides} guide{totalGuides !== 1 ? "s" : ""} disponible{totalGuides !== 1 ? "s" : ""}
            </h2>
          </div>
          <Link
            to="/catalogue"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]/80 transition-colors group shrink-0"
          >
            Voir le catalogue
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Featured guide (first one, larger) */}
        {guideEntries.length > 0 && (() => {
          const [slug, guide] = guideEntries[0];
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <Link
                to={`/guides/${slug}`}
                className="group block p-8 sm:p-10 rounded-[2rem] bg-[color:var(--color-card)]/60 border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/25 hover:bg-[color:var(--color-card)] transition-all relative overflow-hidden"
              >
                {/* Featured glow */}
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-[color:var(--color-primary)]/8 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 text-[9px] font-black uppercase tracking-widest text-[color:var(--color-primary)]">
                        <Sparkles className="w-2.5 h-2.5" />
                        Guide Phare
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[color:var(--color-card)] border border-[color:var(--color-border)] text-[9px] font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">
                        <Clock className="w-2.5 h-2.5" />
                        {READ_TIMES[slug] || 5} min de lecture
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight group-hover:text-[color:var(--color-primary)] transition-colors">
                      {guide.title}
                    </h2>
                    <p className="text-[color:var(--color-text-muted)] leading-relaxed max-w-2xl">
                      {guide.description}
                    </p>
                  </div>

                  {/* CTA arrow */}
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl border border-[color:var(--color-border)] group-hover:bg-[color:var(--color-primary)] group-hover:border-[color:var(--color-primary)] transition-all duration-300 shrink-0">
                    <ChevronRight className="w-5 h-5 text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-primary-contrast)] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })()}

        {/* Remaining guides grid */}
        {guideEntries.length > 1 && (
          <div className="grid md:grid-cols-2 gap-5">
            {guideEntries.slice(1).map(([slug, guide], idx) => (
              <motion.div
                key={slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
              >
                <Link
                  to={`/guides/${slug}`}
                  className="group flex flex-col h-full p-7 rounded-[1.75rem] bg-[color:var(--color-card)]/50 border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/25 hover:bg-[color:var(--color-card)] transition-all relative overflow-hidden"
                >
                  {/* Hover glow */}
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-[color:var(--color-primary)]/6 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10 flex flex-col flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 text-[color:var(--color-primary)] group-hover:bg-[color:var(--color-primary)] group-hover:text-[color:var(--color-primary-contrast)] transition-all duration-300">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] text-[8px] font-bold uppercase tracking-widest text-[color:var(--color-text-subtle)]">
                        <Clock className="w-2.5 h-2.5" />
                        {READ_TIMES[slug] || 5} min
                      </span>
                    </div>

                    <h2 className="font-black text-lg tracking-tight mb-3 group-hover:text-[color:var(--color-primary)] transition-colors leading-snug">
                      {guide.title}
                    </h2>
                    <p className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed flex-1">
                      {guide.description}
                    </p>

                    {/* Read CTA */}
                    <div className="flex items-center gap-2 mt-6 pt-5 border-t border-[color:var(--color-border)]">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-primary)] transition-colors">
                        Lire le guide
                      </span>
                      <ArrowRight className="w-3 h-3 text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-primary)] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {guideEntries.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[color:var(--color-card)] border border-[color:var(--color-border)] flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7 text-[color:var(--color-text-subtle)]" />
            </div>
            <p className="text-[color:var(--color-text-muted)]">Aucun guide disponible pour le moment.</p>
          </div>
        )}
      </div>

      {/* ═══ CTA BOTTOM ═══ */}
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2.5rem] bg-[color:var(--color-card)]/60 border border-[color:var(--color-primary)]/10 p-10 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-primary)]/5 via-transparent to-indigo-500/5" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--color-primary)]/20 to-transparent" />

          <div className="relative z-10 space-y-4">
            <h3 className="text-xl font-black tracking-tight">Besoin d'un conseil personnalisé ?</h3>
            <p className="text-[color:var(--color-text-muted)] text-sm max-w-md mx-auto">
              Notre conseiller IA est disponible 24h/24 pour vous guider dans votre choix.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link
                to="/assistant"
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.25)]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Demander à l'IA
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl border border-[color:var(--color-border)] text-[color:var(--color-text)] font-bold text-xs uppercase tracking-widest hover:border-[color:var(--color-primary)]/30 transition-all"
              >
                Contacter un expert
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
