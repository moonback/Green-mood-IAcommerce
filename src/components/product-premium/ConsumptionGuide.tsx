import { motion } from 'motion/react';
import { useSettingsStore } from '../../store/settingsStore';

const steps = [
  {
    icon: '🚚',
    title: 'Livraison',
    detail: 'Transport sécurisé',
    time: 'J+3 à J+7',
    body: 'Votre machine est livrée emballée sur palette, protégée contre les chocs. Un transporteur spécialisé vous contacte pour convenir d\'un créneau.',
  },
  {
    icon: '🔧',
    title: 'Installation',
    detail: 'Mise en place sur site',
    time: '1 à 3 h',
    body: 'Notre technicien pose et cale la machine à l\'emplacement choisi, effectue les connexions électriques et réseau, puis vérifie chaque fonction.',
  },
  {
    icon: '🎮',
    title: 'Démarrage',
    detail: 'Formation & premiers jeux',
    time: '30 min',
    body: 'Prise en main complète : réglages son/image, configuration monnayeur, démonstration des modes de jeu. Vous repartez autonome.',
  },
];

export default function ConsumptionGuide() {
  const { settings } = useSettingsStore();

  return (
    <section className="relative border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/20">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[color:var(--color-primary)] mb-2">Mise en service</p>
          <h3 className="text-3xl font-['Inter',sans-serif] font-bold text-[color:var(--color-text)]">De la commande au premier jeu</h3>
          <p className="mt-2 text-sm text-[color:var(--color-text-muted)] max-w-xl">
            {settings.store_name} gère tout de A à Z — livraison, installation et formation incluses.
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