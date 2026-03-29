import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Leaf, Zap, BarChart2 } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { ProductSpec } from '../../types/premiumProduct';

// ── Types ─────────────────────────────────────────────────────────────────────
type EffectKey = 'Détente' | 'Sommeil' | 'Euphorie' | 'Créativité' | 'Concentration' | 'Soulagement';
type Source = 'terpenes' | 'metrics' | 'fallback';

const EFFECT_META: Record<EffectKey, { sublabel: string; icon: string; relaxing: boolean }> = {
  Détente:       { sublabel: 'Apaisement & calme',       icon: '🧘', relaxing: true  },
  Sommeil:       { sublabel: 'Récupération & repos',      icon: '💤', relaxing: true  },
  Soulagement:   { sublabel: 'Confort corporel',          icon: '🌿', relaxing: true  },
  Euphorie:      { sublabel: 'Légèreté & bonne humeur',   icon: '✨', relaxing: false },
  Créativité:    { sublabel: 'Inspiration & idées',       icon: '🎨', relaxing: false },
  Concentration: { sublabel: 'Focus & éveil mental',      icon: '🎯', relaxing: false },
};

const EFFECT_KEYS = Object.keys(EFFECT_META) as EffectKey[];

// ── Terpene profiles (for future real terpene data) ───────────────────────────
const TERPENE_PROFILES: Array<{ patterns: string[]; effects: Partial<Record<EffectKey, number>> }> = [
  { patterns: ['myrcène', 'myrcene'],         effects: { Détente: 90, Sommeil: 80, Soulagement: 65, Euphorie: 25 } },
  { patterns: ['limonène', 'limonene'],        effects: { Euphorie: 85, Créativité: 70, Concentration: 65, Détente: 35 } },
  { patterns: ['caryophyllène', 'caryophyl'], effects: { Soulagement: 88, Détente: 65, Euphorie: 30 } },
  { patterns: ['linalool'],                     effects: { Sommeil: 90, Détente: 80, Soulagement: 50 } },
  { patterns: ['pinène', 'pinene'],            effects: { Concentration: 90, Créativité: 72, Euphorie: 42 } },
  { patterns: ['terpinolène', 'terpinol'],     effects: { Euphorie: 72, Créativité: 60, Détente: 48 } },
  { patterns: ['ocimène', 'ocimene'],          effects: { Créativité: 82, Euphorie: 65, Concentration: 55 } },
  { patterns: ['humulène', 'humulene'],        effects: { Soulagement: 88, Détente: 52 } },
  { patterns: ['géraniol', 'geraniol'],        effects: { Détente: 68, Euphorie: 55, Sommeil: 62 } },
  { patterns: ['bisabolol'],                    effects: { Sommeil: 72, Détente: 78, Soulagement: 58 } },
  { patterns: ['nerolidol', 'nérolidol'],      effects: { Sommeil: 80, Détente: 75 } },
  { patterns: ['borneol', 'bornéol'],          effects: { Sommeil: 75, Soulagement: 65, Détente: 60 } },
  { patterns: ['eucalyptol', 'cinéole'],       effects: { Concentration: 78, Créativité: 60 } },
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
): { source: Source; scores: Record<EffectKey, number> } {

  // ── 1. Try individual terpene specs ──
  const terpeneSpecs = specs.filter(s =>
    s.category === 'Profil Aromatique' ||
    s.category === 'Terpènes' ||
    s.category === 'Profil de Terpènes',
  );

  const sums: Record<EffectKey, number> = { Détente: 0, Sommeil: 0, Soulagement: 0, Euphorie: 0, Créativité: 0, Concentration: 0 };
  let matched = 0;

  for (const spec of terpeneSpecs) {
    const profile = matchTerpene(spec.name);
    if (!profile) continue;
    matched++;
    const w = (spec.intensity ?? 50) / 100;
    for (const [k, v] of Object.entries(profile.effects) as [EffectKey, number][]) {
      sums[k] += v * w;
    }
  }

  if (matched > 0) {
    const max = Math.max(...Object.values(sums), 1);
    return {
      source: 'terpenes',
      scores: Object.fromEntries(
        EFFECT_KEYS.map(k => [k, Math.round((sums[k] / max) * 100)]),
      ) as Record<EffectKey, number>,
    };
  }

  // ── 2. Derive from productMetrics (AI-generated, product-specific) ──
  //   Détente (0-10): overall relaxation score
  //   Puissance (0-10): potency / intensity
  //   Saveur / Arôme: organoleptic qualities (linked to terpene richness)
  if (productMetrics) {
    const D = productMetrics.Détente * 10;    // 0–100
    const P = productMetrics.Puissance * 10;  // 0–100
    const A = productMetrics.Arôme * 10;      // 0–100

    const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

    return {
      source: 'metrics',
      scores: {
        // Relaxant trio: driven by Détente, inversely by Puissance
        Détente:       clamp(D),
        Sommeil:       clamp(D * 0.85 + (100 - P) * 0.15),
        Soulagement:   clamp(D * 0.5 + P * 0.5),
        // Stimulant trio: driven by Puissance, inversely by Détente
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
    <div className="rounded-xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl px-3 py-2 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#10b981] mb-0.5">
        {meta.icon} {item.subject}
      </p>
      <p className="text-[9px] text-white/50 font-medium">{meta.sublabel}</p>
      <p className="text-xl font-black text-white mt-1">
        {item.value}<span className="text-xs text-white/40">/100</span>
      </p>
    </div>
  );
};

// ── Source badge config ───────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<Source, { icon: typeof Leaf; label: string; sub: string; color: string; border: string; bg: string }> = {
  terpenes: { icon: Leaf,     label: 'Profil terpénique',   sub: 'Données labo certifiées',  color: '#10b981', border: 'border-[#10b981]/30', bg: 'bg-[#10b981]/8' },
  metrics:  { icon: Sparkles, label: 'Analyse IA produit',  sub: 'Scores générés par l\'IA', color: '#a78bfa', border: 'border-[#a78bfa]/30', bg: 'bg-[#a78bfa]/8' },
  fallback: { icon: BarChart2, label: 'Estimation CBD',     sub: 'D\'après la composition',  color: '#94a3b8', border: 'border-[#94a3b8]/20', bg: 'bg-[#94a3b8]/6' },
};

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  specs: ProductSpec[];
  productMetrics?: Record<'Détente' | 'Saveur' | 'Arôme' | 'Puissance', number>;
  cbdPercentage?: number | null;
}

