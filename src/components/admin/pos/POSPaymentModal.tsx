import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Banknote, Smartphone, AlertTriangle, RotateCcw, CheckCircle2 } from 'lucide-react';
import { PaymentMethod } from './types';
import React from 'react';

export const pmOptions: { key: PaymentMethod; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'cash', label: 'Espèces', icon: Banknote, color: 'border-green-500 bg-green-900/20 text-green-400' },
    { key: 'card', label: 'Carte', icon: CreditCard, color: 'border-blue-500 bg-blue-900/20 text-blue-400' },
    { key: 'mobile', label: 'Mobile', icon: Smartphone, color: 'border-purple-500 bg-purple-900/20 text-purple-400' },
];

interface POSPaymentModalProps {
    showPaymentModal: boolean;
    setShowPaymentModal: (v: boolean) => void;
    isLightTheme: boolean;
    total: number;
    paymentMethod: PaymentMethod;
    setPaymentMethod: (pm: PaymentMethod) => void;
    cashGiven: string;
    setCashGiven: (v: string) => void;
    processSale: () => void;
    isProcessing: boolean;
}

export default function POSPaymentModal(props: POSPaymentModalProps) {
    const {
        showPaymentModal,
        setShowPaymentModal,
        isLightTheme,
        total,
        paymentMethod,
        setPaymentMethod,
        cashGiven,
        setCashGiven,
        processSale,
        isProcessing
    } = props;

    if (!showPaymentModal) return null;

    const cashNum = parseFloat(cashGiven) || 0;
    const change = Math.max(0, cashNum - total);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`border rounded-xl p-4 w-full max-w-sm shadow-2xl transition-all ${isLightTheme ? 'bg-white border-emerald-100' : 'bg-zinc-900 border border-zinc-700'}`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <h2 className={`text-base font-bold transition-colors ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Encaissement</h2>
                        <button
                            onClick={() => setShowPaymentModal(false)}
                            className={`transition-colors ${isLightTheme ? 'text-emerald-300 hover:text-emerald-600' : 'text-zinc-500 hover:text-white'}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Total to pay */}
                    <div className={`rounded-xl p-3 mb-3 text-center transition-all ${isLightTheme ? 'bg-emerald-50 border border-emerald-100' : 'bg-zinc-800'}`}>
                        <p className={`text-[9px] uppercase tracking-widest mb-0.5 font-black ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-500'}`}>Montant à encaisser</p>
                        <p className={`text-3xl font-black ${isLightTheme ? 'text-green-700' : 'text-green-400'}`}>{total.toFixed(2)} €</p>
                    </div>

                    {/* Payment method */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        {pmOptions.map((pm) => (
                            <button
                                key={pm.key}
                                onClick={() => setPaymentMethod(pm.key)}
                                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all ${paymentMethod === pm.key
                                    ? (isLightTheme && pm.key === 'card' ? 'bg-blue-600 border-blue-500 text-white'
                                        : isLightTheme && pm.key === 'cash' ? 'bg-emerald-600 border-emerald-500 text-white'
                                            : isLightTheme && pm.key === 'mobile' ? 'bg-purple-600 border-purple-500 text-white'
                                                : pm.color)
                                    : (isLightTheme ? 'border-emerald-100 bg-emerald-50 text-emerald-400 hover:border-emerald-300' : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600')
                                    }`}
                            >
                                <pm.icon className="w-5 h-5" />
                                <span className="text-[9px] font-black uppercase tracking-widest">{pm.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Cash given field */}
                    <AnimatePresence>
                        {paymentMethod === 'cash' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden mb-5"
                            >
                                <div className={`rounded-xl p-4 space-y-3 transition-all ${isLightTheme ? 'bg-emerald-50' : 'bg-zinc-800'}`}>
                                    <div>
                                        <label className={`text-[9px] uppercase font-black tracking-widest mb-1 block ${isLightTheme ? 'text-emerald-700/60' : 'text-zinc-400'}`}>
                                            Montant reçu (€)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={total}
                                            placeholder={`Min. ${total.toFixed(2)}`}
                                            value={cashGiven}
                                            onChange={(e) => setCashGiven(e.target.value)}
                                            className={`w-full rounded-lg px-3 py-2 text-lg font-black transition-all focus:outline-none ${isLightTheme
                                                ? 'bg-white border border-emerald-100 text-emerald-950 focus:border-green-500'
                                                : 'bg-zinc-700 border border-zinc-600 text-white focus:border-green-500'}`}
                                        />
                                    </div>

                                    {/* Quick amounts */}
                                    <div className="flex gap-2 flex-wrap">
                                        {[
                                            Math.ceil(total),
                                            Math.ceil(total / 5) * 5,
                                            Math.ceil(total / 10) * 10,
                                            Math.ceil(total / 20) * 20,
                                            50,
                                        ]
                                            .filter((v, i, arr) => arr.indexOf(v) === i && v >= total)
                                            .slice(0, 4)
                                            .map((v) => (
                                                <button
                                                    key={v}
                                                    onClick={() => setCashGiven(v.toFixed(2))}
                                                    className={`flex-1 rounded-lg py-2 text-[10px] font-black transition-all ${isLightTheme
                                                        ? 'bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                                                        : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'}`}
                                                >
                                                    {v.toFixed(0)} €
                                                </button>
                                            ))}
                                    </div>

                                    {cashNum >= total && (
                                        <div className={`flex items-center justify-between border rounded-lg px-3 py-2 transition-all ${isLightTheme ? 'bg-white border-green-500/20' : 'bg-green-900/20 border-green-800'}`}>
                                            <span className={`text-xs font-black uppercase tracking-tight ${isLightTheme ? 'text-green-700' : 'text-green-400'}`}>Monnaie à rendre</span>
                                            <span className={`text-lg font-black ${isLightTheme ? 'text-green-700' : 'text-green-400'}`}>{change.toFixed(2)} €</span>
                                        </div>
                                    )}

                                    {cashNum > 0 && cashNum < total && (
                                        <div className="flex items-center gap-2 text-red-400 text-xs">
                                            <AlertTriangle className="w-4 h-4" />
                                            Montant insuffisant ({(total - cashNum).toFixed(2)} € manquant)
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Confirm */}
                    <button
                        onClick={processSale}
                        disabled={
                            isProcessing ||
                            (paymentMethod === 'cash' && (cashNum < total || cashNum === 0))
                        }
                        className={`w-full flex items-center justify-center gap-2 font-black py-3 rounded-xl transition-all text-xs uppercase tracking-[0.2em] ${isLightTheme
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 disabled:bg-emerald-50 disabled:text-emerald-200'
                            : 'bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black'
                            }`}
                    >
                        {isProcessing ? (
                            <>
                                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                Traitement…
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Valider la vente
                            </>
                        )}
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
