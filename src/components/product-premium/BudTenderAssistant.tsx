import { useMemo, useState } from 'react';
import { Bot, SendHorizonal } from 'lucide-react';
import type { Product } from '../../types/premiumProduct';

interface Props {
  product: Product;
}

export default function BudTenderAssistant({ product }: Props) {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<Array<{ q: string; a: string }>>([]);

  const quickAnswers = useMemo(
    () => ({
      effects: `${product.name} offre un score de détente de ${product.productMetrics?.Détente ?? 0}/10 et une puissance de ${product.productMetrics?.Puissance ?? 0}/10.`,
      flavor: `Profil aromatique : ${product.productMetrics?.Arôme ?? 0}/10 pour l'arôme et ${product.productMetrics?.Saveur ?? 0}/10 pour le goût. Un vrai délice !`,
      usage: "Nous recommandons une utilisation progressive. Commencez par de petites quantités pour apprécier les effets de cette variété premium.",
    }),
    [product]
  );

  const ask = (text: string) => {
    const t = text.toLowerCase();
    let a = "Je suis votre Vendeur IA. Je peux vous renseigner sur les effets, les arômes ou les conseils d'utilisation de cette variété.";
    if (t.includes('effet') || t.includes('détente') || t.includes('puissance') || t.includes('relax')) a = quickAnswers.effects;
    else if (t.includes('goût') || t.includes('saveur') || t.includes('arôme') || t.includes('parfum')) a = quickAnswers.flavor;
    else if (t.includes('usage') || t.includes('conseil') || t.includes('utiliser') || t.includes('consommer')) a = quickAnswers.usage;
    setHistory((h) => [...h, { q: text, a }]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(92vw,360px)] rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4 shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center gap-2 text-[color:var(--color-primary)]"><Bot size={16} /> IA Conseiller</div>
      <div className="max-h-44 space-y-2 overflow-auto pr-1 text-sm">
        {history.slice(-3).map((item, idx) => (
          <div key={`${item.q}-${idx}`} className="space-y-1">
            <p className="text-[color:var(--color-text-muted)]">Vous : {item.q}</p>
            <p className="text-[color:var(--color-text)]">IA : {item.a}</p>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!question.trim()) return;
          ask(question.trim());
          setQuestion('');
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Posez votre question..."
          className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-muted)] px-3 py-2 text-sm text-[color:var(--color-text)] outline-none"
        />
        <button className="rounded-xl bg-[color:var(--color-primary)] px-3 text-[color:var(--color-primary-contrast)]"><SendHorizonal size={16} /></button>
      </form>
    </div>
  );
}