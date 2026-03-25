import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  ShieldCheck,
  Truck,
  RefreshCcw,
  CreditCard,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import SEO from "../components/SEO";
import { useSettingsStore } from "../store/settingsStore";

// Articles moved inside component

export default function CGV() {
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

  const articles = [
    {
      id: "1",
      icon: <FileText className="w-5 h-5" />,
      title: "Objet & Champ d'Application",
      content: [
        `Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des ventes réalisées par la société ${settings.store_name} (ci-après « ${settings.store_name} »), inscrite au Registre du Commerce et des Sociétés de Paris sous le numéro SIRET ${settings.store_siret || '123 456 789 00012'}, via son site internet et sa boutique physique.`,
        `Toute commande passée sur le site implique l'acceptation pleine et entière des présentes CGV. ${settings.store_name} se réserve le droit de modifier ces conditions à tout moment. Les CGV applicables sont celles en vigueur à la date de la commande.`,
        "Nos produits sont exclusivement destinés aux adultes majeurs (18 ans et plus). En passant commande, vous confirmez avoir l'âge légal requis.",
      ],
    },
    {
      id: "2",
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Produits & Conformité Légale",
      content: [
        `L'ensemble des machines commercialisées par ${settings.store_name} sont conformes à la législation française et européenne en vigueur, notamment la directive Machines 2006/42/CE et la directive Basse Tension 2014/35/UE. Chaque machine est certifiée CE et livrée avec sa déclaration de conformité.`,
        `${settings.store_name} agit en qualité d'importateur et distributeur agréé. Nos machines sont importées directement des fabricants partenaires et font l'objet de contrôles qualité rigoureux avant mise en vente.`,
        `${settings.store_name} garantit la conformité de ses machines aux normes électriques NF EN applicables et s'assure de la disponibilité des pièces détachées pour au moins 5 ans après la vente.`,
      ],
    },
    {
      id: "3",
      icon: <CreditCard className="w-5 h-5" />,
      title: "Prix & Modalités de Paiement",
      content: [
        `Les prix affichés sur le site sont en euros (€) TTC (Toutes Taxes Comprises). ${settings.store_name} se réserve le droit de modifier ses prix à tout moment, les prix applicables étant ceux en vigueur au moment de la validation de la commande.`,
        "Les paiements sont acceptés par carte bancaire (Visa, Mastercard, American Express), PayPal, et en espèces en boutique. Toutes les transactions en ligne sont sécurisées par cryptage SSL 256 bits.",
        "Aucun escompte ne sera consenti en cas de paiement anticipé. La commande est confirmée après validation du paiement intégral. En cas d'échec du paiement, la commande est automatiquement annulée.",
      ],
    },
    {
      id: "4",
      icon: <Truck className="w-5 h-5" />,
      title: "Livraison & Délais",
      content: [
        `${settings.store_name} s'engage à expédier les commandes dans un délai de 24 à 48 heures ouvrées suivant la validation du paiement. Les délais de livraison sont donnés à titre indicatif et ne sont pas garantis.`,
        `Les frais de livraison sont indiqués lors du processus de commande. La livraison est offerte pour toute commande supérieure à ${settings.delivery_free_threshold} €. ${settings.store_name} ne peut être tenu responsable des retards imputables au transporteur ou à des cas de force majeure.`,
        `En cas de commande non réceptionnée ou de colis perdu, ${settings.store_name} s'engage à diligenter une enquête auprès du transporteur et à proposer, selon les résultats, un renvoi ou un remboursement dans un délai de 30 jours.`,
      ],
    },
    {
      id: "5",
      icon: <RefreshCcw className="w-5 h-5" />,
      title: "Droit de Rétractation & Retours",
      content: [
        "Conformément à l'article L. 221-18 du Code de la Consommation, vous disposez d'un délai de 14 jours calendaires à compter de la réception de votre commande pour exercer votre droit de rétractation, sans avoir à motiver votre décision.",
        `Pour exercer ce droit, vous devez notifier ${settings.store_name} de votre décision par courrier électronique à ${settings.store_email} ou via le formulaire de contact, en indiquant le numéro de commande et les articles concernés.`,
        `Les produits retournés doivent être dans leur état d'origine, non ouverts et dans leur emballage intact. Les frais de retour sont à la charge du client, sauf en cas d'erreur de ${settings.store_name} ou de défaut du produit. Le remboursement sera effectué dans les 14 jours suivant la réception et vérification du retour.`,
        "Exception : Le droit de rétractation ne s'applique pas aux produits descellés après livraison qui ne peuvent être renvoyés pour des raisons d'hygiène ou de protection de la santé.",
      ],
    },
    {
      id: "6",
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Garanties & Responsabilité",
      content: [
        `${settings.store_name} garantit la conformité des produits vendus aux descriptions figurant sur le site. En cas de défaut de conformité constaté à la réception, le client dispose de 30 jours pour en informer ${settings.store_name}, qui procédera au remplacement ou au remboursement.`,
        `${settings.store_name} ne saurait être engagée pour tous inconvénients ou dommages inhérents à l'utilisation du réseau Internet, notamment une rupture de service, une intrusion extérieure ou la présence de virus informatiques.`,
        `${settings.store_name} ne pourra être tenu responsable des conséquences d'une utilisation non conforme aux recommandations d'utilisation ou en violation des conditions légales applicables (usage par un mineur, femme enceinte, etc.).`,
      ],
    },
    {
      id: "7",
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "Propriété Intellectuelle",
      content: [
        `L'ensemble du contenu du site ${settings.store_name} (textes, images, logos, vidéos, graphismes, etc.) est protégé par le droit de la propriété intellectuelle et est la propriété exclusive de ${settings.store_name} ou fait l'objet d'une autorisation d'utilisation.`,
        `Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sauf autorisation préalable écrite de ${settings.store_name}.`,
      ],
    },
    {
      id: "8",
      icon: <FileText className="w-5 h-5" />,
      title: "Données Personnelles & Cookies",
      content: [
        `${settings.store_name} traite vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés. Pour en savoir plus, consultez notre Politique de Confidentialité.`,
        "Les données collectées lors de votre commande (nom, adresse, e-mail) sont utilisées exclusivement pour le traitement de votre commande et l'amélioration de nos services. Elles ne sont jamais vendues à des tiers.",
      ],
    },
    {
      id: "9",
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Loi Applicable & Litiges",
      content: [
        "Les présentes CGV sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité. À défaut, le litige sera soumis aux tribunaux compétents.",
        "Conformément aux articles L. 611-1 et suivants du Code de la Consommation, vous pouvez recourir gratuitement au service de médiation compétent pour tout litige non résolu. Médiateur de la consommation : CNPM Médiation Consommation — https://www.cnpm-mediation-consommation.eu",
      ],
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Conditions Générales de Vente — ${settings.store_name}`,
    description:
      `Consultez les Conditions Générales de Vente de ${settings.store_name} : commande, paiement, livraison, retours et droit de rétractation.`,
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pb-32">
      <SEO
        title={`Conditions Générales de Vente (CGV) — ${settings.store_name}`}
        description={`Lisez les Conditions Générales de Vente de ${settings.store_name} : commande, paiement sécurisé, livraison, politique de retour et droit de rétractation 14 jours.`}
        keywords={`CGV machines loisirs, conditions vente arcade, retour machines, livraison machines, ${settings.store_name} conditions`}
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
                <FileText className="w-4 h-4" />
                Document légal
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-serif font-bold tracking-tighter leading-none text-[color:var(--color-text)]">
              CONDITIONS GÉNÉRALES <br />
              <span className="text-[color:var(--color-primary)] italic glow-green">
                DE VENTE.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[color:var(--color-text-muted)] text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto font-light leading-relaxed">
              Dernière mise à jour : 1er janvier 2025 — Version 3.0
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick navigation */}
      <section className="py-8 px-4 border-b border-[color:var(--color-border)] sticky top-16 z-30 bg-[color:var(--color-bg)]/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2">
            {articles.map((article) => (
              <a
                key={article.id}
                href={`#article-${article.id}`}
                className="px-3 py-1.5 rounded-lg bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] text-[color:var(--color-text-muted)] text-xs font-medium hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)]/20 transition-all"
              >
                Art. {article.id}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {articles.map((article, i) => (
            <motion.div
              key={article.id}
              id={`article-${article.id}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/10 transition-all group"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[color:var(--color-primary)]/10 flex items-center justify-center text-[color:var(--color-primary)] flex-shrink-0 group-hover:bg-[color:var(--color-primary)]/20 transition-colors">
                  {article.icon}
                </div>
                <div>
                  <span className="text-xs font-black text-[color:var(--color-text-subtle)] uppercase tracking-widest">
                    Article {article.id}
                  </span>
                  <h2 className="text-xl font-bold text-[color:var(--color-text)] mt-1">
                    {article.title}
                  </h2>
                </div>
              </div>
              <div className="space-y-4 pl-14">
                {article.content.map((paragraph, j) => (
                  <p
                    key={j}
                    className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-[2rem] bg-[color:var(--color-primary)]/5 border border-[color:var(--color-primary)]/20"
          >
            <h3 className="text-lg font-bold text-[color:var(--color-primary)] mb-4">
              Une question sur ces CGV ?
            </h3>
            <p className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed mb-6">
              Notre service client est disponible du lundi au samedi pour
              répondre à toutes vos questions concernant nos conditions générales
              de vente.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-3 px-6 py-3 bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black uppercase tracking-widest text-xs rounded-xl hover:opacity-90 transition-all group"
              >
                Nous contacter
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href={`mailto:${settings.store_email}`}
                className="inline-flex items-center gap-3 px-6 py-3 border border-[color:var(--color-border)] text-[color:var(--color-text-muted)] text-xs font-medium rounded-xl hover:border-[color:var(--color-primary)]/40 transition-all"
              >
                {settings.store_email}
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
