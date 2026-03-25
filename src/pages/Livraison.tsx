import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Truck,
  Package,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCcw,
  Zap,
  Star,
  ChevronDown,
} from "lucide-react";
import SEO from "../components/SEO";
import { useState } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { AnimatePresence } from "motion/react";

const deliveryOptions = [
  {
    icon: <Zap className="w-6 h-6" />,
    badge: "Recommandé",
    title: "Express Paris & IDF",
    subtitle: "Livraison en 24h",
    price: "4,90 €",
    freeFrom: "Offert dès 60 €",
    description:
      "Recevez votre commande le lendemain pour Paris et l'Île-de-France. Livraison en point relais ou à domicile.",
    features: [
      "Livraison J+1 ouvré",
      "Suivi en temps réel",
      "Créneau horaire au choix",
      "Signature à réception",
    ],
    highlight: true,
  },
  {
    icon: <Truck className="w-6 h-6" />,
    badge: null,
    title: "Standard France",
    subtitle: "Livraison en 48–72h",
    price: "2,90 €",
    freeFrom: "Offert dès 40 €",
    description:
      "Livraison dans toute la France métropolitaine en 2 à 3 jours ouvrés via Colissimo ou Chronopost.",
    features: [
      "Livraison J+2 à J+3",
      "Numéro de suivi inclus",
      "Point relais ou domicile",
      "Emballage discret",
    ],
    highlight: false,
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    badge: "Gratuit",
    title: "Click & Collect",
    subtitle: "Retrait en boutique",
    price: "Gratuit",
    freeFrom: "Sans minimum",
    description:
      "Commandez en ligne et récupérez votre colis en boutique à Paris sous 2h. Conseil personnalisé à la remise.",
    features: [
      "Disponible sous 2h",
      "Boutique ouverte 7j/7",
      "Conseil expert inclus",
      "Pas de frais de port",
    ],
    highlight: false,
  },
];

const steps = [
  {
    number: "01",
    title: "Commande validée",
    desc: "Vous recevez une confirmation par e-mail avec le récapitulatif de votre commande.",
  },
  {
    number: "02",
    title: "Préparation soignée",
    desc: "Nos équipes préparent votre commande avec soin. Chaque produit est vérifié et emballé dans notre packaging discret et premium.",
  },
  {
    number: "03",
    title: "Expédition & Suivi",
    desc: "Votre colis est remis au transporteur. Vous recevez un lien de suivi personnalisé en temps réel.",
  },
  {
    number: "04",
    title: "Livraison & Satisfaction",
    desc: "Votre commande arrive à destination. Notre service client reste disponible pour tout besoin post-livraison.",
  },
];

const packagingFeatures = [
  "Emballage renforcé — protection maximale pour les machines",
  "Matériaux éco-responsables et recyclables",
  "Calage mousse haute densité anti-choc",
  "Film plastique étanche contre l'humidité",
  "Notice d'installation et certificat CE inclus",
];

const returnFaqs = [
  {
    q: "Puis-je retourner un produit ?",
    a: "Oui, vous disposez de 14 jours à compter de la réception pour retourner tout produit non ouvert, dans son emballage d'origine. Les frais de retour sont à votre charge sauf en cas d'erreur de notre part.",
  },
  {
    q: "Comment effectuer un retour ?",
    a: "Contactez notre service client par e-mail ou via le formulaire de contact. Nous vous enverrons une étiquette de retour et les instructions nécessaires sous 24h.",
  },
  {
    q: "Quand serai-je remboursé ?",
    a: "Le remboursement est effectué dans les 5 jours ouvrés suivant la réception et vérification du retour, par le même moyen de paiement utilisé lors de la commande.",
  },
  {
    q: "Livrez-vous en dehors de la France ?",
    a: "Nous livrons en France métropolitaine et dans les DOM-TOM. La livraison en Europe (Belgique, Suisse, Luxembourg, etc.) est disponible sur devis. Contactez-nous pour les conditions et tarifs.",
  },
  {
    q: "Mon colis est endommagé, que faire ?",
    a: "Photographiez le colis et les produits, puis contactez-nous immédiatement. Nous traiterons votre dossier en priorité et réexpédierons votre commande sans délai.",
  },
];