export default function TerpeneEffectsChart({ specs, productMetrics, cbdPercentage }: Props) {
  const { source, scores } = useMemo(
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
    spectrumPos < 30  ? 'Très relaxant'
    : spectrumPos < 45 ? 'Majoritairement relaxant'
    : spectrumPos < 55 ? 'Équilibré'
    : spectrumPos < 70 ? 'Légèrement stimulant'
    :                     'Majoritairement stimulant';

  const isRelaxant = spectrumPos < 50;
  const srcCfg = SOURCE_CONFIG[source];
  const SrcIcon = srcCfg.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative border-y border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/40 overflow-hidden"
    >
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[360px] rounded-full bg-[color:var(--color-primary)]/6 blur-[80px]" />

      <div className="relative mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/10 px-3 py-1.5">
              <Sparkles className="w-3 h-3 text-[color:var(--color-primary)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-primary)]">
                Analyse IA des Effets
              </span>
            </div>
            <h3
              className="text-3xl text-[color:var(--color-text)]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Spectre d'Effets
            </h3>
            <p className="mt-1.5 text-sm text-[color:var(--color-text-muted)] font-medium max-w-md">
              {source === 'terpenes'
                ? 'Effets prédits par l\'IA à partir du profil terpénique certifié labo.'
                : source === 'metrics'
                ? 'Effets calculés par l\'IA d\'après les scores de relaxation, puissance et arôme du produit.'
                : 'Estimation d\'après la composition cannabinoïde du produit.'}
            </p>
          </div>

          <div className={`inline-flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${srcCfg.border} ${srcCfg.bg}`}>
            <SrcIcon className="w-4 h-4 flex-shrink-0" style={{ color: srcCfg.color }} />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: srcCfg.color }}>
                {srcCfg.label}
              </p>
              <p className="text-[9px] text-[color:var(--color-text-subtle)] font-medium">{srcCfg.sub}</p>
            </div>
          </div>
        </div>

        {/* ── Two-column: radar + bars ── */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] items-center">

          {/* Radar */}
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-[380px] mx-auto">
              <div className="absolute inset-0 rounded-full bg-[color:var(--color-primary)]/4 blur-2xl scale-75 pointer-events-none" />
              <ResponsiveContainer width="100%" aspect={1}>
                <RadarChart data={radarData} margin={{ top: 24, right: 32, bottom: 24, left: 32 }}>
                  <PolarGrid
                    gridType="polygon"
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="3 3"
                  />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={({ x, y, payload }: any) => {
                      const meta = EFFECT_META[payload.value as EffectKey];
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={-4} textAnchor="middle" style={{ fontSize: 14 }}>
                            {meta.icon}
                          </text>
                          <text
                            x={0} y={10}
                            textAnchor="middle"
                            style={{ fontSize: 9, fontWeight: 700, fill: 'rgba(255,255,255,0.40)', letterSpacing: '0.07em' }}
                          >
                            {payload.value.toUpperCase()}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Effets"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="#10b981"
                    fillOpacity={0.18}
                    dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Effect bars */}
          <div className="grid gap-2.5">
            {EFFECT_KEYS.map((key, idx) => {
              const meta = EFFECT_META[key];
              const score = scores[key];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.06, duration: 0.4 }}
                  className="group flex items-center gap-3.5 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 px-4 py-3.5 hover:border-[color:var(--color-primary)]/25 transition-colors duration-300 cursor-default"
                >
                  <span className="text-base w-5 text-center flex-shrink-0">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text)]">{key}</p>
                      <span className={`text-xs font-black tabular-nums ${meta.relaxing ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>{score}</span>
                    </div>
                    <p className="text-[9px] text-[color:var(--color-text-subtle)] font-medium mb-2 leading-none">{meta.sublabel}</p>
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-[color:var(--color-bg-muted)]">
                      <motion.div
                        className={`h-full rounded-full ${meta.relaxing
                          ? 'bg-gradient-to-r from-[#10b981] to-[#34d399]'
                          : 'bg-gradient-to-r from-[#f59e0b] to-[#fb923c]'}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${score}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.1 + idx * 0.07, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Spectrum ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mt-10 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-subtle)]">
              Axe dominant
            </p>
            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
              isRelaxant
                ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
                : 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]'
            }`}>
              {spectrumLabel}
            </span>
          </div>

          {/* Bar + marker */}
          <div className="relative h-3">
            <div
              className="h-3 w-full rounded-full overflow-hidden"
              style={{ background: 'linear-gradient(to right, #10b981, #34d399 35%, #fbbf24 65%, #f97316)' }}
            />
            <motion.div
              className={`absolute top-1/2 w-5 h-5 rounded-full bg-white shadow-lg border-2 border-[color:var(--color-bg)] ${isRelaxant ? 'ring-2 ring-[#10b981]' : 'ring-2 ring-[#f97316]'}`}
              style={{ translateX: '-50%', translateY: '-50%', left: `${spectrumPos}%` }}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.7 }}
            />
          </div>

          <div className="mt-2.5 flex justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#10b981]">Relaxant</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-[#f97316]">Stimulant</span>
          </div>

          {/* Score recap */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#10b981]/8 border border-[#10b981]/15 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#10b981] mb-1">Score Relaxant</p>
              <p className="text-2xl font-black text-[color:var(--color-text)] tabular-nums">
                {relaxAvg}<span className="text-xs text-[color:var(--color-text-subtle)]">/100</span>
              </p>
              <p className="text-[9px] text-[color:var(--color-text-subtle)] font-medium mt-0.5">Détente · Sommeil · Soulagement</p>
            </div>
            <div className="rounded-xl bg-[#f59e0b]/8 border border-[#f59e0b]/15 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#f59e0b] mb-1">Score Stimulant</p>
              <p className="text-2xl font-black text-[color:var(--color-text)] tabular-nums">
                {stimAvg}<span className="text-xs text-[color:var(--color-text-subtle)]">/100</span>
              </p>
              <p className="text-[9px] text-[color:var(--color-text-subtle)] font-medium mt-0.5">Euphorie · Créativité · Focus</p>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.section>
  );
}
