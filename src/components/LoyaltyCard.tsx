import { useRef, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Share2, Copy, Check, Gift } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

interface LoyaltyCardProps {
    userId: string;
    fullName: string;
    points: number;
    referralCode?: string | null;
    /** Set to true for the compact version shown inside admin POS modal */
    compact?: boolean;
}

/**
 * Generates a short, stable loyalty card number from a UUID.
 */
function getCardNumber(userId: string, storeName: string) {
    const raw = userId.replace(/-/g, '').toUpperCase();
    const initials = storeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'GM';
    return `${initials}-${raw.slice(-8)}`;
}

const TIER_COLORS: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    argent: '#C0C0C0',
    gold: '#FFD700',
    or: '#FFD700',
    platine: '#e5e4e2',
    platinum: '#e5e4e2'
};

function useCopy(text: string, delay = 2000) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), delay);
        });
    };
    return { copied, copy };
}

export default function LoyaltyCard({ userId, fullName, points, referralCode, compact = false }: LoyaltyCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const { settings } = useSettingsStore();

    const tiers = useMemo(() => {
        const settingsTiers = settings.loyalty_tiers || [];
        return [...settingsTiers].sort((a, b) => a.min_points - b.min_points);
    }, [settings.loyalty_tiers]);

    const tier = useMemo(() => {
        if (tiers.length === 0) return { label: 'Membre', color: '#39FF14', next: null, nextLabel: null, progress: 100 };

        const current = [...tiers].reverse().find(t => points >= t.min_points) || tiers[0];
        const idx = tiers.findIndex(t => t.id === current.id);
        const next = tiers[idx + 1] || null;

        const color = TIER_COLORS[current.name.toLowerCase()] || '#39FF14';

        let progress = 100;
        if (next) {
            const range = next.min_points - current.min_points;
            const currentProgress = points - current.min_points;
            progress = Math.min(Math.round((currentProgress / range) * 100), 100);
        }

        return {
            label: current.name,
            color,
            next: next ? next.min_points : null,
            nextLabel: next ? next.name : null,
            progress
        };
    }, [points, tiers]);

    const cardNum = useMemo(() => getCardNumber(userId, settings.store_name), [userId, settings.store_name]);
    const qrValue = `${settings.store_url?.replace(/\/$/, '') || 'greenmood'}/loyalty/${userId}`;

    const { copied: copiedCard, copy: copyCard } = useCopy(cardNum);
    const { copied: copiedRef, copy: copyRef } = useCopy(referralCode ?? '');

    if (compact) {
        return (
            <div className="flex flex-col items-center gap-4">
                <div
                    ref={cardRef}
                    className="w-full max-w-[360px] rounded-3xl p-5 relative overflow-hidden shadow-2xl"
                    style={{
                        background: 'linear-gradient(135deg, #0a1a0f 0%, #0d2310 40%, #132b14 100%)',
                        border: `1px solid ${tier.color}30`,
                        boxShadow: `0 0 40px ${tier.color}15, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: tier.color }} />
                    <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full blur-2xl opacity-10 bg-green-400" />

                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div>
                            <p className="text-[9px] font-mono tracking-[0.3em] text-green-400/60 uppercase mb-1">{settings.store_name}</p>
                            <p className="text-[color:var(--color-text)] font-black text-base leading-tight truncate max-w-[180px]">{fullName || 'Client'}</p>
                            <p className="text-[10px] font-mono text-[color:var(--color-text-subtle)] mt-0.5">{cardNum}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ color: tier.color, background: `${tier.color}15`, border: `1px solid ${tier.color}30` }}>
                                {tier.label}
                            </span>
                            <div className="flex items-center gap-1">
                                <Star className="w-3 h-3" style={{ color: tier.color, fill: tier.color }} />
                                <span className="font-black text-[color:var(--color-text)] text-sm">{points}</span>
                                <span className="text-[10px] text-[color:var(--color-text-subtle)]">{settings.loyalty_currency_name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center relative z-10">
                        <div className="bg-[color:var(--color-surface)] rounded-2xl p-2.5 shadow-xl">
                            <QRCodeSVG
                                value={qrValue}
                                size={100}
                                bgColor="#ffffff"
                                fgColor="#0a1a0f"
                                level="H"
                            />
                        </div>
                    </div>

                    <p className="text-center text-[9px] font-mono text-[color:var(--color-text-subtle)] mt-3 relative z-10">Scannez pour identifier ce client au POS</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-6 w-full">
            {/* Premium loyalty card */}
            <motion.div
                ref={cardRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.015, rotateX: 1 }}
                className="w-full max-sm rounded-[2rem] p-7 relative overflow-hidden shadow-2xl cursor-default select-none"
                style={{
                    background: 'linear-gradient(135deg, #071510 0%, #0d2310 50%, #1a3a1c 100%)',
                    border: `1px solid ${tier.color}40`,
                    boxShadow: `0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 0 80px ${tier.color}18`,
                }}
            >
                {/* Background effects */}
                <div className="absolute top-0 right-0 w-56 h-56 rounded-full blur-3xl opacity-12" style={{ background: tier.color }} />
                <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full blur-2xl opacity-10 bg-emerald-400" />
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 80% 20%, ${tier.color}08 0%, transparent 50%)`,
                }} />
                {/* Subtle diagonal lines texture */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 0px, transparent 50%)',
                    backgroundSize: '8px 8px',
                }} />

                {/* Card chip-style emblem */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-8 h-6 rounded bg-gradient-to-br from-amber-300/30 to-amber-600/20 border border-amber-400/20 grid grid-cols-2 grid-rows-3 gap-0.5 p-0.5">
                    {Array(6).fill(0).map((_, i) => (
                        <div key={i} className="bg-amber-400/20 rounded-[1px]" />
                    ))}
                </div>

                {/* Top section */}
                <div className="flex items-start justify-between mb-6 relative z-10 pt-2">
                    <div>
                        <p className="text-[9px] font-mono tracking-[0.3em] text-green-400/60 uppercase mb-1">{settings.store_name}</p>
                        <p className="text-[color:var(--color-text)] font-black text-xl leading-tight">{fullName || 'Client'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <span
                            className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                            style={{
                                color: tier.color,
                                background: `${tier.color}18`,
                                border: `1px solid ${tier.color}35`,
                                textShadow: `0 0 8px ${tier.color}60`,
                            }}
                        >
                            ✦ {tier.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5" style={{ color: tier.color, fill: tier.color }} />
                            <span className="text-lg font-black text-[color:var(--color-text)]">{points}</span>
                            <span className="text-[10px] text-[color:var(--color-text-subtle)] font-bold">PTS</span>
                        </div>
                    </div>
                </div>

                {/* QR Code center */}
                <div className="flex justify-center mb-6 relative z-10">
                    <div
                        className="bg-[color:var(--color-surface)] rounded-2xl p-3 shadow-2xl"
                        style={{ boxShadow: `0 8px 30px ${tier.color}25, 0 0 0 1px rgba(255,255,255,0.1)` }}
                    >
                        <QRCodeSVG
                            value={qrValue}
                            size={130}
                            bgColor="#ffffff"
                            fgColor="#0a1a0f"
                            level="H"
                        />
                    </div>
                </div>

                {/* Points + card number row */}
                <div className="flex items-end justify-between relative z-10">
                    <div>
                        <p className="text-[8px] font-mono tracking-[0.3em] text-[color:var(--color-text-subtle)] uppercase mb-1">Points accumulés</p>
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4" style={{ color: tier.color, fill: tier.color }} />
                            <span className="text-2xl font-black text-[color:var(--color-text)]">{points}</span>
                            <span className="text-xs text-[color:var(--color-text-subtle)] font-bold">PTS</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-mono tracking-[0.2em] text-[color:var(--color-text-subtle)] uppercase mb-1">N° Carte</p>
                        <button
                            onClick={copyCard}
                            className="flex items-center gap-1.5 group"
                            title="Copier le numéro"
                        >
                            <span className="text-sm font-mono font-bold tracking-widest transition-colors" style={{ color: copiedCard ? '#4ade80' : `${tier.color}cc` }}>
                                {cardNum}
                            </span>
                            <AnimatePresence mode="wait">
                                {copiedCard
                                    ? <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="w-3 h-3 text-green-400" /></motion.span>
                                    : <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Copy className="w-3 h-3 text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-text-muted)] transition-colors" /></motion.span>
                                }
                            </AnimatePresence>
                        </button>
                    </div>
                </div>

                {/* Progress bar to next tier */}
                {tier.next !== null && (
                    <div className="mt-5 relative z-10">
                        <div className="flex justify-between items-center mb-1.5">
                            <p className="text-[8px] font-mono text-[color:var(--color-text-subtle)] uppercase tracking-widest">{tier.label}</p>
                            <p className="text-[8px] font-mono uppercase tracking-widest" style={{ color: `${tier.color}90` }}>
                                {tier.next - points} {settings.loyalty_currency_name} → {tier.nextLabel}
                            </p>
                        </div>
                        <div className="h-1.5 rounded-full bg-[color:var(--color-bg-elevated)] overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${tier.progress}%` }}
                                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                                className="h-full rounded-full relative"
                                style={{ background: `linear-gradient(90deg, ${tier.color}60, ${tier.color})` }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full shadow-lg" style={{ background: tier.color, boxShadow: `0 0 6px ${tier.color}` }} />
                            </motion.div>
                        </div>
                        <p className="text-right text-[8px] font-mono mt-1" style={{ color: `${tier.color}60` }}>{tier.progress}%</p>
                    </div>
                )}

                {tier.next === null && (
                    <div className="mt-5 relative z-10 text-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: tier.color }}>
                            ✦ Membre Platine — Niveau Maximal ✦
                        </p>
                    </div>
                )}
            </motion.div>

            {/* Referral code block */}
            {referralCode && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="w-full max-w-sm rounded-2xl px-5 py-4 flex items-center justify-between gap-3"
                    style={{
                        background: 'linear-gradient(135deg, #0a1a0f, #0d2310)',
                        border: `1px solid ${tier.color}25`,
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}30` }}>
                            <Gift className="w-4 h-4" style={{ color: tier.color }} />
                        </div>
                        <div>
                            <p className="text-[8px] font-mono tracking-[0.3em] text-[color:var(--color-text-subtle)] uppercase mb-0.5">Code parrainage</p>
                            <p className="text-base font-black font-mono tracking-widest text-[color:var(--color-text)]">{referralCode}</p>
                        </div>
                    </div>
                    <button
                        onClick={copyRef}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{
                            color: copiedRef ? '#4ade80' : tier.color,
                            background: copiedRef ? '#4ade8015' : `${tier.color}10`,
                            border: `1px solid ${copiedRef ? '#4ade8040' : `${tier.color}25`}`,
                        }}
                    >
                        {copiedRef ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedRef ? 'Copié' : 'Copier'}
                    </button>
                </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 text-xs">
                <button
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: `Ma Carte Fidélité ${settings.store_name}`,
                                text: `Mon code: ${cardNum} — ${points} points${referralCode ? `\nCode parrainage: ${referralCode}` : ''}`,
                            }).catch(() => { });
                        } else {
                            const text = [
                                `Carte Fidélité ${settings.store_name}`,
                                `N°: ${cardNum}`,
                                `Points: ${points}`,
                                referralCode ? `Code parrainage: ${referralCode}` : '',
                            ].filter(Boolean).join('\n');
                            navigator.clipboard.writeText(text).then(() => { });
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--color-bg-elevated)] hover:bg-[color:var(--color-bg-elevated)]/90 border border-[color:var(--color-border)] hover:border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-all"
                >
                    <Share2 className="w-3.5 h-3.5" />
                    Partager
                </button>
            </div>

            <p className="text-center text-[10px] font-mono text-[color:var(--color-text-subtle)] max-w-xs leading-relaxed">
                Présentez ce QR code en boutique pour identifier votre compte et utiliser vos {settings.loyalty_currency_name.toLowerCase()}.
            </p>
        </div>
    );
}
