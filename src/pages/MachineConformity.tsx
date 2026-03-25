import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  FileText,
  Globe,
  BookOpen,
  Scale,
} from "lucide-react";
import SEO from "../components/SEO";
import { useSettingsStore } from "../store/settingsStore";

const legalPoints = [
  {
    icon: <Scale className="w-6 h-6" />,
    title: "Certification CE Obligatoire",
    content:
      "Tous nos produits sont certifiés CE conformément aux directives européennes applicables (LVD, EMC, RoHS). Cette certification garantit la conformité aux exigences de sécurité, de santé et de protection de l'environnement.",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Réglementation High-Tech",
    content:
      "La distribution d'équipements technologiques et connectés en France est encadrée par des normes de cybersécurité et d'efficacité énergétique. NeuroCart respecte toutes les obligations légales et environnementales (DEEE).",
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "Garantie Constructeur 2 ans",
    content:
      "Conformément à la législation européenne sur la garantie légale de conformité, tous nos produits bénéficient d'une garantie constructeur minimale de 2 ans couvrant les défauts matériels et logiciels.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "Support & Maintenance",
    content:
      "Notre support technique dispose d'un accès direct aux centres de réparation agréés. Nous garantissons la disponibilité des mises à jour et des pièces critiques pour une durabilité maximale.",
  },
];

const restrictions = [
  "Utilisation conforme au manuel utilisateur fournie",
  "Mises à jour logicielles régulières recommandées",
  "Modifications non autorisées annulant la garantie",
  "Signalement de toute anomalie sous 48h",
  "Recyclage via les filières DEEE en fin de vie",
];

const allowedThings = [
  "Garantie constructeur 2 ans sur tout défaut",
  "Certification CE sur 100% du catalogue",
  "Support technique expert inclus",
  "Accès prioritaire aux nouvelles versions",
  "Droit de rétractation de 14 jours respecté",
];

const faqItems = [
  {
    q: "Que couvre exactement la garantie ?",
    a: "La garantie couvre les défauts de fabrication, les pannes de composants internes et les bugs logiciels majeurs empêchant l'usage normal. Elle exclut les dommages physiques et l'oxydation.",
  },
  {
    q: "Comment fonctionne le support technique ?",
    a: "Notre équipe est joignable 24/7 par chat. En cas de panne matérielle, nous organisons le retour produit ou l'envoi d'un technicien certifié selon la catégorie d'équipement.",
  },
  {
    q: "Les produits sont-ils déjà configurés ?",
    a: "La plupart de nos innovations sont 'Plug & Play'. Si une configuration complexe est nécessaire, nos guides interactifs et notre IA de support vous accompagnent pas à pas.",
  },
  {
    q: "Proposez-vous une extension de garantie ?",
    a: "Oui, NeuroCart propose des extensions de garantie 'Elite' allant jusqu'à 5 ans, incluant le remplacement à neuf et le prêt de matériel de secours.",
  },
];

