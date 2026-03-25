import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Info, Gauge, Zap, LayoutGrid, List } from 'lucide-react';
import type { ProductSpec } from '../../types/premiumProduct';
import { formatProductText } from '../../lib/textFormatter';

interface Props {
  specs: ProductSpec[];
}

export default function ProductSpecs({ specs }: Props) {
  const [active, setActive] = useState(specs[0]?.name ?? '');
  const [viewMode, setViewMode] = useState<'details' | 'grid'>('grid');

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
    <section id="specs" className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 lg:px-8 scroll-mt-24">
      {/* ── Header Decor ── */}
      <div className="mb-12 relative">
        <div className="absolute -left-4 top-0 w-1 h-12 bg-gradient-to-b from-[color:var(--color-primary)] to-transparent rounded-full" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-primary)] mb-2 flex items-center gap-2">
          <Info className="w-3 h-3" /> Expertise & Transparence
        </p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-4xl font-black text-[color:var(--color-text)] uppercase tracking-tight leading-none">
              Composition <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--color-primary)] to-emerald-400">& Analyse</span>
            </h3>
            <p className="text-sm text-[color:var(--color-text-muted)] max-w-xl font-medium">
              Nous garantissons une traçabilité totale et des analyses en laboratoire indépendant pour chaque lot.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[color:var(--color-bg-muted)] border border-[color:var(--color-border)] self-start md:self-auto">
            <button
              onClick={() => setViewMode('details')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'details' ? 'bg-[color:var(--color-card)] text-[color:var(--color-primary)] shadow-sm' : 'text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)]'}`}
              title="Vue détaillée"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[color:var(--color-card)] text-[color:var(--color-primary)] shadow-sm' : 'text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)]'}`}
              title="Vue grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'details' ? (
          <motion.div
            key="details-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-8 lg:grid-cols-[340px_1fr]"
          >
            {/* Selector with categories */}
            <div className="space-y-8 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-[color:var(--color-border-strong)]">
              {Object.entries(groupedSpecs).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-1 h-1 rounded-full bg-[color:var(--color-primary)]" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)]">{category}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {items.map((spec) => {
                      const isActive = spec.name === active;
                      return (
                        <motion.button
                          key={spec.name}
                          onClick={() => setActive(spec.name)}
                          whileHover={{ x: isActive ? 0 : 4 }}
                          className={`group flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all border ${isActive
                            ? 'border-[color:var(--color-primary)]/40 bg-gradient-to-r from-[color:var(--color-primary)]/15 to-transparent text-[color:var(--color-primary)] shadow-lg'
                            : 'border-transparent bg-[color:var(--color-bg-muted)] text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-elevated)] hover:text-[color:var(--color-text)]'
                            }`}
                        >
                          <span className={`text-2xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 opacity-70'}`}>
                            {spec.icon}
                          </span>
                          <div className="min-w-0">
                            <p className={`text-xs font-black leading-none truncate mb-1 ${isActive ? 'text-[color:var(--color-text)]' : ''}`}>{spec.name}</p>
                            <p className="text-[9px] font-bold text-[color:var(--color-text-subtle)] uppercase tracking-tighter opacity-70">
                              {isActive ? 'Sélectionné' : 'Voir détails'}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Detail panel */}
            <div className="min-h-[500px]">
              <AnimatePresence mode="wait">
                {activeSpec && (
                  <motion.div
                    key={activeSpec.name}
                    initial={{ opacity: 0, scale: 0.98, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.98, x: -20 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="relative h-full rounded-3xl border border-[color:var(--color-border)] bg-gradient-to-br from-[color:var(--color-card)] to-[color:var(--color-bg)] p-8 md:p-12 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] group"
                  >
                    {/* Background Elements */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-[color:var(--color-primary)]/10 rounded-full blur-[80px] pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
                    <div className="absolute top-0 right-0 p-8 text-[color:var(--color-primary)]/5 font-black text-9xl select-none leading-none pointer-events-none">
                      {activeSpec.icon}
                    </div>

                    <div className="relative h-full flex flex-col">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                        <div className="flex items-center gap-6">
                          <div className="w-24 h-24 rounded-[30px] border-2 border-[color:var(--color-primary)]/20 bg-gradient-to-br from-[color:var(--color-primary)]/20 to-transparent flex items-center justify-center text-5xl flex-shrink-0 shadow-[0_10px_30px_rgba(var(--theme-primary-rgb),0.2)]">
                            {activeSpec.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 px-3 py-1 rounded-full border border-[color:var(--color-primary)]/20">
                                {activeSpec.category}
                              </span>
                              {activeSpec.intensity >= 95 && (
                                <span className="flex items-center gap-1 text-[9px] uppercase font-black tracking-widest text-[#10b981]">
                                  <ShieldCheck className="w-3 h-3" /> Top Produit
                                </span>
                              )}
                            </div>
                            <h4 className="text-4xl md:text-5xl font-black text-[color:var(--color-text)] uppercase leading-none tracking-tight">
                              {activeSpec.name}
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 space-y-12">
                        <div className="space-y-4">
                          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-subtle)] flex items-center gap-2">
                            <span className="w-8 h-px bg-[color:var(--color-primary)]/30" /> Analyse Bio-chimique
                          </p>
                          <div 
                            className="text-lg md:text-xl text-[color:var(--color-text)] leading-relaxed font-medium bg-[color:var(--color-bg-elevated)] backdrop-blur-sm p-8 rounded-3xl border border-[color:var(--color-border)] shadow-inner [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                            dangerouslySetInnerHTML={{ __html: formatProductText(activeSpec.description) }}
                          />
                        </div>

                        {/* Metrics visualization */}
                        <div className="grid md:grid-cols-2 gap-8 items-end">
                          <div className="space-y-6">
                            <div className="space-y-1">
                              <div className="flex justify-between items-end mb-3">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)]">Intensité Bien-être</p>
                                  <p className="text-2xl font-black text-[color:var(--color-text)]">
                                    {activeSpec.intensity >= 90 ? 'Luxe / Pur' : activeSpec.intensity >= 80 ? 'Équilibré' : 'Subtil'}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-4xl font-black text-[color:var(--color-primary)] drop-shadow-[0_0_10px_rgba(var(--theme-primary-rgb),0.4)]">
                                    {activeSpec.intensity || 100}<span className="text-xl">%</span>
                                  </span>
                                </div>
                              </div>
                              <div className="h-4 rounded-full bg-[color:var(--color-bg-muted)] overflow-hidden p-1 border border-[color:var(--color-border)] shadow-inner">
                                <motion.div
                                  key={activeSpec.name + '-bar'}
                                  className="h-full rounded-full bg-gradient-to-r from-[color:var(--color-primary)] via-emerald-500 to-emerald-400 relative"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${activeSpec.intensity || 100}%` }}
                                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                                >
                                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                                  <motion.div
                                    animate={{ x: ['-100%', '200%'] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                                  />
                                </motion.div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-[color:var(--color-bg-elevated)] rounded-2xl p-6 border border-[color:var(--color-border)] flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[color:var(--color-primary)]/20 flex items-center justify-center text-[color:var(--color-primary)]">
                              <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] mb-1">Effet Notoire</p>
                              <p className="text-xs font-bold text-[color:var(--color-text)] leading-snug">
                                {activeSpec.intensity >= 90 
                                  ? "Une caractéristique qui démarque vraiment cette variété par sa puissance et sa pureté." 
                                  : "Un profil équilibré offrant une expérience douce et agréable pour le quotidien."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-12 flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          <Gauge className="w-3 h-3" /> Article vérifié
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" /> Garantie Vendeur
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {specs.map((spec, i) => (
              <motion.div
                key={spec.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="group relative rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6 hover:border-[color:var(--color-primary)]/50 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[color:var(--color-bg-muted)] flex items-center justify-center text-2xl shadow-inner group-hover:bg-[color:var(--color-primary)]/10 transition-colors">
                    {spec.icon}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] bg-[color:var(--color-bg-muted)] px-2 py-0.5 rounded-md">
                    {spec.category}
                  </span>
                </div>
                <h5 className="text-sm font-black text-[color:var(--color-text)] uppercase tracking-tight mb-2 leading-none group-hover:text-[color:var(--color-primary)] transition-colors">
                  {spec.name}
                </h5>
                <div 
                  className="text-xs text-[color:var(--color-text-muted)] leading-relaxed line-clamp-3 [&_p]:mb-2"
                  dangerouslySetInnerHTML={{ __html: formatProductText(spec.description) }}
                />
                
                <div className="mt-4 pt-4 border-t border-[color:var(--color-border)]/50">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] mb-2">
                    <span>Intensité</span>
                    <span>{spec.intensity}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-[color:var(--color-bg-muted)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${spec.intensity}%` }}
                      className="h-full bg-[color:var(--color-primary)]"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer Info ── */}
      <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-[color:var(--color-primary)]/5 to-transparent border border-[color:var(--color-primary)]/10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[color:var(--color-primary)]/20 flex items-center justify-center text-[color:var(--color-primary)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-black text-[color:var(--color-text)] uppercase tracking-widest">Engagement Qualité</p>
            <p className="text-[11px] text-[color:var(--color-text-muted)] font-medium">Produits sélectionnés rigoureusement · Des millions d'avis clients · Le meilleur choix garanti</p>
          </div>
        </div>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('cortex-open-modal', { detail: 'performance' }))}
          className="px-6 py-2.5 rounded-xl bg-[color:var(--color-card)] border border-[color:var(--color-border)] text-[10px] font-black text-[color:var(--color-text)] uppercase tracking-[0.2em] hover:border-[color:var(--color-primary)] transition-all shadow-sm"
        >
          Voir les détails
        </button>
      </div>
    </section>
  );
}