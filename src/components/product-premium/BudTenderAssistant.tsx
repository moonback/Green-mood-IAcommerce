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
      perf: `${product.name} obtient ${product.machineMetrics.Performance}/10 en performance et ${product.machineMetrics.Immersion}/10 en immersion.`,
      spec: `Specification cle : ${product.machineSpecs[0]?.name ?? 'Qualite construction'} (${product.machineSpecs[0]?.category ?? 'Fabrication premium'}).`,
      usage: "Usage prive, bar ou salle arcade - nos conseillers vous aident a choisir la configuration adaptee a votre projet.",
    }),
    [product]
  );

  const ask = (text: string) => {
    const t = text.toLowerCase();
    let a = "Je peux vous renseigner sur les performances, specifications techniques et conseils d'installation de cette machine.";
    if (t.includes('perfo') || t.includes('fort') || t.includes('puissant')) a = quickAnswers.perf;
    else if (t.includes('spec') || t.includes('caract') || t.includes('technique')) a = quickAnswers.spec;
    else if (t.includes('usage') || t.includes('install') || t.includes('utilisation') || t.includes('bar') || t.includes('salle')) a = quickAnswers.usage;
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