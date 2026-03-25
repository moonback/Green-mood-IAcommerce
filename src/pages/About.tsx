import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Truck,
  Wrench,
  Star,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Users,
  Award,
  Globe,
  Gamepad2,
} from "lucide-react";
import SEO from "../components/SEO";
import { useSettingsStore } from "../store/settingsStore";
import { useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";

const values = [
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "Excellence Tech",
    description:
      "Chaque produit est rigoureusement sélectionné et testé par nos experts. Nous ne travaillons qu'avec des partenaires certifiés aux standards internationaux.",
  },
  {
    icon: <Truck className="w-6 h-6" />,
    title: "Livraison Expert",
    description:
      "Nous assurons une livraison sécurisée et rapide de vos équipements high-tech. Un service logistique dédié pour garantir l'intégrité de vos produits.",
  },
  {
    icon: <Wrench className="w-6 h-6" />,
    title: "Support Réactif",
    description:
      "Notre service client dispose de spécialistes tech et d'un support 24/7 pour vous accompagner dans la configuration et l'usage de vos innovations.",
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: "Innovation",
    description:
      "Nous dénichons les perles rares de la technologie avant qu'elles ne deviennent des standards. Notre mission : vous offrir le futur, aujourd'hui.",
  },
];

const commitments = [
  "Produits certifiés CE et conformes aux normes de sécurité",
  "Partenariats directs avec les marques tech mondiales",
  "Garantie constructeur 2 ans sur tout le catalogue",
  "Experts innovation disponibles pour vous conseiller",
];

