import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Megaphone, Plus, X, Save, RefreshCw, Check,
  Eye, EyeOff, Trash2, Edit3, ExternalLink,
  Image as ImageIcon, Upload, Sparkles, Tag,
  GripVertical, ToggleLeft, ToggleRight, Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Ad } from '../AdCard';
import { useToastStore } from '../../store/toastStore';

const INPUT =
  'w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 focus:bg-white/[0.05] transition-all';
const LABEL = 'block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1';

const BADGE_COLORS: { id: Ad['badge_color']; label: string; style: string }[] = [
  { id: 'neon', label: 'Neon', style: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { id: 'amber', label: 'Ambre', style: 'bg-amber-400/20 text-amber-400 border-amber-400/40' },
  { id: 'purple', label: 'Violet', style: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  { id: 'pink', label: 'Rose', style: 'bg-pink-500/20 text-pink-400 border-pink-500/40' },
  { id: 'blue', label: 'Bleu', style: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
];

const EMPTY_AD: Omit<Ad, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  tagline: '',
  description: '',
  image_url: '',
  cta_label: 'Voir l\'offre',
  cta_url: '',
  badge_text: '',
  badge_color: 'amber',
  target_categories: [],
  target_tags: [],
  is_active: true,
  position: 0,
};

// Posistion dans la grille toutes les N cartes produits
const POSITION_OPTIONS = [
  { value: 4, label: 'Toutes les 4 cartes' },
  { value: 8, label: 'Toutes les 8 cartes' },
  { value: 12, label: 'Toutes les 12 cartes' },
  { value: 0, label: 'Position fixe (index)' },
];

export default function AdminAdsTab() {
  const { addToast } = useToastStore();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAd, setEditingAd] = useState<Partial<Ad> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchAds = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('catalog_ads')
      .select('*')
      .order('position', { ascending: true });
    if (!error && data) setAds(data as Ad[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleSave = async () => {
    if (!editingAd) return;
    setIsSaving(true);
    try {
      if (editingAd.id) {
        const { error } = await supabase
          .from('catalog_ads')
          .update({ ...editingAd, updated_at: new Date().toISOString() })
          .eq('id', editingAd.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('catalog_ads')
          .insert({ ...editingAd, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setEditingAd(null);
      setIsCreating(false);
      await fetchAds();
    } catch (err) {
      console.error('Error saving ad:', err);
      addToast({ type: 'error', message: 'Erreur lors de la sauvegarde.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await supabase.from('catalog_ads').delete().eq('id', id);
    await fetchAds();
  };

  const handleToggleActive = async (ad: Ad) => {
    await supabase
      .from('catalog_ads')
      .update({ is_active: !ad.is_active })
      .eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, is_active: !a.is_active } : a));
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `ad-${Math.random()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(`ads/${fileName}`, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(`ads/${fileName}`);
      setEditingAd(prev => prev ? { ...prev, image_url: publicUrl } : prev);
    } catch (err) {
      console.error('Upload error:', err);
      addToast({ type: 'error', message: "Erreur lors de l'upload." });
    } finally {
      setIsUploading(false);
    }
  };

  const startCreate = () => {
    setEditingAd({ ...EMPTY_AD });
    setIsCreating(true);
  };

  const hasActiveAds = ads.some(a => a.is_active);

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2.5rem]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Publicité ciblée</p>
          <div className="flex items-center gap-3">
            <Megaphone className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Annonces Catalogue</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Insérez des cartes sponsorisées directement dans la grille produits — même design que les ProductCards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasActiveAds && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                {ads.filter(a => a.is_active).length} actives
              </span>
            </div>
          )}
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 text-black font-black text-xs uppercase tracking-widest hover:bg-white transition-all hover:scale-105 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
          >
            <Plus className="w-4 h-4" />
            Nouvelle annonce
          </button>
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-400/5 border border-amber-400/15">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-400 leading-relaxed">
          Les annonces s'affichent dans la grille du catalogue avec le même design que les cartes produits.
          Elles sont clairement identifiées par un badge <span className="text-amber-400 font-bold">Sponsorisé</span>.
          Vous pouvez les cibler par catégorie ou tags, et contrôler leur position dans la grille.
        </p>
      </div>

      {/* ── Create / Edit Form ── */}
      <AnimatePresence>
        {editingAd && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/[0.02] border border-amber-400/20 rounded-[2.5rem] p-8 lg:p-10 space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/10 flex items-center justify-center">
                  {isCreating ? <Plus className="w-5 h-5 text-amber-400" /> : <Edit3 className="w-5 h-5 text-amber-400" />}
                </div>
                <h3 className="text-lg font-black text-white">
                  {isCreating ? 'Créer une annonce' : 'Modifier l\'annonce'}
                </h3>
              </div>
              <button
                onClick={() => { setEditingAd(null); setIsCreating(false); }}
                className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left col */}
              <div className="space-y-6">
                <div>
                  <label className={LABEL}>Titre de l'annonce *</label>
                  <input
                    value={editingAd.title || ''}
                    onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })}
                    className={`${INPUT} text-base font-bold`}
                    placeholder="Ex : Soldes Printemps – -20% sur les Fleurs !"
                  />
                </div>

                <div>
                  <label className={LABEL}>Accroche (tagline)</label>
                  <input
                    value={editingAd.tagline || ''}
                    onChange={(e) => setEditingAd({ ...editingAd, tagline: e.target.value })}
                    className={INPUT}
                    placeholder="Ex : Offre valable jusqu'au 31 mars"
                  />
                </div>

                <div>
                  <label className={LABEL}>Description courte</label>
                  <input
                    value={editingAd.description || ''}
                    onChange={(e) => setEditingAd({ ...editingAd, description: e.target.value })}
                    className={INPUT}
                    placeholder="Ex : Conditions d'application..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Texte du bouton CTA</label>
                    <input
                      value={editingAd.cta_label || ''}
                      onChange={(e) => setEditingAd({ ...editingAd, cta_label: e.target.value })}
                      className={INPUT}
                      placeholder="Voir l'offre"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>URL de destination *</label>
                    <input
                      value={editingAd.cta_url || ''}
                      onChange={(e) => setEditingAd({ ...editingAd, cta_url: e.target.value })}
                      className={INPUT}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Badge texte</label>
                    <input
                      value={editingAd.badge_text || ''}
                      onChange={(e) => setEditingAd({ ...editingAd, badge_text: e.target.value })}
                      className={INPUT}
                      placeholder="Ex : Promo, Nouveau..."
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Couleur badge</label>
                    <div className="flex gap-2 flex-wrap pt-1">
                      {BADGE_COLORS.map(bc => (
                        <button
                          key={bc.id}
                          type="button"
                          onClick={() => setEditingAd({ ...editingAd, badge_color: bc.id })}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black border uppercase tracking-widest transition-all ${editingAd.badge_color === bc.id ? bc.style + ' scale-110 shadow-lg' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'}`}
                        >
                          {bc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Position dans la grille</label>
                  <select
                    value={editingAd.position ?? 4}
                    onChange={(e) => setEditingAd({ ...editingAd, position: Number(e.target.value) })}
                    className={`${INPUT} cursor-pointer`}
                  >
                    {POSITION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 20].map(n => (
                      <option key={`idx-${n}`} value={n}>Index fixe : position {n}</option>
                    ))}
                  </select>
                  <p className="text-[9px] text-zinc-600 mt-1 ml-1">
                    Saisissez l'index (0=début) ou choisissez une fréquence d'affichage.
                  </p>
                </div>

                <div>
                  <label className={LABEL}>Ciblage par tags (séparés par virgule)</label>
                  <input
                    value={(editingAd.target_tags || []).join(', ')}
                    onChange={(e) => setEditingAd({
                      ...editingAd,
                      target_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                    className={INPUT}
                    placeholder="Ex : fleurs, CBD, relaxant"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                  <div>
                    <p className="text-sm font-bold text-white">Annonce active</p>
                    <p className="text-xs text-zinc-500">Afficher dans le catalogue</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingAd({ ...editingAd, is_active: !editingAd.is_active })}
                    className={`transition-all duration-300 ${editingAd.is_active ? 'text-emerald-400' : 'text-zinc-600'}`}
                  >
                    {editingAd.is_active
                      ? <ToggleRight className="w-9 h-9" />
                      : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>
              </div>

              {/* Right col — Image */}
              <div className="space-y-4">
                <label className={LABEL}>Image de l'annonce</label>
                <div className="relative group aspect-square bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-3xl overflow-hidden flex items-center justify-center transition-all hover:border-amber-400/40">
                  {editingAd.image_url ? (
                    <>
                      <img
                        src={editingAd.image_url}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => document.getElementById('ad-img-upload')?.click()}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold transition-all"
                        >
                          <Upload className="w-4 h-4" /> Changer
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAd({ ...editingAd, image_url: '' })}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500 rounded-xl text-red-400 hover:text-white text-xs font-bold transition-all"
                        >
                          <X className="w-4 h-4" /> Supprimer
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => document.getElementById('ad-img-upload')?.click()}
                      className="flex flex-col items-center gap-4 text-zinc-600 hover:text-amber-400 transition-colors"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-10 h-10 animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Upload...</span>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-amber-400/10 transition-all">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Choisir une image</span>
                          <span className="text-[9px] text-zinc-700">ou saisir une URL ci-dessous</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    id="ad-img-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await handleImageUpload(file);
                    }}
                  />
                </div>
                <input
                  value={editingAd.image_url || ''}
                  onChange={(e) => setEditingAd({ ...editingAd, image_url: e.target.value })}
                  className={`${INPUT} text-xs`}
                  placeholder="https://... (URL externe)"
                />

                {/* Preview */}
                {(editingAd.title || editingAd.tagline) && (
                  <div className="mt-4 p-4 rounded-2xl bg-amber-400/5 border border-amber-400/15">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-1.5">
                      <Eye className="w-3 h-3" /> Aperçu carte
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white line-clamp-1">{editingAd.title}</p>
                      {editingAd.tagline && <p className="text-xs text-zinc-400 line-clamp-2">{editingAd.tagline}</p>}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold">Sponsorisé</span>
                        {editingAd.badge_text && (
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${BADGE_COLORS.find(b => b.id === editingAd.badge_color)?.style}`}>
                            {editingAd.badge_text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end gap-4 pt-4 border-t border-white/[0.05]">
              <button
                onClick={() => { setEditingAd(null); setIsCreating(false); }}
                className="px-6 py-3 rounded-2xl border border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editingAd.title || !editingAd.cta_url}
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 ${saveSuccess
                  ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-amber-400 text-black hover:bg-white hover:scale-105 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                  }`}
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Sauvegarde...' : saveSuccess ? 'Enregistré !' : 'Sauvegarder l\'annonce'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ads List ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 gap-5 text-center">
          <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center">
            <Megaphone className="w-9 h-9 text-zinc-700" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-semibold text-white">Aucune annonce</h3>
            <p className="text-zinc-500 text-sm mt-1">Créez votre première annonce publicitaire pour le catalogue.</p>
          </div>
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 text-black font-bold text-sm hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4" /> Créer une annonce
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => (
            <motion.div
              key={ad.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-5 p-5 rounded-2xl border transition-all ${ad.is_active
                ? 'bg-amber-400/[0.03] border-amber-400/15 hover:border-amber-400/30'
                : 'bg-white/[0.01] border-white/[0.05] opacity-60'
                }`}
            >
              {/* Drag handle (visual only) */}
              <GripVertical className="w-4 h-4 text-zinc-700 flex-shrink-0" />

              {/* Image preview */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 flex-shrink-0">
                {ad.image_url
                  ? <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Tag className="w-6 h-6 text-zinc-700" /></div>}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-white text-sm truncate">{ad.title}</p>
                  {ad.badge_text && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold flex-shrink-0 ${BADGE_COLORS.find(b => b.id === ad.badge_color)?.style || ''}`}>
                      {ad.badge_text}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate">{ad.tagline}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                    Position : {ad.position === 0 ? 'début' : `#${ad.position}`}
                  </span>
                  {ad.cta_url && (
                    <a
                      href={ad.cta_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-amber-400 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      {ad.cta_url.slice(0, 40)}{ad.cta_url.length > 40 ? '...' : ''}
                    </a>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex-shrink-0 ${ad.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${ad.is_active ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                {ad.is_active ? 'Actif' : 'Inactif'}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggleActive(ad)}
                  title={ad.is_active ? 'Désactiver' : 'Activer'}
                  className={`p-2 rounded-xl transition-all ${ad.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-zinc-600 hover:text-white hover:bg-white/5'}`}
                >
                  {ad.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setEditingAd({ ...ad }); setIsCreating(false); }}
                  className="p-2 rounded-xl text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(ad.id)}
                  className="p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}


    </div>
  );
}
