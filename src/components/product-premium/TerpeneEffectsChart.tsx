import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Leaf, Zap, BarChart2 } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { ProductSpec } from '../../types/premiumProduct';

// ── Types ─────────────────────────────────────────────────────────────────────
type EffectKey = 'Détente' | 'Sommeil' | 'Euphorie' | 'Créativité' | 'Concentration' | 'Soulagement';
type Source = 'terpenes' | 'metrics' | 'fallback';

const EFFECT_META: Record<EffectKey, { sublabel: string; icon: string; relaxing: boolean; color: string }> = {
  Détente:       { sublabel: 'Apaisement',       icon: '🧘', relaxing: true,  color: '#10b981' },
  Sommeil:       { sublabel: 'Récupération',      icon: '💤', relaxing: true,  color: '#059669' },
  Soulagement:   { sublabel: 'Confort',          icon: '🌿', relaxing: true,  color: '#047857' },
  Euphorie:      { sublabel: 'Légèreté',   icon: '✨', relaxing: false, color: '#f59e0b' },
  Créativité:    { sublabel: 'Inspiration',       icon: '🎨', relaxing: false, color: '#d97706' },
  Concentration: { sublabel: 'Focus',      icon: '🎯', relaxing: false, color: '#b45309' },
};

const EFFECT_KEYS = Object.keys(EFFECT_META) as EffectKey[];

// ── Terpene profiles ──────────────────────────────────────────────────────────
const TERPENE_PROFILES: Array<{ name: string; patterns: string[]; effects: Partial<Record<EffectKey, number>> }> = [
  { name: 'Myrcène', patterns: ['myrcène', 'myrcene'],         effects: { Détente: 90, Sommeil: 80, Soulagement: 65, Euphorie: 25 } },
  { name: 'Limonène', patterns: ['limonène', 'limonene'],        effects: { Euphorie: 85, Créativité: 70, Concentration: 65, Détente: 35 } },
  { name: 'Caryophyllène', patterns: ['caryophyllène', 'caryophyl'], effects: { Soulagement: 88, Détente: 65, Euphorie: 30 } },
  { name: 'Linalool', patterns: ['linalool'],                     effects: { Sommeil: 90, Détente: 80, Soulagement: 50 } },
  { name: 'Pinène', patterns: ['pinène', 'pinene'],            effects: { Concentration: 90, Créativité: 72, Euphorie: 42 } },
  { name: 'Terpinolène', patterns: ['terpinolène', 'terpinol'],     effects: { Euphorie: 72, Créativité: 60, Détente: 48 } },
  { name: 'Ocimène', patterns: ['ocimène', 'ocimene'],          effects: { Créativité: 82, Euphorie: 65, Concentration: 55 } },
  { name: 'Humulène', patterns: ['humulène', 'humulene'],        effects: { Soulagement: 88, Détente: 52 } },
  { name: 'Géraniol', patterns: ['géraniol', 'geraniol'],        effects: { Détente: 68, Euphorie: 55, Sommeil: 62 } },
  { name: 'Bisabolol', patterns: ['bisabolol'],                    effects: { Sommeil: 72, Détente: 78, Soulagement: 58 } },
  { name: 'Nérolidol', patterns: ['nerolidol', 'nérolidol'],      effects: { Sommeil: 80, Détente: 75 } },
  { name: 'Bornéol', patterns: ['borneol', 'bornéol'],          effects: { Sommeil: 75, Soulagement: 65, Détente: 60 } },
  { name: 'Eucalyptol', patterns: ['eucalyptol', 'cinéole'],       effects: { Concentration: 78, Créativité: 60 } },
];

function matchTerpene(name: string) {
  const lower = name.toLowerCase();
  return TERPENE_PROFILES.find(t => t.patterns.some(p => lower.includes(p)));
}

