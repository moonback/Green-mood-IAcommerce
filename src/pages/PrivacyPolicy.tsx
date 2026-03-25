import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Eye,
  Trash2,
  FileText,
  UserCheck,
  ArrowRight,
  Database,
  Cookie,
  Globe,
} from "lucide-react";
import SEO from "../components/SEO";
import { useSettingsStore } from "../store/settingsStore";

const sections = [
  {
    id: "1",
    icon: <Database className="w-5 h-5" />,
    title: "Données Collectées",
    content: [
      {
        subtitle: "Données fournies directement par vous",
        text: "Lors de la création de votre compte, d'une commande ou d'une prise de contact, nous collectons : votre nom et prénom, adresse e-mail, numéro de téléphone, adresse postale de livraison et de facturation, ainsi que les informations nécessaires au traitement du paiement (gérées directement par notre prestataire de paiement sécurisé).",
      },
      {
        subtitle: "Données collectées automatiquement",
        text: "Lors de votre navigation sur notre site, nous collectons automatiquement certaines données techniques : adresse IP (anonymisée), type de navigateur et système d'exploitation, pages visitées et temps de consultation, provenance (moteur de recherche, réseaux sociaux). Ces données sont collectées via des cookies de mesure d'audience.",
      },
      {
        subtitle: "Données relatives aux achats",
        text: "Nous conservons l'historique de vos commandes, vos préférences produits et les avis que vous avez laissés afin de personnaliser votre expérience et améliorer nos recommandations.",
      },
    ],
  },
  {
    id: "2",
    icon: <Eye className="w-5 h-5" />,
    title: "Finalités du Traitement",
    content: [
      {
        subtitle: "Gestion des commandes",
        text: "Le traitement de vos commandes, la livraison et le service après-vente constituent notre finalité principale. Ces données sont traitées sur la base de l'exécution du contrat de vente.",
      },
      {
        subtitle: "Relation client",
        text: "Nous utilisons vos coordonnées pour répondre à vos questions, gérer vos réclamations et vous informer de l'état de vos commandes. Base légale : intérêt légitime et exécution du contrat.",
      },
      {
        subtitle: "Marketing (avec votre consentement)",
        text: "Si vous avez accepté de recevoir nos communications, nous vous envoyons des newsletters, offres promotionnelles et informations sur nos nouveaux produits. Vous pouvez vous désabonner à tout moment via le lien présent dans chaque e-mail.",
      },
      {
        subtitle: "Amélioration du service",
        text: "Nous analysons anonymement les données de navigation pour améliorer notre site et personnaliser votre expérience d'achat. Ces traitements reposent sur notre intérêt légitime.",
      },
    ],
  },
  {
    id: "3",
    icon: <UserCheck className="w-5 h-5" />,
    title: "Vos Droits RGPD",
    content: [
      {
        subtitle: "Droit d'accès",
        text: "Vous avez le droit d'accéder à l'ensemble des données personnelles vous concernant que nous détenons. Vous pouvez demander une copie de ces données à tout moment.",
      },
      {
        subtitle: "Droit de rectification",
        text: "Vous pouvez à tout moment corriger, compléter ou mettre à jour vos données personnelles, directement depuis votre espace client ou en nous contactant.",
      },
      {
        subtitle: "Droit à l'effacement (« droit à l'oubli »)",
        text: "Vous pouvez demander la suppression de vos données personnelles, sauf obligation légale de conservation (données de facturation conservées 10 ans conformément au Code de Commerce).",
      },
      {
        subtitle: "Droit à la portabilité",
        text: "Vous pouvez demander à recevoir vos données dans un format structuré, couramment utilisé et lisible par machine, pour les transmettre à un autre responsable de traitement.",
      },
      {
        subtitle: "Droit d'opposition et de limitation",
        text: "Vous pouvez vous opposer au traitement de vos données à des fins de prospection commerciale à tout moment, ou demander une limitation du traitement en cas de contestation.",
      },
    ],
  },
  {
    id: "4",
    icon: <Cookie className="w-5 h-5" />,
    title: "Cookies & Traceurs",
    content: [
      {
        subtitle: "Cookies essentiels",
        text: "Indispensables au fonctionnement du site (session, panier, préférences). Ils ne peuvent pas être désactivés sans altérer le fonctionnement du site. Aucun consentement requis.",
      },
      {
        subtitle: "Cookies analytiques",
        text: "Nous utilisons des outils d'analyse d'audience (Google Analytics en mode anonymisé ou équivalent) pour mesurer l'audience et améliorer notre site. Ces cookies nécessitent votre consentement.",
      },
      {
        subtitle: "Cookies de personnalisation",
        text: "Ces cookies nous permettent de mémoriser vos préférences (langue, produits récemment consultés) et d'améliorer votre expérience de navigation.",
      },
      {
        subtitle: "Gestion de vos préférences",
        text: "Vous pouvez gérer vos préférences de cookies à tout moment via notre bandeau de gestion des cookies, ou directement dans les paramètres de votre navigateur. La désactivation de certains cookies peut altérer votre expérience sur le site.",
      },
    ],
  },
  {
    id: "5",
    icon: <Lock className="w-5 h-5" />,
    title: "Sécurité & Conservation",
    content: [
      {
        subtitle: "Mesures de sécurité",
        text: "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement SSL/TLS, accès restreint aux données personnelles, audits de sécurité réguliers, hébergement sur des serveurs sécurisés en Europe.",
      },
      {
        subtitle: "Durées de conservation",
        text: "Données de compte : durée de l'abonnement + 3 ans après la dernière activité. Données de commande et facturation : 10 ans (obligation légale). Données marketing : jusqu'à retrait de votre consentement. Cookies analytiques : 13 mois maximum.",
      },
    ],
  },
  {
    id: "6",
    icon: <Globe className="w-5 h-5" />,
    title: "Transferts de Données & Sous-traitants",
    content: [
      {
        subtitle: "Partage avec des tiers",
        text: "Nous ne vendons jamais vos données personnelles. Elles peuvent être partagées avec nos sous-traitants nécessaires à l'exécution de notre service : transporteurs (pour la livraison), prestataires de paiement (Stripe/Viva Wallet), hébergeur (Supabase), outils de marketing (avec votre consentement).",
      },
      {
        subtitle: "Transferts hors UE",
        text: "Certains de nos sous-traitants peuvent être établis hors de l'Union Européenne. Dans ce cas, nous nous assurons que des garanties appropriées sont mises en place (clauses contractuelles types de la Commission européenne, certifications Privacy Shield équivalentes).",
      },
    ],
  },
];

