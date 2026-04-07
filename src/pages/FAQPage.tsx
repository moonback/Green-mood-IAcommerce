import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown, Search, MessageCircle, Gamepad2, Truck,
  ShieldCheck, CreditCard, Star, ArrowRight, Sparkles, HelpCircle,
} from "lucide-react";
import SEO from "../components/SEO";
import { useSettingsStore } from "../store/settingsStore";

const CATEGORIES = [
  { id: "all", label: "Toutes", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "produits", label: "Nos Produits", icon: <Gamepad2 className="w-3.5 h-3.5" /> },
  { id: "commande", label: "Commande", icon: <CreditCard className="w-3.5 h-3.5" /> },
  { id: "livraison", label: "Livraison", icon: <Truck className="w-3.5 h-3.5" /> },
  { id: "innovation", label: "Innovation", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: "fidelite", label: "Fidélité", icon: <Star className="w-3.5 h-3.5" /> },
];

const getFaqs = (c: string) => [
  {
    category: "produits",
    question: "Quelles sont les différentes catégories de produits proposées ?",
    answer: "Nous proposons 3 gammes principales : l'Ultra-Tech (PC, audio Hi-Fi), la Maison Intelligente (domotique, sécurité) et la Tech Accessible (gadgets innovants, accessoires). Chaque produit est sélectionné pour son caractère innovant et son rapport performance/prix.",
  },
  {
    category: "produits",
    question: "Comment choisir le produit tech adapté à mon budget ?",
    answer: "Nos gammes sont segmentées par usage et budget. Notre PlayAdvisor IA peut analyser vos besoins spécifiques et vous recommander la meilleure configuration tech selon votre enveloppe budgétaire.",
  },
  {
    category: "produits",
    question: "Les produits sont-ils certifiés aux normes européennes ?",
    answer: "Oui, l'intégralité de notre catalogue est certifiée CE. Nous veillons particulièrement au respect des normes de sécurité électrique et de protection des données pour tous nos objets connectés.",
  },
  {
    category: "commande",
    question: "Comment passer une commande sur NeuroCart ?",
    answer: "Sélectionnez vos produits innovants, ajoutez-les au panier et réglez en toute sécurité. Vous bénéficierez automatiquement de notre programme de fidélité NeuroPoints dès votre premier achat.",
  },
  {
    category: "commande",
    question: "Quels sont les moyens de paiement disponibles ?",
    answer: "Nous acceptons les cartes bancaires, Apple Pay, Google Pay et PayPal. Le virement bancaire est également possible pour les commandes professionnelles volumineuses.",
  },
  {
    category: "livraison",
    question: "Quels sont les délais de livraison ?",
    answer: "Pour les produits en stock, nous livrons sous 24h à 48h partout en France métropolitaine. L'expédition est réalisée par nos partenaires logistiques spécialisés dans le transport High-Tech.",
  },
  {
    category: "innovation",
    question: "D'où proviennent vos innovations ?",
    answer: "NeuroCart collabore directement avec des start-ups innovantes et des constructeurs leaders en Asie, Europe et aux USA. Nous sourçons des produits souvent exclusifs sur le marché français.",
  },
  {
    category: "fidelite",
    question: "Comment fonctionne le programme de fidélité ?",
    answer: `Chaque commande sur NeuroCart vous rapporte des ${c}. Ces points sont cumulables et utilisables sous forme de remises directes sur vos futurs achats de nouveautés tech.`,
  },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { settings } = useSettingsStore();
  const storeName = settings.store_name || 'Green Mood';
  const budtenderName = settings.budtender_name || 'Assistant';
  const currencyName = settings.loyalty_currency_name || 'Points';
  const faqs = getFaqs(currencyName);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, faqs]);

  // Count per category
  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: faqs.length };
    faqs.forEach((f) => {
      counts[f.category] = (counts[f.category] || 0) + 1;
    });
    return counts;
  }, [faqs]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 25, stiffness: 150 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 150 });

  useEffect(() => {
    const h = (e: MouseEvent) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, [mouseX, mouseY]);

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pb-32">
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      <SEO
        title={`FAQ — Toutes vos questions | ${storeName}`}
        description="Trouvez des réponses sur nos produits, la livraison, les garanties et notre service client."
        keywords={`FAQ ${storeName}, aide, support produits, livraison`}
        schema={faqSchema}
      />

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[65vh] flex items-center justify-center pt-32 pb-16 overflow-hidden">
        {/* Noise */}
        <div className="absolute inset-0 z-10 opacity-[0.025] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[300px] bg-[color:var(--color-primary)]/6 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Mouse glow */}
        <motion.div
          style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
          className="absolute z-0 w-[500px] h-[500px] bg-[color:var(--color-primary)]/8 rounded-full blur-[130px] pointer-events-none mix-blend-screen"
        />

        <div className="relative z-20 max-w-4xl mx-auto px-5 w-full flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full space-y-8"
          >
            {/* Badge */}
            <div className="flex justify-center">
              <motion.span
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 py-2 px-5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)]/60 text-[color:var(--color-primary)] text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-md"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--color-primary)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[color:var(--color-primary)]" />
                </span>
                Centre d'aide
              </motion.span>
            </div>

            {/* H1 */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold tracking-tighter leading-none text-[color:var(--color-text)] uppercase">
              QUESTIONS <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--color-primary)] via-[color:var(--color-primary)] to-indigo-400 drop-shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.3)]">
                & RÉPONSES.
              </span>
            </h1>

            <p className="text-[color:var(--color-text-muted)] text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
              Tout ce que vous devez savoir sur nos produits, la livraison et votre expérience {storeName}.
            </p>

            {/* Search */}
            <div className="max-w-xl mx-auto relative mt-6">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-text-subtle)]" />
              <input
                type="text"
                placeholder="Rechercher une question..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setOpenIndex(null); }}
                className="w-full bg-[color:var(--color-card)]/60 border border-[color:var(--color-border)] rounded-2xl pl-12 pr-6 py-4 text-[color:var(--color-text)] placeholder-[color:var(--color-text-subtle)] focus:outline-none focus:border-[color:var(--color-primary)]/50 focus:bg-[color:var(--color-card)] transition-all backdrop-blur-sm text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] transition-colors text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 opacity-50">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">{faqs.length} questions répondues</span>
              <span className="w-1 h-1 rounded-full bg-[color:var(--color-text-subtle)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">5 catégories</span>
              <span className="w-1 h-1 rounded-full bg-[color:var(--color-text-subtle)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">Réponse immédiate</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ CATEGORY FILTERS (STICKY) ═══ */}
      <div className="sticky top-16 z-30 bg-[color:var(--color-bg)]/95 backdrop-blur-xl border-b border-[color:var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => {
              const count = countByCategory[cat.id] || 0;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                      ? "bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)]"
                      : "bg-[color:var(--color-card)]/60 border border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-primary)]/30 hover:text-[color:var(--color-text)]"
                    }`}
                >
                  {cat.icon}
                  {cat.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black ${isActive ? "bg-white/20" : "bg-[color:var(--color-bg-elevated)]"
                    }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ FAQ LIST ═══ */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Results count */}
          {(searchQuery || activeCategory !== "all") && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-6 text-center"
            >
              {filteredFaqs.length} résultat{filteredFaqs.length !== 1 ? "s" : ""}
              {searchQuery ? ` pour "${searchQuery}"` : ""}
            </motion.p>
          )}

          {filteredFaqs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24 space-y-5"
            >
              <div className="w-16 h-16 rounded-2xl bg-[color:var(--color-card)] border border-[color:var(--color-border)] flex items-center justify-center mx-auto">
                <HelpCircle className="w-7 h-7 text-[color:var(--color-text-subtle)]" />
              </div>
              <p className="text-[color:var(--color-text-muted)] text-lg font-medium">
                Aucun résultat pour «&nbsp;{searchQuery}&nbsp;»
              </p>
              <p className="text-[color:var(--color-text-subtle)] text-sm">
                Essayez d'autres mots-clés ou contactez nos experts.
              </p>
              <button
                onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[color:var(--color-border)] text-xs font-bold text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)]/30 transition-all"
              >
                Réinitialiser la recherche
              </button>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              {filteredFaqs.map((faq, index) => {
                const globalIndex = faqs.indexOf(faq);
                const isOpen = openIndex === globalIndex;
                const catObj = CATEGORIES.find((c) => c.id === faq.category);
                return (
                  <motion.div
                    key={globalIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={`border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen
                        ? "border-[color:var(--color-primary)]/30 bg-[color:var(--color-card)] shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.08)]"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 hover:border-[color:var(--color-primary)]/20"
                      }`}
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Left accent */}
                        <div className={`w-1 h-8 rounded-full shrink-0 transition-all ${isOpen ? "bg-[color:var(--color-primary)]" : "bg-[color:var(--color-border)]"
                          }`} />
                        <div className="min-w-0">
                          {catObj && catObj.id !== "all" && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-[color:var(--color-primary)] mb-1 block">
                              {catObj.label}
                            </span>
                          )}
                          <span className={`font-semibold text-sm leading-relaxed block ${isOpen ? "text-[color:var(--color-text)]" : "text-[color:var(--color-text-muted)]"
                            }`}>
                            {faq.question.replace(/NeuroCart/gi, storeName)}
                          </span>
                        </div>
                      </div>
                      <div className={`h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-300 ${isOpen
                          ? "bg-[color:var(--color-primary)] border-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)]"
                          : "border-[color:var(--color-border)] text-[color:var(--color-text-subtle)]"
                        }`}>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="px-6 pb-6 ml-4 pl-6 border-l-2 border-[color:var(--color-primary)]/20 ml-[1.75rem] text-[color:var(--color-text-muted)] leading-relaxed text-sm">
                            {faq.answer
                              .replace(/BudTender/gi, budtenderName)
                              .replace(/NeuroCart/gi, storeName)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══ CTA — ENCORE DES QUESTIONS ═══ */}
      <section className="py-16 px-4 border-t border-[color:var(--color-border)]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[2.5rem] bg-[color:var(--color-card)]/60 border border-[color:var(--color-border)] p-10 lg:p-14 text-center"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-primary)]/5 via-transparent to-indigo-500/5 opacity-60" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--color-primary)]/20 to-transparent" />

            <div className="relative z-10 space-y-6">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-14 h-14 rounded-2xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 flex items-center justify-center mx-auto"
              >
                <MessageCircle className="w-6 h-6 text-[color:var(--color-primary)]" />
              </motion.div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Vous n'avez pas trouvé votre réponse ?
                </h2>
                <p className="text-[color:var(--color-text-muted)] text-sm mt-2 max-w-md mx-auto leading-relaxed">
                  Nos conseillers experts sont disponibles pour vous guider dans vos choix.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  to="/contact"
                  className="group inline-flex items-center gap-3 px-7 py-3.5 bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.25)]"
                >
                  Contacter un expert
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 border border-[color:var(--color-border)] text-[color:var(--color-text)] font-bold uppercase tracking-widest text-xs rounded-2xl hover:border-[color:var(--color-primary)]/40 hover:bg-[color:var(--color-primary)]/5 transition-all"
                  onClick={() => {
                    const bt = document.getElementById("budtender-trigger");
                    if (bt) bt.click();
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[color:var(--color-primary)]" />
                  {budtenderName} IA
                </button>
              </div>

              {/* Response time info */}
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)] opacity-50">
                Réponse habituelle sous 2h · Lun–Ven 9h–18h
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