export default function About() {
  const { settings } = useSettingsStore();

  const timeline = [
    {
      year: "2010",
      title: "L'Étincelle Innovation",
      desc: "Création de NeuroCart par un collectif d'ingénieurs passionnés, avec la mission de rendre la haute technologie accessible à tous.",
    },
    {
      year: "2014",
      title: "Showroom Connecté",
      desc: `Inauguration de notre premier espace de démonstration à Paris — un lieu hybride où le futur de la tech se vit en immersion totale.`,
    },
    {
      year: "2018",
      title: "Réseau Mondial",
      desc: "Établissement de partenariats exclusifs avec des start-ups de la Silicon Valley et d'Asie pour importer les innovations les plus disruptives.",
    },
    {
      year: "2021",
      title: "Digitalisation Totale",
      desc: "Lancement de notre plateforme e-commerce intelligente, intégrant des conseils personnalisés par IA pour chaque profil d'utilisateur.",
    },
    {
      year: "2024",
      title: "Leader High-Tech",
      desc: `${settings.store_name} devient la destination privilégiée pour l'innovation en France, avec une communauté de plus de 10 000 passionnés de tech.`,
    },
  ];

  const stats = [
    { value: "10K+", label: "Clients actifs" },
    { value: "1000+", label: "Produits innovants" },
    { value: "14 ans", label: "D'expertise tech" },
    { value: "4.9/5", label: "Satisfaction" },
  ];

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const schema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    mainEntity: {
      "@type": "Organization",
      "name": settings.store_name,
      "description": `Destination leader pour l'innovation high-tech et les produits premium en France`,
      "foundingDate": "2010",
      "url": settings.store_url,
    },
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pb-32">
      <SEO
        title={`À Propos — ${settings.store_name}, L'Innovation à votre Portée`}
        description={`Découvrez l'histoire de ${settings.store_name}, notre vision du futur et notre engagement pour une technologie performante et accessible.`}
        keywords={`à propos ${settings.store_name}, histoire high-tech, innovation France, gadgets connectés, showroom Paris`}
        schema={schema}
      />

      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center pt-32 pb-20 overflow-hidden">
        {/* Grain texture */}
        <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* Mouse-follow glow */}
        <motion.div
          style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
          className="absolute z-0 w-[600px] h-[600px] bg-[color:var(--color-primary)]/10 rounded-full blur-[140px] pointer-events-none opacity-20 mix-blend-screen"
        />

        <div className="relative z-20 max-w-7xl mx-auto px-5 w-full flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full space-y-8"
          >
            {/* Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 py-2 px-5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] text-[color:var(--color-primary)] text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-sm">
                <Sparkles className="w-4 h-4" />
                Notre Vision
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-serif font-bold tracking-tighter leading-none uppercase">
              NÉS POUR <br />
              <span className="text-[color:var(--color-primary)] italic glow-green">
                L'INNOVATION.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[color:var(--color-text-muted)] text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto font-light leading-relaxed">
              {settings.store_name} n'est pas un simple revendeur. C'est le point de rencontre entre
              la haute technologie et vos besoins quotidiens, un engagement total pour un futur intelligent.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission + Stats */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <p className="text-[color:var(--color-primary)] text-xs font-black uppercase tracking-[0.2em]">
                  Notre Mission
                </p>
                <h2 className="text-5xl md:text-6xl font-serif font-bold leading-tight uppercase">
                  Propulser chaque projet
                  <br />
                  <span className="text-[color:var(--color-primary)] italic">
                    avec le meilleur de la tech.
                  </span>
                </h2>
              </div>
              <div className="space-y-6 text-[color:var(--color-text-muted)] font-light leading-relaxed">
                <p>
                  Chez {settings.store_name}, nous croyons que l'innovation doit être un levier
                  de performance et de confort pour tous, sans compromis sur la fiabilité.
                </p>
                <p>
                  Nos experts analysent chaque avancée technologique pour ne retenir que
                  les solutions les plus pertinentes et durables : de l'ultra-premium au gadget intelligent accessible.
                </p>
                <p>
                  Plus qu'un catalogue, nous offrons un accompagnement personnalisé pour
                  intégrer le futur dans votre écosystème personnel ou professionnel.
                </p>
              </div>
              <Link
                to="/catalogue"
                className="inline-flex items-center gap-3 px-8 py-4 bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black uppercase tracking-widest text-sm rounded-2xl hover:opacity-90 transition-all group"
              >
                Explorer nos innovations
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-6"
            >
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/20 transition-all text-center space-y-2"
                >
                  <div className="text-3xl md:text-4xl font-black text-[color:var(--color-primary)]">
                    {stat.value}
                  </div>
                  <div className="text-xs text-[color:var(--color-text-subtle)] font-medium uppercase tracking-widest">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-4 border-t border-[color:var(--color-border)]">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <p className="text-[color:var(--color-primary)] text-xs font-black uppercase tracking-[0.2em]">
              Pourquoi nous ?
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold uppercase">
              Nos Valeurs Fondamentales
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/20 transition-all group space-y-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-primary)]/10 flex items-center justify-center text-[color:var(--color-primary)] group-hover:bg-[color:var(--color-primary)]/20 transition-colors">
                  {value.icon}
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-bold uppercase tracking-wider">{value.title}</h3>
                  <p className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 px-4 border-t border-[color:var(--color-border)]">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <p className="text-[color:var(--color-primary)] text-xs font-black uppercase tracking-[0.2em]">
              Notre Parcours
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold uppercase">
              Une décennie d'{" "}
              <span className="text-[color:var(--color-primary)] italic tracking-tighter">ÉVOLUTION</span>
            </h2>
          </div>

          <div className="relative space-y-8">
            <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-emerald-500/50 via-emerald-500/20 to-transparent" />
            {timeline.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-8 items-start pl-16 relative"
              >
                <div className="absolute left-3 top-2 w-6 h-6 rounded-full bg-[color:var(--color-bg)] border-2 border-emerald-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[color:var(--color-primary)]" />
                </div>
                <div className="p-6 rounded-2xl bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/20 transition-all flex-1">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-[color:var(--color-primary)] font-black text-xl">
                      {item.year}
                    </span>
                    <h3 className="text-[color:var(--color-text)] font-bold uppercase tracking-widest">{item.title}</h3>
                  </div>
                  <p className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment Banner */}
      <section className="py-24 px-4 border-t border-[color:var(--color-border)]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[3rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] p-12 lg:p-20 text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/5" />
            <div className="relative z-10 space-y-8 max-w-3xl mx-auto">
              <div className="w-20 h-20 rounded-full bg-[color:var(--color-primary)]/10 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-10 h-10 text-[color:var(--color-primary)]" />
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold uppercase">
                Notre engagement{" "}
                <span className="text-[color:var(--color-primary)] italic">indéfectible</span>
              </h2>
              <p className="text-[color:var(--color-text-muted)] font-light leading-relaxed text-lg">
                Nous ne distribuons jamais un produit que nous ne pouvons pas certifier à 100%.
                Chaque référence est homologuée, testée par notre équipe technique
                et validée selon les standards les plus stricts de l'industrie technologique mondiale.
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                {commitments.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-[color:var(--color-text-muted)]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[color:var(--color-primary)] flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center border-t border-[color:var(--color-border)]">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-[color:var(--color-primary)]" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)]">
              Prêt pour le futur ?
            </span>
          </div>
          <h2 className="text-4xl font-serif font-bold uppercase">
            Équipez votre quotidien avec{" "}
            <span className="text-[color:var(--color-primary)] italic">{settings.store_name}</span>
          </h2>
          <p className="text-[color:var(--color-text-muted)] font-light">
            Découvrez notre sélection exclusive ou contactez nos experts
            pour un diagnostic innovation personnalisé.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/catalogue"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black uppercase tracking-widest text-sm rounded-2xl hover:opacity-90 transition-all group"
            >
              Voir le catalogue
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-3 px-8 py-4 border border-[color:var(--color-border)] text-[color:var(--color-text)] font-bold uppercase tracking-widest text-sm rounded-2xl hover:border-[color:var(--color-primary)]/40 transition-all"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