// ── Effect computation ────────────────────────────────────────────────────────
function computeEffects(
  specs: ProductSpec[],
  productMetrics: Record<'Détente' | 'Saveur' | 'Arôme' | 'Puissance', number> | undefined,
  cbdPercentage: number | null | undefined,
): { source: Source; scores: Record<EffectKey, number>; contributors: string[] } {

  // ── 1. Try individual terpene specs ──
  const terpeneSpecs = specs.filter(s =>
    s.category === 'Profil Aromatique' ||
    s.category === 'Terpènes' ||
    s.category === 'Profil de Terpènes',
  );

  const sums: Record<EffectKey, number> = { Détente: 0, Sommeil: 0, Soulagement: 0, Euphorie: 0, Créativité: 0, Concentration: 0 };
  let matched = 0;
  const contributors: string[] = [];

  for (const spec of terpeneSpecs) {
    const profile = matchTerpene(spec.name);
    if (!profile) continue;
    matched++;
    contributors.push(profile.name);
    const w = (spec.intensity ?? 50) / 100;
    for (const [k, v] of Object.entries(profile.effects) as [EffectKey, number][]) {
      sums[k] += v * w;
    }
  }

  if (matched > 0) {
    const max = Math.max(...Object.values(sums), 1);
    return {
      source: 'terpenes',
      contributors: Array.from(new Set(contributors)),
      scores: Object.fromEntries(
        EFFECT_KEYS.map(k => [k, Math.round((sums[k] / max) * 100)]),
      ) as Record<EffectKey, number>,
    };
  }

  // ── 2. Derive from productMetrics (AI-generated, product-specific) ──
  if (productMetrics) {
    const D = productMetrics.Détente * 10;
    const P = productMetrics.Puissance * 10;
    const A = productMetrics.Arôme * 10;

    const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

    return {
      source: 'metrics',
      contributors: ['Analyse sensorielle', 'Puissance perçue'],
      scores: {
        Détente:       clamp(D),
        Sommeil:       clamp(D * 0.85 + (100 - P) * 0.15),
        Soulagement:   clamp(D * 0.5 + P * 0.5),
        Euphorie:      clamp(P * 0.7 + (100 - D) * 0.3),
        Créativité:    clamp(A * 0.4 + (100 - D) * 0.35 + P * 0.25),
        Concentration: clamp(P * 0.55 + (100 - D) * 0.45),
      },
    };
  }

  // ── 3. Last resort: CBD% ──
  const cbd = Math.min(cbdPercentage ?? 10, 30);
  const r = 40 + cbd * 1.5;
  return {
    source: 'fallback',
    contributors: ['Profil CBD estimé'],
    scores: {
      Détente:       Math.min(90, Math.round(r)),
      Sommeil:       Math.min(80, Math.round(r * 0.75)),
      Soulagement:   Math.min(85, Math.round(r * 0.85)),
      Euphorie:      Math.min(65, Math.round(35 + cbd)),
      Créativité:    Math.min(60, Math.round(30 + cbd * 0.8)),
      Concentration: Math.min(55, Math.round(25 + cbd * 0.7)),
    },
  };
}

// ── Custom radar tooltip ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as { subject: EffectKey; value: number };
  const meta = EFFECT_META[item.subject];
  return (
    <div className="rounded-2xl border border-[color:var(--color-border)]/50 bg-[color:var(--color-card)]/95 backdrop-blur-2xl px-3 py-2.5 shadow-2xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{meta.icon}</span>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text)]">
          {item.subject}
        </p>
      </div>
      <p className="text-xl font-black text-[color:var(--color-primary)] leading-none mt-1">
        {item.value}<span className="text-[10px] text-[color:var(--color-text-muted)] ml-0.5">/100</span>
      </p>
    </div>
  );
};

// ── Source badge config ───────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<Source, { icon: typeof Leaf; label: string; sub: string; color: string; border: string; bg: string }> = {
  terpenes: { icon: Leaf,     label: 'Profil Terpénique',   sub: 'Analyse labo',  color: '#10b981', border: 'border-[#10b981]/30', bg: 'bg-[#10b981]/8' },
  metrics:  { icon: Sparkles, label: 'Analyse IA',  sub: 'Basée sur les notes', color: '#a78bfa', border: 'border-[#a78bfa]/30', bg: 'bg-[#a78bfa]/8' },
  fallback: { icon: BarChart2, label: 'Estimation',     sub: 'Basée sur le CBD',  color: '#94a3b8', border: 'border-[#94a3b8]/20', bg: 'bg-[#94a3b8]/6' },
};

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  specs: ProductSpec[];
  productMetrics?: Record<'Détente' | 'Saveur' | 'Arôme' | 'Puissance', number>;
  cbdPercentage?: number | null;
}

