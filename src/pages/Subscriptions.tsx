import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Pause, Play, X, ChevronDown, ShoppingBag, Calendar, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Subscription, SubscriptionFrequency } from '../lib/types';
import { useNavigate } from 'react-router-dom';
import AccountPageLayout from '../components/AccountPageLayout';

const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  weekly: 'Chaque semaine',
  biweekly: 'Toutes les 2 semaines',
  monthly: 'Chaque mois',
};

const STATUS_CONFIG = {
  active: { label: 'Actif', dot: 'bg-[color:var(--color-primary)]', badge: 'text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 border-[color:var(--color-primary)]/20' },
  paused: { label: 'En pause', dot: 'bg-yellow-500', badge: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
  cancelled: { label: 'Résilié', dot: 'bg-red-500', badge: 'text-red-600 bg-red-50 border-red-100' },
};

export default function Subscriptions() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [changingFreq, setChangingFreq] = useState<string | null>(null);

  useEffect(() => {
    if (!settings.subscriptions_enabled) {
      navigate('/compte');
      return;
    }
    if (!user) return;
    loadSubscriptions();
  }, [user, settings.subscriptions_enabled, navigate]);

  async function loadSubscriptions() {
    if (!user) return;
    const { data } = await supabase
      .from('subscriptions')
      .select('*, product:products(id, name, slug, image_url, price)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSubscriptions((data as Subscription[]) ?? []);
    setIsLoading(false);
  }

  async function handleTogglePause(sub: Subscription) {
    if (sub.status === 'cancelled') return;
    const newStatus = sub.status === 'active' ? 'paused' : 'active';
    await supabase.from('subscriptions').update({ status: newStatus }).eq('id', sub.id);
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, status: newStatus } : s))
    );
  }

  async function handleCancel(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir résilier cet abonnement ? Cette action est irréversible.')) return;
    await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', id);
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'cancelled' } : s))
    );
  }

  async function handleChangeFrequency(id: string, frequency: SubscriptionFrequency) {
    const now = new Date();
    if (frequency === 'weekly') now.setDate(now.getDate() + 7);
    else if (frequency === 'biweekly') now.setDate(now.getDate() + 14);
    else now.setMonth(now.getMonth() + 1);

    const next_delivery_date = now.toISOString().split('T')[0];
    await supabase
      .from('subscriptions')
      .update({ frequency, next_delivery_date })
      .eq('id', id);
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, frequency, next_delivery_date } : s))
    );
    setChangingFreq(null);
  }

  const activeCount = subscriptions.filter(s => s.status === 'active').length;

  return (
    <AccountPageLayout
      seoTitle={`Mes Abonnements — ${settings.store_name}`}
      seoDescription="Gérez vos livraisons automatiques."
      icon={RefreshCw}
      iconColor="#10b981"
      title="Abonnements"
      subtitle="Livraisons automatiques · Modifiables à tout moment"
      stat={activeCount > 0 ? activeCount : undefined}
      statLabel={activeCount > 0 ? 'Actifs' : undefined}
      footerText="Abonnements résiliables à tout moment sans frais"
    >

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl p-6 animate-pulse h-32" />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-[color:var(--color-surface)] border border-dashed border-[color:var(--color-border)] rounded-[2.5rem] shadow-sm">
                        <div className="w-20 h-20 rounded-full bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-[color:var(--color-primary)]/5 rounded-full blur-xl" />
                            <RefreshCw className="w-8 h-8 text-[color:var(--color-text-muted)]" />
                        </div>
                         <div className="space-y-2">
                            <p className="text-xl font-black text-[color:var(--color-text)] uppercase">Aucun abonnement</p>
                            <p className="text-sm text-[color:var(--color-text-subtle)] max-w-xs mx-auto font-medium">
                                Abonnez-vous à vos produits préférés pour des livraisons automatiques et économisez.
                            </p>
                        </div>
                         <Link
                            to="/catalogue"
                            className="inline-flex items-center gap-2 bg-[color:var(--color-card)] text-[color:var(--color-text)] font-black uppercase tracking-widest px-8 py-3 rounded-xl hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-primary-contrast)] transition-all text-sm shadow-xl shadow-zinc-900/10"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            Découvrir les produits
                        </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub, i) => {
              const statusCfg = STATUS_CONFIG[sub.status];
              return (
                                 <motion.div
                                    key={sub.id}
                                    layout
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    className="group bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl p-5 md:p-6 hover:border-[color:var(--color-primary)]/25 transition-all shadow-sm"
                                >
                  <div className="flex gap-5">
                    {/* Product image */}
                                         {sub.product?.image_url ? (
                                            <img
                                                src={sub.product.image_url}
                                                alt={sub.product.name}
                                                className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl border border-[color:var(--color-border)] shrink-0 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 md:w-20 md:h-20 bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] rounded-xl flex items-center justify-center shrink-0">
                                                <Package className="w-6 h-6 text-[color:var(--color-text-muted)]" />
                                            </div>
                                        )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                                                 <div>
                                                    <h3 className="text-base md:text-lg font-black text-[color:var(--color-text)] truncate">
                                                        {sub.product?.name ?? 'Produit'}
                                                    </h3>
                                                    <p className="text-sm text-[color:var(--color-text-subtle)] mt-0.5 font-medium">
                                                        Qté : {sub.quantity} × {sub.product?.price?.toFixed(2)} €
                                                    </p>
                                                </div>
                        <span className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border shrink-0 ${statusCfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[color:var(--color-text-subtle)]">
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3" />
                          {FREQUENCY_LABELS[sub.frequency]}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          Prochaine : {new Date(sub.next_delivery_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </span>
                      </div>

                      {/* Actions */}
                      {sub.status !== 'cancelled' && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {/* Frequency selector */}
                          <div className="relative">
                                                         <button
                                                            onClick={() => setChangingFreq(changingFreq === sub.id ? null : sub.id)}
                                                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] bg-[color:var(--color-bg-elevated)] hover:bg-[color:var(--color-surface)] px-3 py-2 rounded-lg transition-all border border-[color:var(--color-border)] shadow-sm"
                                                        >
                                                            <RefreshCw className="w-3 h-3" />
                                                            Fréquence
                                                            <ChevronDown className={`w-3 h-3 transition-transform ${changingFreq === sub.id ? 'rotate-180' : ''}`} />
                                                        </button>

                            <AnimatePresence>
                              {changingFreq === sub.id && (
                                                                 <motion.div
                                                                    initial={{ opacity: 0, y: 5 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: 5 }}
                                                                    className="absolute top-full left-0 mt-1 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-xl overflow-hidden shadow-2xl z-10 min-w-[180px]"
                                                                >
                                                                    {(Object.keys(FREQUENCY_LABELS) as SubscriptionFrequency[]).map((freq) => (
                                                                        <button
                                                                            key={freq}
                                                                            onClick={() => handleChangeFrequency(sub.id, freq)}
                                                                            className={`block w-full text-left px-4 py-2.5 text-xs font-black uppercase tracking-tight transition-colors ${sub.frequency === freq
                                                                                ? 'bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]'
                                                                                : 'text-[color:var(--color-text-subtle)] hover:bg-[color:var(--color-bg-elevated)] hover:text-[color:var(--color-text)]'
                                                                                }`}
                                                                        >
                                                                            {FREQUENCY_LABELS[freq]}
                                                                        </button>
                                                                    ))}
                                                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Pause/Resume */}
                                                         <button
                                                            onClick={() => handleTogglePause(sub)}
                                                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] bg-[color:var(--color-bg-elevated)] hover:bg-[color:var(--color-surface)] px-3 py-2 rounded-lg transition-all border border-[color:var(--color-border)] shadow-sm"
                                                        >
                                                            {sub.status === 'active' ? (
                                                                <><Pause className="w-3 h-3" /> Pause</>
                                                            ) : (
                                                                <><Play className="w-3 h-3" /> Reprendre</>
                                                            )}
                                                        </button>

                          {/* Cancel */}
                                                         <button
                                                            onClick={() => handleCancel(sub.id)}
                                                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-600 bg-red-50 hover:bg-[color:var(--color-surface)] px-3 py-2 rounded-lg transition-all border border-red-100 hover:border-red-500/20 shadow-sm"
                                                        >
                                                            <X className="w-3 h-3" />
                                                            Résilier
                                                        </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

    </AccountPageLayout>
  );
}