export default function Livraison() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const settings = useSettingsStore((s) => s.settings);

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
    name: `Livraison — ${settings.store_name}`,
    description:
      `Informations sur la livraison ${settings.store_name} : express Paris 24h, France 48-72h, Click & Collect gratuit.`,
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pb-32">
      <SEO
        title={`Livraison — ${settings.store_name} Paris, Express 24h`}
        description={`Livraison express 24h sur Paris, 48-72h en France. Click & Collect gratuit en boutique. Emballage discret et eco-responsable. Offert dès 40€.`}
        keywords={`livraison machines arcade Paris, livraison machines loisirs France, Click Collect machines, retour machines, délais livraison, ${settings.store_name}`}
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
                <Truck className="w-4 h-4" />
                Livraison & Expédition
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-serif font-bold tracking-tighter leading-none text-[color:var(--color-text)]">
              RAPIDE, DISCRET, <br />
              <span className="text-[color:var(--color-primary)] italic glow-green">
                SOIGNÉ.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[color:var(--color-text-muted)] text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto font-light leading-relaxed">
              Vos machines de loisirs méritent une livraison à la hauteur. Transport sécurisé, installation professionnelle et suivi en temps réel — partout en France.
            </p>

            {/* Quick trust signals */}
            <div className="flex flex-wrap justify-center gap-6 pt-4">
              {[
                "Offert dès 40 €",
                "Emballage discret",
                "Suivi en temps réel",
                "Retours 14 jours",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[color:var(--color-text-muted)]">
                  <CheckCircle2 className="w-4 h-4 text-[color:var(--color-primary)]" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Delivery Options */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-[color:var(--color-primary)] text-xs font-black uppercase tracking-[0.2em]">
              Options de livraison
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold">
              Choisissez votre mode
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {deliveryOptions.map((option, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative p-8 rounded-[2rem] border transition-all ${
                  option.highlight
                    ? "bg-[color:var(--color-primary)]/5 border-[color:var(--color-primary)]/30"
                    : "bg-[color:var(--color-card)]/80 border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/20"
                }`}
              >
                {option.badge && (
                  <div
                    className={`absolute -top-3 left-8 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                      option.highlight
                        ? "bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)]"
                        : "bg-[color:var(--color-bg-elevated)]/90 text-[color:var(--color-text)]"
                    }`}
                  >
                    {option.badge}
                  </div>
                )}

                <div className="space-y-6">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      option.highlight
                        ? "bg-[color:var(--color-primary)]/20 text-[color:var(--color-primary)]"
                        : "bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text-muted)]"
                    }`}
                  >
                    {option.icon}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-1">{option.title}</h3>
                    <p
                      className={`text-sm font-medium ${option.highlight ? "text-[color:var(--color-primary)]" : "text-[color:var(--color-text-muted)]"}`}
                    >
                      {option.subtitle}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[color:var(--color-text)]">
                      {option.price}
                    </span>
                    <span className="text-xs text-[color:var(--color-primary)] font-bold">
                      {option.freeFrom}
                    </span>
                  </div>

                  <p className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed">
                    {option.description}
                  </p>

                  <ul className="space-y-2">
                    {option.features.map((feat, j) => (
                      <li
                        key={j}
                        className="flex items-center gap-3 text-sm text-[color:var(--color-text-muted)]"
                      >
                        <CheckCircle2
                          className={`w-4 h-4 flex-shrink-0 ${option.highlight ? "text-[color:var(--color-primary)]" : "text-[color:var(--color-text-subtle)]"}`}
                        />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-24 px-4 border-t border-[color:var(--color-border)]">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <p className="text-[color:var(--color-primary)] text-xs font-black uppercase tracking-[0.2em]">
              De la commande à la livraison
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold">
              4 étapes vers votre machine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative p-8 rounded-[2rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/20 transition-all group"
              >
                <div className="text-6xl font-black text-[color:var(--color-primary)]/10 group-hover:text-[color:var(--color-primary)]/20 transition-colors mb-6 leading-none">
                  {step.number}
                </div>
                <h3 className="text-lg font-bold mb-3">{step.title}</h3>
                <p className="text-[color:var(--color-text-muted)] text-sm font-light leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Packaging */}
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
                  Notre packaging
                </p>
                <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
                  Discret, premium
                  <br />
                  <span className="text-[color:var(--color-primary)] italic">
                    et éco-responsable.
                  </span>
                </h2>
              </div>
              <p className="text-[color:var(--color-text-muted)] font-light leading-relaxed">
                Chaque machine est emballée avec le plus grand soin. Nos
                emballages renforcés protègent vos équipements contre les chocs,
                vibrations et l'humidité, garantissant une livraison en parfait
                état à chaque commande.
              </p>
              <ul className="space-y-3">
                {packagingFeatures.map((feat, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm text-[color:var(--color-text-muted)]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[color:var(--color-primary)] flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="p-10 rounded-[3rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-primary)]/10 flex items-center justify-center">
                    <Package className="w-7 h-7 text-[color:var(--color-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-bold">Emballage Certifié</h3>
                    <p className="text-[color:var(--color-text-subtle)] text-sm">
                      Eco-responsable & discret
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: "Protection",
                      value: 100,
                      desc: "Anti-choc renforcé",
                    },
                    {
                      label: "Recyclabilité",
                      value: 90,
                      desc: "Matériaux recyclables",
                    },
                    {
                      label: "Protection",
                      value: 100,
                      desc: "Produits intacts garantis",
                    },
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[color:var(--color-text-muted)] font-medium">
                          {item.label}
                        </span>
                        <span className="text-[color:var(--color-text-subtle)]">{item.desc}</span>
                      </div>
                      <div className="h-1.5 bg-[color:var(--color-bg-elevated)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.value}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: i * 0.2 }}
                          className="h-full bg-[color:var(--color-primary)] rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-[color:var(--color-border)]">
                  <Star className="w-5 h-5 text-[color:var(--color-primary)]" />
                  <p className="text-sm text-[color:var(--color-text-muted)]">
                    98% de nos clients satisfaits de la présentation
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Returns & FAQ */}
      <section className="py-24 px-4 border-t border-[color:var(--color-border)]">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <RefreshCcw className="w-5 h-5 text-[color:var(--color-primary)]" />
              <p className="text-[color:var(--color-primary)] text-xs font-black uppercase tracking-[0.2em]">
                Retours & FAQ
              </p>
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold">
              Vos questions
            </h2>
          </div>

          <div className="space-y-4">
            {returnFaqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="border border-[color:var(--color-border)] rounded-2xl overflow-hidden bg-[color:var(--color-card)]/80 hover:border-[color:var(--color-primary)]/20 transition-colors"
              >
                <button
                  onClick={() =>
                    setOpenIndex(openIndex === i ? null : i)
                  }
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <span className="font-medium text-[color:var(--color-text)] pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-[color:var(--color-primary)] shrink-0 transition-transform duration-300 ${
                      openIndex === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-5 text-[color:var(--color-text-muted)] leading-relaxed text-sm">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Shipping guarantees */}
      <section className="py-16 px-4 border-t border-[color:var(--color-border)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: <ShieldCheck className="w-6 h-6" />,
                label: "100% Sécurisé",
                desc: "Paiement chiffré SSL",
              },
              {
                icon: <Package className="w-6 h-6" />,
                label: "Discret",
                desc: "Emballage neutre",
              },
              {
                icon: <Clock className="w-6 h-6" />,
                label: "Rapide",
                desc: "Expédié sous 24h",
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                label: "Premium",
                desc: "Qualité certifiée",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] flex flex-col items-center text-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-[color:var(--color-primary)]/10 flex items-center justify-center text-[color:var(--color-primary)]">
                  {item.icon}
                </div>
                <div>
                  <p className="font-bold text-sm">{item.label}</p>
                  <p className="text-[color:var(--color-text-subtle)] text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl font-serif font-bold">
            Commandez maintenant,{" "}
            <span className="text-[color:var(--color-primary)] italic">
              recevez demain.
            </span>
          </h2>
          <p className="text-[color:var(--color-text-muted)] font-light">
            Profitez de la livraison offerte dès 40 € d'achat. Commandes
            passées avant 14h expédiées le jour même.
          </p>
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black uppercase tracking-widest text-sm rounded-2xl hover:opacity-90 transition-all group"
          >
            Voir le catalogue
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
