import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Star, Trash2, X, Plus, Minus, Tag, Percent, Hash, CreditCard, UserPlus, FileText, Brain } from 'lucide-react';
import { Product, Category, Profile, UserAIPreferences } from '../../../lib/types';
import { CartLine, AppliedPromo } from './types';
import { CATEGORY_SLUGS } from '../../../lib/constants';
import { useSettingsStore } from '../../../store/settingsStore';

interface POSCartPanelProps {
    isLightTheme: boolean;
    isCartVisible: boolean;
    setIsCartVisible: (v: boolean) => void;
    showHistory: boolean;
    selectedCustomer: Profile | null;
    setSelectedCustomer: (c: Profile | null) => void;
    setPosStep: (step: 'client' | 'category' | 'products') => void;
    setShowCustomerDetail: (v: boolean) => void;
    selectedCustomerAIPreferences: UserAIPreferences | null;
    setShowAIPreferences: (v: boolean) => void;
    useLoyaltyPoints: boolean;
    setUseLoyaltyPoints: (v: boolean) => void;
    pointsToRedeem: number;
    setPointsToRedeem: (v: number) => void;
    subtotal: number;
    discount: number;
    promoDiscount: number;
    cart: CartLine[];
    setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
    clearCart: () => void;
    removeLine: (productId: string) => void;
    updateQty: (productId: string, delta: number) => void;
    updatePrice: (productId: string, price: string) => void;
    categories: Category[];
    discountType: 'percent' | 'fixed';
    setDiscountType: React.Dispatch<React.SetStateAction<'percent' | 'fixed'>>;
    discountValue: string;
    setDiscountValue: (v: string) => void;
    promoInput: string;
    setPromoInput: (v: string) => void;
    promoError: string;
    setPromoError: (v: string) => void;
    appliedPromo: AppliedPromo | null;
    setAppliedPromo: (p: AppliedPromo | null) => void;
    handleApplyPromo: () => void;
    isCheckingPromo: boolean;
    loyaltyDiscount: number;
    total: number;
    setShowPaymentModal: (v: boolean) => void;
}

