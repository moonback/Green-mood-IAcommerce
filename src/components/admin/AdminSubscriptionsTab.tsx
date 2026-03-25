import { useState, useEffect } from 'react';
import { RefreshCw, Truck, Pause, Play, X, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Subscription, SubscriptionFrequency } from '../../lib/types';
import { useToastStore } from '../../store/toastStore';

const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  weekly: 'Chaque semaine',
  biweekly: 'Toutes les 2 semaines',
  monthly: 'Chaque mois',
};

const STATUS_CONFIG = {
  active: { label: 'Actif', color: 'text-green-400 bg-green-900/30 border-green-800' },
  paused: { label: 'En pause', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-800' },
  cancelled: { label: 'Annulé', color: 'text-red-400 bg-red-900/30 border-red-800' },
};

interface SubWithRelations extends Subscription {
  profile?: { id: string; full_name: string | null };
}

export default function AdminSubscriptionsTab() {
  const { addToast } = useToastStore();
  const [subscriptions, setSubscriptions] = useState<SubWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'cancelled'>('all');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function loadSubscriptions() {
    setIsLoading(true);
    const { data } = await supabase
      .from('subscriptions')
      .select('*, product:products(id, name, price, image_url), profile:profiles(id, full_name)')
      .order('next_delivery_date', { ascending: true });
    setSubscriptions((data as SubWithRelations[]) ?? []);
    setIsLoading(false);
  }

  async function handleTriggerDelivery(sub: SubWithRelations) {
    if (!sub.product) return;
    setIsTriggering(sub.id);

    try {
      const productPrice = Number(sub.product.price);
      const totalAmount = productPrice * sub.quantity;

      // 1. Create order
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: sub.user_id,
          delivery_type: 'delivery',
          subtotal: totalAmount,
          delivery_fee: 0,
          total: totalAmount,
          loyalty_points_earned: Math.floor(totalAmount),
          loyalty_points_redeemed: 0,
          payment_status: 'paid',
          status: 'processing',
          notes: `Commande automatique — abonnement ${FREQUENCY_LABELS[sub.frequency]}`,
        })
        .select()
        .single();

      if (error || !order) throw new Error('Erreur création commande');

      // 2. Create order item
      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: sub.product_id,
        product_name: sub.product.name,
        unit_price: productPrice,
        quantity: sub.quantity,
        total_price: totalAmount,
      });

      // 3. Link to subscription
      await supabase.from('subscription_orders').insert({
        subscription_id: sub.id,
        order_id: order.id,
      });

      // 4. Advance next_delivery_date
      const next = new Date(sub.next_delivery_date);
      if (sub.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else if (sub.frequency === 'biweekly') next.setDate(next.getDate() + 14);
      else next.setMonth(next.getMonth() + 1);
      const next_delivery_date = next.toISOString().split('T')[0];

      await supabase
        .from('subscriptions')
        .update({ next_delivery_date })
        .eq('id', sub.id);

      // Update local state
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, next_delivery_date } : s))
      );

      addToast({ type: 'success', message: 'Livraison déclenchée avec succès ! Commande créée.' });
    } catch (err) {
      addToast({ type: 'error', message: 'Erreur lors du déclenchement. Veuillez réessayer.' });
      console.error(err);
    } finally {
      setIsTriggering(null);
    }
  }

  async function handleToggleStatus(sub: SubWithRelations) {
    if (sub.status === 'cancelled') return;
    const newStatus = sub.status === 'active' ? 'paused' : 'active';
    await supabase.from('subscriptions').update({ status: newStatus }).eq('id', sub.id);
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, status: newStatus } : s))
    );
  }

  const filtered = statusFilter === 'all'
    ? subscriptions
    : subscriptions.filter((s) => s.status === statusFilter);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'active', 'paused', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${statusFilter === f
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
            >
              {f === 'all' ? 'Tous' : STATUS_CONFIG[f].label}
            </button>
          ))}
        </div>
        <button
          onClick={loadSubscriptions}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Aucun abonnement trouvé.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const statusCfg = STATUS_CONFIG[sub.status];
            const isExpanded = expandedId === sub.id;
            return (
              <div
                key={sub.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
              >
                {/* Row */}
                <div className="p-4 flex items-center gap-3">
                  {/* Product thumbnail */}
                  {sub.product?.image_url ? (
                    <img src={sub.product.image_url} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 bg-zinc-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-sm font-medium text-white truncate">
                        {sub.profile?.full_name ?? 'Client inconnu'}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{sub.product?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Fréquence</p>
                      <p className="text-xs text-zinc-300">{FREQUENCY_LABELS[sub.frequency]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Prochaine livraison</p>
                      <p className="text-xs text-zinc-300">
                        {new Date(sub.next_delivery_date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sub.status === 'active' && (
                      <button
                        onClick={() => handleTriggerDelivery(sub)}
                        disabled={isTriggering === sub.id}
                        className="flex items-center gap-1.5 text-xs text-white bg-emerald-500 hover:bg-green-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        {isTriggering === sub.id ? '...' : 'Livrer'}
                      </button>
                    )}
                    {sub.status !== 'cancelled' && (
                      <button
                        onClick={() => handleToggleStatus(sub)}
                        className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                        title={sub.status === 'active' ? 'Mettre en pause' : 'Reprendre'}
                      >
                        {sub.status === 'active' ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                      className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-950 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-zinc-500">Quantité</span>
                      <p className="text-zinc-300 mt-0.5">{sub.quantity}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Prix unitaire</span>
                      <p className="text-zinc-300 mt-0.5">{Number(sub.product?.price ?? 0).toFixed(2)} €</p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Total livraison</span>
                      <p className="text-zinc-300 mt-0.5">
                        {(Number(sub.product?.price ?? 0) * sub.quantity).toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Créé le</span>
                      <p className="text-zinc-300 mt-0.5">
                        {new Date(sub.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
