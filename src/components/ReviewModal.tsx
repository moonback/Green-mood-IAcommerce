import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, MessageSquare, CheckCircle2, ChevronRight, ChevronLeft, Send, Sparkles, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Order, OrderItem } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import StarRating from './StarRating';
import { useSettingsStore } from '../store/settingsStore';

interface ReviewModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

interface ProductReview {
  product_id: string;
  product_name: string;
  image_url: string | null;
  rating: number;
  comment: string;
  isSubmitted: boolean;
}

export default function ReviewModal({ order, isOpen, onClose }: ReviewModalProps) {
  const { user } = useAuthStore();
  const settings = useSettingsStore(s => s.settings);
  const addToast = useToastStore((s) => s.addToast);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && order.order_items) {
      const items = order.order_items as OrderItem[];
      setReviews(
        items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          image_url: item.product?.image_url || null,
          rating: 0,
          comment: '',
          isSubmitted: false,
        }))
      );
      setCurrentIndex(0);
    }
  }, [isOpen, order]);

  const currentReview = reviews[currentIndex];

  const handleRatingChange = (rating: number) => {
    setReviews((prev) => prev.map((r, i) => (i === currentIndex ? { ...r, rating } : r)));
  };

  const handleCommentChange = (comment: string) => {
    setReviews((prev) => prev.map((r, i) => (i === currentIndex ? { ...r, comment } : r)));
  };

  const submitCurrentReview = async () => {
    if (!user || !currentReview || currentReview.rating === 0) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        product_id: currentReview.product_id,
        user_id: user.id,
        order_id: order.id,
        rating: currentReview.rating,
        comment: currentReview.comment.trim() || null,
        is_published: false, // Wait for moderation
        is_verified: true,
      });

      if (error) throw error;
      
      // --- Credit Loyalty Points for Review ---
      const POINTS_PER_REVIEW = 50;
      const { data: profile } = await supabase
        .from('profiles')
        .select('loyalty_points')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        const newBalance = (profile.loyalty_points || 0) + POINTS_PER_REVIEW;
        
        // Update profile
        await supabase
          .from('profiles')
          .update({ loyalty_points: newBalance })
          .eq('id', user.id);
          
        // Log transaction
        await supabase.from('loyalty_transactions').insert({
          user_id: user.id,
          type: 'earned',
          points: POINTS_PER_REVIEW,
          balance_after: newBalance,
          note: `Récompense : Avis sur ${currentReview.product_name}`,
        });
      }
      // --- End Loyalty Logic ---

      setReviews((prev) => prev.map((r, i) => (i === currentIndex ? { ...r, isSubmitted: true } : r)));

      addToast({ message: `Avis pour ${currentReview.product_name} envoyé !`, type: 'success' });

      if (currentIndex < reviews.length - 1) {
        setTimeout(() => setCurrentIndex((prev) => prev + 1), 600);
      }
    } catch (err: any) {
      addToast({ message: 'Erreur lors de l\'envoi de l\'avis', type: 'error' });
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < reviews.length - 1) setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[color:var(--color-overlay)] backdrop-blur-xl"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-[color:var(--color-border)] flex items-center justify-between bg-[color:var(--color-card-muted)]">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-[color:var(--color-text)] tracking-tight">Expérience Client</h3>
              </div>
              <p className="text-[10px] font-mono text-[color:var(--color-text-subtle)] uppercase tracking-widest">Commande #{order.id.slice(0, 8)}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {currentReview ? (
                <motion.div
                  key={currentReview.product_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-8"
                >
                  {/* Product Info */}
                  <div className="flex items-center gap-6 p-4 bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--color-primary)]/[0.02] blur-[40px] pointer-events-none" />
                    {currentReview.image_url ? (
                      <img
                        src={currentReview.image_url}
                        className="w-20 h-20 rounded-xl object-cover border border-[color:var(--color-border)] group-hover:border-[color:var(--color-primary)]/20 transition-all shadow-xl"
                        alt={currentReview.product_name}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-[color:var(--color-bg-elevated)]/85 rounded-xl flex items-center justify-center border border-[color:var(--color-border)]">
                        <Star className="w-8 h-8 text-[color:var(--color-text-subtle)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-mono text-[color:var(--color-primary)] uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Produit sélectionné
                      </p>
                      <h4 className="text-lg font-bold text-[color:var(--color-text)] truncate">{currentReview.product_name}</h4>
                    </div>
                  </div>

                  {/* Rating Container */}
                  <div className="space-y-4 text-center py-8 bg-[color:var(--color-bg)]/40 rounded-3xl border border-dashed border-[color:var(--color-border)] group/rating hover:border-[color:var(--color-primary)]/20 transition-all">
                    <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--color-text-subtle)] group-hover/rating:text-[color:var(--color-text-muted)] transition-colors">Quelle est votre note ?</p>
                    <div className="flex justify-center">
                      <StarRating
                        rating={currentReview.rating}
                        interactive={!currentReview.isSubmitted}
                        onRate={handleRatingChange}
                        size="lg"
                      />
                    </div>
                    {currentReview.rating > 0 && (
                      <motion.p
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] font-mono text-[color:var(--color-primary)] uppercase tracking-widest"
                      >
                        {currentReview.rating === 5 ? 'Exceptionnel !' : currentReview.rating >= 4 ? 'Très satisfait' : currentReview.rating >= 3 ? 'Satisfaisant' : 'Moyen'}
                      </motion.p>
                    )}
                  </div>

                  {/* Comment box */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <MessageSquare className="w-3.5 h-3.5 text-[color:var(--color-text-subtle)]" />
                      <span className="text-[10px] font-bold text-[color:var(--color-text-subtle)] uppercase tracking-widest">Partagez vos impressions</span>
                    </div>
                    <textarea
                      value={currentReview.comment}
                      readOnly={currentReview.isSubmitted}
                      onChange={(e) => handleCommentChange(e.target.value)}
                      placeholder="Commentaires sur les arômes, effets, qualité..."
                      className="w-full bg-[color:var(--color-card)]/85 border border-[color:var(--color-border)] rounded-2xl p-5 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-subtle)] focus:outline-none focus:border-[color:var(--color-primary)]/40 focus:bg-[color:var(--color-surface)]/95 transition-all min-h-[120px] resize-none"
                    />
                  </div>

                  {/* Navigation and Submission */}
                  <div className="flex items-center justify-between pt-6 border-t border-[color:var(--color-border)]">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="w-11 h-11 rounded-xl border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)] disabled:opacity-0 transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="flex flex-col items-center min-w-[50px]">
                        <span className="text-[10px] font-mono text-[color:var(--color-text-subtle)]">Step</span>
                        <span className="text-xs font-bold text-[color:var(--color-text)]">{currentIndex + 1} / {reviews.length}</span>
                      </div>
                      <button
                        onClick={handleNext}
                        disabled={currentIndex === reviews.length - 1}
                        className="w-11 h-11 rounded-xl border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)] disabled:opacity-0 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {currentReview.isSubmitted ? (
                      <div className="flex items-center gap-2 text-[color:var(--color-primary)] font-black text-[10px] uppercase tracking-widest bg-[color:var(--color-primary)]/10 px-6 py-3 rounded-xl border border-[color:var(--color-primary)]/20">
                        <CheckCircle2 className="w-4 h-4" />
                        Transmis
                      </div>
                    ) : (
                      <button
                        onClick={submitCurrentReview}
                        disabled={currentReview.rating === 0 || isSubmitting}
                        className="bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black uppercase tracking-widest px-8 py-3.5 rounded-xl hover:shadow-[0_0_25px_rgba(57,255,20,0.3)] disabled:opacity-30 transition-all flex items-center gap-2 text-xs"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-[color:var(--color-primary-contrast)]/30 border-t-[color:var(--color-primary-contrast)] rounded-full animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Publier
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-6"
                >
                  <div className="w-20 h-20 bg-[color:var(--color-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-[color:var(--color-primary)]/10 blur-2xl rounded-full" />
                    <Sparkles className="w-10 h-10 text-[color:var(--color-primary)] relative z-10" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-bold text-[color:var(--color-text)] uppercase tracking-tight">Expérience Partagée</h4>
                    <p className="text-[color:var(--color-text-subtle)] text-sm leading-relaxed max-w-sm mx-auto">
                      Merci pour votre retour précieux. Vos avis contribuent à l'excellence de la communauté {settings.store_name}.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="bg-[color:var(--color-surface)] text-[color:var(--color-primary-contrast)] font-black uppercase tracking-widest px-10 py-4 rounded-xl hover:bg-[color:var(--color-primary)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all w-full text-sm"
                  >
                    Fermer la fenêtre
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="px-8 py-4 bg-[color:var(--color-bg)]/20 border-t border-[color:var(--color-border)] flex items-center justify-center gap-2">
            <Shield className="w-3 h-3 text-[color:var(--color-text-subtle)]" />
            <span className="text-[9px] font-mono text-[color:var(--color-text-subtle)] uppercase tracking-widest">Avis vérifiés {settings.store_name}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
