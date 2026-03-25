import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Truck, Clock, ChevronDown, ArrowLeft, ShoppingBag, RotateCcw, Star, FileText, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Order, OrderItem } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import SEO from '../components/SEO';
import ReviewModal from '../components/ReviewModal';
import { downloadInvoice } from '../lib/invoiceGenerator';
import AccountSidebar from '../components/AccountSidebar';
import { useSettingsStore } from '../store/settingsStore';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  paid: { label: 'Confirmé', color: 'text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 border-[color:var(--color-primary)]/20' },
  processing: { label: 'Préparation', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  ready: { label: 'Prêt', color: 'text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 border-[color:var(--color-primary)]/25' },
  shipped: { label: 'En transit', color: 'text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 border-[color:var(--color-primary)]/20' },
  delivered: { label: 'Livré', color: 'text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 border-[color:var(--color-primary)]/25' },
  cancelled: { label: 'Annulé', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

export default function Orders() {
  const { user } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const openSidebar = useCartStore((s) => s.openSidebar);
  const addToast = useToastStore((s) => s.addToast);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const handleReorder = async (order: Order) => {
    const items = order.order_items as OrderItem[] | undefined;
    if (!items || items.length === 0) return;

    const productIds = items.map((i) => i.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .in('id', productIds)
      .eq('is_active', true)
      .eq('is_available', true);

    if (!products || products.length === 0) {
      addToast({ message: 'Les produits de cette commande ne sont plus disponibles', type: 'error' });
      return;
    }

    let addedCount = 0;
    for (const product of products) {
      const originalItem = items.find((i) => i.product_id === product.id);
      if (originalItem && product.stock_quantity > 0) {
        addItem(product);
        if (originalItem.quantity > 1) {
          useCartStore.getState().updateQuantity(product.id, originalItem.quantity);
        }
        addedCount++;
      }
    }

    if (addedCount > 0) {
      addToast({ message: `${addedCount} produit${addedCount > 1 ? 's' : ''} ajouté${addedCount > 1 ? 's' : ''} au panier`, type: 'success' });
      openSidebar();
    } else {
      addToast({ message: 'Aucun produit disponible en stock', type: 'error' });
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      setIsLoading(true);
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, count, error } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(image_url)), profile:profiles(*), address:addresses(*)', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        addToast({ message: 'Erreur lors du chargement des commandes', type: 'error' });
      } else {
        setOrders((data as Order[]) ?? []);
        setTotalCount(count ?? 0);
      }
      setIsLoading(false);
    };

    fetchOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [user, currentPage]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const settings = useSettingsStore((s) => s.settings);

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pt-1 pb-1">
      <SEO title={`Mes Commandes — L'Excellence ${settings.store_name}`} description="Historique de vos commandes." />

      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <AccountSidebar />
          <div className="flex-1 space-y-8">

            {/* Header */}
            <div>
              <Link to="/compte" className="inline-flex items-center gap-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] text-xs font-bold uppercase tracking-wider transition-colors mb-6 group">
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                Mon Espace
              </Link>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/25 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.05)]">
                      <Package className="w-6 h-6 text-[color:var(--color-primary)]" />
                    </div>
                    <div>
                      <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[color:var(--color-text)] mb-1">
                        Mes Commandes
                      </h1>
                      <p className="text-sm text-[color:var(--color-text-muted)]">Gérez vos achats et suivez vos livraisons.</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] font-bold mb-1">Total Commandes</span>
                    <span className="text-2xl font-mono font-black text-[color:var(--color-text)]">
                      {totalCount.toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-3xl p-8 animate-pulse shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[color:var(--color-bg-elevated)]" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-24 bg-[color:var(--color-bg-elevated)] rounded" />
                        <div className="h-3 w-40 bg-[color:var(--color-bg-elevated)] rounded" />
                      </div>
                      <div className="h-8 w-24 bg-[color:var(--color-bg-elevated)] rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-32 text-center space-y-8 bg-[color:var(--color-surface)]/[0.01] border border-dashed border-[color:var(--color-border)] rounded-[2.5rem]"
              >
                <div className="w-24 h-24 rounded-full bg-[color:var(--color-card)]/85 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-[color:var(--color-primary)]/5 rounded-full blur-2xl animate-pulse" />
                  <ShoppingBag className="w-10 h-10 text-[color:var(--color-text-muted)]" />
                </div>
                <div className="space-y-3">
                  <p className="text-2xl font-black text-[color:var(--color-text)]">Aucune commande</p>
                  <p className="text-sm text-[color:var(--color-text-muted)] max-w-xs mx-auto leading-relaxed">
                    Votre historique est vide pour le moment. Découvrez nos produits et commencez votre expérience {settings.store_name}.
                  </p>
                </div>
                <Link
                  to="/catalogue"
                  className="group relative inline-flex items-center gap-3 bg-[color:var(--color-card)] text-[color:var(--color-text)] font-black uppercase tracking-widest px-10 py-5 rounded-2xl hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-text)] transition-all overflow-hidden"
                >
                  <span className="relative z-10 text-xs">Explorer le Catalogue</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 transition-transform group-hover:translate-x-1 relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4">
                  {orders.map((order, i) => {
                    const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
                    const isExpanded = expanded === order.id;
                    const items = order.order_items as OrderItem[] | undefined;

                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`group relative bg-[color:var(--color-card)]/80 border rounded-3xl overflow-hidden transition-all duration-500 hover:border-emerald-300 shadow-sm ${isExpanded ? 'border-emerald-500 ring-1 ring-[color:var(--color-primary)]/10' : 'border-[color:var(--color-border)]'
                          }`}
                      >
                        <button
                          onClick={() => setExpanded(isExpanded ? null : order.id)}
                          className="w-full flex flex-col md:flex-row md:items-center justify-between p-6 md:p-8 text-left gap-6"
                        >
                          <div className="flex items-center gap-6 flex-1">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl ${isExpanded ? 'bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] scale-110' : 'bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)] group-hover:bg-[color:var(--color-bg-elevated)]/90 group-hover:text-[color:var(--color-primary)]'
                              }`}>
                              {order.delivery_type === 'click_collect' ? (
                                <Package className="w-6 h-6" />
                              ) : (
                                <Truck className="w-6 h-6" />
                              )}
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-black text-[color:var(--color-text)] tracking-tight uppercase">
                                  #{order.id.slice(0, 8)}
                                </h3>
                                <div className={`hidden sm:flex items-center gap-1.5 text-[8px] font-black tracking-[0.2em] uppercase px-3 py-1 rounded-full border ${status.color.replace('text-', 'text-opacity-100 ')} bg-[color:var(--color-card)]/80 shadow-sm`}>
                                  <div className={`w-1 h-1 rounded-full animate-pulse ${status.color.split(' ')[0].replace('text-', 'bg-')}`} />
                                  {status.label}
                                </div>
                              </div>
                              <p className="text-[10px] text-[color:var(--color-text-muted)] font-mono flex items-center gap-2 uppercase tracking-wider">
                                <Clock className="w-3 h-3 text-[color:var(--color-primary)]" />
                                {new Date(order.created_at).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-8">
                            <div className="md:text-right flex flex-col md:items-end">
                              <span className="text-[10px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-widest mb-1">Montant Total</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-[color:var(--color-text)] tracking-tighter">
                                  {order.total.toFixed(2)}
                                </span>
                                <span className="text-[color:var(--color-primary)] text-sm font-bold">€</span>
                              </div>
                            </div>
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-500 ${isExpanded ? 'rotate-180 bg-[color:var(--color-card)] border-[color:var(--color-border)] text-[color:var(--color-text)]' : 'border-[color:var(--color-border)] text-[color:var(--color-text-muted)] group-hover:border-[color:var(--color-primary)]/40 group-hover:text-[color:var(--color-primary)]'
                              }`}>
                              <ChevronDown className="w-5 h-5" />
                            </div>
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && items && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                              className="overflow-hidden border-t border-[color:var(--color-border)]"
                            >
                              <div className="p-8 space-y-8 bg-[color:var(--color-bg)]/50">
                                {/* Items List */}
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Détails des articles</h4>
                                    <span className="text-[10px] font-mono text-[color:var(--color-text-muted)]">{items.length} article{items.length > 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="divide-y divide-white/[0.05]">
                                    {items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-center py-4 group/item">
                                        <div className="flex flex-col">
                                          <span className="text-sm font-bold text-[color:var(--color-text-muted)] group-hover/item:text-[color:var(--color-text)] transition-colors">
                                            {item.product_name}
                                          </span>
                                          <span className="text-[10px] text-[color:var(--color-text-muted)] font-mono mt-0.5 uppercase tracking-wider">
                                            Quantité : {item.quantity}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-sm font-black text-[color:var(--color-text)]">{item.total_price.toFixed(2)} €</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[color:var(--color-border)]">
                                  <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Informations de livraison</h4>
                                    {order.address && (
                                      <div className="text-xs text-[color:var(--color-text-muted)] leading-relaxed bg-[color:var(--color-card)]/80 p-4 rounded-2xl border border-[color:var(--color-border)]">
                                        <p className="font-bold text-[color:var(--color-text)] mb-1">{order.profile?.full_name || 'Client'}</p>
                                        <p>{order.address.street}</p>
                                        <p>{order.address.postal_code} {order.address.city}</p>
                                        <p className="mt-2 text-[10px] text-[color:var(--color-text-muted)]">{order.delivery_type === 'click_collect' ? 'Retrait en point de vente' : 'Livraison standard'}</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-3 bg-[color:var(--color-card)]/80 p-6 rounded-3xl border border-[color:var(--color-border)] shadow-sm">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-[color:var(--color-text-muted)]">Sous-total</span>
                                      <span className="font-mono text-[color:var(--color-text)]">{(order.total - order.delivery_fee).toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-[color:var(--color-text-muted)]">Livraison</span>
                                      <span className="font-mono text-[color:var(--color-primary)]">{order.delivery_fee === 0 ? 'OFFERTE' : `${order.delivery_fee.toFixed(2)} €`}</span>
                                    </div>
                                    <div className="pt-3 border-t border-[color:var(--color-border)] flex justify-between items-end">
                                      <span className="text-xs font-black uppercase tracking-widest text-[color:var(--color-primary)]">Total Payé</span>
                                      <span className="text-3xl font-black text-[color:var(--color-text)] tracking-tighter">{order.total.toFixed(2)} <span className="text-sm font-bold text-[color:var(--color-primary)]">€</span></span>
                                    </div>
                                  </div>
                                </div>

                                {/* Interaction Buttons */}
                                <div className="flex flex-wrap gap-3 pt-4">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleReorder(order); }}
                                    className="flex-1 min-w-[200px] group/btn relative flex items-center justify-center gap-3 bg-[color:var(--color-primary)] text-[color:var(--color-text)] font-black uppercase tracking-[0.15em] py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[color:var(--color-primary)]/10"
                                  >
                                    <RotateCcw className="w-4 h-4 group-hover/btn:rotate-[-180deg] transition-transform duration-500" />
                                    <span className="text-[10px]">Recommander</span>
                                  </button>

                                  <div className="flex gap-3 flex-1 sm:flex-none">
                                    {(order.payment_status === 'paid') && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); downloadInvoice(order); }}
                                        className="flex-1 sm:flex-none px-6 flex items-center justify-center gap-3 bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] text-[color:var(--color-text)] font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-[color:var(--color-bg)] hover:border-[color:var(--color-primary)]/40 transition-all text-[10px]"
                                      >
                                        <FileText className="w-4 h-4 text-[color:var(--color-primary)]" />
                                        Facture
                                      </button>
                                    )}

                                    {(order.status === 'delivered' || order.status === 'ready') && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setReviewOrder(order); }}
                                        className="flex-1 sm:flex-none px-6 flex items-center justify-center gap-3 bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] text-[color:var(--color-text)] font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-[color:var(--color-bg)] hover:border-yellow-400 transition-all text-[10px]"
                                      >
                                        <Star className="w-4 h-4 text-yellow-500" />
                                        Laisser un Avis
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-between bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] p-4 rounded-3xl shadow-sm">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all hover:bg-[color:var(--color-bg-elevated)]/90 hover:text-[color:var(--color-text)] disabled:opacity-20 group"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                      Précédent
                    </button>

                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-xl font-mono text-sm transition-all ${currentPage === page
                            ? 'bg-[color:var(--color-primary)] text-[color:var(--color-text)] font-black scale-110 shadow-lg shadow-[color:var(--color-primary)]/25'
                            : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)]/90'
                            }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all hover:bg-[color:var(--color-bg-elevated)]/90 hover:text-[color:var(--color-text)] disabled:opacity-20 group"
                    >
                      Suivant
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty space/Footer info */}
            <div className="mt-12 pt-8 border-t border-[color:var(--color-border)] flex items-center justify-center gap-4 text-[10px] font-black text-[color:var(--color-text-muted)] uppercase tracking-[0.3em]">
              <Shield className="w-4 h-4 text-[color:var(--color-primary)]/30" />
              <span>Paiement & Commandes Hautement Sécurisés</span>
            </div>
          </div>
        </div>
      </div>

      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          isOpen={!!reviewOrder}
          onClose={() => setReviewOrder(null)}
        />
      )}
    </div>
  );
}