import { memo, useMemo, useCallback, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Scale, RefreshCw, Package, Star, Zap, Trophy, Users2, Maximize2, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import type { Product } from '../lib/types';
import { applyProductImageFallback, getProductImageSrc } from '../lib/productImage';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useSettingsStore } from '../store/settingsStore';
import { Badge } from './ui/Badge';

interface ProductCardV2Props {
    product: Product;
    isCompared?: boolean;
    onToggleCompare?: () => void;
    loyaltyEnabled?: boolean;
}

const StarRow = memo(({ rating, count }: { rating: number; count?: number }) => (
    <div className="flex items-center gap-1.5">
        <div className="flex" aria-label={`${rating} étoiles sur 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < Math.floor(rating)
                        ? 'fill-amber-400 text-amber-400'
                        : i < rating
                            ? 'fill-amber-400/50 text-amber-400/50'
                            : 'fill-slate-600 text-[color:var(--color-text-subtle)]'
                        }`}
                />
            ))}
        </div>
        {count !== undefined && count > 0 && (
            <span className="text-xs text-[color:var(--color-text-muted)] font-medium">({count})</span>
        )}
    </div>
));
StarRow.displayName = 'StarRow';

function ProductCardV2({
    product,
    isCompared,
    onToggleCompare,
    loyaltyEnabled,
}: ProductCardV2Props) {
    const [addedAnimation, setAddedAnimation] = useState(false);
    const addItem = useCartStore(useCallback((s) => s.addItem, []));
    const openSidebar = useCartStore(useCallback((s) => s.openSidebar, []));
    const addToast = useToastStore(useCallback((s) => s.addToast, []));
    const toggleWish = useWishlistStore(useCallback((s) => s.toggleItem, []));
    const isWished = useWishlistStore(useCallback((s) => s.items.includes(product.id), [product.id]));
    const earnRate = useSettingsStore(useCallback((s) => s.settings.loyalty_earn_rate, []));
    const currencyName = useSettingsStore(useCallback((s) => s.settings.loyalty_currency_name, []));

    const isOutOfStock = !product.is_available || product.stock_quantity === 0;

    const badge = useMemo(() => {
        if (product.avg_rating && product.avg_rating >= 4.5 && (product.review_count ?? 0) > 5)
            return { label: 'Top Rated', icon: <Trophy className="w-2.5 h-2.5" />, variant: 'sales' as const };
        if (product.stock_quantity > 0 && product.stock_quantity <= 5)
            return {
                label: `${product.stock_quantity} restant${product.stock_quantity > 1 ? 's' : ''}`,
                icon: <Zap className="w-2.5 h-2.5" />,
                variant: 'warning' as const,
            };
        if (product.stock_quantity > 0 && product.stock_quantity <= 10)
            return {
                label: `${product.stock_quantity} en stock`,
                icon: <Zap className="w-2.5 h-2.5" />,
                variant: 'warning' as const,
            };
        if (product.is_featured)
            return { label: 'Best Pick', icon: <Star className="w-2.5 h-2.5" />, variant: 'success' as const };
        return null;
    }, [product.avg_rating, product.review_count, product.stock_quantity, product.is_featured]);

    const earnedPoints = useMemo(
        () => Math.round(product.price * (earnRate || 1)),
        [product.price, earnRate],
    );

    const discount = useMemo(() => {
        if (product.is_bundle && product.original_value && product.original_value > product.price)
            return Math.round(((product.original_value - product.price) / product.original_value) * 100);
        return null;
    }, [product.is_bundle, product.original_value, product.price]);

    const handleAddToCart = useCallback((e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isOutOfStock) return;
        addItem(product, 1);
        openSidebar();
        addToast({ message: `${product.name} ajouté au panier`, type: 'success' });
        setAddedAnimation(true);
        setTimeout(() => setAddedAnimation(false), 600);
    }, [addItem, openSidebar, addToast, product, isOutOfStock]);

    const handleToggleWish = useCallback((e: MouseEvent) => {
        // Stop propagation so it doesn't trigger parent links in any context
        e.stopPropagation();
        toggleWish(product.id);
        addToast({
            message: isWished ? `${product.name} retiré des favoris` : `${product.name} ajouté aux favoris`,
            type: isWished ? 'info' : 'success',
        });
    }, [toggleWish, addToast, product.id, product.name, isWished]);

    const handleToggleCompare = useCallback((e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleCompare?.();
    }, [onToggleCompare]);

    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`
        group relative flex flex-col
        bg-[color:var(--color-card)]/85 backdrop-blur-xl shadow-[0_18px_45px_rgba(2,8,23,0.45)]
        rounded-3xl border overflow-hidden
        transition-all duration-300
        ${isCompared
                    ? 'border-green-neon shadow-[0_0_0_2px_rgba(var(--theme-neon-rgb),0.4)]'
                    : 'border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/40 hover:shadow-[0_20px_60px_rgba(2,8,23,0.5)]'
                }
      `}
        >
            {discount !== null && (
                <div className="absolute top-3 left-3 z-10 bg-red-500 text-[color:var(--color-text)] text-xs font-black px-2.5 py-1 rounded-full shadow-lg">
                    -{discount}%
                </div>
            )}
            {product.is_bundle && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-[color:var(--color-primary)]/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-[color:var(--color-text)]">
                    <Package className="w-3 h-3" />
                    Pack
                </div>
            )}
            {/* Action buttons — Layer 30 to stay above everything */}
            <div className="absolute top-3 right-3 z-30 flex flex-col gap-2">
                <motion.button
                    onClick={handleToggleWish}
                    whileTap={{ scale: 0.85 }}
                    animate={isWished ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                    aria-label={isWished ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    className={`
            flex items-center justify-center w-8 h-8 rounded-2xl backdrop-blur-xl border
            transition-all duration-200
            ${isWished
                            ? 'bg-red-500 border-red-500 text-[color:var(--color-text)] shadow-[0_2px_12px_rgba(239,68,68,0.35)]'
                            : 'bg-[color:var(--color-card)]/80 border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:text-red-400 hover:border-red-400/30'
                        }
          `}
                >
                    <motion.span
                        key={isWished ? 'wish-filled' : 'wish-empty'}
                        initial={{ scale: 0.7, rotate: -20, opacity: 0.5 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                    >
                        <Heart className={`w-3.5 h-3.5 ${isWished ? 'fill-current' : ''}`} />
                    </motion.span>
                </motion.button>
                {onToggleCompare && (
                    <motion.button
                        onClick={handleToggleCompare}
                        whileTap={{ scale: 0.85 }}
                        aria-label={isCompared ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
                        className={`
              flex items-center justify-center w-8 h-8 rounded-2xl backdrop-blur-xl border
              transition-all duration-200
              ${isCompared
                                ? 'bg-[color:var(--color-primary)] border-green-neon text-[color:var(--color-text)]'
                                : 'bg-[color:var(--color-card)]/80 border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)]/30'
                            }
            `}
                    >
                        <Scale className="w-3.5 h-3.5" />
                    </motion.button>
                )}
                {product.is_subscribable && (
                    <div
                        className="flex items-center justify-center w-8 h-8 bg-[color:var(--color-card)]/80 backdrop-blur-xl rounded-2xl border border-[color:var(--color-primary)]/25 text-[color:var(--color-primary)] glow-neon"
                        aria-label="Abonnement disponible"
                        title="Abonnement disponible"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </div>
                )}
            </div>
            <Link
                to={`/catalogue/${product.slug}`}
                className="relative block overflow-hidden bg-[color:var(--color-card)]/70 group/image"
                aria-label={`Voir ${product.name}`}
                tabIndex={-1}
            >
                {/* Cyber Grid Background (Visible on hover) */}
                <div className="absolute inset-0 opacity-0 group-hover/image:opacity-[0.05] transition-opacity duration-500"
                    style={{
                        backgroundImage: `linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)`,
                        backgroundSize: '20px 20px',
                    }}
                />

                <div className="aspect-square relative z-10">
                    <img
                        src={getProductImageSrc(product.image_url)}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain p-6 transition-transform duration-500 ease-out group-hover:scale-110"
                        onError={applyProductImageFallback}
                    />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-primary)]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {isOutOfStock && (
                    <div className="absolute inset-0 bg-[color:var(--color-card)]/80 backdrop-blur-sm flex items-center justify-center z-30">
                        <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--color-text-muted)] bg-[color:var(--color-card)]/90 px-3 py-1.5 rounded-full border border-[color:var(--color-border)]">
                            Rupture de stock
                        </span>
                    </div>
                )}
            </Link>
            <div className="flex flex-col flex-1 p-4 md:p-5 gap-3">
                {badge && (
                    <div>
                        <Badge variant={badge.variant} pulse={badge.variant === 'warning'}>
                            {badge.icon}
                            {badge.label}
                        </Badge>
                    </div>
                )}
                {product.avg_rating !== undefined && product.avg_rating > 0 && (
                    <StarRow rating={product.avg_rating} count={product.review_count} />
                )}
                <Link
                    to={`/catalogue/${product.slug}`}
                    className="font-bold text-sm md:text-base text-[color:var(--color-text)] leading-snug line-clamp-2 hover:text-[color:var(--color-primary)] transition-colors duration-200"
                >
                    {product.name}
                </Link>
                {product.attributes?.brand && (
                    <p className="text-[11px] text-[color:var(--color-text-muted)] -mt-1">
                        par <span className="text-[color:var(--color-text-muted)] font-bold">{product.attributes.brand}</span>
                    </p>
                )}
                {product.description && (
                    <p className="text-[11px] text-[color:var(--color-text-subtle)] line-clamp-2 leading-relaxed -mt-0.5">
                        <span dangerouslySetInnerHTML={{ __html: product.description }} />
                    </p>
                )}
                {(() => {
                    const specs = product.attributes?.specs?.slice(0, 3) ?? product.attributes?.benefits?.slice(0, 3);
                    if (!specs?.length) return null;
                    return (
                        <ul className="flex flex-col gap-0.5 -mt-0.5">
                            {specs.map((s, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-[10px] text-[color:var(--color-text-muted)]">
                                    <span className="w-1 h-1 rounded-full bg-[color:var(--color-primary)] shrink-0 glow-neon" />
                                    <span className="truncate">{s}</span>
                                </li>
                            ))}
                        </ul>
                    );
                })()}
                <div className="flex-1" />
                <div className="flex items-end justify-between gap-3 mt-1">
                    <div className="space-y-0.5">
                        {product.original_value && product.original_value > product.price && (
                            <p className="text-xs text-[color:var(--color-text-muted)] line-through">
                                {product.original_value.toFixed(2)} €
                            </p>
                        )}
                        <p className="text-xl font-black text-[color:var(--color-text)] tabular-nums">
                            {product.price.toFixed(2)}
                            <span className="text-[color:var(--color-primary)] ml-0.5 text-lg glow-neon">€</span>
                        </p>
                        {loyaltyEnabled && (
                            <p className="text-xs text-amber-300 font-semibold">
                                +{earnedPoints} {currencyName || 'pts'}
                            </p>
                        )}
                    </div>
                    <motion.button
                        onClick={handleAddToCart}
                        disabled={isOutOfStock}
                        whileTap={!isOutOfStock ? { scale: 0.88 } : undefined}
                        aria-label={`Ajouter ${product.name} au panier`}
                        className={`
              relative shrink-0 inline-flex items-center justify-center gap-1.5
              min-h-12 px-3.5 rounded-2xl font-bold
              transition-all duration-200
              ${isOutOfStock
                                ? 'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text-subtle)] cursor-not-allowed'
                                : 'bg-[color:var(--color-primary)] text-[color:var(--color-text)] hover:bg-[color:var(--color-primary)]/90 shadow-[0_4px_16px_rgba(var(--theme-neon-rgb),0.35)] hover:shadow-[0_4px_24px_rgba(var(--theme-neon-rgb),0.55)]'
                            }
            `}
                    >
                        <AnimatePresence mode="wait">
                            {addedAnimation ? (
                                <motion.span
                                    key="check"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="text-lg font-black"
                                >
                                    ✓
                                </motion.span>
                            ) : (
                                <motion.span key="cart" initial={{ scale: 1 }} exit={{ scale: 0 }} className="inline-flex items-center gap-1.5">
                                    <ShoppingCart className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase tracking-wide">Ajouter</span>
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>
            </div>
        </motion.article>
    );
}

export default memo(ProductCardV2);
