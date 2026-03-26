import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle, Package, Truck, Clock, ArrowRight, Coins } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Order } from '../lib/types';
import SEO from '../components/SEO';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id');
  const { user, fetchProfile } = useAuthStore();
  const { settings } = useSettingsStore();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    
    supabase
      .from('orders')
      .select('*, order_items(*), address:addresses(*)')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        if (data) {
          setOrder(data as Order);
          if (user) {
            fetchProfile(user.id);
          }
        }
      });
  }, [orderId, user, fetchProfile]);

  return (
    <>
      <SEO title={`Commande confirmée — ${settings.store_name}`} description="Votre commande a été confirmée." />

      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
        <div className="relative overflow-hidden">
          {/* Background Effects */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.08),transparent_50%)]" />

          <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl"
            >
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-5xl font-black uppercase tracking-tight mb-4 text-white"
            >
              Commande <br />
              <span className="text-emerald-400">Confirmée !</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-slate-400 text-lg mb-12 font-light"
            >
              Merci pour votre confiance. <br />
              Un e-mail de confirmation vient de vous être envoyé.
            </motion.p>

            {order && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-900/80 rounded-[2.5rem] p-8 border border-white/10 text-left space-y-6 mb-12 shadow-2xl backdrop-blur-xl"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest">Référence</span>
                  <span className="font-mono text-sm text-emerald-400 font-bold">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest">Total réglé</span>
                  <span className="text-xl font-black text-white">{order.total.toFixed(2)} €</span>
                </div>

                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest">Mode</span>
                  <span className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                    {order.delivery_type === 'click_collect' ? (
                      <>
                        <Package className="w-4 h-4 text-emerald-400" />
                        Retrait Boutique
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4 text-emerald-400" />
                        Livraison Standard
                      </>
                    )}
                  </span>
                </div>

                {order.order_items && order.order_items.length > 0 && (
                  <div className="border-b border-white/5 pb-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest">
                        Articles ({order.order_items.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {order.order_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-slate-950/70 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">{item.product_name}</p>
                            <p className="text-xs text-slate-400">× {item.quantity}</p>
                          </div>
                          <p className="text-sm font-black text-emerald-400">{item.total_price.toFixed(2)} €</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.loyalty_points_earned > 0 && (
                  <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4">
                    <span className="text-amber-500 text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      {settings.loyalty_currency_name} gagnés
                    </span>
                    <span className="text-amber-500 font-black text-lg">+{order.loyalty_points_earned}</span>
                  </div>
                )}

                {order.delivery_type === 'click_collect' && (
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5 shadow-inner">
                    <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest mb-3">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Informations retrait
                    </div>
                    <div className="text-xs text-slate-400 leading-relaxed font-medium">
                      <p className="text-white font-bold mb-1">{settings.store_address}</p>
                      <p>{settings.store_hours}</p>
                      <p className="mt-2 text-emerald-400/80">Tél : {settings.store_phone}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center px-4"
            >
              <Link
                to="/compte/commandes"
                className="group flex items-center justify-center gap-3 bg-white text-slate-950 font-black uppercase text-[11px] tracking-[0.2em] px-10 py-5 rounded-2xl transition-all hover:bg-emerald-500 shadow-xl"
              >
                Suivre ma commande
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/catalogue"
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[11px] tracking-[0.2em] px-10 py-5 rounded-2xl border border-white/10 transition-all backdrop-blur-md"
              >
                Continuer mes achats
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
