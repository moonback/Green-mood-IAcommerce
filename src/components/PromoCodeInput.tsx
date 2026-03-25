import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, CheckCircle2, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface AppliedPromo {
    code: string;
    description: string | null;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    /** montant réel déduit calculé par le parent */
    discount_amount: number;
}

interface PromoCodeInputProps {
    subtotal: number;
    onApply: (promo: AppliedPromo | null) => void;
    applied: AppliedPromo | null;
}

export default function PromoCodeInput({ subtotal, onApply, applied }: PromoCodeInputProps) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleApply = async () => {
        const code = input.trim().toUpperCase();
        if (!code) return;
        setLoading(true);
        setError('');

        const { data, error: fetchError } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();

        setLoading(false);

        if (fetchError || !data) {
            setError('Code promo invalide ou inexistant.');
            return;
        }

        // Validations
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            setError('Ce code promo a expiré.');
            return;
        }
        if (data.max_uses !== null && data.uses_count >= data.max_uses) {
            setError('Ce code promo a atteint son nombre maximum d\'utilisations.');
            return;
        }
        if (subtotal < data.min_order_value) {
            setError(`Ce code nécessite un minimum de commande de ${parseFloat(data.min_order_value).toFixed(2)} €.`);
            return;
        }

        // Calcul de la réduction
        const discount_amount =
            data.discount_type === 'percent'
                ? Math.min(subtotal, (subtotal * parseFloat(data.discount_value)) / 100)
                : Math.min(subtotal, parseFloat(data.discount_value));

        onApply({
            code: data.code,
            description: data.description,
            discount_type: data.discount_type as 'percent' | 'fixed',
            discount_value: parseFloat(data.discount_value),
            discount_amount: parseFloat(discount_amount.toFixed(2)),
        });
        setInput('');
    };

    const handleRemove = () => {
        onApply(null);
        setError('');
    };

    return (
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-sm text-white">Code promo</h3>
            </div>

            <AnimatePresence mode="wait">
                {applied ? (
                    /* Applied state */
                    <motion.div
                        key="applied"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3"
                    >
                        <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-emerald-400 font-mono tracking-wider">{applied.code}</p>
                                {applied.description && (
                                    <p className="text-xs text-zinc-400 mt-0.5">{applied.description}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-emerald-400 font-bold text-sm">
                                −{applied.discount_amount.toFixed(2)} €
                            </span>
                            <button
                                onClick={handleRemove}
                                aria-label="Retirer le code promo"
                                className="w-6 h-6 rounded-full bg-zinc-700 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-all"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    /* Input state */
                    <motion.div
                        key="input"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                    >
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => { setInput(e.target.value.toUpperCase()); setError(''); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                                placeholder="EX : WEEDKEND-20"
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
                            />
                            <button
                                onClick={handleApply}
                                disabled={loading || !input.trim()}
                                className="px-4 py-2.5 bg-emerald-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm rounded-xl transition-colors flex items-center gap-1.5"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
                            </button>
                        </div>
                        <AnimatePresence>
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-xs text-red-400 mt-2"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
