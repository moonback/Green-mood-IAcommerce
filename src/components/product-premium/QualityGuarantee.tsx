import { motion } from 'motion/react';
import { ShieldCheck, Wrench, Truck, CreditCard, Headphones, Award } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

const badges = [
  { icon: <Award className="w-5 h-5" />, label: 'Meilleurs Prix', desc: 'Des millions d\'articles à prix réduits toute l\'année' },
  { icon: <ShieldCheck className="w-5 h-5" />, label: 'Paiement Sécurisé', desc: 'Règlement 100% crypté et facilité de paiement en 3x/4x sans frais' },
  { icon: <Truck className="w-5 h-5" />, label: 'Expédition 24h', desc: 'Livraison express en relais ou à domicile' },
  { icon: <Wrench className="w-5 h-5" />, label: 'Retours Simples', desc: 'Vous avez 30 jours pour changer d\'avis (frais offerts)' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'Immense Choix', desc: 'Culture, tech, mode... trouvez tout au même endroit' },
  { icon: <Headphones className="w-5 h-5" />, label: 'Service Client', desc: 'Nos conseillers sont à votre écoute 7j/7' },
];

export default function QualityGuarantee() {
  const { settings } = useSettingsStore();

  return (
    <section className="relative border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/30">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--color-primary)] mb-2">Notre engagement</p>
          <h3 className="text-3xl font-['Inter',sans-serif] font-black text-[color:var(--color-text)] uppercase">Le Choix & Les Prix</h3>
          <p className="mt-2 text-sm text-[color:var(--color-text-muted)] max-w-xl font-medium">
            Trouvez absolument tout ce que vous cherchez au meilleur prix possible sur {settings.store_name}, avec la sérénité d'une logistique infaillible.
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