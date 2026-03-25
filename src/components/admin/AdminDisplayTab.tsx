import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Monitor, Search, Check, X, ExternalLink, Save, Copy, Tv, Timer, Tag, QrCode, Zap,
  MessageSquare, Video, Star, ImageIcon, LayoutGrid, Rows3, Flame, CalendarClock, Megaphone,
  ChevronUp, ChevronDown, Settings2, Package, Wifi, AlertTriangle, Leaf, ShieldCheck, BookOpen, Plus,
  CloudSun, Sun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning,
  Layout, Palette, Layers, History, ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../lib/types';
import { useToastStore } from '../../store/toastStore';
import { useSettingsStore } from '../../store/settingsStore';
import ProductImageUpload from './ProductImageUpload';

interface FlashPromo {
  enabled: boolean;
  title: string;
  subtitle: string;
  original_price: number;
  promo_price: number;
  end_date: string;
  product_id: string;
}

interface CBDTip {
  id: string;
  enabled: boolean;
  title: string;
  content: string;
  icon: 'leaf' | 'zap' | 'shield' | 'star';
}

interface DisplayConfig {
  product_ids: string[];
  rotation_interval: number;
  show_price: boolean;
  show_qr: boolean;
  show_ticker: boolean;
  ticker_text: string;
  video_url: string;
  background_image_url: string;
  show_reviews: boolean;
  display_mode: 'single' | 'grid';
  grid_count: 2 | 3 | 4;
  flash_promo: FlashPromo;
  show_scarcity: boolean;
  scarcity_threshold: number;
  show_tips: boolean;
  tip_frequency: number;
  cbd_tips: CBDTip[];
  show_weather: boolean;
  weather_city: string;
  show_ads: boolean;
  ad_frequency: number;
}

const DEFAULT_FLASH_PROMO: FlashPromo = {
  enabled: false,
  title: '',
  subtitle: '',
  original_price: 0,
  promo_price: 0,
  end_date: '',
  product_id: '',
};

const DEFAULT_TIPS: CBDTip[] = [
  { id: 'dosage', enabled: true, title: 'Trouvez Votre Dosage', content: 'Commencez avec une faible dose et augmentez progressivement. La règle d\'or : commencer bas, aller lentement. Écoutez votre corps.', icon: 'leaf' },
  { id: 'sublingual', enabled: true, title: 'Huile Sublinguale', content: 'Déposez l\'huile sous la langue et maintenez 60 secondes avant d\'avaler. Absorption maximale, effets ressentis en 15 à 45 minutes.', icon: 'zap' },
  { id: 'quality', enabled: true, title: 'Qualité Certifiée', content: 'Tous nos produits sont testés par des laboratoires indépendants. Les certificats d\'analyse sont disponibles sur demande en boutique.', icon: 'shield' },
  { id: 'conservation', enabled: false, title: 'Conservation Optimale', content: 'Conservez vos fleurs CBD dans un endroit frais, sec et à l\'abri de la lumière pour préserver leurs arômes et propriétés actives.', icon: 'leaf' },
  { id: 'wellness', enabled: false, title: 'CBD & Bien-Être', content: 'Le CBD soutient l\'équilibre naturel du corps via le système endocannabinoïde. Des résultats optimaux apparaissent après 2 à 4 semaines.', icon: 'star' },
];

const DEFAULT_CONFIG: DisplayConfig = {
  product_ids: [],
  rotation_interval: 8,
  show_price: true,
  show_qr: true,
  show_ticker: false,
  ticker_text: 'Boutique CBD Premium  ·  Bien-Être Naturel  ·  Produits 100% naturels  ·  Livraison offerte dès 40€',
  video_url: '',
  background_image_url: '',
  show_reviews: true,
  display_mode: 'single',
  grid_count: 3,
  flash_promo: DEFAULT_FLASH_PROMO,
  show_scarcity: true,
  scarcity_threshold: 5,
  show_tips: false,
  tip_frequency: 3,
  cbd_tips: DEFAULT_TIPS,
  show_weather: true,
  weather_city: 'Paris',
  show_ads: true,
  ad_frequency: 4,
};

