import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Info, Gauge, Zap, LayoutGrid, List, CheckCircle2, ChevronRight, FlaskConical } from 'lucide-react';
import type { ProductSpec } from '../../types/premiumProduct';
import { formatProductText } from '../../lib/textFormatter';

interface Props {
  specs: ProductSpec[];
}

export default function ProductSpecs({ specs }: Props) {
  const [active, setActive] = useState(specs[0]?.name ?? '');
  const [viewMode, setViewMode] = useState<'details' | 'grid'>('details');

  // Group specs by category
  const groupedSpecs = useMemo(() => {
    const groups: Record<string, ProductSpec[]> = {};
    specs.forEach((spec) => {
      if (!groups[spec.category]) groups[spec.category] = [];
      groups[spec.category].push(spec);
    });
    return groups;
  }, [specs]);

  const activeSpec = specs.find((t) => t.name === active) ?? specs[0];

  if (!specs.length) return null;

  return (
    <section id="specs" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 scroll-mt-24">
      {/* ── Header ── */}
      <div className="mb-12 relative flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[color:var(--color-border)] pb-8">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 text-[color:var(--color-primary)]">
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">Analyse Botanique & Transparence</span>
          </div>
          <h3 className="text-4xl md:text-5xl font-black text-[color:var(--color-text)] tracking-tight leading-tight">
            Transparence <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--color-primary)] to-emerald-400">
              Absolue.
            </span>
          </h3>
          <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed max-w-xl font-medium">
            Plongez au cœur de nos formulations. Chaque produit est testé rigoureusement en laboratoire indépendant pour garantir un profil terpénique exceptionnel et une pureté inégalée.
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-[color:var(--color-bg-muted)] border border-[color:var(--color-border)] shadow-inner">
          <button
            onClick={() => setViewMode('details')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
              viewMode === 'details' 
                ? 'bg-[color:var(--color-card)] text-[color:var(--color-primary)] shadow-sm scale-100' 
                : 'text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] scale-95 hover:scale-100'
            }`}
          >
            <List className="w-4 h-4" /> Analyse Profonde
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
              viewMode === 'grid' 
                ? 'bg-[color:var(--color-card)] text-[color:var(--color-primary)] shadow-sm scale-100' 
                : 'text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] scale-95 hover:scale-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Vue Globale
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'details' ? (
          <motion.div
            key="details-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-8 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]"
          >
            {/* Sidebar Navigation */}
            <div className="flex flex-col gap-8">
              {Object.entries(groupedSpecs).map(([category, items], i) => (
                <div key={category} className="space-y-4">
                  <h4 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-subtle)]">
                    <span className="w-6 h-px bg-[color:var(--color-border-strong)]" />
                    {category}
                  </h4>
                  <div className="flex flex-col gap-2">
                    {items.map((spec) => {
                      const isActive = spec.name === active;
                      return (
                        <button
                          key={spec.name}
                          onClick={() => setActive(spec.name)}
                          className={`relative group flex items-center justify-between px-5 py-3.5 rounded-2xl text-left transition-all duration-300 ${
                            isActive
                              ? 'bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/30 shadow-[0_4px_20px_rgba(var(--theme-primary-rgb),0.1)]'
                              : 'bg-transparent text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-elevated)] hover:text-[color:var(--color-text)] border border-transparent'
                          }`}
                        >
                          {isActive && (
                            <motion.div 
                                layoutId="active-indicator"
                                className="absolute inset-0 bg-gradient-to-r from-[color:var(--color-primary)]/5 to-transparent rounded-2xl pointer-events-none"
                            />
                          )}
                          <div className="flex items-center gap-4 relative z-10">
                            <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.5)]' : 'opacity-60 group-hover:scale-110 group-hover:opacity-100'}`}>
                              {spec.icon}
                            </span>
                            <span className={`text-xs font-bold leading-tight ${isActive ? 'text-[color:var(--color-text)]' : ''}`}>
                              {spec.name}
                            </span>
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform duration-300 relative z-10 ${isActive ? 'translate-x-1 opacity-100' : 'opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-50'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bento Detail Panel */}
            <div className="min-h-[600px]">
              <AnimatePresence mode="wait">
                {activeSpec && (
                  <motion.div
                    key={activeSpec.name}
                    initial={{ opacity: 0, scale: 0.97, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.97, x: -20 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full flex flex-col gap-6"
                  >
                    {/* Top Row: Title & Score */}
                    <div className="grid md:grid-cols-[1fr_auto] gap-6">
                        <div className="relative rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 backdrop-blur-xl p-8 overflow-hidden shadow-sm flex items-center gap-6 group">
                            <div className="absolute -top-32 -right-32 w-64 h-64 bg-[color:var(--color-primary)]/10 rounded-full blur-[60px] pointer-events-none transition-all duration-700 group-hover:bg-[color:var(--color-primary)]/20" />
                            
                            <div className="w-20 h-20 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-muted)]/50 flex items-center justify-center text-4xl shadow-inner relative z-10">
                                {activeSpec.icon}
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-[10px] uppercase font-black tracking-widest text-[color:var(--color-text-subtle)] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-primary)]" />
                                    {activeSpec.category}
                                  </span>
                                  {activeSpec.intensity >= 95 && (
                                    <span className="flex items-center gap-1 text-[9px] uppercase font-black tracking-widest text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full border border-[#10b981]/20">
                                      <CheckCircle2 className="w-3 h-3" /> Premium
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-3xl md:text-4xl font-black text-[color:var(--color-text)] tracking-tight">
                                  {activeSpec.name}
                                </h4>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 backdrop-blur-xl p-8 shadow-sm flex flex-col justify-center min-w-[240px] relative overflow-hidden">
                            <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] mb-2 relative z-10">Indice d'Intensité</p>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-5xl font-black text-[color:var(--color-primary)] tracking-tighter">
                                    {activeSpec.intensity || 100}
                                </span>
                                <span className="text-xl font-bold text-[color:var(--color-primary)]/50">%</span>
                            </div>
                            <div className="mt-4 h-1.5 w-full rounded-full bg-[color:var(--color-bg-muted)] overflow-hidden relative z-10">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${activeSpec.intensity || 100}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full rounded-full bg-gradient-to-r from-[color:var(--color-primary)] to-emerald-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Details & Table */}
                    <div className="grid lg:grid-cols-2 gap-6 flex-1">
                        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 backdrop-blur-xl p-8 shadow-sm flex flex-col">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)] mb-6 flex items-center gap-2">
                                <Info className="w-3.5 h-3.5" /> Fiche Descriptive
                            </p>
                            <div 
                                className="prose prose-sm prose-invert max-w-none text-[color:var(--color-text-muted)] mt-auto
                                           [&>p]:leading-relaxed [&>p]:mb-4 
                                           [&>ul]:mt-4 [&>ul>li]:mb-2 [&>ul>li]:flex [&>ul>li]:items-start [&>ul>li]:gap-2
                                           [&>ul>li]:before:content-[''] [&>ul>li]:before:w-1.5 [&>ul>li]:before:h-1.5 [&>ul>li]:before:mt-1.5 [&>ul>li]:before:bg-[color:var(--color-primary)] [&>ul>li]:before:rounded-full [&>ul>li]:before:block"
                                dangerouslySetInnerHTML={{ __html: formatProductText(activeSpec.description) }}
                            />
                        </div>

                        <div className="flex flex-col gap-6">
                            {/* Dynamic Content based on Category */}
                            {activeSpec.category === 'Profil Aromatique' || activeSpec.category === 'Terpènes' ? (
                                <div className="rounded-3xl border border-[color:var(--color-border)] border-t-[color:var(--color-primary)] hover:border-t-emerald-400 bg-[color:var(--color-card)]/60 backdrop-blur-xl p-8 shadow-sm transition-colors duration-500 flex-1 flex flex-col justify-center">
                                    <h5 className="text-[10px] font-black text-[color:var(--color-text)] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                        <Zap className="w-3 h-3 text-[color:var(--color-primary)]" /> Répartition Terpénique
                                    </h5>
                                    <div className="space-y-5">
                                        {[
                                            { name: 'Myrcène (Terreux, Relaxant)', p: 85 },
                                            { name: 'Limonène (Agrumes, Énergisant)', p: 65 },
                                            { name: 'Caryophyllène (Poivré, Apaisant)', p: 45 },
                                        ].map(t => (
                                            <div key={t.name} className="space-y-2">
                                                <div className="flex justify-between items-end text-xs">
                                                    <span className="font-bold text-[color:var(--color-text)]">{t.name}</span>
                                                    <span className="font-black text-[color:var(--color-primary)]">{t.p}%</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-[color:var(--color-bg-muted)] overflow-hidden shadow-inner">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        whileInView={{ width: `${t.p}%` }}
                                                        viewport={{ once: true }}
                                                        transition={{ duration: 1, delay: 0.2 }}
                                                        className="h-full bg-gradient-to-r from-[color:var(--color-primary)] to-emerald-400" 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 backdrop-blur-xl p-8 shadow-sm flex-1 flex flex-col justify-center">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)] mb-6">
                                        Spécifications Techniques
                                    </h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Analyste', value: 'Lab-Botanique', icon: '🔬' },
                                            { label: 'Méthode', value: 'HPLC ISO', icon: '⚙️' },
                                            { label: 'Traçabilité', value: 'Blockchain', icon: '🔗' },
                                            { label: 'Pesticides', value: '0.0% (ND)', icon: '🌱' },
                                        ].map((item) => (
                                            <div key={item.label} className="p-4 rounded-2xl bg-[color:var(--color-bg-muted)] border border-[color:var(--color-bg-elevated)] flex flex-col gap-1.5 transition-colors hover:border-[color:var(--color-border)]">
                                                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[color:var(--color-text-subtle)] flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                                    <span>{item.icon}</span> {item.label}
                                                </span>
                                                <span className="text-sm font-black text-[color:var(--color-text)]">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-5 flex items-start gap-4">
                                <ShieldCheck className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500 mb-1">Garantie Vendeur</p>
                                    <p className="text-xs text-[color:var(--color-text-muted)] font-medium leading-relaxed">
                                        Ce produit a été rigoureusement testé par nos experts. Sa composition est certifiée conforme aux normes strictes de qualité européenne.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {specs.map((spec, i) => (
              <motion.div
                key={spec.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="group relative flex flex-col h-full rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 backdrop-blur-xl p-6 hover:border-[color:var(--color-primary)]/40 transition-all duration-500 shadow-sm hover:shadow-[0_10px_40px_rgba(var(--theme-primary-rgb),0.08)] hover:-translate-y-1.5 overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[color:var(--color-primary)]/0 via-[color:var(--color-primary)]/40 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] flex items-center justify-center text-2xl shadow-inner group-hover:bg-[color:var(--color-primary)]/10 group-hover:text-[color:var(--color-primary)] transition-colors duration-500 relative z-10">
                    {spec.icon}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] bg-[color:var(--color-bg-muted)] border border-[color:var(--color-border)] px-2.5 py-1 rounded-full relative z-10 block max-w-[120px] truncate text-center">
                    {spec.category}
                  </span>
                </div>

                <h5 className="text-lg font-black text-[color:var(--color-text)] tracking-tight mb-3 leading-tight group-hover:text-[color:var(--color-primary)] transition-colors duration-300">
                  {spec.name}
                </h5>

                <div 
                  className="text-[13px] text-[color:var(--color-text-muted)] font-medium leading-relaxed line-clamp-3 mb-6 relative z-10 flex-1
                             [&_p]:mb-0 [&_ul]:hidden"
                  dangerouslySetInnerHTML={{ __html: formatProductText(spec.description) }}
                />
                
                <div className="mt-auto pt-5 border-t border-[color:var(--color-border)]/50 relative z-10">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text)] mb-2.5">
                    <span className="opacity-60">Indice</span>
                    <span className="text-[color:var(--color-primary)]">{spec.intensity}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[color:var(--color-bg-muted)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${spec.intensity}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.1 }}
                      className="h-full bg-gradient-to-r from-[color:var(--color-primary)] to-emerald-400"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer Info ── */}
      <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-6 rounded-3xl bg-[color:var(--color-bg-muted)] border border-[color:var(--color-border)] overflow-hidden relative">
        <div className="absolute top-0 right-0 bottom-0 w-64 bg-gradient-to-l from-[color:var(--color-primary)]/5 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-card)] border border-[color:var(--color-border)] shadow-sm flex items-center justify-center text-[color:var(--color-text)]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-black text-[color:var(--color-text)] tracking-tight mb-1">Expertise & Traçabilité garantie</p>
            <p className="text-xs text-[color:var(--color-text-muted)] font-medium">Nos certificats d'analyse sont disponibles sur simple demande ou numérisables via le QR code de votre produit.</p>
          </div>
        </div>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('cortex-open-modal', { detail: 'performance' }))}
          className="relative z-10 group px-6 py-3 rounded-xl bg-[color:var(--color-text)] text-[color:var(--color-bg)] text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-[color:var(--color-primary)] hover:text-white hover:shadow-[0_5px_15px_rgba(var(--theme-primary-rgb),0.3)] whitespace-nowrap"
        >
          En savoir plus
        </button>
      </div>
    </section>
  );
}