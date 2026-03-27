import { motion } from 'motion/react';
import { ShieldCheck, Wrench, Truck, CreditCard, Headphones, Award } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

const badges = [
  { icon: <Award className="w-5 h-5" />, label: 'Qualité Royale', desc: 'Sélection rigoureuse des meilleures fleurs et résines premium' },
  { icon: <ShieldCheck className="w-5 h-5" />, label: 'Analyses Labo', desc: 'Tous nos produits sont testés pour garantir pureté et conformité THC < 0.3%' },
  { icon: <Truck className="w-5 h-5" />, label: 'Livraison Discrète', desc: 'Expédition rapide sous 24h dans un emballage neutre et inodore' },
  { icon: <Wrench className="w-5 h-5" />, label: 'Expertise Budtender', desc: 'Des conseils d\'experts pour trouver la variété adaptée à vos besoins' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'Bien-être Suprême', desc: 'Détente, sommeil, récupération... le meilleur du CBD légal' },
  { icon: <Headphones className="w-5 h-5" />, label: 'Soutien Client', desc: 'Notre équipe est à votre écoute pour une expérience d\'exception' },
];

export default function QualityGuarantee() {
  const { settings } = useSettingsStore();

  return (
    <section className="relative border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/30">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--color-primary)] mb-2">Notre engagement</p>
          <h3 className="text-3xl text-[color:var(--color-text)]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>L'Excellence du <span className="text-[color:var(--color-primary)] italic">CBD Premium</span></h3>
          <p className="mt-2 text-sm text-[color:var(--color-text-muted)] max-w-xl font-medium">
            Découvrez une sélection exclusive de produits botaniques chez {settings.store_name}, avec la garantie d'une pureté absolue et d'effets contrôlés.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge, idx) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.07, duration: 0.4 }}
              className="group flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5 hover:border-[color:var(--color-primary)]/30 hover:bg-[color:var(--color-primary)]/5 transition-all shadow-sm hover:shadow-md cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 flex items-center justify-center text-[color:var(--color-primary)] flex-shrink-0 group-hover:scale-110 group-hover:bg-[color:var(--color-primary)]/20 transition-all shadow-sm">
                {badge.icon}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm font-black text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors uppercase tracking-tight">{badge.label}</p>
                <p className="text-[11px] text-[color:var(--color-text-muted)] mt-1 leading-relaxed font-medium group-hover:text-[color:var(--color-text-subtle)] transition-colors">{badge.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}