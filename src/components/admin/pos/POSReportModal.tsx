import { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, FileCheck, Banknote, CreditCard, Smartphone, Package, Calculator, Printer, X, Lock } from 'lucide-react';
import { DailyReport } from './types';

interface POSReportModalProps {
    reportData: DailyReport;
    reportMode: 'view' | 'close';
    onClose: () => void;
    onFinalizeClose: (cashCounted: string) => void;
    isLightTheme?: boolean;
}

export default function POSReportModal({
    reportData,
    reportMode,
    onClose,
    onFinalizeClose,
    isLightTheme,
}: POSReportModalProps) {
    const [cashCounted, setCashCounted] = useState<string>('');

    const panierMoyen = reportData.orderCount > 0 ? (reportData.totalSales / reportData.orderCount).toFixed(2) : '0.00';
    const bestSeller = Object.entries(reportData.productBreakdown || {}).sort((a, b) => b[1].qty - a[1].qty)[0];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`border rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto sm:overflow-hidden shadow-2xl transition-all ${isLightTheme ? 'bg-white border-emerald-100' : 'bg-zinc-900 border border-zinc-800'}`}
            >
                <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                                {reportMode === 'view' ? <FileText className="w-6 h-6" /> : <FileCheck className="w-6 h-6 text-red-500" />}
                            </div>
                            <div>
                                <h2 className={`text-xl font-bold transition-colors ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>
                                    {reportMode === 'view' ? 'Rapport de Lecture' : 'Clôture de Caisse'}
                                </h2>
                                <p className={`text-xs transition-colors ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-500'}`}>Synthèse du {reportData.date.toLocaleDateString('fr-FR')}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-full transition-colors ${isLightTheme ? 'hover:bg-emerald-50 text-emerald-400' : 'hover:bg-zinc-800 text-zinc-500'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className={`border col-span-2 sm:col-span-1 rounded-2xl p-3 sm:p-4 transition-all ${isLightTheme ? 'bg-emerald-50 border-emerald-100' : 'bg-green-500/10 border-green-500/20'}`}>
                                    <p className={`text-[8px] sm:text-[10px] uppercase font-black tracking-widest mb-1 ${isLightTheme ? 'text-emerald-600' : 'text-green-400'}`}>Caisses Totales</p>
                                    <p className={`text-2xl sm:text-3xl font-black leading-none ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{reportData.totalSales.toFixed(2)} €</p>
                                </div>
                                <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border flex flex-col justify-center transition-all ${isLightTheme ? 'bg-white border-emerald-100' : 'bg-zinc-800/50 border-zinc-800'}`}>
                                    <p className={`text-[8px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 ${isLightTheme ? 'text-emerald-600/40' : 'text-zinc-500'}`}>Commandes</p>
                                    <p className={`text-xl sm:text-2xl font-black leading-none ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{reportData.orderCount}</p>
                                </div>
                                <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border flex flex-col justify-center transition-all ${isLightTheme ? 'bg-white border-emerald-100' : 'bg-zinc-800/50 border-zinc-800'}`}>
                                    <p className={`text-[8px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 ${isLightTheme ? 'text-emerald-600/40' : 'text-zinc-500'}`}>Panier Moyen</p>
                                    <p className={`text-lg sm:text-xl font-bold leading-none ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{panierMoyen} €</p>
                                </div>
                                <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border flex flex-col justify-center transition-all ${isLightTheme ? 'bg-white border-emerald-100' : 'bg-zinc-800/50 border-zinc-800'}`}>
                                    <p className={`text-[8px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 ${isLightTheme ? 'text-emerald-600/40' : 'text-zinc-500'}`}>Top Vente</p>
                                    <p className={`text-xs sm:text-sm font-bold truncate ${isLightTheme ? 'text-emerald-950' : 'text-white'}`} title={bestSeller ? bestSeller[0] : '-'}>
                                        {bestSeller ? bestSeller[0] : '-'}
                                    </p>
                                    {bestSeller && <p className={`text-[10px] sm:text-xs font-bold mt-0.5 ${isLightTheme ? 'text-green-600' : 'text-green-400'}`}>{bestSeller[1].qty} vendus</p>}
                                </div>
                            </div>

                            <div className={`rounded-2xl border divide-y transition-all ${isLightTheme ? 'bg-emerald-50/30 border-emerald-100 divide-emerald-100' : 'bg-zinc-800/30 border-zinc-800 divide-zinc-800'}`}>
                                <div className="p-4 flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <Banknote className={`w-4 h-4 ${isLightTheme ? 'text-emerald-600' : 'text-green-400'}`} />
                                        <span className={isLightTheme ? 'text-emerald-800' : 'text-zinc-300'}>Espèces</span>
                                    </div>
                                    <span className={`font-bold ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{reportData.cashTotal.toFixed(2)} €</span>
                                </div>
                                <div className="p-4 flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-blue-400" />
                                        <span className={isLightTheme ? 'text-emerald-800' : 'text-zinc-300'}>Carte Bancaire</span>
                                    </div>
                                    <span className={`font-bold ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{reportData.cardTotal.toFixed(2)} €</span>
                                </div>
                                <div className="p-4 flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="w-4 h-4 text-purple-400" />
                                        <span className={isLightTheme ? 'text-emerald-800' : 'text-zinc-300'}>Mobile</span>
                                    </div>
                                    <span className={`font-bold ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{reportData.mobileTotal.toFixed(2)} €</span>
                                </div>
                            </div>

                        </div>

                        <div className="flex flex-col h-full space-y-4">
                            <div className="bg-zinc-800/50 rounded-2xl p-4 border border-zinc-800 flex justify-between items-center shrink-0">
                                <div>
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Articles vendus</p>
                                    <p className="text-lg font-bold text-white">{reportData.itemsSold} unités</p>
                                </div>
                                <Package className="w-8 h-8 text-zinc-700" />
                            </div>

                            {reportMode === 'close' ? (
                                <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col space-y-4 transition-all ${isLightTheme ? 'bg-white border border-emerald-100 shadow-sm' : 'bg-zinc-800/20 border border-zinc-800'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Calculator className={`w-6 h-6 ${isLightTheme ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                        <h3 className={`font-black uppercase tracking-tight ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Vérification Caisse</h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-500'}`}>Espèces comptées dans le tiroir</label>
                                            <input
                                                type="number"
                                                value={cashCounted}
                                                onChange={(e) => setCashCounted(e.target.value)}
                                                placeholder="0.00 €"
                                                className={`w-full text-xl sm:text-2xl font-black rounded-xl sm:rounded-2xl border px-4 sm:px-6 py-3 sm:py-4 focus:outline-none focus:ring-4 focus:ring-green-500/20 transition-all ${isLightTheme ? 'bg-white border-emerald-100 text-emerald-950 placeholder-emerald-100' : 'bg-black/60 border-zinc-700 text-white placeholder-zinc-800'}`}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className={`text-[9px] uppercase font-bold ${isLightTheme ? 'text-emerald-600/40' : 'text-zinc-500'}`}>Théorique (Système)</label>
                                                <div className={`p-3 rounded-xl border font-black text-sm ${isLightTheme ? 'bg-emerald-50 border-emerald-100 text-emerald-950' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
                                                    {reportData.cashTotal.toFixed(2)} €
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className={`text-[9px] uppercase font-bold ${isLightTheme ? 'text-emerald-600' : 'text-green-400'}`}>Réel (Compté)</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={cashCounted}
                                                        onChange={(e) => setCashCounted(e.target.value)}
                                                        className={`w-full p-3 rounded-xl border-2 focus:border-green-500 text-sm outline-none transition-all ${isLightTheme ? 'bg-emerald-50 border-emerald-100 text-emerald-950 placeholder-emerald-100' : 'bg-zinc-950 border-green-500/30 text-white placeholder-zinc-800'}`}
                                                    />
                                                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isLightTheme ? 'text-emerald-400' : 'text-zinc-500'}`}>€</span>
                                                </div>
                                            </div>
                                        </div>

                                        {cashCounted && (
                                            <div className={`p-3 rounded-xl flex justify-between items-center text-sm font-bold ${isLightTheme ? 'bg-emerald-50 border border-emerald-100' : 'bg-zinc-800/50 border border-zinc-700'} ${(parseFloat(cashCounted) - reportData.cashTotal) === 0
                                                ? (isLightTheme ? 'text-emerald-600' : 'text-green-400')
                                                : (isLightTheme ? 'text-red-600' : 'text-red-400')
                                                }`}>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Écart de caisse :</span>
                                                <span className="text-sm font-black italic">
                                                    {(parseFloat(cashCounted) - reportData.cashTotal).toFixed(2)} €
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${isLightTheme ? 'bg-emerald-50 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                        <Lock className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p className={`text-sm font-medium ${isLightTheme ? 'text-emerald-800' : 'text-zinc-500'}`}>Comptez votre fonds de caisse pour clôturer</p>
                                </div>
                            )}

                            {/* Product Breakdown */}
                            <div className="flex-1 lg:overflow-y-auto custom-scrollbar lg:pr-2 min-h-[200px] lg:min-h-[300px] max-h-[500px]">
                                <div className={`rounded-2xl overflow-hidden border ${isLightTheme ? 'bg-emerald-50 border-emerald-100' : 'bg-black/40 border-zinc-800'}`}>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-[10px] sm:text-xs min-w-[300px]">
                                            <thead className={`uppercase font-black tracking-widest ${isLightTheme ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-800/50 text-zinc-500'}`}>
                                                <tr>
                                                    <th className="px-4 py-2">Produit</th>
                                                    <th className="px-4 py-2 text-center">Qté</th>
                                                    <th className="px-4 py-2 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isLightTheme ? 'divide-emerald-100 text-emerald-800' : 'divide-zinc-800/50 text-zinc-300'}`}>
                                                {Object.entries(reportData.productBreakdown || {}).map(([name, stats]) => (
                                                    <tr key={name}>
                                                        <td className="px-4 py-2.5 font-medium">{name}</td>
                                                        <td className={`px-4 py-2.5 text-center font-bold ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{stats.qty}</td>
                                                        <td className={`px-4 py-2.5 text-right font-bold ${isLightTheme ? 'text-emerald-600' : 'text-green-400'}`}>{stats.total.toFixed(2)} €</td>
                                                    </tr>
                                                ))}
                                                {Object.keys(reportData.productBreakdown || {}).length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className={`px-4 py-6 text-center italic ${isLightTheme ? 'text-emerald-400' : 'text-zinc-600'}`}>Aucun article vendu</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 sm:p-6 border-t flex flex-col sm:flex-row gap-4 items-center justify-between transition-all ${isLightTheme ? 'bg-emerald-50/50 border-emerald-100' : 'bg-black/20 border-zinc-800'}`}>
                        <button
                            onClick={() => window.print()}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 font-bold text-xs sm:text-sm rounded-xl transition-all ${isLightTheme ? 'text-emerald-600 hover:bg-emerald-50 border border-emerald-100' : 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700'}`}
                        >
                            <Printer className="w-4 h-4" />
                            Imprimer le rapport
                        </button>
                        {reportMode === 'view' ? (
                            <button
                                onClick={onClose}
                                className={`w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-2xl transition-all px-8 ${isLightTheme ? 'shadow-md shadow-green-200' : ''}`}
                            >
                                OK
                            </button>
                        ) : (
                            <button
                                onClick={() => onFinalizeClose(cashCounted)}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                            >
                                <Lock className="w-4 h-4" />
                                Confirmer la Clôture
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
