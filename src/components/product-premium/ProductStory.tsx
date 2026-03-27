import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Sparkles, Quote } from 'lucide-react';

interface Props {
  title: string;
  text: string;
}

export default function ProductStory({ title, text }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.4, 1, 1, 0.4]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[70vh] w-full overflow-hidden border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]"
    >
      {/* Background Image with Parallax */}
      <motion.div
        style={{ y, opacity }}
        className="absolute inset-0 z-0"
      >
        <img
          src="/images/premium_wellbeing_lifestyle.png"
          alt="Illustration produit"
          loading="lazy"
          className="h-full w-full object-cover scale-110 opacity-30"
        />
        {/* Theme-aware gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--color-bg)] via-[color:var(--color-bg)]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-bg)] via-transparent to-[color:var(--color-bg)]/30" />
      </motion.div>

      {/* Decorative Floating Glows */}
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-[color:var(--color-primary)]/10 blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-cyan-600/10 blur-[120px]" />

      <div className="relative z-10 mx-auto grid min-h-[70vh] max-w-7xl items-center px-6 py-24 lg:grid-cols-2 lg:gap-16">
        {/* Left Content Side */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 px-4 py-2 backdrop-blur-xl shadow-2xl">
            <Sparkles className="h-4 w-4 text-[color:var(--color-primary)]" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[color:var(--color-primary)]">
              Présentation Détaillée
            </span>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl text-[color:var(--color-text)] sm:text-5xl lg:text-6xl leading-[1.1]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              <span className="block text-[color:var(--color-text-subtle)] text-xl mb-2" style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Zoom sur</span>
              {title}
            </h2>

            <div className="relative">
              <Quote className="absolute -top-10 -left-6 h-20 w-20 text-[color:var(--color-text)]/5 rotate-180" />
              <div 
                className="relative z-10 text-xl leading-relaxed text-[color:var(--color-text-muted)] font-medium border-l border-[color:var(--color-primary)]/30 pl-8 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_li]:mb-2 [&_strong]:text-[color:var(--color-primary)] [&_strong]:font-black"
                dangerouslySetInnerHTML={{ __html: text }}
              />
            </div>
          </div>

          {/* Detail */}
          <div className="flex items-center gap-6 pt-4">
            <div className="h-px flex-1 bg-gradient-to-r from-[color:var(--color-primary)]/40 to-transparent" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-subtle)]">
              Sélectionné pour vous
            </span>
          </div>
        </motion.div>
      </div>

      {/* Modern Accent line at the bottom */}
      <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-[color:var(--color-primary)]/20 to-transparent" />
    </section>
  );
}