export default function MachineConformity() {
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

  const { settings } = useSettingsStore();

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Garanties, Certifications & Conformité — ${settings.store_name}`,
    description:
      `Tout savoir sur les certifications CE, garanties constructeur et engagement qualité des produits innovants chez ${settings.store_name}.`,
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pb-32">
      <SEO
        title={`Garanties & Conformité — Certifications High-Tech | ${settings.store_name}`}
        description={`Découvrez les garanties de ${settings.store_name}, certifications CE et conformité réglementaire de toutes nos innovations technologiques.`}
        keywords={`garantie high-tech, certification CE produit, conformité tech, support client ${settings.store_name}, innovations certifiées`}
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
                <Scale className="w-4 h-4" />
                Fiabilité & Normes
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-serif font-bold tracking-tighter leading-none text-[color:var(--color-text)] uppercase">
              GARANTIES & <br />
              <span className="text-[color:var(--color-primary)] italic glow-green">
                CONFORMITÉ.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[color:var(--color-text-muted)] text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto font-light leading-relaxed">
              Tout savoir sur nos certifications, notre charte qualité et notre SAV expert.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Certification Status Banner */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[2rem] bg-[color:var(--color-primary)]/5 border border-[color:var(--color-primary)]/20 p-8"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-[color:var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-8 h-8 text-[color:var(--color-primary)]" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-[color:var(--color-text)] mb-2">
                  Standard CE : La garantie d'une technologie sûre et homologuée
                </h2>
                <p className="text-[color:var(--color-text-muted)] font-light">
                  Tous les équipements distribués par {settings.store_name} sont soumis à des tests rigoureux de sécurité électrique et de compatibilité électromagnétique. Nous ne faisons aucun compromis sur la sécurité de votre écosystème.
                </p>
              </div>
              <div className="px-6 py-3 rounded-xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 text-center flex-shrink-0">
                <div className="text-2xl font-black text-[color:var(--color-primary)]">
                  CE
                </div>
                <div className="text-xs text-[color:var(--color-text-muted)] font-medium uppercase tracking-wider">
                  Certifié
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Legal Framework */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-[color:var(--color-primary)] text-xs font-black uppercase tracking-[0.2em]">
              Cadre légal
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold uppercase">
              Nos Engagemens de Conformité
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {legalPoints.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/20 transition-all group space-y-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[color:var(--color-primary)]/10 flex items-center justify-center text-[color:var(--color-primary)] group-hover:bg-[color:var(--color-primary)]/20 transition-colors flex-shrink-0">
                    {point.icon}
                  </div>
                  <h3 className="text-lg font-bold pt-2 uppercase tracking-wide">{point.title}</h3>
                </div>
                <p className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed">
                  {point.content}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Covered vs Precautions */}
      <section className="py-24 px-4 border-t border-[color:var(--color-border)]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-[color:var(--color-primary)] text-xs font-black uppercase tracking-[0.2em]">
              Usage & Couverture
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold uppercase">
              NeuroCart à vos côtés
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Covered */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[color:var(--color-primary)]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[color:var(--color-primary)]" />
                </div>
                <h3 className="text-lg font-bold text-[color:var(--color-primary)] uppercase tracking-widest">Inclus & Garanti</h3>
              </div>
              <ul className="space-y-3">
                {allowedThings.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[color:var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-[color:var(--color-text-muted)]">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Precautions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-amber-400 uppercase tracking-widest">
                  Précautions d'Usage
                </h3>
              </div>
              <ul className="space-y-3">
                {restrictions.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[color:var(--color-text-muted)]">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Certification & Documentation Section */}
      <section className="py-24 px-4 border-t border-[color:var(--color-border)]">
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
                  Transparence & Traçabilité
                </p>
                <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight uppercase">
                  Chaque innovation,
                  <br />
                  <span className="text-[color:var(--color-primary)] italic">
                    son certificat.
                  </span>
                </h2>
              </div>
              <p className="text-[color:var(--color-text-muted)] font-light leading-relaxed">
                Chaque produit livré par {settings.store_name} inclut un accès numérique à sa documentation technique, ses certificats de conformité et ses manuels d'optimisation via un QR code unique.
              </p>
              <div className="space-y-3">
                {[
                  "Digitalisation des certificats de conformité",
                  "Accès aux vidéos de configuration experte",
                  "Support chat direct lié à votre numéro de série",
                  "Guide de recyclage et durabilité inclus",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <Sparkles className="w-4 h-4 text-[color:var(--color-primary)]" />
                    <span className="text-[color:var(--color-text-muted)]">{item}</span>
                  </div>
                ))}
              </div>

            </motion.div>

            {/* Documentation visual */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-10 rounded-[3rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] space-y-6"
            >
              <div className="flex items-center gap-4 pb-6 border-b border-[color:var(--color-border)]">
                <BookOpen className="w-6 h-6 text-[color:var(--color-primary)]" />
                <span className="font-bold">NeuroPass — Produit réf. NC-2024-X1</span>
              </div>
              {[
                { label: "Certification CE/RoHS", value: "Validée", status: "ok" },
                { label: "Garantie NC Care", value: "24 Mois", status: "active" },
                { label: "Cybersécurité (norme V2)", value: "Certifiée", status: "ok" },
                { label: "Documentation Cloud", value: "Disponible", status: "ok" },
                { label: "Empreinte Carbone", value: "Optimisée", status: "ok" },
                { label: "Mises à jour firmware", value: "Automatiques", status: "ok" },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-[color:var(--color-text-muted)] font-medium">{row.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-[color:var(--color-text)]">{row.value}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 border-t border-[color:var(--color-border)]">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-[color:var(--color-primary)] text-xs font-black uppercase tracking-[0.2em]">
              FAQ Technique
            </p>
            <h2 className="text-4xl font-serif font-bold uppercase">
              Questions fréquentes
            </h2>
          </div>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/20 transition-all space-y-3"
              >
                <h3 className="font-bold text-[color:var(--color-text)] flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[color:var(--color-primary)] flex-shrink-0 mt-0.5" />
                  {item.q}
                </h3>
                <p className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed pl-8">
                  {item.a}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center border-t border-[color:var(--color-border)]">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl font-serif font-bold uppercase">
            Garantie totale sur <br />
            <span className="text-[color:var(--color-primary)] italic tracking-tighter">toutes nos innovations.</span>
          </h2>
          <p className="text-[color:var(--color-text-muted)] font-light">
            Chaque produit {settings.store_name} est certifié, garanti et prêt à transformer votre quotidien avec sérénité.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/catalogue"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black uppercase tracking-widest text-sm rounded-2xl hover:opacity-90 transition-all group"
            >
              Explorer le catalogue
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

          </div>
        </div>
      </section>
    </div>
  );
}
