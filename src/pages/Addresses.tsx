import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Plus,
  Trash2,
  Home,
  Building2,
  Check,
  X,
  Compass,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Address } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import AccountPageLayout from '../components/AccountPageLayout';

export default function Addresses() {
  const { user } = useAuthStore();
  const settings = useSettingsStore((s) => s.settings);
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
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
  };

  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('domicile') || l.includes('maison')) return Home;
    if (l.includes('bureau') || l.includes('travail') || l.includes('entreprise')) return Building2;
    return MapPin;
  };

  const addButton = (
    <button
      onClick={() => setShowForm(!showForm)}
      className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: showForm
          ? 'color-mix(in srgb, var(--color-card) 80%, transparent)'
          : 'var(--color-primary)',
        color: showForm ? 'var(--color-text-muted)' : 'white',
        border: `1px solid ${showForm ? 'color-mix(in srgb, var(--color-border) 100%, transparent)' : 'var(--color-primary)'}`,
      }}
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
  );

  return (
    <AccountPageLayout
      seoTitle={`Mes Adresses — ${settings.store_name}`}
      seoDescription="Gérez vos adresses de livraison."
      icon={MapPin}
      iconColor="#06b6d4"
      title="Mes Adresses"
      subtitle="Gérez vos lieux de livraison favoris"
      stat={addresses.length}
      statLabel="Adresses"
      headerActions={addButton}
      footerText="Adresses chiffrées et sécurisées"
    >
      {/* ── Add form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              className="rounded-[2rem] p-6 md:p-8 relative overflow-hidden"
              style={{
                background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
                border: '1px solid #06b6d425',
              }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, #06b6d408, transparent 70%)', transform: 'translate(30%, -30%)' }} />

              <p
                className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-text-muted)] mb-6 flex items-center gap-2"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                <Compass className="w-3.5 h-3.5 text-[#06b6d4]" />
                Nouvelle destination
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Type', placeholder: 'Domicile, Bureau...', key: 'label', value: form.label },
                  { label: 'Adresse', placeholder: 'Numéro et rue', key: 'street', value: form.street },
                  { label: 'Code Postal', placeholder: 'Code postal', key: 'postal_code', value: form.postal_code },
                  { label: 'Ville', placeholder: 'Ville', key: 'city', value: form.city },
                ].map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label
                      className="text-[9px] uppercase tracking-widest text-[color:var(--color-text-muted)] px-1"
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                      {field.label}
                    </label>
                    <input
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--color-text)] focus:outline-none transition-all placeholder:text-[color:var(--color-text-muted)]"
                      style={{
                        background: 'color-mix(in srgb, var(--color-bg) 100%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#06b6d445'; }}
                      onBlur={(e) => { e.target.style.borderColor = ''; }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={handleAdd}
                  disabled={isSaving || !form.street || !form.city || !form.postal_code}
                  className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{ background: '#06b6d4' }}
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

      {/* ── Address cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[1.75rem] h-48 animate-pulse"
              style={{ background: 'color-mix(in srgb, var(--color-card) 85%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)' }}
            />
          ))}
        </div>
      ) : addresses.length === 0 && !showForm ? (
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
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, #06b6d410, transparent 70%)' }} />
            <Compass className="w-8 h-8 text-[color:var(--color-text-muted)]" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-[color:var(--color-text)]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Aucune adresse
            </p>
            <p className="text-sm text-[color:var(--color-text-muted)] max-w-xs mx-auto">
              Ajoutez votre première adresse pour faciliter vos futures commandes.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm text-white transition-all"
            style={{ background: '#06b6d4' }}
          >
            <Plus className="w-4 h-4" />
            Ajouter une adresse
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addresses.map((addr, i) => {
            const AddrIcon = getIcon(addr.label);
            return (
              <motion.div
                key={addr.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="group relative flex flex-col rounded-[1.75rem] p-6 transition-all duration-400"
                style={{
                  background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
                  border: addr.is_default
                    ? '1px solid #06b6d440'
                    : '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
                  boxShadow: addr.is_default ? '0 0 24px #06b6d412' : 'none',
                }}
              >
                {/* Top accent line for default */}
                {addr.is_default && (
                  <div className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full"
                    style={{ background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)' }} />
                )}

                {/* Top row */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300"
                      style={{
                        background: addr.is_default ? '#06b6d4' : 'color-mix(in srgb, var(--color-bg) 100%, transparent)',
                        border: `1px solid ${addr.is_default ? '#06b6d440' : 'color-mix(in srgb, var(--color-border) 100%, transparent)'}`,
                        color: addr.is_default ? 'white' : 'var(--color-text-muted)',
                      }}
                    >
                      <AddrIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[color:var(--color-text)]">{addr.label}</h4>
                      {addr.is_default && (
                        <span
                          className="flex items-center gap-1 text-[9px] uppercase tracking-widest"
                          style={{ fontFamily: "'DM Mono', monospace", color: '#06b6d4' }}
                        >
                          <Check className="w-2.5 h-2.5" />
                          Par défaut
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Address details */}
                <div className="flex-1 space-y-1.5 mb-4">
                  <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed">{addr.street}</p>
                  <p
                    className="text-[10px] text-[color:var(--color-text-muted)] uppercase tracking-widest"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {addr.postal_code} {addr.city}, {addr.country}
                  </p>
                </div>

                {/* Set default */}
                {!addr.is_default && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="w-full text-[9px] font-bold uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300 hover:text-[#06b6d4]"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      color: 'var(--color-text-muted)',
                      border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#06b6d425'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = ''; }}
                  >
                    Définir par défaut
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </AccountPageLayout>
  );
}
