import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Mail,
  Save,
  Sparkles,
  Phone,
  BrainCircuit,
  Target,
  Zap,
  Waves,
  Coins,
  Cake,
  Flame,
  Leaf,
  ChevronDown,
  SlidersHorizontal,
  LockKeyhole,
  Lock as LockIcon,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  LogOut,
  Settings,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Fingerprint,
  Key,
  ShieldCheck,
  SmartphoneNfc,
  Cpu,
  Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, getDeviceId } from '../store/authStore';
import { useBudTenderMemory, SavedPrefs } from '../hooks/useBudTenderMemory';
import { TECH_ADVISOR_DEFAULT_QUIZ, QuizStep, fetchBudTenderSettings } from '../lib/budtenderSettings';
import { useSettingsStore } from '../store/settingsStore';
import AccountPageLayout from '../components/AccountPageLayout';

type TabType = 'identity' | 'security' | 'ai';

export default function Profile() {
  const { user, profile, setProfile } = useAuthStore();
  const { savedPrefs, savePrefs, clearPrefs, isLoading: isPrefsLoading } = useBudTenderMemory();
  const settings = useSettingsStore((s) => s.settings);
  const budtenderName = settings.budtender_name || 'BudTender';

  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'identity';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Sync tab with URL if it changes
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && (tab === 'identity' || tab === 'security' || tab === 'ai')) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [sessions, setSessions] = useState<Array<{ id: string; device_id: string; device_name: string | null; user_agent: string | null; last_seen: string }>>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const [quizSteps, setQuizSteps] = useState<QuizStep[]>(TECH_ADVISOR_DEFAULT_QUIZ);
  const [prefs, setPrefs] = useState<SavedPrefs>({});

  useEffect(() => {
    const loadSteps = async () => {
      try {
        const btSettings = await fetchBudTenderSettings();
        let steps = [...TECH_ADVISOR_DEFAULT_QUIZ];
        if (btSettings.quiz_steps?.length) {
          steps = steps.map(def => btSettings.quiz_steps.find(s => s.id === def.id) || def);
          btSettings.quiz_steps.forEach(cs => {
            if (!steps.find(s => s.id === cs.id)) steps.push(cs);
          });
        }
        setQuizSteps(steps);
      } catch (err) {
        console.error('Quiz load error:', err);
      }
    };
    loadSteps();
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setBirthday(profile.birthday || '');
    }
  }, [profile]);

  useEffect(() => {
    if (savedPrefs && Object.keys(savedPrefs).length > 0) {
      if (import.meta.env.DEV) console.info('[Profile] Hydrating prefs from memory:', savedPrefs);
      setPrefs(p => ({ ...p, ...savedPrefs }));
    }
  }, [savedPrefs]);

  useEffect(() => {
    if (user?.id) loadSessions();
  }, [user?.id]);

  const loadSessions = async () => {
    if (!user) return;
    setIsSessionsLoading(true);
    try {
      const { data } = await supabase
        .from('user_active_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen', { ascending: false });
      setSessions((data || []) as any);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSessionsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const passChange = Boolean(currentPassword || newPassword || confirmNewPassword);
      if (passChange) {
        if (!currentPassword || !newPassword || !confirmNewPassword) throw new Error('Veuillez remplir tous les champs mot de passe.');
        if (newPassword.length < 8) throw new Error('8 caractères minimum requis.');
        if (newPassword !== confirmNewPassword) throw new Error('Les mots de passe ne correspondent pas.');

        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: currentPassword,
        });
        if (reauthError) throw new Error('Ancien mot de passe incorrect.');

        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
        if (passwordError) throw passwordError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone, birthday: birthday || null })
        .eq('id', user.id);
      if (profileError) throw profileError;

      await savePrefs(prefs as any);
      setProfile({ ...profile!, full_name: fullName, phone: phone, birthday: birthday || null });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPrefs = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser toutes vos préférences IA BudTender ? Toute sa mémoire sur vous sera effacée.")) {
      setIsSaving(true);
      try {
        await clearPrefs();
        setPrefs({});
        setMessage({ type: 'success', text: 'Préférences réinitialisées.' });
        setTimeout(() => setMessage(null), 5000);
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const updatePref = (key: string, value: string) => {
    if (key === 'priority_features' || Array.isArray(prefs[key as keyof SavedPrefs])) {
      const current = (prefs[key as keyof SavedPrefs] || []) as string[];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      setPrefs(p => ({ ...p, [key]: updated }));
    } else {
      setPrefs(p => ({ ...p, [key]: value }));
    }
  };

  const isPrefSelected = (key: string, value: any) => {
    const val = prefs[key as keyof SavedPrefs];
    return Array.isArray(val) ? val.includes(value) : val === value;
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Instantané";
    if (min < 60) return `${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}j`;
  };

  const handleRevokeSession = async (sid: string) => {
    try {
      await supabase.from('user_active_sessions').delete().eq('id', sid);
      setSessions(s => s.filter(x => x.id !== sid));
    } catch (err) { console.error(err); }
  };

  const saveButton = (
    <button
      onClick={handleSave}
      disabled={isSaving}
      className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 disabled:opacity-50"
      style={{
        background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
        border: '1px solid #3b82f628',
        color: 'var(--color-text)',
      }}
    >
      {isSaving ? <Cpu className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      Sauvegarder
    </button>
  );

  return (
    <AccountPageLayout
      seoTitle={`Mon Profil — ${settings.store_name}`}
      seoDescription="Paramètres exclusifs et préférences IA."
      icon={Settings}
      iconColor="#3b82f6"
      title="Paramètres"
      subtitle={`${profile?.full_name || 'Membre'} · ID #${user?.id.slice(0, 6).toUpperCase()}`}
      headerActions={saveButton}
      footerText={`${settings.store_name} Elite Protection — AES-256 Enabled`}
    >
      <div className="space-y-8">
        {/* ── Navigation Tabs ────────────────────────── */}
            <div className="flex items-center gap-2 bg-[color:var(--color-card-muted)] backdrop-blur-sm p-1.5 rounded-[1.75rem] border border-[color:var(--color-border)] w-fit shadow-sm">
              {[
                { id: 'identity', label: 'Identité', icon: Fingerprint },
                { id: 'security', label: 'Sécurité', icon: Key },
                { id: 'ai', label: 'Profil IA', icon: BrainCircuit },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 relative ${activeTab === tab.id ? 'text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]'
                    }`}
                >
                  {activeTab === tab.id && (
                    <motion.div layoutId="activeTab" className="absolute inset-0 bg-[color:var(--color-card)] rounded-2xl shadow-lg shadow-zinc-900/10" />
                  )}
                  <tab.icon className={`relative z-10 w-4 h-4 ${activeTab === tab.id ? 'stroke-[3px]' : ''}`} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* ── Content Panes ───────────────────────────── */}
            <div className="min-h-[500px]">
              <AnimatePresence mode="wait">
                {activeTab === 'identity' && (
                  <motion.div
                    key="identity"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] flex items-center gap-2">
                          <User className="w-3.5 h-3.5" /> Détails Personnels
                        </h3>
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-[color:var(--color-text-muted)] uppercase tracking-widest px-2">Nom Complet</p>
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-2xl px-5 py-4 text-sm text-[color:var(--color-text)] focus:border-green-neon focus:bg-[color:var(--color-card)]/80 transition-all outline-none"
                              placeholder="Jean Dupont"
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-[color:var(--color-text-muted)] uppercase tracking-widest px-2">Téléphone</p>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-2xl px-5 py-4 text-sm text-[color:var(--color-text)] focus:border-green-neon focus:bg-[color:var(--color-card)]/80 transition-all outline-none"
                              placeholder="+33 X XX XX XX XX"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-2">
                              <p className="text-[9px] font-black text-[color:var(--color-text-muted)] uppercase tracking-widest">Date de naissance</p>
                              {profile?.birthday && <LockIcon className="w-3 h-3 text-[color:var(--color-text-muted)]" />}
                            </div>
                            <input
                              type="date"
                              value={birthday}
                              onChange={(e) => setBirthday(e.target.value)}
                              disabled={!!profile?.birthday}
                              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-2xl px-5 py-4 text-sm text-[color:var(--color-text)] focus:border-green-neon focus:bg-[color:var(--color-card)]/80 transition-all [color-scheme:light] disabled:opacity-40 outline-none"
                            />
                            {profile?.birthday && <p className="text-[8px] text-[color:var(--color-text-muted)] uppercase font-black italic px-2">Certifié et non modifiable.</p>}
                          </div>
                        </div>
                      </div>

                      <div className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" /> Compte & Accès
                        </h3>
                        <div className="p-6 bg-[color:var(--color-bg)] rounded-3xl border border-[color:var(--color-border)] flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] shadow-sm flex items-center justify-center text-[color:var(--color-text-muted)]">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[color:var(--color-text-muted)] uppercase tracking-widest leading-none mb-1.5">Email Principal</p>
                            <p className="text-sm font-mono text-[color:var(--color-text)]">{user?.email}</p>
                          </div>
                        </div>
                        <div className="p-6 bg-[color:var(--color-primary)]/10 rounded-3xl border border-[color:var(--color-primary)]/20 space-y-3 shadow-sm shadow-green-neon/5">
                          <p className="text-[10px] font-black text-[color:var(--color-primary)] uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" /> Statut Elite
                          </p>
                          <p className="text-xs text-[color:var(--color-text)] leading-relaxed font-black uppercase tracking-tight">
                            Votre profil est entièrement synchronisé avec le système Master de {settings.store_name}. Vos données sont protégées par un chiffrement AES-256.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-[2.5rem] p-8 md:p-10 space-y-8 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 shadow-sm">
                          <LockKeyhole className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-[color:var(--color-text)]">Modification Sécurisée</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                          { label: 'Ancien Mot de Passe', val: currentPassword, set: setCurrentPassword, show: showCurrentPassword, setShow: setShowCurrentPassword },
                          { label: 'Nouveau', val: newPassword, set: setNewPassword, show: showNewPassword, setShow: setShowNewPassword },
                          { label: 'Confirmer', val: confirmNewPassword, set: setConfirmNewPassword, show: showConfirmNewPassword, setShow: setShowConfirmNewPassword },
                        ].map((f, i) => (
                          <div key={i} className="space-y-2">
                            <p className="text-[9px] font-black text-[color:var(--color-text-muted)] uppercase tracking-widest px-2">{f.label}</p>
                            <div className="relative">
                              <input
                                type={f.show ? 'text' : 'password'}
                                value={f.val}
                                onChange={(e) => f.set(e.target.value)}
                                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-2xl px-5 py-4 pr-12 text-sm text-[color:var(--color-text)] focus:border-green-neon focus:bg-[color:var(--color-card)]/80 transition-all outline-none"
                                placeholder="••••••••"
                              />
                              <button onClick={() => f.setShow(!f.show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors">
                                {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] flex items-center gap-2">
                          <SmartphoneNfc className="w-3.5 h-3.5" /> Appareils de confiance
                        </h3>
                        <span className="text-[10px] font-mono text-[color:var(--color-text-muted)] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] px-2.5 py-1 rounded-full shadow-sm">{sessions.length} Actifs</span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {isSessionsLoading ? (
                          <div className="h-24 bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-[2rem] animate-pulse shadow-sm" />
                        ) : (
                          sessions.map(s => {
                            const isCur = s.device_id === getDeviceId();
                            return (
                              <div key={s.id} className={`flex items-center justify-between p-5 rounded-[2rem] border transition-all shadow-sm ${isCur ? 'bg-[color:var(--color-primary)]/10 border-emerald-500 shadow-md ring-1 ring-[color:var(--color-primary)]/10' : 'bg-[color:var(--color-card)]/80 border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/35'
                                }`}>
                                <div className="flex items-center gap-5">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isCur ? 'bg-[color:var(--color-primary)] border-green-neon text-[color:var(--color-primary-contrast)]' : 'bg-[color:var(--color-bg)] border-[color:var(--color-border)] text-[color:var(--color-text-muted)]'}`}>
                                    {/Android|iPhone/i.test(s.user_agent || '') ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-3">
                                      <p className="text-sm font-black uppercase tracking-tight text-[color:var(--color-text)]">{s.device_name || 'Inconnu'}</p>
                                      {isCur && <span className="bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">CE TERMINAL</span>}
                                    </div>
                                    <p className="text-[9px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest mt-1">Dernière activité : {getTimeAgo(s.last_seen)}</p>
                                  </div>
                                </div>
                                {!isCur && (
                                  <button
                                    onClick={() => handleRevokeSession(s.id)}
                                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-[color:var(--color-text)] border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all"
                                  >
                                    Révoquer
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'ai' && (
                  <motion.div
                    key="ai"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-12"
                  >
                    <div className="relative overflow-hidden bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-[3rem] p-10 shadow-sm">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[color:var(--color-primary)]/5 blur-[100px] -z-10" />
                      <div className="max-w-2xl space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 flex items-center justify-center text-[color:var(--color-primary)] mb-6 shadow-sm">
                          <BrainCircuit className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-['Inter',sans-serif] font-black uppercase tracking-tight text-[color:var(--color-text)]">Intelligence de Boutique : {budtenderName}</h2>
                        <p className="text-sm text-[color:var(--color-text-muted)] font-black leading-relaxed italic uppercase tracking-tight">
                          "Je m'adapte à vos préférences techniques pour vous proposer l'équipement le plus adapté. Configurez vos critères ci-dessous pour que mes recommandations restent impeccables."
                        </p>
                      </div>
                    </div>

                    {/* 🧠 Dynamic AI Traits Section - NOW FIRST */}
                    <div className="space-y-10 pb-12 border-b border-[color:var(--color-border)]/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                          <Zap className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">Profil Evolutif (BudTender)</h4>
                          <p className="text-[10px] text-purple-500/70 font-black uppercase mt-1">Traits identifiés automatiquement lors de vos échanges</p>
                        </div>
                      </div>

                      {Object.entries(prefs).filter(([k, v]) => v !== undefined && v !== null && !['id', 'user_id', 'updated_at', 'preferences'].includes(k)).length > 0 ? (
                        <div className="flex flex-wrap gap-4">
                          {Object.entries(prefs)
                            .filter(([k, v]) => v !== undefined && v !== null && !['id', 'user_id', 'updated_at', 'preferences'].includes(k))
                            .map(([key, value]) => {
                              const vStr = Array.isArray(value) 
                                ? value.join(', ') 
                                : typeof value === 'object' && value !== null
                                  ? Object.entries(value as object).map(([ik, iv]) => `${ik.replace(/_/g, ' ')}: ${iv}`).join('; ')
                                  : String(value);

                              return (
                                <div
                                  key={key}
                                  className="bg-[color:var(--color-card)]/80 border border-purple-500/20 rounded-[2rem] px-8 py-5 shadow-sm hover:border-purple-500/40 transition-all duration-500 group"
                                >
                                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-500/70 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    {key.replace(/_/g, ' ')}
                                  </div>
                                  <div className="text-xs font-black uppercase tracking-tight text-[color:var(--color-text)]">
                                    {vStr}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="p-8 border border-dashed border-[color:var(--color-border)] rounded-[2.5rem] bg-[color:var(--color-card)]/30 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)] italic">
                            BudTender n'a pas encore extrait de traits spécifiques. Discutez avec lui pour enrichir votre profil.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* <div className="space-y-16 pt-4">
                      {quizSteps.map((step, idx) => (
                        <div key={step.id} className="space-y-8 px-4">
                          <div className="flex items-center gap-4">
                            <span className="text-3xl font-['Inter',sans-serif] font-black text-[color:var(--color-text)]">{(idx + 1).toString().padStart(2, '0')}</span>
                            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">{step.question}</h4>
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {step.options.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => updatePref(step.id, opt.value)}
                                className={`group relative flex flex-col items-center justify-center gap-4 p-8 rounded-[2.5rem] border transition-all duration-700 shadow-sm ${isPrefSelected(step.id, opt.value)
                                  ? 'bg-[color:var(--color-primary)]/10 border-emerald-500 ring-4 ring-emerald-500/5'
                                  : 'bg-[color:var(--color-card)]/80 border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/35'
                                  }`}
                              >
                                <span className="text-4xl group-hover:scale-125 transition-transform duration-500">{opt.emoji}</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest text-center ${isPrefSelected(step.id, opt.value) ? 'text-[color:var(--color-primary)]' : 'text-[color:var(--color-text-muted)]'}`}>{opt.label}</span>
                                {isPrefSelected(step.id, opt.value) && (
                                  <motion.div layoutId={`check-${step.id}`} className="absolute top-4 right-4 text-[color:var(--color-primary)]">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </motion.div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div> */}

                    <div className="pt-10 flex justify-center border-t border-[color:var(--color-border)]/50">
                      <button
                        onClick={handleResetPrefs}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/40 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Réinitialiser Profil BudTender
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Floating Message ────────────────────────── */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
                >
                  <div className={`p-5 rounded-2xl border backdrop-blur-3xl shadow-2xl flex items-center gap-4 ${message.type === 'success'
                    ? 'bg-[color:var(--color-card)]/80 border-[color:var(--color-primary)]/35 text-[color:var(--color-primary)] shadow-[color:var(--color-primary)]/10'
                    : 'bg-red-50 border-red-500/30 text-red-600 shadow-red-500/10'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    <p className="text-xs font-black uppercase tracking-widest">{message.text}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

      </div>
    </AccountPageLayout>
  );
}