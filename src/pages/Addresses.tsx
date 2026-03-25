import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plus, Trash2, Star, ArrowLeft, Home, Building2, Compass, Shield, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Address } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import SEO from '../components/SEO';

export default function Addresses() {
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: 'Domicile', street: '', city: '', postal_code: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        setAddresses((data as Address[]) ?? []);
        setIsLoading(false);
      });
  }, [user]);

  const handleAdd = async () => {
    if (!user || !form.street || !form.city || !form.postal_code) return;
    setIsSaving(true);
    const { data } = await supabase
      .from('addresses')
      .insert({ ...form, user_id: user.id, country: 'France', is_default: addresses.length === 0 })
      .select()
      .single();
    if (data) {
      setAddresses((prev) => [...prev, data as Address]);
      setForm({ label: 'Domicile', street: '', city: '', postal_code: '' });
      setShowForm(false);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('addresses').delete().eq('id', id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, is_default: a.id === id }))
    );
  };

  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('domicile') || l.includes('maison')) return Home;
    if (l.includes('bureau') || l.includes('travail') || l.includes('entreprise')) return Building2;
    return MapPin;
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pt-1 pb-1">
      <SEO title={`Mes Adresses — L'Excellence ${useSettingsStore.getState().settings.store_name}`} description="Gérez vos adresses de livraison." />

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
                <div className="w-10 h-10 rounded-xl bg-[color:var(--color-primary)]/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[color:var(--color-primary)]" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
                  Mes Adresses
                </h1>
              </div>
              <p className="text-sm text-[color:var(--color-text-muted)]">Gérez vos lieux de livraison favoris.</p>
            </div>

            <button
              onClick={() => setShowForm(!showForm)}
              className="group inline-flex items-center gap-2.5 bg-[color:var(--color-card)] text-[color:var(--color-text)] font-bold text-sm uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-text)] active:scale-[0.97] transition-all"
            >
              {showForm ? (
                <>
                  <X className="w-4 h-4" />
                  Fermer
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  Nouvelle adresse
                </>
              )}
            </button>
          </div>
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[color:var(--color-primary)]/[0.03] blur-[80px] pointer-events-none" />

                <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-6 flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-[color:var(--color-primary)]" />
                  Nouvelle Destination
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest px-1">Type</label>
                    <input
                      placeholder="Domicile, Bureau..."
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-xl px-4 py-3 text-sm text-[color:var(--color-text)] focus:outline-none focus:border-[color:var(--color-primary)]/45 focus:bg-[color:var(--color-card)]/80 transition-all placeholder:text-[color:var(--color-text-muted)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest px-1">Adresse</label>
                    <input
                      placeholder="Numéro et rue"
                      value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-xl px-4 py-3 text-sm text-[color:var(--color-text)] focus:outline-none focus:border-[color:var(--color-primary)]/45 focus:bg-[color:var(--color-card)]/80 transition-all placeholder:text-[color:var(--color-text-muted)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest px-1">Code Postal</label>
                    <input
                      placeholder="Code postal"
                      value={form.postal_code}
                      onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-xl px-4 py-3 text-sm text-[color:var(--color-text)] focus:outline-none focus:border-[color:var(--color-primary)]/45 focus:bg-[color:var(--color-card)]/80 transition-all placeholder:text-[color:var(--color-text-muted)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest px-1">Ville</label>
                    <input
                      placeholder="Ville"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-xl px-4 py-3 text-sm text-[color:var(--color-text)] focus:outline-none focus:border-[color:var(--color-primary)]/45 focus:bg-[color:var(--color-card)]/80 transition-all placeholder:text-[color:var(--color-text-muted)]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={handleAdd}
                    disabled={isSaving || !form.street || !form.city || !form.postal_code}
                    className="flex-1 bg-[color:var(--color-primary)] text-[color:var(--color-text)] font-bold uppercase tracking-wider py-3.5 rounded-xl hover:shadow-[0_0_25px_rgba(37,99,235,0.2)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all text-sm"
                  >
                    {isSaving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-8 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Address Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl p-6 animate-pulse h-48 shadow-sm" />
            ))}
          </div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-[color:var(--color-card)]/80 border border-dashed border-[color:var(--color-border)] rounded-2xl shadow-sm">
            <div className="w-20 h-20 rounded-full bg-[color:var(--color-bg)] flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[color:var(--color-primary)]/5 rounded-full blur-xl" />
              <Compass className="w-8 h-8 text-[color:var(--color-text-subtle)]" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold text-[color:var(--color-text)]">Aucune adresse</p>
              <p className="text-sm text-[color:var(--color-text-muted)] max-w-xs mx-auto">
                Ajoutez votre première adresse pour faciliter vos futures commandes.
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-[color:var(--color-card)] text-[color:var(--color-text)] font-bold uppercase tracking-wider px-8 py-3 rounded-xl hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-text)] transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Ajouter une adresse
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addresses.map((addr, i) => {
              const AddrIcon = getIcon(addr.label);
              return (
                <motion.div
                  key={addr.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`group relative bg-[color:var(--color-card)]/80 border rounded-2xl p-6 transition-all duration-500 flex flex-col shadow-sm ${addr.is_default
                    ? 'border-emerald-500 ring-1 ring-[color:var(--color-primary)]/10'
                    : 'border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/25'
                    }`}
                >
                  {/* Top row */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${addr.is_default
                        ? 'bg-[color:var(--color-primary)] text-[color:var(--color-text)]'
                        : 'bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)] group-hover:bg-[color:var(--color-bg-elevated)]/90 group-hover:text-[color:var(--color-primary)]'
                        }`}>
                        <AddrIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-[color:var(--color-text)]">{addr.label}</h4>
                        {addr.is_default && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--color-primary)] flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            Par défaut
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[color:var(--color-text-subtle)] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Address details */}
                  <div className="flex-1 space-y-1.5 mb-4">
                    <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed">{addr.street}</p>
                    <p className="text-xs text-[color:var(--color-text-muted)] font-mono uppercase tracking-widest">{addr.postal_code} {addr.city}, {addr.country}</p>
                  </div>

                  {/* Actions */}
                  {!addr.is_default && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="w-full text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] py-3 rounded-xl border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/25 transition-all"
                    >
                      Définir par défaut
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-12 flex items-center justify-center gap-2 text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest">
          <Shield className="w-3 h-3" />
          <span>Adresses chiffrées et sécurisées</span>
        </div>
      </div>
    </div>
  );
}