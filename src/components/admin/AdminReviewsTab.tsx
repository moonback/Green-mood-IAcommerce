import { useState, useEffect } from 'react';
import { Eye, EyeOff, Trash2, CheckCircle, Clock, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Review } from '../../lib/types';
import StarRating from '../StarRating';

interface ReviewWithRelations extends Omit<Review, 'product'> {
  product?: { id: string; name: string; slug: string; image_url: string | null };
  profile?: { id: string; full_name: string | null };
}

export default function AdminReviewsTab() {
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'published'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    setIsLoading(true);
    const { data } = await supabase
      .from('reviews')
      .select('*, product:products(id, name), profile:profiles(id, full_name)')
      .order('created_at', { ascending: false });
    setReviews((data as ReviewWithRelations[]) ?? []);
    setIsLoading(false);
  }

  async function handleTogglePublish(review: ReviewWithRelations) {
    const newVal = !review.is_published;
    await supabase.from('reviews').update({ is_published: newVal }).eq('id', review.id);
    setReviews((prev) =>
      prev.map((r) => (r.id === review.id ? { ...r, is_published: newVal } : r))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet avis définitivement ?')) return;
    await supabase.from('reviews').delete().eq('id', id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = reviews.filter((review) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'pending'
          ? !review.is_published
          : review.is_published;

    const matchesSearch = !searchQuery ||
      (review.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (review.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    return matchesFilter && matchesSearch;
  });

  const pendingCount = reviews.filter((r) => !r.is_published).length;

  return (
    <div className="space-y-4">
      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex gap-2">
          {[
            { key: 'all', label: `Tous (${reviews.length})` },
            { key: 'pending', label: `En attente (${pendingCount})` },
            { key: 'published', label: `Publiés (${reviews.length - pendingCount})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filter === key
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par client ou produit..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
            />
          </div>
          <button
            onClick={loadReviews}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Aucun avis trouvé.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div
              key={review.id}
              className={`bg-zinc-900 border rounded-2xl p-4 transition-all hover:border-zinc-700 ${review.is_published ? 'border-zinc-800' : 'border-yellow-900/50'
                }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <StarRating rating={review.rating} size="sm" />
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                        {(review.profile?.full_name ?? 'C').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-white">
                        {review.profile?.full_name ?? 'Client'}
                      </span>
                    </div>
                    <span className="text-zinc-600 text-xs">sur</span>
                    <span className="text-xs text-zinc-400 truncate max-w-[150px]">
                      {review.product?.name ?? 'Produit inconnu'}
                    </span>
                    {review.is_verified && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full">
                        Vérifié
                      </span>
                    )}
                    <span className={`ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${review.is_published
                      ? 'text-green-400 bg-green-900/20'
                      : 'text-yellow-400 bg-yellow-900/20'
                      }`}>
                      {review.is_published ? (
                        <><CheckCircle className="w-3 h-3" /> Publié</>
                      ) : (
                        <><Clock className="w-3 h-3" /> En attente</>
                      )}
                    </span>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-3">{review.comment}</p>
                  )}

                  {/* Date */}
                  <p className="text-xs text-zinc-600 mt-2">
                    {new Date(review.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleTogglePublish(review)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${review.is_published
                      ? 'text-yellow-400 bg-yellow-900/20 hover:bg-yellow-900/30'
                      : 'text-green-400 bg-green-900/20 hover:bg-green-900/30'
                      }`}
                    title={review.is_published ? 'Dépublier' : 'Publier'}
                  >
                    {review.is_published ? (
                      <><EyeOff className="w-3.5 h-3.5" /> Dépublier</>
                    ) : (
                      <><Eye className="w-3.5 h-3.5" /> Publier</>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
