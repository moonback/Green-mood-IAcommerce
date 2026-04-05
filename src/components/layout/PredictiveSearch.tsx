import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Search, X, Leaf, Sparkles, ChevronRight, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { applyProductImageFallback, getProductImageSrc } from "../../lib/productImage";
import { supabase } from "../../lib/supabase";
import { generateEmbedding } from "../../lib/embeddings";
import { matchProductsRpc } from "../../lib/matchProductsRpc";
import StarRating from "../StarRating";
import { Product, Category } from "../../lib/types";

interface PredictiveSearchProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function PredictiveSearch({ isOpen, setIsOpen }: PredictiveSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ products: Product[]; categories: Category[] }>({ products: [], categories: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Predictive search logic
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults({ products: [], categories: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const text = searchQuery.trim();
        console.log('[Search] Début de recherche pour:', text);

        // 1. Recherche classique (Mots-clés & Catégories) - RAPIDE & FIABLE
        const [kwRes, catRes] = await Promise.all([
          supabase.from("products").select("*, category:categories(*)").ilike("name", `%${text}%`).eq("is_active", true).limit(10),
          supabase.from("categories").select("*").ilike("name", `%${text}%`).eq("is_active", true).limit(3)
        ]);

        const keywordProducts = kwRes.data || [];
        const searchCategories = catRes.data || [];

        // Affichage immédiat des résultats par mots-clés
        setSearchResults({ products: keywordProducts, categories: searchCategories });

        // 2. Recherche Vectorielle (IA) - EN OPTION
        try {
          const embedding = await generateEmbedding(text).catch((e) => {
            console.warn('[Search] Erreur embedding (ignorée):', e);
            return null;
          });

          if (embedding) {
            const { data: vectorProducts } = await matchProductsRpc<Product>({
              embedding,
              matchThreshold: 0.3,
              matchCount: 10
            });

            if (vectorProducts && vectorProducts.length > 0) {
              const mergedMap = new Map<string, Product>();
              keywordProducts.forEach(p => mergedMap.set(p.id, p));
              (vectorProducts as Product[]).forEach(pv => {
                if (!mergedMap.has(pv.id)) mergedMap.set(pv.id, pv);
              });

              const mergedProducts = Array.from(mergedMap.values()).slice(0, 10);

              // 3. Récupération des notes pour les produits fusionnés
              const { data: ratingsData } = await supabase
                .from("reviews")
                .select("product_id, rating")
                .in("product_id", mergedProducts.map(p => p.id))
                .eq("is_published", true);

              const ratingMap = new Map<string, { sum: number; count: number }>();
              (ratingsData || []).forEach((r) => {
                const cur = ratingMap.get(r.product_id) ?? { sum: 0, count: 0 };
                ratingMap.set(r.product_id, { sum: cur.sum + r.rating, count: cur.count + 1 });
              });

              const finalProducts = mergedProducts.map((p) => {
                const r = ratingMap.get(p.id);
                return r ? { ...p, avg_rating: r.sum / r.count, review_count: r.count } : p;
              });

              setSearchResults({ products: finalProducts, categories: searchCategories });
            }
          }
        } catch (vErr) {
          console.warn('[Search] Erreur recherche vectorielle (douce):', vErr);
        }
      } catch (error) {
        console.error("[Search] Erreur fatale:", error);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Close search on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [setIsOpen]);

  if (!isOpen) return null;

  const modal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-[color:var(--color-bg)]/80 backdrop-blur-2xl flex items-start justify-center pt-12 sm:pt-20 px-4"
        onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 10, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-4xl bg-[color:var(--color-card)]/90 border border-[color:var(--color-border)] rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl relative"
        >
          {/* Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--color-primary)]/50 to-transparent" />
          
          <div className="p-6 sm:p-10 space-y-8">
            <div className="relative group">
              <Search className={`absolute left-7 top-1/2 -translate-y-1/2 w-6 h-6 transition-all duration-500 ${isSearching ? "text-[color:var(--color-primary)] scale-110" : "text-[color:var(--color-text-muted)] group-focus-within:text-[color:var(--color-primary)]"}`} />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit, une collection..."
                className="w-full bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-[1.5rem] pl-16 pr-20 py-6 text-xl text-[color:var(--color-text)] placeholder-[color:var(--color-text-muted)] focus:outline-none focus:border-[color:var(--color-primary)]/40 focus:bg-[color:var(--color-bg)] transition-all font-sans font-medium"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[color:var(--color-bg-muted)] border border-[color:var(--color-border)] text-[10px] font-black text-[color:var(--color-text-muted)] uppercase tracking-widest">
                  ESC
                </div>
              </div>
            </div>

            {/* Results Area */}
            <div className="min-h-[200px] max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
              {searchQuery.length >= 2 ? (
                <div className="space-y-12">
                  {/* Categories */}
                  {searchResults.categories.length > 0 && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[color:var(--color-primary)]/70">
                          Collections
                        </h3>
                        <div className="flex-1 h-[1px] bg-gradient-to-r from-[color:var(--color-primary)]/20 to-transparent" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.categories.map((cat) => (
                          <Link
                            key={cat.id}
                            to={`/catalogue?category=${cat.id}`}
                            onClick={() => setIsOpen(false)}
                            className="group relative overflow-hidden p-5 bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-2xl hover:border-[color:var(--color-primary)]/30 transition-all shadow-sm hover:shadow-md"
                          >
                            <div className="absolute inset-0 bg-[color:var(--color-primary)]/0 group-hover:bg-[color:var(--color-primary)]/5 transition-colors" />
                            <div className="relative flex items-center justify-between">
                              <span className="text-sm font-bold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors truncate">{cat.name}</span>
                              <ChevronRight className="w-4 h-4 text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-primary)] transition-all group-hover:translate-x-1" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {searchResults.products.length > 0 ? (
                    <div className="space-y-5">
                      <div className="flex items-center gap-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[color:var(--color-primary)]/70">
                          Produits Suggerés
                        </h3>
                        <div className="flex-1 h-[1px] bg-gradient-to-r from-[color:var(--color-primary)]/20 to-transparent" />
                      </div>
                      <div className="grid gap-3">
                        {searchResults.products.map((prod) => (
                          <Link
                            key={prod.id}
                            to={`/catalogue/${prod.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="group relative flex items-center gap-5 p-4 bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-2xl hover:border-[color:var(--color-primary)]/30 hover:bg-[color:var(--color-bg)] transition-all shadow-sm hover:shadow-md"
                          >
                            <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-[color:var(--color-bg)] border border-[color:var(--color-border)] group-hover:border-[color:var(--color-primary)]/20 transition-colors p-3">
                              <img 
                                src={getProductImageSrc(prod.image_url)} 
                                alt={prod.name} 
                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" 
                                onError={applyProductImageFallback}
                              />
                            </div>
                            
                            <div className="flex-1 min-w-0 py-1">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                  <p className="text-base font-bold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors truncate">{prod.name}</p>
                                  <p className="text-[10px] text-[color:var(--color-primary)]/70 font-black uppercase tracking-[0.1em] mt-0.5">{prod.category?.name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-base font-black text-[color:var(--color-text)]">{prod.price.toFixed(2)}€</p>
                                  {prod.original_value && prod.original_value > prod.price && (
                                    <p className="text-xs text-[color:var(--color-text-muted)] line-through">{(prod.original_value).toFixed(2)}€</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex flex-wrap gap-2">
                                  {prod.avg_rating && prod.avg_rating > 0 ? (
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[color:var(--color-primary)]/5 border border-[color:var(--color-primary)]/10 scale-90 origin-left">
                                      <StarRating rating={prod.avg_rating} size="sm" showCount={false} />
                                      <span className="text-[10px] text-[color:var(--color-primary)] font-bold">{prod.avg_rating.toFixed(1)}</span>
                                    </div>
                                  ) : null}
                                  {prod.attributes?.aromas?.slice(0, 1).map((aroma: string, i: number) => (
                                    <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[color:var(--color-bg-muted)] text-[10px] text-[color:var(--color-text-subtle)] font-bold uppercase tracking-wider">
                                      <Leaf className="w-3 h-3 opacity-50" />
                                      {aroma}
                                    </div>
                                  ))}
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                  <div className="w-8 h-8 rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] flex items-center justify-center shadow-lg">
                                    <ArrowRight className="w-4 h-4" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    !isSearching && (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-[color:var(--color-bg-elevated)] flex items-center justify-center mb-4">
                          <Search className="w-8 h-8 text-[color:var(--color-text-muted)]" />
                        </div>
                        <p className="text-[color:var(--color-text)] font-bold text-lg">Aucun résultat</p>
                        <p className="text-[color:var(--color-text-muted)] text-sm mt-1 max-w-[280px]">Nous n'avons rien trouvé pour "{searchQuery}". Essayez d'autres mots-clés.</p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="py-10 space-y-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
                        Explorer par catégories
                      </h3>
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-[color:var(--color-border)] to-transparent" />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {["En Promo", "Nouveautés", "Fleurs", "Résines", "Vapes"].map((term) => (
                        <button
                          key={term}
                          onClick={() => setSearchQuery(term)}
                          className="px-6 py-3 bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-2xl text-xs font-bold text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:border-[color:var(--color-primary)]/30 hover:bg-[color:var(--color-primary)]/5 transition-all shadow-sm"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-primary)]/70 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Tendances
                      </h4>
                      <div className="space-y-1">
                        {["Amnesia Haze", "Super Skunk", "CBD Premium"].map((trend) => (
                          <button 
                            key={trend}
                            onClick={() => setSearchQuery(trend)}
                            className="block w-full text-left py-2 text-sm text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors"
                          >
                            • {trend}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[color:var(--color-primary)]/5 border border-[color:var(--color-primary)]/10 rounded-3xl p-6 flex flex-col justify-between">
                      <div>
                        <p className="text-sm font-bold text-[color:var(--color-text)] mb-2">Besoin d'aide ?</p>
                        <p className="text-xs text-[color:var(--color-text-muted)] leading-relaxed">Notre assistant BudTender peut vous aider à trouver le produit idéal pour vos besoins.</p>
                      </div>
                      <Link to="/assistant" onClick={() => setIsOpen(false)} className="mt-4 text-[10px] font-black uppercase tracking-widest text-[color:var(--color-primary)] hover:opacity-80 flex items-center gap-2 transition-opacity">
                        Lancer l'assistant <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (!isMounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(modal, document.body);
}
