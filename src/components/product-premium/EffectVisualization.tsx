import { motion } from 'motion/react';

interface Props {
  metrics: Record<'Détente' | 'Saveur' | 'Arôme' | 'Puissance', number>;
}

const effectConfig: {
  key: keyof Props['metrics'];
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  bg: string;
}[] = [
    { key: 'Détente', label: 'Relaxation', sublabel: 'Effet apaisant & calme', icon: '🧘', color: 'from-[#10b981] to-[#34d399]', bg: 'bg-[#10b981]/10' },
    { key: 'Saveur', label: 'Goût', sublabel: 'Profil en bouche', icon: '👅', color: 'from-amber-500 to-amber-400', bg: 'bg-amber-50' },
    { key: 'Arôme', label: 'Parfum', sublabel: 'Expérience olfactive', icon: '👃', color: 'from-purple-500 to-purple-400', bg: 'bg-purple-50' },
    { key: 'Puissance', label: 'Intensité', sublabel: 'Ressenti des effets', icon: '⚡', color: 'from-[#ef4444] to-[#f87171]', bg: 'bg-[#ef4444]/10' },
  ];

export default function EffectVisualization({ metrics = {} as any }: Props) {
  return (
    <section className="relative border-y border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/50">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--color-primary)] mb-2">Analyse produit</p>
          <h3 className="text-3xl font-['Inter',sans-serif] font-black text-[color:var(--color-text)] uppercase">Évaluation Complète</h3>
          <p className="mt-2 text-sm text-[color:var(--color-text-muted)] font-medium">Score sur 10 basé sur la qualité globale, le design et le rapport qualité/prix.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {effectConfig.map(({ key, label, sublabel, icon, color, bg }, idx) => {
            const value = metrics[key] ?? 0;
            const percentage = Math.min(value * 10, 100);
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.07, duration: 0.4 }}
                className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5 space-y-4 shadow-sm hover:border-[color:var(--color-primary)]/30 transition-all cursor-default group"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform`}>
                    {icon}
                  </div>
                  <span className="text-2xl font-black text-[color:var(--color-text)]">{value}<span className="text-sm text-[color:var(--color-text-subtle)]">/10</span></span>
                </div>

                <div>
                  <p className="text-xs font-black text-[color:var(--color-text)] mb-0.5 uppercase tracking-wide">{label}</p>
                  <p className="text-[10px] text-[color:var(--color-text-subtle)] mb-2.5 font-bold">{sublabel}</p>
                  <div className="relative h-2 overflow-hidden rounded-full bg-[color:var(--color-bg-muted)]">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${color} shadow-[0_0_8px_rgba(var(--theme-neon-rgb),0.3)]`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${percentage}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: idx * 0.1, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}