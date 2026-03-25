import { useRef } from 'react';

interface DualRangeSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
  step?: number;
  formatLabel?: (v: number) => string;
}

export default function DualRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  step = 1,
  formatLabel = (v) => `${v}€`,
}: DualRangeSliderProps) {
  const range = max - min;
  const leftPct = range === 0 ? 0 : ((valueMin - min) / range) * 100;
  const rightPct = range === 0 ? 100 : ((valueMax - min) / range) * 100;

  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      {/* Value labels */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
          {formatLabel(valueMin)}
        </span>
        <span className="text-xs text-zinc-600 font-bold uppercase tracking-widest">à</span>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
          {formatLabel(valueMax)}
        </span>
      </div>

      {/* Slider track */}
      <div className="relative h-10 flex items-center" ref={trackRef}>
        {/* Background track */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-zinc-800" />

        {/* Active range fill */}
        <div
          className="absolute h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(57,255,20,0.5)]"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />

        {/* Min handle input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChangeMin(Math.min(v, valueMax - step));
          }}
          className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(57,255,20,0.6)] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-emerald-500 [&::-moz-range-thumb]:cursor-grab"
          style={{ zIndex: valueMin > max - (range * 0.1) ? 5 : 4 }}
        />

        {/* Max handle input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChangeMax(Math.max(v, valueMin + step));
          }}
          className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/30 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(57,255,20,0.6)] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/30 [&::-moz-range-thumb]:cursor-grab"
          style={{ zIndex: 3 }}
        />
      </div>

      {/* Min/Max bounds labels */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{formatLabel(min)}</span>
        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{formatLabel(max)}</span>
      </div>
    </div>
  );
}
