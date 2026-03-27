import { motion } from 'motion/react';
import { Home, Coffee, Building2, Info, CheckCircle2, Users, TrendingUp } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

const profiles = [
  {
    level: 'Léger / Découverte',
    context: 'Détente Quotidienne',
    tip: 'Idéal pour une première expérience. Apaise l\'esprit sans altérer la concentration. Parfait en journée pour rester productif et détendu.',
    icon: Coffee,
    color: 'from-emerald-500/20 to-teal-500/10',
    intensity: 33,
  },
  {
    level: 'Équilibré / Médium',
    context: 'Sérénité Active',
    tip: 'Idéal après le travail. Aide à déconnecter et favorise une récupération musculaire optimale. Une intensité modérée pour un bien-être durable.',
    icon: Home,
    color: 'from-amber-500/20 to-orange-500/10',
    intensity: 66,
  },
  {
    level: 'Intense / Profond',
    context: 'Repos Absolu',
    tip: 'Notre concentration maximale. Conçue pour favoriser un sommeil réparateur profond et calmer les tensions les plus fortes.',
    icon: Building2,
    color: 'from-purple-500/20 to-indigo-500/10',
    intensity: 100,
  },
];

const tips = [
  { icon: CheckCircle2, title: 'Dosage Progressif', text: 'Commencez par une faible dose et augmentez par paliers de 5mg jusqu\'à trouver votre équilibre idéal.' },
  { icon: Users, title: 'Accompagnement', text: 'Chaque organisme réagit différemment. Nos conseillers sont là pour vous orienter selon vos besoins spécifiques.' },
  { icon: TrendingUp, title: 'Consommation Bio', text: 'Privilégiez les infusions ou la vaporisation pour préserver l\'intégrité des cannabinoïdes et des terpènes.' },
];

export default function DosageGuide() {
  const { settings } = useSettingsStore();

  return (
    <section className="relative overflow-hidden border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/50 py-24">
      {/* Background ambient */}
      <div className="absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 bg-[color:var(--color-primary)]/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[1fr_auto_1fr]">

          {/* Left: context & tips */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[color:var(--color-primary)]"
            >
              <CheckCircle2 size={14} className="mb-0.5" />
              Guide de Bien-être
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-4xl text-[color:var(--color-text)] md:text-5xl"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Trouvez votre<br />
              <span className="text-[color:var(--color-text-subtle)] italic">équilibre.</span>
            </motion.h3>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-12 space-y-8"
            >
              <p className="text-[color:var(--color-text-muted)] leading-relaxed">
                Le dosage du CBD dépend de votre poids, de votre métabolisme et de vos attentes. L'équipe{' '}
                <span className="text-[color:var(--color-text)] border-b border-[color:var(--color-primary)]/30">{settings.store_name}</span>{' '}
                a conçu ces profils pour vous aider à débuter votre voyage botanique.
              </p>

              <div className="space-y-6">
                {tips.map((tip, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-none flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 text-[color:var(--color-primary)]">
                      <tip.icon size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[color:var(--color-text)]">{tip.title}</h4>
                      <p className="text-xs text-[color:var(--color-text-muted)] mt-1 leading-relaxed">{tip.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-[color:var(--color-border)] to-transparent" />

          {/* Right: profile cards */}
          <div className="space-y-6">
            {profiles.map((item, idx) => (
              <motion.div
                key={item.level}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                whileHover={{ x: 8 }}
                className="group relative flex items-center gap-6 rounded-[1.5rem] border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 p-6 transition-all hover:border-[color:var(--color-primary)]/35 hover:bg-[color:var(--color-card)]/60"
              >
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-gradient-to-br ${item.color} backdrop-blur-sm transition-transform group-hover:scale-110`}>
                  <item.icon className="text-[color:var(--color-primary)]" size={28} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">{item.level}</p>
                    <span className="text-[10px] font-bold text-[color:var(--color-primary)] px-2 py-0.5 rounded-full bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/25">
                      {item.context}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-text-muted)] line-clamp-2">{item.tip}</p>

                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-bg-muted)]">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.intensity}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                      className="h-full bg-[color:var(--color-primary)] shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.5)]"
                    />
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 p-4"
            >
              <Info size={16} className="text-[color:var(--color-primary)] shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium leading-relaxed text-[color:var(--color-text-muted)] italic">
                Ces informations sont données à titre pédagogique et ne constituent pas un avis médical. Consultez un professionnel de santé en cas de besoin.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}