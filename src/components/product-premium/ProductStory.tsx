import { motion, useScroll, useTransform, useInView } from 'motion/react';
import { useRef } from 'react';
import { Sparkles, Quote, Sprout, Wind, ShieldCheck, Microscope } from 'lucide-react';

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

  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.8, 1, 1, 0.8]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);

  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={containerRef}
      className="relative min-h-[60vh] w-full overflow-hidden border-y border-[color:var(--color-border)]/30 bg-[color:var(--color-bg)] py-16 lg:py-20"
    >
      {/* Immersive Parallax Background */}
      <motion.div
        style={{ y: y1, opacity, scale }}
        className="absolute inset-0 z-0"
      >
        <img
          src="/premium_wellness_story_bg_1775484333607.png"
          alt="Premium Background"
          className="h-full w-full object-cover opacity-15 grayscale brightness-[0.9]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--color-bg)] via-[color:var(--color-bg)]/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[color:var(--color-bg)] to-transparent" />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20">
          
          {/* Detailed Story Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3">
              <div className="h-0.5 w-8 bg-gradient-to-r from-[color:var(--color-primary)] to-transparent" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-primary)]">
                Genèse & Vision
              </span>
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl text-[color:var(--color-text)] leading-none" style={{ fontFamily: "'DM Serif Display', serif" }}>
                L'âme de {title}
              </h2>
              <div className="relative max-w-xl">
                <Quote className="absolute -top-8 -left-6 h-16 w-16 text-[color:var(--color-primary)]/10" />
                <div 
                  className="relative space-y-4 text-lg leading-relaxed text-[color:var(--color-text-muted)] font-medium"
                  dangerouslySetInnerHTML={{ 
                    __html: text.length > 500 ? text.slice(0, 500) + '...' : text 
                  }}
                />
              </div>
            </div>

            {/* Interactive Quality Stamps */}
            <div className="flex gap-8 border-t border-[color:var(--color-border)]/50 pt-8 mt-4">
               <div className="flex items-center gap-3">
                 <ShieldCheck className="h-5 w-5 text-[color:var(--color-primary)]/60" />
                 <div className="flex flex-col">
                   <span className="text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text)]">Certifié</span>
                   <span className="text-[8px] text-[color:var(--color-text-subtle)] uppercase">Analyses Labo</span>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <Wind className="h-5 w-5 text-cyan-500/60" />
                 <div className="flex flex-col">
                   <span className="text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text)]">Terpènes</span>
                   <span className="text-[8px] text-[color:var(--color-text-subtle)] uppercase">Sauvegardés</span>
                 </div>
               </div>
            </div>
          </motion.div>

          {/* Technical Detail Grid (Detailed side) */}
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex flex-col justify-center"
          >
            <div className="bg-white/[0.02] dark:bg-white/[0.04] border border-white/[0.08] rounded-[2.5rem] p-8 lg:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--color-primary)]/10 blur-[60px] -z-10 group-hover:scale-150 transition-transform duration-1000" />
              
              <div className="flex items-center gap-3 mb-8">
                <Microscope className="h-5 w-5 text-[color:var(--color-primary)]" />
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[color:var(--color-text)]">Données Techniques</h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: "Mode de Culture", value: "Indoor Organique", icon: Sprout },
                  { label: "Extraction", value: "Cryogénique", icon: Wind },
                  { label: "Séchage", value: "Lent à froid", icon: ShieldCheck },
                  { label: "Température", value: "19°C constant", icon: Microscope },
                ].map((item, i) => (
                  <div key={i} className="space-y-2 group/item">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-3 w-3 text-[color:var(--color-primary)] group-hover/item:scale-110 transition-transform" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)]">{item.label}</span>
                    </div>
                    <p className="text-[11px] font-bold text-[color:var(--color-text)] uppercase">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-green-neon">Score BudTender</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-1.5 w-1.5 rounded-full bg-green-neon" />
                    ))}
                  </div>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-black uppercase text-[color:var(--color-text)]">Excellence</span>
                   <p className="text-[8px] text-[color:var(--color-text-subtle)] uppercase">Botanique Approuvée</p>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}