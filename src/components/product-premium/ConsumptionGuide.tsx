import { motion } from 'motion/react';
import { useSettingsStore } from '../../store/settingsStore';

const steps = [
  {
    icon: '🌿',
    title: 'Préparation & Contrôle',
    detail: 'Haute Qualité',
    time: 'Luxe & Pureté',
    body: 'Nos fleurs de CBD sont sélectionnées avec une exigence extrême, manucurées à la main et analysées par des laboratoires indépendants pour garantir une pureté totale.',
  },
  {
    icon: '📦',
    title: 'Livraison Discrète',
    detail: 'Protection Optimale',
    time: '48h - 72h',
    body: 'Votre commande est expédiée dans des colis neutres et opaques, avec un triple emballage sous vide qui neutralise totalement les odeurs pour une totale discrétion.',
  },
  {
    icon: '🧘',
    title: 'Dégustation & Effet',
    detail: 'Bien-être Suprême',
    time: 'Relaxation Totale',
    body: 'Suivez nos guides de dosage personnalisés et profitez d\'un moment de sérénité. Nos extraits sont conçus pour agir en harmonie avec votre corps sans effet psychoactif.',
  },
];

export default function ConsumptionGuide() {
  const { settings } = useSettingsStore();

  return (
    <section className="relative border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/20">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[color:var(--color-primary)] mb-2">Artisans de la Détente</p>
          <h3 className="text-3xl font-['Inter',sans-serif] font-bold text-[color:var(--color-text)]">Un Voyage Botanique d'Exception</h3>
          <p className="mt-2 text-sm text-[color:var(--color-text-muted)] max-w-xl">
            {settings.store_name} vous guide vers une expérience de CBD premium, de la sélection des graines à votre rituel quotidien.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, idx) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="group relative rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 p-6 space-y-4 overflow-hidden hover:border-[color:var(--color-primary)]/40 transition-all"
            >
              {/* Step number watermark */}
              <span className="absolute top-5 right-5 text-[48px] font-black text-[color:var(--color-text)] opacity-10 leading-none select-none">
                {String(idx + 1).padStart(2, '0')}
              </span>

              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 flex items-center justify-center text-2xl mb-4 text-[color:var(--color-primary)]">
                  {step.icon}
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--color-primary)]">{step.detail}</p>
                  <span className="text-[color:var(--color-text-subtle)]">·</span>
                  <p className="text-[10px] text-[color:var(--color-text-muted)]">{step.time}</p>
                </div>
                <h4 className="text-xl font-['Inter',sans-serif] font-bold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors">{step.title}</h4>
                <p className="mt-3 text-sm text-[color:var(--color-text-muted)] leading-relaxed">{step.body}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}