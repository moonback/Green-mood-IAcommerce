import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Star, Clock, CheckCircle, MessageSquareQuote } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Review } from '../lib/types';
import StarRating from '../components/StarRating';
import { useSettingsStore } from '../store/settingsStore';
import AccountPageLayout from '../components/AccountPageLayout';

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

  const publishedCount = reviews.filter((r) => r.is_published).length;
  const pendingCount = reviews.filter((r) => !r.is_published).length;

  const statBadges = (
    <div className="flex items-center gap-2">
      {publishedCount > 0 && (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
            color: 'var(--color-primary)',
          }}
        >
          <CheckCircle className="w-3 h-3" />
          {publishedCount} publié{publishedCount > 1 ? 's' : ''}
        </span>
      )}
      {pendingCount > 0 && (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest text-yellow-600"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: 'rgba(234,179,8,0.08)',
            border: '1px solid rgba(234,179,8,0.2)',
          }}
        >
          <Clock className="w-3 h-3" />
          {pendingCount} en attente
        </span>
      )}
    </div>
  );

  return (
    <AccountPageLayout
      seoTitle={`Mes Impressions — ${settings.store_name}`}
      seoDescription="Consultez et gérez vos avis produits."
      icon={Star}
      iconColor="#f97316"
      title="Mes Avis"
      subtitle="Vos témoignages et notes sur les produits"
      stat={reviews.length}
      statLabel="Avis"
      headerActions={statBadges}
      footerText={`Vos avis aident la communauté ${settings.store_name}`}
    >
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[1.75rem] h-32 animate-pulse"
              style={{
                background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
              }}
            />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center space-y-6 rounded-[2rem]"
          style={{
            background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
            border: '1px dashed color-mix(in srgb, var(--color-border) 100%, transparent)',
          }}
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center relative"
            style={{ background: 'color-mix(in srgb, var(--color-bg) 100%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)' }}>
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, #f9731610, transparent 70%)' }} />
            <MessageSquareQuote className="w-8 h-8 text-[color:var(--color-text-muted)]" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-[color:var(--color-text)]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Aucun avis pour le moment
            </p>
            <p className="text-sm text-[color:var(--color-text-muted)] max-w-xs mx-auto">
              Partagez vos impressions après avoir reçu vos commandes.
            </p>
          </div>
          <Link
            to="/compte/commandes"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all"
            style={{
              background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
              border: '1px solid #f9731628',
              color: 'var(--color-text)',
            }}
          >
            Voir mes Commandes
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="group rounded-[1.75rem] p-5 md:p-6 transition-all duration-400"
              style={{
                background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
                border: `1px solid ${review.is_published ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)' : 'color-mix(in srgb, var(--color-border) 100%, transparent)'}`,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#f9731628'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = review.is_published ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)' : ''; }}
            >
              <div className="flex gap-5 items-start">
                {/* Product image */}
                <div className="relative shrink-0">
                  {review.product?.image_url ? (
                    <Link to={`/catalogue/${review.product.slug}`}>
                      <img
                        src={review.product.image_url}
                        alt={review.product.name}
                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl transition-all duration-300 group-hover:scale-[1.03]"
                        style={{ border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)' }}
                      />
                    </Link>
                  ) : (
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl flex items-center justify-center"
                      style={{ background: 'color-mix(in srgb, var(--color-bg) 100%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)' }}>
                      <Star className="w-6 h-6 text-[color:var(--color-text-muted)]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                  {/* Name + status */}
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
                        <span
                          className="text-[10px] text-[color:var(--color-text-muted)] uppercase tracking-wider"
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        >
                          {review.rating}/5
                        </span>
                      </div>
                    </div>

                    {review.is_published ? (
                      <span
                        className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0"
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        <CheckCircle className="w-3 h-3" />
                        Publié
                      </span>
                    ) : (
                      <span
                        className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 text-yellow-600"
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          background: 'rgba(234,179,8,0.08)',
                          border: '1px solid rgba(234,179,8,0.2)',
                        }}
                      >
                        <Clock className="w-3 h-3" />
                        En modération
                      </span>
                    )}
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-sm text-[color:var(--color-text-muted)] italic leading-relaxed border-l-2 border-[#f9731640] pl-4 py-0.5">
                      "{review.comment}"
                    </p>
                  )}

                  {/* Date */}
                  <p
                    className="text-[10px] text-[color:var(--color-text-muted)] uppercase tracking-wider"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
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
    </AccountPageLayout>
  );
}