const ROTATION_OPTIONS = [5, 8, 12, 20, 30];
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=400';

interface Props { products: Product[] }

function Toggle({ on, onChange, color = 'green' }: { on: boolean; onChange: () => void; color?: 'green' | 'orange' }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-[22px] rounded-full transition-all duration-300 flex-shrink-0 ${on ? (color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500') : 'bg-zinc-800'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${on ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

function weatherIcon(code: number): { Icon: any; color: string } {
  if (code === 0) return { Icon: Sun, color: 'text-yellow-300' };
  if (code <= 2) return { Icon: CloudSun, color: 'text-yellow-200' };
  if (code === 3) return { Icon: Cloud, color: 'text-zinc-300' };
  if (code <= 48) return { Icon: CloudFog, color: 'text-zinc-400' };
  if (code <= 55) return { Icon: CloudDrizzle, color: 'text-sky-300' };
  if (code <= 65) return { Icon: CloudRain, color: 'text-sky-400' };
  if (code <= 77) return { Icon: CloudSnow, color: 'text-blue-200' };
  if (code <= 82) return { Icon: CloudRain, color: 'text-sky-400' };
  return { Icon: CloudLightning, color: 'text-yellow-400' };
}

function WeatherPreview({ city }: { city: string }) {
  const [data, setData] = useState<{ temp: number; code: number; name: string } | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = city.trim();
    if (q.length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        let res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=fr&format=json`);
        let json = await res.json();
        let loc = json.results?.[0];

        if (!loc && q.includes(' ')) {
          res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.replace(/\s+/g, '-'))}&count=1&language=fr&format=json`);
          json = await res.json();
          loc = json.results?.[0];
        }

        if (!loc) { setError(true); setLoading(false); return; }
        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`);
        const wx = await wxRes.json();
        if (!cancelled && wx.current_weather) {
          setData({ temp: Math.round(wx.current_weather.temperature), code: wx.current_weather.weathercode, name: loc.name });
        }
      } catch { setError(true); }
      finally { setLoading(false); }
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [city]);

  if (!city.trim() || city.length < 3) return null;

  return (
    <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-800/30 border border-zinc-700/30">
      {loading ? (
        <div className="w-4 h-4 rounded-full border border-zinc-500 border-t-white animate-spin" />
      ) : error ? (
        <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-bold">
          <AlertTriangle className="w-3 h-3" /> Ville non trouvée
        </div>
      ) : data ? (
        <>
          {(() => { const { Icon, color } = weatherIcon(data.code); return <Icon className={`w-4 h-4 ${color}`} />; })()}
          <span className="text-[11px] font-black text-white">{data.name} · {data.temp}°C</span>
        </>
      ) : null}
    </div>
  );
}

export default function AdminDisplayTab({ products }: Props) {
  const addToast = useToastStore((s) => s.addToast);
  const [config, setConfig] = useState<DisplayConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'promo' | 'tips' | 'ads'>('content');
  const [search, setSearch] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const displayUrl = `${window.location.origin}/afficheur`;

  useEffect(() => {
    async function load() {
      try {
        const { data: rows } = await supabase
          .from('store_settings').select('value').eq('key', 'store_display').limit(1);
        
        const storeName = useSettingsStore.getState().settings.store_name || 'Eco CBD';
        const defaultTicker = `${storeName} Premium  ·  Bien-Être Naturel  ·  Produits 100% naturels  ·  Livraison offerte dès 40€`;
        
        if (rows?.[0]?.value) {
          setConfig({ 
            ...DEFAULT_CONFIG, 
            ticker_text: defaultTicker,
            ...(rows[0].value as Partial<DisplayConfig>) 
          });
        } else {
          setConfig({ ...DEFAULT_CONFIG, ticker_text: defaultTicker });
        }
      } catch { /* use defaults */ } finally { setIsLoading(false); }
    }
    load();
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    products.forEach(p => { if (p.category?.name && !seen.has(p.category.name)) { seen.add(p.category.name); result.push(p.category.name); } });
    return result.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p =>
      p.is_active &&
      (!categoryFilter || p.category?.name === categoryFilter) &&
      (!q || p.name.toLowerCase().includes(q) || (p.category?.name ?? '').toLowerCase().includes(q))
    );
  }, [products, search, categoryFilter]);

  const selectedProducts = useMemo(
    () => config.product_ids.map(id => products.find(p => p.id === id)).filter((p): p is Product => !!p),
    [config.product_ids, products]
  );

  const flashStatus = useMemo<'disabled' | 'incomplete' | 'active' | 'expired'>(() => {
    const fp = config.flash_promo;
    if (!fp.enabled) return 'disabled';
    if (!fp.title || !fp.promo_price) return 'incomplete';
    if (fp.end_date && new Date(fp.end_date) < new Date()) return 'expired';
    return 'active';
  }, [config.flash_promo]);

  const toggleProduct = (id: string) => {
    setConfig(prev => {
      if (prev.product_ids.includes(id)) return { ...prev, product_ids: prev.product_ids.filter(x => x !== id) };
      if (prev.product_ids.length >= 12) { addToast({ message: 'Maximum 12 produits', type: 'error' }); return prev; }
      return { ...prev, product_ids: [...prev.product_ids, id] };
    });
  };

  const moveProduct = (id: string, dir: 'up' | 'down') => {
    setConfig(prev => {
      const idx = prev.product_ids.indexOf(id);
      if (idx === -1) return prev;
      const newIds = [...prev.product_ids];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= newIds.length) return prev;
      [newIds[idx], newIds[swap]] = [newIds[swap], newIds[idx]];
      return { ...prev, product_ids: newIds };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('store_settings')
        .upsert({ key: 'store_display', value: config, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      addToast({ message: 'Configuration sauvegardée', type: 'success' });
    } catch { addToast({ message: 'Erreur lors de la sauvegarde', type: 'error' }); }
    finally { setIsSaving(false); }
  };

  const handleCopyUrl = async () => {
    try { await navigator.clipboard.writeText(displayUrl); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000); }
    catch { addToast({ message: 'Impossible de copier', type: 'error' }); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  const fp = config.flash_promo;
  const discount = fp.original_price > 0 ? Math.round((1 - fp.promo_price / fp.original_price) * 100) : 0;
  const savings = fp.original_price - fp.promo_price;

  const tabs = [
    { id: 'content', label: 'Sélection', icon: Layers, desc: 'Gestion des produits' },
    { id: 'settings', label: 'Affichage', icon: Settings2, desc: 'Modes et vitesse' },
    { id: 'promo', label: 'Promo Flash', icon: Flame, desc: 'Offres limitées' },
    { id: 'tips', label: 'Conseils', icon: BookOpen, desc: 'Education CBD' },
    { id: 'ads', label: 'Annonces', icon: Megaphone, desc: 'Publicités régie' },
  ] as const;

  return (
    <div className="flex flex-col min-h-screen bg-[#030405] text-zinc-400 font-sans selection:bg-emerald-500/30">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 bg-[#030405]/80 backdrop-blur-xl border-b border-white/[0.03]">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-emerald-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all">
                <Tv className="w-6 h-6 text-black" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-black text-white tracking-tight">Display Studio</h1>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Connect</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 font-medium">Boutique : <span className="text-zinc-300">{useSettingsStore.getState().settings.store_name || 'Eco CBD'}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center bg-white/[0.03] border border-white/[0.05] rounded-2xl px-4 py-2.5 gap-3 group hover:border-white/10 transition-all">
              <Wifi className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              <code className="text-[11px] font-mono text-zinc-400 max-w-[200px] truncate">{displayUrl}</code>
              <button 
                onClick={handleCopyUrl}
                className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                title="Copier l'URL"
              >
                {urlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500 hover:text-white" />}
              </button>
            </div>
            
            <button
              onClick={() => window.open(displayUrl, '_blank')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95 group"
            >
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              Aperçu
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="relative group flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-black rounded-2xl text-sm font-black overflow-hidden active:scale-95 transition-all disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Save className="relative z-10 w-4 h-4" />
              <span className="relative z-10">{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- CONTENT AREA --- */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-10">
        
        {/* Main Tab Controller */}
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Navigation Side */}
          <nav className="lg:w-[320px] flex flex-col gap-8 shrink-0">
            <div className="space-y-2">
              <h2 className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.2em] px-4">Menu Studio</h2>
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-3xl transition-all group ${
                        isActive 
                          ? 'bg-emerald-500 text-black shadow-xl shadow-emerald-500/10' 
                          : 'hover:bg-white/[0.03] text-zinc-500 hover:text-white'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                        isActive ? 'bg-black/10' : 'bg-white/[0.03] border border-white/[0.05] group-hover:border-white/10'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-black">{tab.label}</div>
                        <div className={`text-[10px] font-bold opacity-60 ${isActive ? 'text-black' : 'text-zinc-600'}`}>{tab.desc}</div>
                      </div>
                      <ArrowRight className={`w-4 h-4 transition-transform ${isActive ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats / Info */}
            <div className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] rounded-[32px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500">Statut Diffusion</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded-md border border-emerald-500/20">ACTIF</span>
              </div>
              <div className="space-y-3">
                <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${(selectedProducts.length / 12) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-zinc-600">Capacité Catalogue</span>
                  <span className="text-white">{selectedProducts.length} / 12</span>
                </div>
              </div>
            </div>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="min-h-[600px]"
              >
                {activeTab === 'content' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Sélection TV</h2>
                        <p className="text-sm text-zinc-500 mt-1 font-medium">Glissez pour réorganiser, cliquez pour modifier</p>
                      </div>
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-black rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
                      >
                        <Plus className="w-5 h-5" />
                        Gérer le catalogue
                      </button>
                    </div>

                    {selectedProducts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                          {selectedProducts.map((p, idx) => (
                            <motion.div
                              key={p.id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="group relative bg-white/[0.02] border border-white/[0.06] rounded-[32px] overflow-hidden hover:border-emerald-500/30 transition-all"
                            >
                              <div className="aspect-[16/10] relative overflow-hidden">
                                <img src={p.image_url ?? FALLBACK_IMG} alt={p.name} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#030405] via-transparent to-transparent" />
                                
                                <div className="absolute top-4 left-4 flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-xs font-black text-white">
                                    {idx + 1}
                                  </div>
                                  <div className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                    {p.category?.name}
                                  </div>
                                </div>

                                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => moveProduct(p.id, 'up')} disabled={idx === 0} className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                                  <button onClick={() => moveProduct(p.id, 'down')} disabled={idx === selectedProducts.length - 1} className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                                  <button onClick={() => toggleProduct(p.id)} className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X className="w-4 h-4" /></button>
                                </div>
                              </div>
                              
                              <div className="p-6">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-black truncate">{p.name}</h3>
                                    <p className="text-sm text-zinc-500 font-bold mt-1">{p.price.toFixed(2)}€</p>
                                  </div>
                                  <div className={`w-3 h-3 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]'}`} />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-dashed border-white/10 rounded-[40px] text-center px-6">
                        <div className="w-20 h-20 rounded-3xl bg-white/[0.03] flex items-center justify-center mb-6">
                          <Package className="w-10 h-10 text-zinc-700" />
                        </div>
                        <h3 className="text-xl font-black text-white">Votre liste est vide</h3>
                        <p className="text-zinc-500 mt-2 max-w-sm font-medium">Commencez par ajouter des produits à mettre en avant sur votre écran de boutique.</p>
                        <button 
                          onClick={() => setIsModalOpen(true)}
                          className="mt-8 px-10 py-4 bg-emerald-500 text-black font-black rounded-2xl hover:shadow-2xl hover:shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          Parcourir le catalogue
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-10 max-w-2xl">
                    <header>
                      <h2 className="text-2xl font-black text-white tracking-tight">Configuration Visuelle</h2>
                      <p className="text-sm text-zinc-500 mt-1 font-medium">Affinement de l'expérience utilisateur et des cycles</p>
                    </header>

                    <div className="grid gap-8">
                      {/* Vitesse */}
                      <section className="bg-white/[0.02] border border-white/[0.06] rounded-[32px] p-8 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                            <Timer className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="font-black text-white">Cadence de rotation</h3>
                            <p className="text-xs text-zinc-500">Temps d'exposition de chaque élément</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ROTATION_OPTIONS.map(s => (
                            <button
                              key={s}
                              onClick={() => setConfig(c => ({ ...c, rotation_interval: s }))}
                              className={`flex-1 min-w-[80px] py-4 rounded-2xl text-xs font-black transition-all ${
                                config.rotation_interval === s 
                                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                                : 'bg-white/[0.03] text-zinc-500 hover:text-white hover:bg-white/[0.06]'
                              }`}
                            >
                              {s} secondes
                            </button>
                          ))}
                        </div>
                      </section>

                      {/* Mode Layout */}
                      <section className="bg-white/[0.02] border border-white/[0.06] rounded-[32px] p-8 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                            <Layout className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-black text-white">Structure d'affichage</h3>
                            <p className="text-xs text-zinc-500">Organisation spatiale des produits</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { id: 'single', label: 'Produit Unique', icon: Rows3, desc: 'Immersion totale' },
                            { id: 'grid', label: 'Grille Multiple', icon: LayoutGrid, desc: 'Vue d\'ensemble' },
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              onClick={() => setConfig(c => ({ ...c, display_mode: mode.id as any }))}
                              className={`p-6 rounded-[28px] text-left transition-all border ${
                                config.display_mode === mode.id 
                                ? 'bg-blue-500/5 border-blue-500 text-white' 
                                : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:border-white/20'
                              }`}
                            >
                              <mode.icon className={`w-8 h-8 mb-4 ${config.display_mode === mode.id ? 'text-blue-400' : 'text-zinc-700'}`} />
                              <div className="font-black text-sm">{mode.label}</div>
                              <div className="text-[10px] opacity-60 font-bold mt-1">{mode.desc}</div>
                            </button>
                          ))}
                        </div>
                        
                        {config.display_mode === 'grid' && (
                          <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between">
                            <span className="text-xs font-black text-zinc-500">Nombre de colonnes</span>
                            <div className="flex gap-2">
                              {[2, 3, 4].map(n => (
                                <button
                                  key={n}
                                  onClick={() => setConfig(c => ({ ...c, grid_count: n as any }))}
                                  className={`w-12 h-10 rounded-xl font-black text-xs transition-colors ${
                                    config.grid_count === n ? 'bg-blue-500 text-white' : 'bg-white/[0.03] text-zinc-600 hover:text-zinc-400'
                                  }`}
                                >
                                  ×{n}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>

                      {/* Composants UI */}
                      <section className="bg-white/[0.02] border border-white/[0.06] rounded-[32px] p-8 space-y-4">
                        <h3 className="text-[11px] font-black text-zinc-600 uppercase tracking-widest mb-2">Composants d'interface</h3>
                        {[
                          { key: 'show_price', label: 'Affichage des prix', icon: Tag },
                          { key: 'show_qr', label: 'QR Code Catalogue', icon: QrCode },
                          { key: 'show_reviews', label: 'Avis Clients', icon: Star },
                          { key: 'show_ticker', label: 'Bandeau Info', icon: MessageSquare },
                        ].map(({ key, label, icon: Icon }) => (
                          <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config[key as keyof DisplayConfig] ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800/50 text-zinc-600'}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-bold text-zinc-300">{label}</span>
                            </div>
                            <Toggle on={config[key as keyof DisplayConfig] as boolean} onChange={() => setConfig(c => ({ ...c, [key]: !c[key as keyof DisplayConfig] }))} />
                          </div>
                        ))}
                      </section>

                      {/* Météo & City */}
                      <section className="bg-white/[0.02] border border-white/[0.06] rounded-[32px] p-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${config.show_weather ? 'bg-sky-500/10 text-sky-400' : 'bg-zinc-800/50 text-zinc-600'}`}>
                              <CloudSun className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-black text-white">Widget Météo</h3>
                              <p className="text-xs text-zinc-500">Informations locales en temps réel</p>
                            </div>
                          </div>
                          <Toggle on={config.show_weather} onChange={() => setConfig(c => ({ ...c, show_weather: !c.show_weather }))} />
                        </div>
                        {config.show_weather && (
                          <div className="space-y-4 pt-4 border-t border-white/[0.05]">
                            <label className="text-[10px] font-black text-zinc-600 uppercase">Ville de référence</label>
                            <input
                              type="text"
                              value={config.weather_city}
                              onChange={(e) => setConfig(c => ({ ...c, weather_city: e.target.value }))}
                              placeholder="Entrez une ville..."
                              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all font-medium"
                            />
                            <WeatherPreview city={config.weather_city} />
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                )}

                {activeTab === 'promo' && (
                  <div className="max-w-2xl space-y-10">
                    <header>
                      <h2 className="text-2xl font-black text-white tracking-tight">Focus Promotionnel</h2>
                      <p className="text-sm text-zinc-500 mt-1 font-medium">Capturez l'attention avec des offres flash percutantes</p>
                    </header>

                    <div className="bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/20 rounded-[40px] p-10 space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all ${config.flash_promo.enabled ? 'bg-orange-500 text-black shadow-2xl shadow-orange-500/40 scale-110' : 'bg-zinc-800 text-zinc-600'}`}>
                            <Flame className="w-8 h-8" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-white">Offre Flash TV</h3>
                            <p className="text-sm text-zinc-500">Mise en avant prioritaire plein écran</p>
                          </div>
                        </div>
                        <Toggle on={config.flash_promo.enabled} onChange={() => setConfig(c => ({ ...c, flash_promo: { ...c.flash_promo, enabled: !c.flash_promo.enabled } }))} color="orange" />
                      </div>

                      <div className="grid gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Appel à l'action / Titre</label>
                          <input
                            type="text"
                            value={config.flash_promo.title}
                            onChange={(e) => setConfig(c => ({ ...c, flash_promo: { ...c.flash_promo, title: e.target.value } }))}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-orange-500/50 transition-all"
                            placeholder="Ex: -50% SUR TOUTES LES FLEURS"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Prix Initial (€)</label>
                            <input
                              type="number"
                              value={config.flash_promo.original_price || ''}
                              onChange={(e) => setConfig(c => ({ ...c, flash_promo: { ...c.flash_promo, original_price: parseFloat(e.target.value) || 0 } }))}
                              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-orange-500/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Prix Promo (€)</label>
                            <input
                              type="number"
                              value={config.flash_promo.promo_price || ''}
                              onChange={(e) => setConfig(c => ({ ...c, flash_promo: { ...c.flash_promo, promo_price: parseFloat(e.target.value) || 0 } }))}
                              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-orange-500/50"
                            />
                          </div>
                        </div>

                        {discount > 0 && (
                          <div className="flex items-center gap-4 p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20">
                            <Zap className="w-8 h-8 text-emerald-400" />
                            <div className="flex-1">
                              <p className="text-[10px] text-zinc-500 font-black uppercase">Économies calculées</p>
                              <p className="text-xl font-black text-emerald-400">-{discount}% <span className="text-sm font-bold opacity-60 ml-2">({savings.toFixed(2)}€ de remise)</span></p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'tips' && (
                  <div className="max-w-4xl space-y-10">
                    <header>
                      <h2 className="text-2xl font-black text-white tracking-tight">Conseils & Éducation</h2>
                      <p className="text-sm text-zinc-500 mt-1 font-medium">Enrichissez l'expérience client avec du contenu instructif</p>
                    </header>

                    <div className="grid lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <section className="bg-white/[0.02] border border-white/[0.06] rounded-[32px] p-8 space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${config.show_tips ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800/50 text-zinc-600'}`}>
                                <BookOpen className="w-6 h-6" />
                              </div>
                              <h3 className="font-black text-white">Diffuser les conseils</h3>
                            </div>
                            <Toggle on={config.show_tips} onChange={() => setConfig(c => ({ ...c, show_tips: !c.show_tips }))} />
                          </div>
                          
                          {config.show_tips && (
                            <div className="space-y-4 pt-4 border-t border-white/[0.05]">
                              <label className="text-[10px] font-black text-zinc-600 uppercase">Fréquence d'insertion</label>
                              <div className="grid grid-cols-4 gap-2">
                                {[2,3,4,5].map(n => (
                                  <button
                                    key={n}
                                    onClick={() => setConfig(c => ({ ...c, tip_frequency: n }))}
                                    className={`py-3 rounded-xl text-xs font-black transition-all ${config.tip_frequency === n ? 'bg-emerald-500 text-black' : 'bg-white/[0.03] text-zinc-500'}`}
                                  >
                                    1 / {n}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </section>
                        
                        {/* Summary Card */}
                        <div className="bg-white/[0.01] border border-white/[0.03] rounded-[32px] p-8">
                          <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Bibliothéque Active</h4>
                          <div className="space-y-4">
                            {(config.cbd_tips ?? DEFAULT_TIPS).filter(t => t.enabled).map(t => (
                              <div key={t.id} className="flex items-center gap-3">
                                <Check className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold text-zinc-400">{t.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {(config.cbd_tips ?? DEFAULT_TIPS).map((tip, idx) => {
                          const Icon = tip.icon === 'zap' ? Zap : tip.icon === 'shield' ? ShieldCheck : tip.icon === 'star' ? Star : Leaf;
                          return (
                            <button
                              key={tip.id}
                              onClick={() => setConfig(c => ({
                                ...c,
                                cbd_tips: (c.cbd_tips ?? DEFAULT_TIPS).map((t, i) => i === idx ? { ...t, enabled: !t.enabled } : t)
                              }))}
                              className={`w-full flex items-start gap-4 p-6 rounded-[28px] text-left transition-all border ${
                                tip.enabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.01] border-white/5 opacity-40 grayscale'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tip.enabled ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-black text-white text-sm">{tip.title}</h4>
                                <p className="text-[10px] font-medium text-zinc-500 mt-1 leading-relaxed">{tip.content}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ads' && (
                  <div className="max-w-2xl space-y-10">
                    <header>
                      <h2 className="text-2xl font-black text-white tracking-tight">Espaces Publicitaires</h2>
                      <p className="text-sm text-zinc-500 mt-1 font-medium">Optimisez vos revenus et partenariats</p>
                    </header>
                    
                    <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/20 rounded-[40px] p-10 space-y-8">
                       <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all ${config.show_ads ? 'bg-amber-400 text-black shadow-2xl shadow-amber-500/40 scale-110' : 'bg-zinc-800 text-zinc-600'}`}>
                            <Megaphone className="w-8 h-8" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-white">Régie Pub Interne</h3>
                            <p className="text-sm text-zinc-500">Insertion d'annonces catalogue</p>
                          </div>
                        </div>
                        <Toggle on={config.show_ads} onChange={() => setConfig(c => ({ ...c, show_ads: !c.show_ads }))} color="orange" />
                      </div>

                      {config.show_ads && (
                        <div className="space-y-8 pt-8 border-t border-white/5">
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Densité d'affichage</label>
                            <div className="grid grid-cols-4 gap-2">
                              {[2, 4, 6, 8].map(f => (
                                <button
                                  key={f}
                                  onClick={() => setConfig(c => ({ ...c, ad_frequency: f }))}
                                  className={`py-4 rounded-2xl text-xs font-black transition-all ${config.ad_frequency === f ? 'bg-amber-400 text-black' : 'bg-white/[0.03] text-zinc-500'}`}
                                >
                                  T{f}
                                </button>
                              ))}
                            </div>
                            <p className="text-[10px] font-bold text-zinc-600 italic">Une annonce sera intercalée tous les {config.ad_frequency} éléments catalogue.</p>
                          </div>

                          <div className="grid gap-4">
                            {[
                              { label: 'Visuels optimisés 4K', status: true },
                              { label: 'Interactivité QR native', status: true },
                              { label: 'Priorité boutique physique', status: true },
                            ].map((item, i) => (
                              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/[0.03]">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-emerald-500" />
                                </div>
                                <span className="text-xs font-bold text-zinc-400">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* --- MODAL SELECTOR --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-6xl max-h-[85vh] bg-[#0A0B0C] border border-white/10 rounded-[48px] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              <div className="px-10 py-8 border-b border-white/[0.03] flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Catalogue Master</h2>
                  <p className="text-sm text-zinc-500 font-medium">{config.product_ids.length} / 12 slots occupés</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-14 h-14 rounded-full bg-white/[0.03] hover:bg-white/10 flex items-center justify-center transition-all"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col p-10 gap-8">
                <div className="flex flex-wrap lg:flex-nowrap gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Filtrer par nom ou variété..."
                      className="w-full bg-white/[0.03] border border-white/10 rounded-[24px] pl-16 pr-8 py-5 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                    />
                  </div>
                  <div className="flex gap-2 p-1.5 bg-white/[0.03] rounded-[24px] border border-white/5 overflow-x-auto no-scrollbar">
                    <button onClick={() => setCategoryFilter('')} className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${!categoryFilter ? 'bg-white text-black' : 'hover:bg-white/5 text-zinc-500'}`}>Tous</button>
                    {categories.map(c => (
                      <button key={c} onClick={() => setCategoryFilter(f => f === c ? '' : c)} className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${categoryFilter === c ? 'bg-emerald-500 text-black' : 'hover:bg-white/5 text-zinc-500'}`}>{c}</button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {filteredProducts.map(p => {
                      const selected = config.product_ids.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleProduct(p.id)}
                          className={`group relative aspect-[3/4] rounded-[32px] overflow-hidden transition-all duration-500 ${selected ? 'ring-4 ring-emerald-500 ring-offset-4 ring-offset-black scale-95' : 'hover:scale-[1.02]'}`}
                        >
                          <img src={p.image_url ?? FALLBACK_IMG} className={`w-full h-full object-cover transition-all duration-700 ${selected ? 'brightness-[0.3] scale-110' : 'group-hover:brightness-110'}`} />
                          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/40 to-transparent">
                            <p className="text-[10px] font-black text-white truncate text-left">{p.name}</p>
                            <p className="text-[9px] font-black text-emerald-400 mt-0.5 text-left">{p.price.toFixed(2)}€</p>
                          </div>
                          {selected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl">
                                <Check className="w-6 h-6 text-black" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