export default function TerpeneEffectsChart({ specs, productMetrics, cbdPercentage }: Props) {
  const { source, scores, contributors } = useMemo(
    () => computeEffects(specs, productMetrics, cbdPercentage),
    [specs, productMetrics, cbdPercentage],
  );

  const radarData = EFFECT_KEYS.map(key => ({
    subject: key,
    value: scores[key],
    fullMark: 100,
  }));

  const relaxAvg = Math.round((scores.Détente + scores.Sommeil + scores.Soulagement) / 3);
  const stimAvg  = Math.round((scores.Euphorie + scores.Créativité + scores.Concentration) / 3);
  const spectrumPos = Math.max(5, Math.min(95, Math.round(((stimAvg - relaxAvg) / 2) + 50)));

  const spectrumLabel =
    spectrumPos < 30  ? 'Tranquillisant'
    : spectrumPos < 45 ? 'Apaisant'
    : spectrumPos < 55 ? 'Équilibré'
    : spectrumPos < 70 ? 'Éveillant'
    :                     'Énergisant';

  const isRelaxant = spectrumPos < 50;
  const srcCfg = SOURCE_CONFIG[source];
  const SrcIcon = srcCfg.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative border-y border-[color:var(--color-border)]/50 bg-[color:var(--color-bg)] py-12 sm:py-16 overflow-hidden"
    >
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[color:var(--color-primary)]/5 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* ── Top Header ── */}
        <div className="mb-8 flex flex-col items-center sm:flex-row sm:justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3
              className="text-3xl sm:text-4xl text-[color:var(--color-text)] mb-1"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Profil terpènes & CBD
            </h3>
            <p className="text-[10px] text-[color:var(--color-text-muted)] font-black uppercase tracking-[0.2em]">
               Lecture bien-être des terpènes et du spectre cannabinoïde
            </p>
          </div>

          <div className={`flex items-center gap-3 rounded-full border px-4 py-1.5 ${srcCfg.border} ${srcCfg.bg}`}>
            <SrcIcon className="w-3.5 h-3.5" style={{ color: srcCfg.color }} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest leading-none" style={{ color: srcCfg.color }}>
                {srcCfg.label}
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Content Grid ── */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Column 1: Radar & Detail (5/12) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="relative aspect-square w-full max-w-[340px] mx-auto bg-[color:var(--color-card)]/40 rounded-[2.5rem] border border-[color:var(--color-border)]/50 p-6 shadow-xl backdrop-blur-xl">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <PolarGrid stroke="rgba(16,185,129,0.15)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={({ x, y, payload }: any) => {
                      const meta = EFFECT_META[payload.value as EffectKey];
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={-4} textAnchor="middle" style={{ fontSize: 13 }}>{meta.icon}</text>
                          <text x={0} y={10} textAnchor="middle" style={{ fontSize: 8, fontWeight: 800, fill: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                            {payload.value}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <Radar
                    dataKey="value"
                    stroke={isRelaxant ? "#10b981" : "#f59e0b"}
                    strokeWidth={2}
                    fill={isRelaxant ? "#10b981" : "#f59e0b"}
                    fillOpacity={0.15}
                    dot={{ r: 3, fill: isRelaxant ? "#10b981" : "#f59e0b" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Contributors */}
            <div className="rounded-[2rem] border border-[color:var(--color-border)]/40 bg-[color:var(--color-card)]/60 backdrop-blur-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-3.5 h-3.5 text-[color:var(--color-primary)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text)]">Contributeurs actifs</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {contributors.map(c => (
                  <span key={c} className="px-3 py-1.5 rounded-xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] text-[10px] font-bold text-[color:var(--color-text-muted)] transition-colors hover:bg-[color:var(--color-primary)]/10 hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)]/30">
                    {c}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-[10px] text-[color:var(--color-text-subtle)] font-medium italic leading-relaxed">
                Effet d'entourage entre terpènes et cannabinoïdes : illustration indicative du ressenti, sans effet psychoactif au sens du THC.
              </p>
            </div>
          </div>

          {/* Column 2: Stats & Bars (7/12) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Spectrum & Balance */}
            <div className="rounded-[2rem] border border-[color:var(--color-border)]/40 bg-[color:var(--color-card)]/60 p-6 backdrop-blur-xl shadow-sm">
              <div className="flex justify-between items-end mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] mb-1">Équilibre Dominant</p>
                  <h4 className={`text-2xl font-black uppercase tracking-tight ${isRelaxant ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
                    {spectrumLabel}
                  </h4>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-[color:var(--color-text-subtle)] uppercase tracking-[0.15em]">Intensité</p>
                  <p className="text-base font-black text-[color:var(--color-text)]">{Math.abs(spectrumPos - 50) * 2}% <span className="text-[10px] text-[color:var(--color-text-muted)] font-bold">Dominant</span></p>
                </div>
              </div>

              <div className="relative h-2.5 rounded-full bg-[color:var(--color-bg-muted)] overflow-hidden ring-1 ring-[color:var(--color-border)]">
                <div 
                  className="absolute inset-0 transition-all duration-1000"
                  style={{ background: 'linear-gradient(to right, #10b981, #d1fae5 45%, #fef3c7 55%, #f59e0b)' }} 
                />
                <motion.div 
                   className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10"
                   initial={{ left: '50%' }}
                   whileInView={{ left: `${spectrumPos}%` }}
                   transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                />
              </div>
              
              <div className="flex justify-between mt-2.5">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-[#10b981]/60">Apaisant</span>
                  <span className="text-xs font-black text-[#10b981]">{relaxAvg}%</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase text-[#f59e0b]/60">Tonique / éveil</span>
                  <span className="text-xs font-black text-[#f59e0b]">{stimAvg}%</span>
                </div>
              </div>
            </div>

            {/* Effect Bars Grid */}
            <div className="grid sm:grid-cols-2 gap-3">
              {EFFECT_KEYS.map((key, idx) => {
                const meta = EFFECT_META[key];
                const score = scores[key];
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white/[0.02] border border-white/5 rounded-xl p-3 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs opacity-70">{meta.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-white/70">{key}</span>
                      </div>
                      <span className="text-[10px] font-black tabular-nums" style={{ color: meta.color }}>{score}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <motion.div 
                        className="h-full rounded-full"
                        style={{ backgroundColor: meta.color }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${score}%` }}
                        transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </motion.section>
  );
}
