import { Star, Quote } from 'lucide-react';
import { motion } from 'motion/react';
import type { Review } from '../../types/premiumProduct';

interface Props {
  reviews: Review[];
}

function ratingToStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => i < rating);
}

export default function ProductReviews({ reviews }: Props) {
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length
      ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100)
      : 0,
  }));

  return (
    <section className="relative border-t border-[color:var(--color-border)] bg-[color:var(--color-card)]/50">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--color-primary)] mb-2">
            Expériences clients
          </p>
          <h3 className="text-3xl text-[color:var(--color-text)]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Avis vérifiés</h3>
        </div>

        {/* ── Empty state ── */}
        {reviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center py-16 gap-5 text-center rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-sm"
          >
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-6 h-6 text-[color:var(--color-text-subtle)]" />
              ))}
            </div>
            <div>
              <p className="text-base font-black text-[color:var(--color-text)]">Aucun avis pour le moment</p>
              <p className="text-sm text-[color:var(--color-text-muted)] mt-1 font-medium">
                Soyez le premier à partager votre expérience avec ce produit.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
            {/* ── Summary card ── */}
            <div className="rounded-[2.5rem] border border-[color:var(--color-border)]/50 bg-[color:var(--color-card)]/60 backdrop-blur-2xl p-8 space-y-6 h-fit shadow-[0_20px_40px_rgba(0,0,0,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 blur-[50px] pointer-events-none" />
              <div className="text-center relative z-10">
                <p className="text-6xl text-[color:var(--color-text)]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>{average.toFixed(1)}</p>
                <div className="flex justify-center mt-2 gap-0.5">
                  {ratingToStars(Math.round(average)).map((filled, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${filled ? 'fill-amber-400 text-amber-400' : 'text-[color:var(--color-bg-muted)]'}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-[color:var(--color-text-muted)] mt-1 font-bold">
                  {reviews.length} avis certifié{reviews.length > 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-2">
                {distribution.map(({ star, count, pct }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[11px] text-[color:var(--color-text-subtle)] w-3 text-right font-bold">{star}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 h-1.5 rounded-full bg-[color:var(--color-bg-muted)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-amber-400"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: (5 - star) * 0.05 }}
                      />
                    </div>
                    <span className="text-[10px] text-[color:var(--color-text-subtle)] w-6 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Review cards ── */}
            <div className="grid gap-5 sm:grid-cols-2 content-start">
              {reviews.slice(0, 4).map((review, idx) => (
                <motion.article
                  key={review.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                  className="relative rounded-[2rem] border border-[color:var(--color-border)]/40 bg-[color:var(--color-card)]/50 p-6 space-y-4 overflow-hidden shadow-lg backdrop-blur-xl hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] hover:border-amber-400/30 transition-all duration-500 group"
                >
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-400/5 blur-[40px] pointer-events-none group-hover:bg-amber-400/10 transition-colors duration-500" />
                  <Quote className="absolute top-4 right-4 w-8 h-8 text-[color:var(--color-text)]/5 group-hover:text-amber-400/20 transition-colors duration-500" />

                  <div className="flex gap-0.5">
                    {ratingToStars(review.rating).map((filled, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${filled ? 'fill-amber-400 text-amber-400' : 'text-[color:var(--color-bg-muted)]'}`}
                      />
                    ))}
                  </div>

                  <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed relative z-10 font-medium">
                    "{review.comment ?? 'Produit de qualité remarquable.'}"
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[color:var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] flex items-center justify-center text-xs font-black text-[color:var(--color-text-subtle)]">
                        {(review.author ?? 'C')[0].toUpperCase()}
                      </div>
                      <p className="text-xs font-black text-[color:var(--color-text)]">
                        {review.author?.split(' ')[0] ?? 'Client vérifié'}
                      </p>
                    </div>
                    <span className="text-[10px] text-[color:var(--color-text-subtle)] font-black uppercase tracking-widest">
                      {new Date(review.created_at).toLocaleDateString('fr-FR', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}