export default function POSCartPanel(props: POSCartPanelProps) {
    const {
        isLightTheme,
        isCartVisible,
        setIsCartVisible,
        showHistory,
        selectedCustomer,
        setSelectedCustomer,
        setPosStep,
        setShowCustomerDetail,
        selectedCustomerAIPreferences,
        setShowAIPreferences,
        useLoyaltyPoints,
        setUseLoyaltyPoints,
        pointsToRedeem,
        setPointsToRedeem,
        subtotal,
        discount,
        promoDiscount,
        cart,
        setCart,
        clearCart,
        removeLine,
        updateQty,
        updatePrice,
        categories,
        discountType,
        setDiscountType,
        discountValue,
        setDiscountValue,
        promoInput,
        setPromoInput,
        promoError,
        setPromoError,
        appliedPromo,
        setAppliedPromo,
        handleApplyPromo,
        isCheckingPromo,
        loyaltyDiscount,
        total,
        setShowPaymentModal
    } = props;

    const { settings } = useSettingsStore();
    const currencyName = settings.loyalty_currency_name || 'pts';

    if (showHistory) return null;

    return (
        <div className={`w-full lg:w-[450px] shrink-0 flex flex-col border rounded-xl overflow-hidden shadow-2xl transition-all ${isLightTheme
            ? 'bg-white border-emerald-100 shadow-emerald-100/30'
            : 'bg-zinc-900 border border-zinc-800 shadow-black/50'
            } ${isCartVisible ? 'flex' : 'hidden lg:flex'}`}>
            <div className="lg:hidden p-4 border-b flex items-center justify-between">
                <h3 className={`font-black text-sm uppercase tracking-widest ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Votre Panier</h3>
                <button onClick={() => setIsCartVisible(false)} className={`p-2 rounded-full transition-colors ${isLightTheme ? 'hover:bg-emerald-50 text-emerald-400' : 'hover:bg-zinc-800 text-zinc-500 hover:text-white'}`}>
                    <X className="w-5 h-5" />
                </button>
            </div>
            {/* Customer Section */}
            <div className={`px-2.5 py-2.5 border-b transition-all ${isLightTheme ? 'bg-emerald-50 border-emerald-100' : 'bg-zinc-800/30 border-zinc-800'}`}>
                {!selectedCustomer ? (
                    <div className="text-center py-2">
                        <p className={`text-xs font-bold mb-2 ${isLightTheme ? 'text-emerald-700/60' : 'text-zinc-500'}`}>Vente sans client</p>
                        <button
                            onClick={() => setPosStep('client')}
                            className={`text-[10px] px-3 py-1.5 rounded-lg transition-colors font-bold flex items-center gap-1 mx-auto ${isLightTheme
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                                }`}
                        >
                            <UserPlus className="w-3 h-3" />
                            Identifier un client
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className={`flex items-center justify-between rounded-lg p-2 transition-all ${isLightTheme ? 'bg-white border border-emerald-100 shadow-sm' : 'bg-zinc-800 border border-zinc-700'}`}>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className={`font-bold text-xs transition-colors ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{selectedCustomer.full_name}</p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setShowCustomerDetail(true)}
                                            className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${isLightTheme ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'}`}
                                            title="Détails client"
                                        >
                                            <FileText className="w-3 h-3" />
                                        </button>
                                        {selectedCustomerAIPreferences && (
                                            <button
                                            onClick={() => setShowAIPreferences(true)}
                                            className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition-all ${isLightTheme ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-green-500 text-black hover:bg-green-400'}`}
                                            title="Intelligence IA"
                                        >
                                            <Brain className="w-2.5 h-2.5" />
                                        </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className={`text-[10px] transition-colors ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-500'}`}>{selectedCustomer.phone || 'Pas de numéro'}</p>
                                    <span className={`font-bold text-[9px] px-1.5 rounded transition-colors ${isLightTheme ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                        ★ {selectedCustomer.loyalty_points} {currencyName}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedCustomer(null);
                                    setUseLoyaltyPoints(false);
                                    setPointsToRedeem(0);
                                    setPosStep('client');
                                }}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Loyalty points redemption UI */}
                        {selectedCustomer.loyalty_points >= 100 && (
                            <div className={`pt-3 border-t mt-3 transition-all ${isLightTheme ? 'border-emerald-100' : 'border-zinc-800'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLightTheme ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/10 text-amber-500'}`}>
                                            <Star className="w-4 h-4 fill-current" />
                                        </div>
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Programme Fidélité</p>
                                            <p className={`text-[9px] font-bold mt-1 ${isLightTheme ? 'text-emerald-600/40' : 'text-zinc-500'}`}>{selectedCustomer.loyalty_points} {currencyName} disponibles</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newVal = !useLoyaltyPoints;
                                            setUseLoyaltyPoints(newVal);
                                            if (newVal) {
                                                const maxRedeemable = Math.min(selectedCustomer.loyalty_points, Math.floor((subtotal - discount) * 100));
                                                setPointsToRedeem(maxRedeemable >= 100 ? 100 : 0);
                                            } else {
                                                setPointsToRedeem(0);
                                            }
                                        }}
                                        className={`relative w-10 h-5 rounded-full transition-colors duration-300 focus:outline-none ${useLoyaltyPoints ? 'bg-green-500' : (isLightTheme ? 'bg-emerald-100' : 'bg-zinc-800')}`}
                                    >
                                        <motion.div
                                            animate={{ x: useLoyaltyPoints ? 22 : 2 }}
                                            className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                                        />
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {useLoyaltyPoints && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-4 overflow-hidden"
                                        >
                                            <div className={`p-2 rounded-xl border transition-all ${isLightTheme ? 'bg-emerald-50/50 border-emerald-100' : 'bg-zinc-950/50 border-zinc-800'}`}>
                                                <div className="flex justify-between items-end mb-3">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Points à convertir</span>
                                                    <div className="text-right">
                                                        <span className={`text-lg font-black leading-none ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{pointsToRedeem}</span>
                                                        <span className="text-[10px] ml-1 font-bold text-zinc-500">PTS</span>
                                                    </div>
                                                </div>

                                                <div className="relative flex items-center group">
                                                    <input
                                                        type="range"
                                                        min="100"
                                                        max={Math.max(100, Math.min(selectedCustomer.loyalty_points, Math.floor((subtotal - discount - promoDiscount) * 100)))}
                                                        step="100"
                                                        value={pointsToRedeem}
                                                        onChange={(e) => setPointsToRedeem(parseInt(e.target.value))}
                                                        className={`w-full h-1 rounded-lg appearance-none cursor-pointer transition-all ${isLightTheme ? 'bg-emerald-100' : 'bg-zinc-800'}`}
                                                        style={{
                                                            accentColor: '#22c55e',
                                                            background: `linear-gradient(to right, #22c55e ${(pointsToRedeem / Math.max(100, Math.min(selectedCustomer.loyalty_points, Math.floor((subtotal - discount - promoDiscount) * 100)))) * 100}%, ${isLightTheme ? '#dcfce7' : '#18181b'} 0%)`
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex justify-between mt-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] font-black uppercase tracking-wider text-zinc-500">Réduction Immédiate</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs font-black text-green-500">-{(pointsToRedeem / 100).toFixed(2)} €</span>
                                                            <span className={`text-[8px] font-bold ${isLightTheme ? 'text-emerald-300' : 'text-zinc-600'}`}>≈ {pointsToRedeem} {currencyName}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setPointsToRedeem(Math.max(0, Math.min(selectedCustomer.loyalty_points, Math.floor((subtotal - discount - promoDiscount) * 100))))}
                                                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all shadow-sm ${isLightTheme ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:shadow-emerald-200' : 'bg-zinc-800 text-zinc-300 hover:bg-white hover:text-black hover:shadow-white/10'}`}
                                                    >
                                                        Max
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Cart header */}
            <div className={`px-3 py-2 border-b flex items-center justify-between transition-all ${isLightTheme ? 'bg-white border-emerald-100' : 'bg-transparent border-zinc-800'}`}>
                <div className="flex items-center gap-2">
                    <ShoppingCart className={`w-4 h-4 ${isLightTheme ? 'text-emerald-600' : 'text-green-400'}`} />
                    <span className={`text-sm font-bold transition-colors ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Vente en cours</span>
                    {cart.length > 0 && (
                        <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 transition-colors ${isLightTheme ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'bg-green-500 text-black'}`}>
                            {cart.reduce((s, l) => s + l.quantity, 0)}
                        </span>
                    )}
                </div>
                {cart.length > 0 && (
                    <button
                        onClick={clearCart}
                        className={`transition-colors ${isLightTheme ? 'text-emerald-200 hover:text-red-500' : 'text-zinc-600 hover:text-red-400'}`}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Cart items */}
            <div className={`flex-1 overflow-y-auto px-3 py-2 space-y-2 transition-all ${isLightTheme ? 'bg-emerald-50/20' : ''}`}>
                <AnimatePresence>
                    {cart.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center h-32 transition-colors ${isLightTheme ? 'text-emerald-200' : 'text-zinc-600'}`}>
                            <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                            <p className="text-xs">Panier vide</p>
                            <p className={`text-[10px] mt-1 ${isLightTheme ? 'text-emerald-100' : 'text-zinc-700'}`}>Cliquez sur un produit pour ajouter</p>
                        </div>
                    ) : (
                        cart.map((line) => {
                            const productCategory = categories.find(c => c.id === line.product.category_id);
                            const isBulkProduct = (
                                productCategory?.slug?.includes('fleurs') ||
                                productCategory?.slug?.includes('resines') ||
                                productCategory?.slug === 'nouveautes'
                            );
                            const isPerUnit = !isBulkProduct || line.product.is_bundle || (!!line.product.weight_grams && line.product.weight_grams > 1 && !line.product.name.toLowerCase().includes('pack'));

                            return (
                                <motion.div
                                    key={line.product.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className={`rounded-lg p-2 transition-all ${isLightTheme ? 'bg-white border border-emerald-100 shadow-sm' : 'bg-zinc-800'}`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                            <p className={`text-xs font-bold leading-tight transition-colors ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>
                                                {line.product.name}
                                            </p>
                                            {isBulkProduct && !isPerUnit && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {[1, 5, 10, 30, 50, 100].map(weight => (
                                                        <button
                                                            key={weight}
                                                            onClick={() => {
                                                                const val = Math.min(weight, line.product.stock_quantity);
                                                                setCart(prev => prev.map(l => l.product.id === line.product.id ? { ...l, quantity: val } : l));
                                                            }}
                                                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border transition-all ${line.quantity === weight
                                                                ? (isLightTheme ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-green-500 border-green-400 text-black')
                                                                : (isLightTheme ? 'bg-emerald-50 border-emerald-100 text-emerald-400 hover:border-emerald-300' : 'bg-zinc-700/50 border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500')
                                                                }`}
                                                        >
                                                            {weight}g
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removeLine(line.product.id)}
                                            className={`transition-colors shrink-0 mt-0.5 ${isLightTheme ? 'text-emerald-200 hover:text-red-500' : 'text-zinc-600 hover:text-red-400'}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Qty controls */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => updateQty(line.product.id, -1)}
                                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shadow-sm ${isLightTheme ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'}`}
                                            >
                                                <Minus className="w-2.5 h-2.5" />
                                            </button>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={line.quantity}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setCart(prev => prev.map(l => l.product.id === line.product.id ? { ...l, quantity: Math.min(val, l.product.stock_quantity) } : l));
                                                    }}
                                                    className={`w-10 rounded-lg text-xs font-black text-center py-1 focus:outline-none transition-all shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isLightTheme
                                                        ? 'bg-emerald-50 border border-emerald-100 text-emerald-950 focus:border-green-500'
                                                        : 'bg-zinc-700 border border-zinc-600 text-white focus:border-green-500'
                                                        }`}
                                                />
                                            </div>
                                            <button
                                                onClick={() => updateQty(line.product.id, 1)}
                                                disabled={line.quantity >= line.product.stock_quantity}
                                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shadow-sm ${isLightTheme ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 disabled:opacity-30' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-40'}`}
                                            >
                                                <Plus className="w-2.5 h-2.5" />
                                            </button>
                                            {!isPerUnit && <span className={`text-[10px] font-bold ml-1 transition-colors ${isLightTheme ? 'text-emerald-400' : 'text-zinc-500'}`}>g</span>}
                                        </div>

                                        {/* Price override */}
                                        <div className="flex-1 relative">
                                            <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs transition-colors ${isLightTheme ? 'text-emerald-400' : 'text-zinc-500'}`}>€</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={line.unitPrice}
                                                onChange={(e) => updatePrice(line.product.id, e.target.value)}
                                                className={`w-full rounded-lg pl-5 pr-2 py-1 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-green-500/20 ${isLightTheme
                                                    ? 'bg-emerald-50 border border-emerald-100 text-emerald-950 focus:border-green-500'
                                                    : 'bg-zinc-700 border border-zinc-600 text-white focus:border-green-500'
                                                    }`}
                                            />
                                        </div>

                                        <span className={`text-xs font-bold shrink-0 transition-colors ${isLightTheme ? 'text-green-600' : 'text-green-400'}`}>
                                            {(line.quantity * line.unitPrice).toFixed(2)} €
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Discount + Totals */}
            <div className={`border-t px-2.5 py-2.5 space-y-1.5 transition-all ${isLightTheme ? 'bg-emerald-50/20 border-emerald-100' : 'border-zinc-800'}`}>
                {/* Discount row */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setDiscountType((t) => (t === 'percent' ? 'fixed' : 'percent'))}
                        className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors ${isLightTheme ? 'bg-white border-emerald-100 text-emerald-400 hover:border-green-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-green-500'}`}
                    >
                        {discountType === 'percent' ? (
                            <Percent className="w-3 h-3" />
                        ) : (
                            <Hash className="w-3 h-3" />
                        )}
                    </button>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={discountType === 'percent' ? 'Remise %' : 'Remise €'}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className={`flex-1 border rounded-lg px-2.5 py-1 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-green-500/20 ${isLightTheme
                            ? 'bg-white border-emerald-100 text-emerald-950 placeholder-emerald-200 focus:border-green-500'
                            : 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600 focus:border-green-500'}`}
                    />
                </div>

                {/* Promo code */}
                {!appliedPromo ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                                <Tag className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 transition-colors ${isLightTheme ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                <input
                                    value={promoInput}
                                    onChange={(e) => {
                                        setPromoInput(e.target.value.toUpperCase());
                                        setPromoError('');
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                                    placeholder="Code…"
                                    className={`w-full border rounded-lg pl-6 pr-2 py-1 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-green-500/20 uppercase ${isLightTheme
                                        ? 'bg-white border-emerald-100 text-emerald-950 placeholder-emerald-200 focus:border-green-500'
                                        : 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600 focus:border-green-500'}`}
                                />
                            </div>
                            <button
                                onClick={handleApplyPromo}
                                disabled={!promoInput.trim() || isCheckingPromo}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all shrink-0 ${isLightTheme
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 shadow-md shadow-emerald-200'
                                    : 'bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white'}`}
                            >
                                {isCheckingPromo ? '…' : 'OK'}
                            </button>
                        </div>
                        {promoError && (
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider pl-1">{promoError}</p>
                        )}
                    </div>
                ) : (
                    <div className={`flex items-center justify-between border rounded-lg px-2.5 py-1.5 transition-all ${isLightTheme ? 'bg-emerald-50 border-emerald-500/30' : 'bg-green-900/20 border-green-500/30'}`}>
                        <div className="flex items-center gap-1.5">
                            <Tag className={`w-3 h-3 shrink-0 ${isLightTheme ? 'text-emerald-700' : 'text-green-400'}`} />
                            <span className={`text-xs font-bold transition-colors ${isLightTheme ? 'text-emerald-950' : 'text-green-400'}`}>{appliedPromo.code}</span>
                            <span className={`text-[10px] transition-colors ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-400'}`}>−{appliedPromo.discount_amount.toFixed(2)} €</span>
                        </div>
                        <button
                            onClick={() => { setAppliedPromo(null); setPromoInput(''); }}
                            className={`transition-colors ${isLightTheme ? 'text-emerald-200 hover:text-red-500' : 'text-zinc-500 hover:text-red-400'}`}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Totals */}
                <div className={`space-y-1 text-xs transition-colors ${isLightTheme ? 'text-emerald-900/60' : 'text-zinc-400'}`}>
                    <div className="flex justify-between">
                        <span>Sous-total</span>
                        <span className={isLightTheme ? 'text-emerald-950 font-medium' : 'text-white'}>{subtotal.toFixed(2)} €</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-orange-500 font-bold">
                            <span>Remise ({discountType === 'percent' ? `${discountValue}%` : `${discountValue}€`})</span>
                            <span>−{discount.toFixed(2)} €</span>
                        </div>
                    )}
                    {promoDiscount > 0 && (
                        <div className={`flex justify-between font-bold ${isLightTheme ? 'text-green-600' : 'text-green-400'}`}>
                            <span>Promo ({appliedPromo?.code})</span>
                            <span>−{promoDiscount.toFixed(2)} €</span>
                        </div>
                    )}
                    {loyaltyDiscount > 0 && (
                        <div className={`flex justify-between font-bold ${isLightTheme ? 'text-amber-600' : 'text-yellow-500'}`}>
                            <span>{currencyName} ({pointsToRedeem} utilisés)</span>
                            <span>−{loyaltyDiscount.toFixed(2)} €</span>
                        </div>
                    )}
                    {selectedCustomer && cart.length > 0 && (
                        <div className={`flex justify-between italic font-black text-[10px] uppercase tracking-wider ${isLightTheme ? 'text-emerald-400' : 'text-blue-400'}`}>
                            <span>Points à gagner</span>
                            <span>+{Math.floor(total)} {currencyName}</span>
                        </div>
                    )}
                    <div className={`flex justify-between text-base font-black pt-1 border-t transition-all ${isLightTheme ? 'text-emerald-950 border-emerald-100' : 'text-white border-zinc-700'}`}>
                        <span>TOTAL</span>
                        <span className={isLightTheme ? 'text-green-700' : 'text-green-400'}>{total.toFixed(2)} €</span>
                    </div>
                </div>

                {/* Pay button */}
                <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={cart.length === 0}
                    className={`w-full flex items-center justify-center gap-2 font-black py-3 rounded-xl transition-all text-xs uppercase tracking-widest ${isLightTheme
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 disabled:bg-emerald-50 disabled:text-emerald-200 disabled:shadow-none'
                        : 'bg-green-500 hover:bg-green-400 text-black disabled:bg-zinc-700 disabled:text-zinc-500'
                        }`}
                >
                    <CreditCard className="w-4 h-4" />
                    Encaisser {cart.length > 0 ? `${total.toFixed(2)} €` : ''}
                </button>
            </div>
        </div>
    );
}
