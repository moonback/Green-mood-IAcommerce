import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Cake, Sparkles, ShoppingBag, ArrowRight, Loader2, Star, Info } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useBudTenderMemory } from '../hooks/useBudTenderMemory';
import { supabase } from '../lib/supabase';
import { Product } from '../lib/types';
import SEO from '../components/SEO';
import AccountSidebar from '../components/AccountSidebar';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { getBirthdayGiftPrompt } from '../lib/budtenderPrompts';


export default function BirthdayGift() {
  const { user, profile } = useAuthStore();
  const { settings } = useSettingsStore();
  const { savedPrefs, pastProducts, pastOrders } = useBudTenderMemory();
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const addToast = useToastStore((s) => s.addToast);

  const [isGenerating, setIsGenerating] = useState(false);
  const [giftProduct, setGiftProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGiftInCart = giftProduct && cartItems.some(item => item.product.name === `🎁 Cadeau Anniversaire: ${giftProduct.name}`);

  // Check if birthday is set
  const hasBirthday = !!profile?.birthday;
  const birthdayDate = hasBirthday ? new Date(profile.birthday) : null;
  const today = new Date();
  const isBirthMonth = birthdayDate ? today.getMonth() === birthdayDate.getMonth() : false;

  // Safeguard: Check if gift was already claimed this year
  const alreadyClaimedThisYear = useMemo(() => {
    if (!profile?.last_birthday_gift_at) return false;
    const lastClaim = new Date(profile.last_birthday_gift_at);
    return lastClaim.getFullYear() === today.getFullYear();
  }, [profile?.last_birthday_gift_at]);

  useEffect(() => {
    const savedYear = localStorage.getItem('gm_birthday_gift_year');
    const savedId = localStorage.getItem('gm_birthday_gift_product_id');

    // If we have a saved gift for this year, and we haven't loaded it yet
    if (savedYear === today.getFullYear().toString() && savedId && !giftProduct) {
      const fetchProduct = async () => {
        try {
          const { data } = await supabase.from('products').select('*, category:categories(*)').eq('id', savedId).single();
          if (data) setGiftProduct(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchProduct();
    }
  }, [giftProduct]);

  const generateGift = async () => {
    if (!user || !profile) return;
    if (alreadyClaimedThisYear || giftProduct) {
      addToast({ message: "Vous avez déjà profité de votre cadeau cette année !", type: "error" });
      return;
    }
    setIsGenerating(true);
    setError(null);

    try {
      // 1. Fetch available products
      const { data: products } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .eq('is_available', true)
        .limit(20);

      if (!products || products.length === 0) {
        throw new Error("Désolé, aucun produit n'est disponible pour le moment.");
      }

      // 2. Call AI to select a product based on preferences
      // We'll use a prompt that simulates the BudTender choosing
      const budtenderName = settings.budtender_name || 'BudTender';
      const storeName = settings.store_name || 'NeuroCart';
      const prompt = getBirthdayGiftPrompt(products, savedPrefs, pastProducts, pastOrders, budtenderName, storeName);

      // We'll use the same Edge Function as the BudTender if available, 
      // otherwise we simulate or use a direct call if we have the key (though security is an issue).
      // Since I don't have a direct "Call OpenRouter" tool here, I'll use the supabase RPC or edge function pattern if it exists.
      // Actually, looking at the codebase, BudTender uses a specific hook.

      // FOR DEMO/IMPLEMENTATION: We'll do a simple selection based on keywords if AI call is complex, 
      // but let's try to simulate the call to the edge function.

      let responseData;
      try {
        const { data: invokeData, error: invokeError } = await supabase.functions.invoke('ai-chat', {
          body: {
            model: settings.ai_model || 'mistralai/mistral-small-creative',
            messages: [
              { role: 'system', content: `Expert ${budtenderName} ${storeName}. Réponds avec l\'ID produit JSON: {"productId": "..."}` },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 300
          }
        });

        if (invokeError) {
          throw new Error(`Erreur réseau: ${invokeError.message}`);
        }

        // Handle error returned inside 200 response
        if (invokeData?.error) {
          console.error("AI Error Details:", invokeData);
          const details = invokeData.details || invokeData.message;
          addToast({ message: `Erreur IA: ${details}`, type: "error" });
          throw new Error(`Erreur AI: ${details}`);
        }

        responseData = invokeData;
      } catch (e: any) {
        console.error("Fetch Exception:", e);
        setError(e.message);
        setIsGenerating(false);
        return;
      }

      if (!responseData || !responseData.choices) {
        throw new Error("Réponse IA vide ou invalide.");
      }

      let selectedId = '';
      try {
        const content = responseData.choices[0].message.content || '';
        const match = content.match(/\{.*\}/);
        if (match) {
          selectedId = JSON.parse(match[0]).productId;
        } else {
          selectedId = content.trim();
        }
      } catch (e) {
        console.warn("Echec du parsing, produit aléatoire.");
        selectedId = products[Math.floor(Math.random() * products.length)].id;
      }

      const selectedProduct = products.find(p => p.id === selectedId) || products[0];
      setGiftProduct(selectedProduct);
      localStorage.setItem('gm_birthday_gift_year', today.getFullYear().toString());
      localStorage.setItem('gm_birthday_gift_product_id', selectedProduct.id);

    } catch (err: any) {
      console.error("Error generating gift:", err);
      setError(err.message || "Une erreur est survenue lors de la sélection de votre cadeau.");
    } finally {
      setIsGenerating(false);
    }
  };

  const claimGift = async () => {
    if (!giftProduct || !user) return;

    if (!alreadyClaimedThisYear) {
      try {
        // 1. Update Profile in DB
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ last_birthday_gift_at: new Date().toISOString() })
          .eq('id', user.id);

        if (updateError) throw updateError;

        // 2. Update Local Auth Store
        const { profile: currentProfile, setProfile } = useAuthStore.getState();
        if (currentProfile) {
          setProfile({
            ...currentProfile,
            last_birthday_gift_at: new Date().toISOString()
          });
        }
      } catch (err: any) {
        console.error("Error updating profile gift status:", err);
      }
    }

    // 3. Add to cart if not already present
    if (!isGiftInCart) {
      addItem({
        ...giftProduct,
        price: 0,
        name: `🎁 Cadeau Anniversaire: ${giftProduct.name}`
      });

      addToast({
        message: "Votre cadeau a été ajouté au panier ! Profitez-en bien 🎮",
        type: "success"
      });
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pt-1 pb-1">
      <SEO title={`Cadeau d'Anniversaire — ${settings.store_name || 'NeuroCart'}`} description={`Récupérez votre cadeau d'anniversaire sélectionné par l'IA de ${settings.store_name || 'NeuroCart'}.`} />

      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <AccountSidebar />

          <main className="flex-1 space-y-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-[3rem] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] p-8 md:p-12 shadow-sm">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-[color:var(--color-primary)]/5 blur-[120px] -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[color:var(--color-primary)]/10 flex items-center justify-center animate-bounce">
                    <Gift className="w-8 h-8 text-[color:var(--color-primary)]" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[color:var(--color-text)] mb-1">
                      Votre Cadeau <span className="text-[color:var(--color-primary)]">Privilège</span>
                    </h1>
                    <p className="text-[color:var(--color-text-muted)] font-medium">L'IA {settings.store_name || 'NeuroCart'} choisit le meilleur pour vous.</p>
                  </div>
                </div>

                {!hasBirthday ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
                    <Info className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                    <div>
                      <h3 className="text-amber-700 font-extrabold mb-2 uppercase tracking-tight">Date de naissance manquante</h3>
                      <p className="text-sm text-[color:var(--color-text-muted)] mb-6 font-medium">
                        Nous avons besoin de connaître votre date de naissance pour débloquer votre cadeau annuel.
                      </p>
                      <motion.a
                        href="/compte/profil"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-emerald-500 hover:text-[color:var(--color-primary)] transition-all shadow-sm"
                      >
                        Compléter mon profil <ArrowRight className="w-4 h-4" />
                      </motion.a>
                    </div>
                  </div>
                ) : (alreadyClaimedThisYear) ? (
                  <div className="bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 rounded-2xl p-6 flex items-start gap-4">
                    <Sparkles className="w-6 h-6 text-[color:var(--color-primary)] shrink-0 mt-1" />
                    <div>
                      <h3 className="text-[color:var(--color-primary)] font-black uppercase tracking-tight mb-2">Cadeau déjà récupéré !</h3>
                      <p className="text-sm text-[color:var(--color-text-muted)] mb-4 font-medium">
                        Vous avez déjà profité de votre privilège d'anniversaire pour cette année ({profile.last_birthday_gift_at ? new Date(profile.last_birthday_gift_at).getFullYear() : new Date().getFullYear()}).
                      </p>
                      <p className="text-xs text-[color:var(--color-text-muted)] italic font-medium">
                        On se retrouve l'année prochaine pour une nouvelle surprise !
                      </p>
                    </div>
                  </div>
                ) : (isBirthMonth || giftProduct) ? (
                  <div className="space-y-6">
                    <p className="text-[color:var(--color-text-muted)] text-lg leading-relaxed font-medium">
                      {giftProduct && alreadyClaimedThisYear
                        ? "Voici le cadeau d'anniversaire qui vous attend de la part de l'IA :"
                        : "Joyeux anniversaire ! Pour célébrer ce moment, notre IA PlayAdvisor va analyser vos préférences pour vous offrir un cadeau sur-mesure."}
                    </p>

                    {!giftProduct && (
                      <motion.button
                        onClick={generateGift}
                        disabled={isGenerating}
                        whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(37,99,235,0.2)" }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-4 px-10 py-5 bg-[color:var(--color-primary)] text-[color:var(--color-text)] rounded-[1.5rem] font-black uppercase tracking-[0.2em] relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Sélection IA...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-6 h-6 animate-pulse" />
                            <span>Découvrir mon cadeau</span>
                          </>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                      </motion.button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 py-2 px-4 bg-[color:var(--color-bg)] rounded-full w-fit border border-[color:var(--color-border)]">
                      <Cake className="w-4 h-4 text-[color:var(--color-text-muted)]" />
                      <span className="text-xs font-mono text-[color:var(--color-text-muted)]">Patience... Votre anniversaire est le {birthdayDate?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                    </div>
                    <p className="text-[color:var(--color-text-muted)] leading-relaxed font-medium">
                      Revenez durant votre mois d'anniversaire pour découvrir la surprise que notre IA vous a réservée.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="py-20 flex flex-col items-center justify-center text-center space-y-6 bg-[color:var(--color-card)]/80 border border-dashed border-[color:var(--color-border)] rounded-[3rem]"
                >
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-2 border-[color:var(--color-primary)]/25 border-t-emerald-500 animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[color:var(--color-primary)]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">L'IA analyse vos goûts...</h3>
                    <p className="text-sm text-[color:var(--color-text-muted)] max-w-xs mx-auto">
                      Nous cherchons le produit parfait parmi notre catalogue premium.
                    </p>
                  </div>
                </motion.div>
              ) : (giftProduct && !alreadyClaimedThisYear) ? (
                <motion.div
                  key="gift"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  {/* Product Card Styled as Gift */}
                  <div className="relative group rounded-[3rem] overflow-hidden bg-[color:var(--color-card)]/80 border border-[color:var(--color-primary)]/35 p-8 shadow-2xl shadow-[color:var(--color-primary)]/5">
                    <div className="absolute top-0 right-0 p-6">
                      <div className="w-12 h-12 rounded-full bg-[color:var(--color-primary)]/10 flex items-center justify-center text-[color:var(--color-primary)]">
                        <Star className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="flex flex-col items-center text-center space-y-6">
                      <div className="w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden bg-[color:var(--color-bg)] border border-[color:var(--color-border)] relative">
                        <img
                          src={giftProduct.image_url}
                          alt={giftProduct.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-0 right-0">
                          <span className="bg-[color:var(--color-primary)] text-[color:var(--color-text)] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                            Sélection IA — Offert
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-3xl font-black text-[color:var(--color-text)]">{giftProduct.name}</h2>
                        <p className="text-[color:var(--color-text-muted)] line-clamp-2 max-w-sm mx-auto">{giftProduct.description}</p>
                      </div>

                      <div className="flex items-center gap-6 py-4 px-8 bg-[color:var(--color-bg)] rounded-2xl border border-[color:var(--color-border)]">
                        <div className="text-center">
                          <p className="text-[10px] text-[color:var(--color-text-muted)] uppercase font-black tracking-widest">Valeur</p>
                          <p className="text-lg font-bold text-[color:var(--color-text)] line-through opacity-50">{giftProduct.price.toFixed(2)}€</p>
                        </div>
                        <div className="w-px h-8 bg-[color:var(--color-border)]" />
                        <div className="text-center">
                          <p className="text-[10px] text-[color:var(--color-primary)] uppercase font-black tracking-widest">Aujourd'hui</p>
                          <p className="text-2xl font-black text-[color:var(--color-primary)]">GRATUIT</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Reasoning & Action */}
                  <div className="flex flex-col justify-center space-y-8 p-4">
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-[color:var(--color-primary)]" />
                        Pourquoi ce choix ?
                      </h3>
                      <p className="text-[color:var(--color-text-muted)] leading-relaxed italic font-medium">
                        "En analysant vos préférences pour les machines de type {savedPrefs?.category || 'arcade'} et votre objectif {savedPrefs?.goal || 'loisirs'}, j'ai sélectionné {giftProduct.name}. C'est un équipement d'exception qui saura sublimer votre journée d'anniversaire."
                      </p>
                    </div>

                    {!isGiftInCart ? (
                      <motion.button
                        onClick={claimGift}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center justify-center gap-4 w-full py-6 bg-[color:var(--color-card)] text-[color:var(--color-text)] rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-text)] transition-all"
                      >
                        <ShoppingBag className="w-6 h-6" />
                        <span>Récupérer mon cadeau</span>
                      </motion.button>
                    ) : (
                      <div className="bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/25 rounded-2xl p-6 text-center">
                        <p className="text-[color:var(--color-primary)] font-black uppercase tracking-widest mb-4">Cadeau réservé !</p>
                        <motion.a
                          href="/panier"
                          className="inline-flex items-center gap-3 text-[color:var(--color-text)] font-bold hover:text-[color:var(--color-primary)] transition-colors"
                        >
                          Aller au panier pour finaliser <ArrowRight className="w-4 h-4" />
                        </motion.a>
                      </div>
                    )}

                    <div className="p-4 bg-[color:var(--color-bg)] rounded-xl border border-[color:var(--color-border)] text-[10px] text-[color:var(--color-text-muted)] uppercase tracking-widest font-black leading-loose text-center">
                      * Offre valable une fois par an • Réservé aux membres {settings.store_name || 'NeuroCart'} Élite • Produit non échangeable
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}