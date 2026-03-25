import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}

export default function QuantitySelector({
  quantity,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
}: QuantitySelectorProps) {
  const btnClass =
    size === 'sm'
      ? 'w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] transition-all disabled:opacity-50 disabled:cursor-not-allowed'
      : 'w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  const iconClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textClass = size === 'sm' ? 'w-6 text-sm' : 'w-8 text-base';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= min}
        className={btnClass}
        aria-label="Diminuer la quantité"
      >
        <Minus className={iconClass} />
      </button>
      <span className={`${textClass} text-center font-semibold text-white`}>
        {quantity}
      </span>
      <button
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= max}
        className={btnClass}
        aria-label="Augmenter la quantité"
      >
        <Plus className={iconClass} />
      </button>
    </div>
  );
}
