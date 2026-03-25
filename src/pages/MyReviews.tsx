import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Star, Clock, CheckCircle, MessageSquareQuote, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Review } from '../lib/types';
import StarRating from '../components/StarRating';
import SEO from '../components/SEO';
import { useSettingsStore } from '../store/settingsStore';

export default function MyReviews() {
  const { user } = useAuthStore();
  const settings = useSettingsStore((s) => s.settings);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('reviews')
      .select('*, product:products(id, name, slug, image_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews((data as Review[]) ?? []);
        setIsLoading(false);
      });
  }, [user]);

  const publishedCount = reviews.filter(r => r.is_published).length;
  const pendingCount = reviews.filter(r => !r.is_published).length;

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pt-1 pb-1">
      <SEO title={`Mes Impressions — L'Excellence ${settings.store_name}`} description="Consultez et gérez vos avis produits." />

      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <Link to="/compte" className="inline-flex items-center gap-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] text-xs font-bold uppercase tracking-wider transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            Mon Espace
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shadow-sm">
                  <Star className="w-5 h-5" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[color:var(--color-text)]">
                  Mes Avis
                </h1>
              </div>
              <p className="text-sm text-[color:var(--color-text-muted)]">Vos témoignages et notes sur les produits.</p>
            </div>
            <div className="flex items-center gap-3">
              {publishedCount > 0 && (
                <span className="text-xs font-mono text-[color:var(--color-primary)] bg-[color:var(--color-card)]/80 border border-[color:var(--color-primary)]/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <CheckCircle className="w-3 h-3" />
                  {publishedCount} publié{publishedCount > 1 ? 's' : ''}
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-xs font-mono text-yellow-600 bg-[color:var(--color-card)]/80 border border-yellow-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <Clock className="w-3 h-3" />
                  {pendingCount} en attente
                </span>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl p-6 animate-pulse h-32 shadow-sm" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-[color:var(--color-card)]/80 border border-dashed border-[color:var(--color-border)] rounded-[2.5rem] shadow-sm">
            <div className="w-20 h-20 rounded-full bg-[color:var(--color-bg)] flex items-center justify-center relative">
              <div className="absolute inset-0 bg-orange-500/5 rounded-full blur-xl" />
              <MessageSquareQuote className="w-8 h-8 text-[color:var(--color-text-subtle)]" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-black text-[color:var(--color-text)] uppercase">Aucun avis pour le moment</p>
              <p className="text-sm text-[color:var(--color-text-muted)] max-w-xs mx-auto">
                Partagez vos impressions après avoir reçu vos commandes.
              </p>
            </div>
            <Link
              to="/compte/commandes"
              className="inline-flex items-center gap-2 bg-[color:var(--color-card)] text-[color:var(--color-text)] font-black uppercase tracking-wider px-8 py-3 rounded-xl hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-text)] transition-all text-sm shadow-xl"
            >
              Voir mes Commandes
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="group bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl p-5 md:p-6 hover:border-[color:var(--color-primary)]/25 transition-all shadow-sm"
              >
                <div className="flex gap-5 items-start">
                  {/* Product image */}
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-[color:var(--color-primary)]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                    {review.product?.image_url ? (
                      <Link to={`/catalogue/${review.product.slug}`}>
                        <img
                          src={review.product.image_url}
                          alt={review.product.name}
                          className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl border border-[color:var(--color-border)] group-hover:border-[color:var(--color-primary)]/25 transition-all shadow-sm"
                        />
                      </Link>
                    ) : (
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-[color:var(--color-bg)] rounded-xl flex items-center justify-center border border-[color:var(--color-border)]">
                        <Star className="w-6 h-6 text-[color:var(--color-text-subtle)]" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Top row: name + status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <Link
                          to={`/catalogue/${review.product?.slug ?? ''}`}
                          className="text-base md:text-lg font-black text-[color:var(--color-text)] hover:text-[color:var(--color-primary)] transition-colors block truncate"
                        >
                          {review.product?.name ?? 'Produit Inconnu'}
                        </Link>
                        <div className="mt-1 flex items-center gap-2">
                          <StarRating rating={review.rating} size="sm" />
                          <span className="text-[10px] text-[color:var(--color-text-muted)] font-mono uppercase tracking-wider">{review.rating}/5</span>
                        </div>
                      </div>

                      {review.is_published ? (
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[color:var(--color-primary)] bg-[color:var(--color-card)]/80 border border-[color:var(--color-primary)]/20 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 shadow-sm">
                          <CheckCircle className="w-3 h-3" />
                          Publié
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-yellow-600 bg-[color:var(--color-card)]/80 border border-yellow-100 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 shadow-sm">
                          <Clock className="w-3 h-3" />
                          En modération
                        </span>
                      )}
                    </div>

                    {/* Comment */}
                    {review.comment && (
                      <p className="text-sm text-[color:var(--color-text-muted)] italic leading-relaxed border-l-2 border-[color:var(--color-primary)]/25 pl-4 py-0.5">
                        "{review.comment}"
                      </p>
                    )}

                    {/* Date */}
                    <p className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      Le {new Date(review.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 flex items-center justify-center gap-2 text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest">
          <Shield className="w-3 h-3" />
          <span>Vos avis aident la communauté {settings.store_name}</span>
        </div>
      </div>
    </div>
  );
}