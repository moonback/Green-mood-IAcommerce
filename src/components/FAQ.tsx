import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

const DEFAULT_FAQS = [
  {
    question: "Proposez-vous la livraison et l'installation ?",
    answer: "Oui, nous assurons la livraison, le déchargement et l'installation professionnelle de chaque machine partout en France par nos propres techniciens."
  },
  {
    question: "Quelle est la durée de la garantie ?",
    answer: "Toutes nos machines bénéficient d'une garantie constructeur de 2 ans. Notre service après-vente basé en France intervient rapidement pour toute assistance."
  },
  {
    question: "Peut-on tester les machines avant d'acheter ?",
    answer: "Absolument ! Nous vous accueillons dans notre showroom pour tester nos bornes d'arcade, flippers et simulateurs en conditions réelles."
  },
  {
    question: "Les machines sont-elles conformes aux normes ?",
    answer: "Oui, l'ensemble de notre catalogue est certifié CE et répond aux normes de sécurité et de robustesse en vigueur pour un usage intensif."
  },
  {
    question: "Quels sont les délais de livraison ?",
    answer: "Les délais varient entre 5 et 10 jours ouvrés pour les produits en stock. Pour les commandes spéciales ou personnalisées, le délai vous est communiqué lors du devis."
  },
  {
    question: "Proposez-vous des solutions de financement ?",
    answer: "Oui, nous proposons des solutions de leasing et de financement adaptées aux professionnels (bars, hôtels, campings) ainsi qu'aux particuliers."
  }
];

export default function FAQ() {
  const { settings } = useSettingsStore();
  const faqs = settings.faqs?.length ? settings.faqs : DEFAULT_FAQS;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <section className="py-16 md:py-24 bg-slate-950 border-t border-white/15">
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-['Inter',sans-serif] font-black text-slate-100 mb-4 uppercase"
          >
            Questions Fréquentes
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 font-medium"
          >
            Tout ce que vous devez savoir sur nos machines de loisirs et nos services.
          </motion.p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="border border-white/15 rounded-2xl overflow-hidden bg-slate-900/70 backdrop-blur-xl shadow-[0_10px_40px_rgba(2,8,23,0.4)] hover:border-[#2563eb]/35 transition-all duration-300"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="font-bold text-slate-100 pr-4">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-cyan-300 shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-4 text-slate-400 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}