export default function PrivacyPolicy() {
  const { settings } = useSettingsStore();

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
    "@type": "WebPage",
    name: `Politique de Confidentialité — ${settings.store_name}`,
    description:
      `Politique de confidentialité de ${settings.store_name} : données collectées, vos droits RGPD, cookies et gestion de la sécurité.`,
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pb-32">
      <SEO
        title={`Politique de Confidentialité — ${settings.store_name} | RGPD`}
        description={`Découvrez comment ${settings.store_name} protège vos données personnelles. Droits RGPD, cookies, données collectées et mesures de sécurité. Conformité totale.`}
        keywords={`politique confidentialité, RGPD, données personnelles, cookies, ${settings.store_name} privacy`}
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

        {/* Ambient glows */}
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.05, 0.12, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-72 h-72 bg-[color:var(--color-primary)]/10 rounded-full blur-[120px] pointer-events-none"
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
                <Lock className="w-4 h-4" />
                RGPD & Confidentialité
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-serif font-bold tracking-tighter leading-none text-[color:var(--color-text)]">
              POLITIQUE DE <br />
              <span className="text-[color:var(--color-primary)] italic glow-green">
                CONFIDENTIALITÉ.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[color:var(--color-text-muted)] text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto font-light leading-relaxed">
              Dernière mise à jour : 1er janvier 2025 — Conforme au RGPD (UE) 2016/679
            </p>
          </motion.div>
        </div>
      </section>

      {/* Commitment banner */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-[color:var(--color-primary)]/5 border border-[color:var(--color-primary)]/20"
          >
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-[color:var(--color-primary)] flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-[color:var(--color-text)] mb-2">
                  Notre engagement pour votre vie privée
                </h2>
                <p className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed">
                  Chez {settings.store_name}, nous croyons que la confidentialité est un
                  droit fondamental. Nous ne vendons jamais vos données, ne les
                  partageons qu'avec les partenaires strictement nécessaires à
                  l'exécution de notre service, et vous permettons à tout moment
                  de contrôler et supprimer vos informations.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick nav */}
      <section className="py-6 px-4 border-b border-[color:var(--color-border)] sticky top-16 z-30 bg-[color:var(--color-bg)]/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                className="px-3 py-1.5 rounded-lg bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] text-[color:var(--color-text-muted)] text-xs font-medium hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)]/20 transition-all"
              >
                {section.title.split(" ")[0]}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, i) => (
            <motion.div
              key={section.id}
              id={`section-${section.id}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/10 transition-all group"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[color:var(--color-primary)]/10 flex items-center justify-center text-[color:var(--color-primary)] flex-shrink-0 group-hover:bg-[color:var(--color-primary)]/20 transition-colors">
                  {section.icon}
                </div>
                <div>
                  <span className="text-xs font-black text-[color:var(--color-text-subtle)] uppercase tracking-widest">
                    Section {section.id}
                  </span>
                  <h2 className="text-xl font-bold text-[color:var(--color-text)] mt-1">
                    {section.title}
                  </h2>
                </div>
              </div>
              <div className="space-y-6 pl-14">
                {section.content.map((item, j) => (
                  <div key={j} className="space-y-2">
                    <h3 className="text-sm font-bold text-[color:var(--color-text)]">
                      {item.subtitle}
                    </h3>
                    <p className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Your rights summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] space-y-6"
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-[color:var(--color-primary)]" />
              <h2 className="text-xl font-bold">Exercer vos droits</h2>
            </div>
            <p className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed">
              Pour exercer l'un de vos droits ou pour toute question relative à
              la protection de vos données personnelles, vous pouvez contacter
              notre Délégué à la Protection des Données (DPO) :
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: <FileText className="w-4 h-4" />,
                  label: "Par e-mail",
                  value: `dpo@${settings.store_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}`,
                },
                {
                  icon: <Globe className="w-4 h-4" />,
                  label: "Par courrier",
                  value: `${settings.store_name} — DPO, ${settings.store_address}`,
                },
                {
                  icon: <ShieldCheck className="w-4 h-4" />,
                  label: "Réclamation CNIL",
                  value: "www.cnil.fr",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] space-y-2"
                >
                  <div className="flex items-center gap-2 text-[color:var(--color-primary)]">
                    {item.icon}
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-[color:var(--color-text-muted)] text-sm break-all">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[color:var(--color-text-subtle)] text-xs font-light">
              Nous nous engageons à répondre à votre demande dans un délai d'un
              mois à compter de sa réception, conformément aux exigences du
              RGPD.
            </p>
          </motion.div>

          {/* Delete account */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)]"
          >
            <div className="flex items-start gap-4">
              <Trash2 className="w-5 h-5 text-[color:var(--color-text-subtle)] flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-bold text-[color:var(--color-text-muted)]">
                  Suppression de compte
                </h3>
                <p className="text-[color:var(--color-text-subtle)] text-sm font-light leading-relaxed">
                  Vous pouvez supprimer votre compte à tout moment depuis votre
                  espace client. Cette action supprimera l'ensemble de vos
                  données personnelles non soumises à obligation légale de
                  conservation, dans un délai de 30 jours.
                </p>
                <Link
                  to="/compte"
                  className="inline-flex items-center gap-2 text-xs text-[color:var(--color-primary)] font-bold hover:underline"
                >
                  Gérer mon compte
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
