import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Lock, User, Eye, EyeOff, Shield, ArrowRight, Gift,
  Check, X, Sparkles, ChevronRight, Leaf
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import SEO from '../components/SEO';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../components/ThemeProvider';
type Mode = 'login' | 'register';

/* ─── Glow Input ─── */
const GlowInput = ({
  id, type, value, onChange, label, icon: Icon, autoComplete, required: req,
  minLength, rightSlot, state = 'default',
}: {
  id: string; type: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string; icon: React.ElementType; autoComplete?: string;
  required?: boolean; minLength?: number;
  rightSlot?: React.ReactNode;
  state?: 'default' | 'success' | 'error';
}) => {
  const ring =
    state === 'success' ? 'border-emerald-400/50 ring-2 ring-emerald-500/15' :
      state === 'error' ? 'border-red-400/50 ring-2 ring-red-500/15' :
        'border-white/10 focus-within:border-emerald-400/50 focus-within:ring-2 focus-within:ring-emerald-500/15';

  return (
    <div className={`relative group rounded-2xl border bg-white/[0.04] transition-all duration-300 ${ring}`}>
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-emerald-400 transition-colors duration-200 z-10 pointer-events-none" />
      <input
        id={id} type={type} value={value} onChange={onChange}
        placeholder=" " autoComplete={autoComplete}
        required={req} minLength={minLength}
        className={`peer w-full rounded-2xl bg-transparent ${rightSlot ? 'pr-12' : 'pr-4'} pl-11 pt-6 pb-2.5 text-white text-sm focus:outline-none`}
      />
      <label
        htmlFor={id}
        className="absolute left-11 top-4 text-white/30 text-sm transition-all duration-200 pointer-events-none
          peer-focus:top-[9px] peer-focus:text-[10px] peer-focus:text-emerald-400 peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider
          peer-[:not(:placeholder-shown)]:top-[9px] peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-white/40 peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider"
      >
        {label}
      </label>
      {rightSlot && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightSlot}</div>
      )}
    </div>
  );
};

/* ─── AI Scan Line ─── */
const AIScanLine = () => (
  <motion.div
    initial={{ scaleX: 0, opacity: 0 }}
    animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
    transition={{ duration: 1.8, ease: 'easeInOut', times: [0, 0.3, 0.7, 1] }}
    className="absolute inset-x-0 top-0 h-[2px] origin-left bg-gradient-to-r from-transparent via-emerald-400 to-cyan-400 rounded-full"
  />
);


export default function Login() {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref')?.trim().toUpperCase() || '';
  const rawRedirectPath = searchParams.get('redirect');
  const redirectPath = rawRedirectPath && rawRedirectPath.startsWith('/') ? rawRedirectPath : '/compte';
  const redirectLabel = redirectPath.startsWith('/assistant') ? 'votre assistant IA'
    : redirectPath.startsWith('/compte') ? 'votre espace client'
      : redirectPath.startsWith('/panier') ? 'votre panier'
        : 'votre prochaine étape';

  const { signIn, signUp } = useAuthStore();
  const { settings } = useSettingsStore();

  const [mode, setMode] = useState<Mode>(refCode ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const logoUrl = resolvedTheme === 'dark'
    ? (settings.store_logo_dark_url || settings.store_logo_url || '/logo.png')
    : (settings.store_logo_url || '/logo.png');

  const hasMinPasswordLength = password.length >= 8;
  const hasLetter = /[A-Za-zÀ-ÿ]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordScore = [hasMinPasswordLength, hasLetter, hasNumber].filter(Boolean).length;
  const strengthLabel = password.length === 0 ? null : passwordScore === 1 ? 'Faible' : passwordScore === 2 ? 'Moyen' : 'Fort';
  const strengthColor = passwordScore === 1 ? 'bg-red-500' : passwordScore === 2 ? 'bg-amber-400' : 'bg-emerald-400';
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const resetFeedback = () => { setError(''); setSuccess(''); };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    resetFeedback();
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetFeedback();
    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === 'login') {
        await signIn(normalizedEmail, password);
        navigate(redirectPath);
      } else {
        if (!fullName.trim()) { setError('Le prénom et nom sont requis.'); return; }
        if (!hasMinPasswordLength || !hasLetter || !hasNumber) {
          setError('Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.');
          return;
        }
        if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
        await signUp(normalizedEmail, password, fullName.trim(), refCode || undefined);
        setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue.';
      if (msg.includes('Invalid login credentials')) setError('Email ou mot de passe incorrect.');
      else if (msg.includes('User already registered')) setError('Un compte existe déjà avec cet email.');
      else setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title={mode === 'login' ? `Connexion — ${settings.store_name}` : `Créer un compte — ${settings.store_name}`}
        description={`Connectez-vous ou créez un compte pour accéder à votre sanctuaire bien-être ${settings.store_name}.`}
      />

      <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden bg-[#020306] text-white">

        {/* ══════════════════════════════════════
            LEFT PANEL — Immersive AI Hero
        ══════════════════════════════════════ */}
        <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col shrink-0 overflow-hidden">

          {/* Deep background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#020504] via-[#020306] to-[#010906]" />

          {/* Animated gradient blobs */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-emerald-600/15 blur-[120px] pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
            className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-green-600/12 blur-[140px] pointer-events-none"
          />
          <motion.div
            animate={{ y: [0, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/8 blur-[100px] pointer-events-none"
          />



          {/* Animated scan line */}
          <motion.div
            animate={{ y: ['0%', '100%'] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent z-20 pointer-events-none"
          />

          {/* Corner brackets */}
          <div className="absolute top-10 left-10 w-12 h-12 border-l-2 border-t-2 border-emerald-400/20 pointer-events-none" />
          <div className="absolute top-10 right-10 w-12 h-12 border-r-2 border-t-2 border-green-400/20 pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-12 h-12 border-l-2 border-b-2 border-emerald-400/20 pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-12 h-12 border-r-2 border-b-2 border-green-400/20 pointer-events-none" />

          {/* Right edge glow */}
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent" />

          {/* ── Content ── */}
          <div className="relative z-10 flex flex-col h-full p-12 xl:p-16 justify-between">

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3"
            >
              <img src={logoUrl} alt={settings.store_name} className="h-16 w-auto object-contain" />
            </motion.div>

            {/* Main headline */}
            <div className="flex-1 flex flex-col justify-center py-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="mb-8"
              >
                {/* Live indicator */}
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                  </span>
                  <span className="text-emerald-300/70 text-[11px] font-bold uppercase tracking-[0.28em]">
                    VOTRE SANCTUAIRE
                  </span>
                </div>

                <h2 className="text-5xl xl:text-6xl font-black leading-[0.92] tracking-tighter mb-6">
                  <span className="text-white">Cultivez votre</span>
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-600 bg-clip-text text-transparent italic">
                    Bien-être.
                  </span>
                </h2>

                <p className="text-white/45 text-base xl:text-lg leading-relaxed max-w-md font-medium">
                  Rejoignez la communauté Green Mood. Suivez vos commandes, cumulez vos points de fidélité et retrouvez vos fleurs favorites.
                </p>
              </motion.div>
            </div>

            {/* Bottom tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="flex items-center gap-2"
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-400/50" />
              <span className="text-white/25 text-[11px] font-semibold tracking-widest uppercase">
                Botanique & Intelligence
              </span>
            </motion.div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            RIGHT PANEL — Login Form
        ══════════════════════════════════════ */}
        <div className="w-full lg:flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-10 py-12 relative lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto no-scrollbar bg-[#020305]">

          {/* Subtle radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_30%,rgba(16,185,129,0.06),transparent)] pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-600/8 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-green-600/8 blur-[120px] pointer-events-none" />

          {/* Mobile bg */}
          <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-[#020306] to-green-950/20 pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px] relative z-10"
          >
            {/* Mobile logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="lg:hidden flex justify-center mb-8"
            >
              <img src={logoUrl} alt={settings.store_name} className="h-16 w-auto object-contain" />
            </motion.div>

            {/* Header */}
            <div className="mb-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                >
                  <h1 className="text-3xl font-black tracking-tight mb-1.5 text-white">
                    {mode === 'login' ? 'Connectez-vous 👋' : 'Créer un compte'}
                  </h1>
                  <p className="text-white/35 text-sm">
                    {mode === 'login'
                      ? `Retrouvez ${redirectLabel} ici.`
                      : `Rejoignez ${settings.store_name} et profitez de nos offres.`}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Main glass card ── */}
            <div className="relative bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(163,108,190,0.07),0_4px_40px_rgba(0,0,0,0.4)]">

              {/* Top gradient accent line */}
              <div className="h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />

              {/* Inner glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(16,185,129,0.06),transparent)] pointer-events-none" />

              <div className="p-6 sm:p-8 relative z-10">

                {/* Mode tabs */}
                <div className="flex rounded-2xl p-1 mb-6 bg-white/[0.04] border border-white/[0.06]">
                  {(['login', 'register'] as Mode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => switchMode(m)}
                      disabled={isLoading}
                      className="relative flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors duration-200 rounded-xl"
                    >
                      {mode === m && (
                        <motion.div
                          layoutId="tab-pill"
                          className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                          transition={{ type: 'spring', bounce: 0.22, duration: 0.4 }}
                        />
                      )}
                      <span className={`relative z-10 transition-colors duration-200 ${mode === m ? 'text-white' : 'text-white/30 hover:text-white/50'}`}>
                        {m === 'login' ? 'Connexion' : 'Inscription'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Referral banner */}
                <AnimatePresence>
                  {refCode && mode === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.28 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                        <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-emerald-300">Invitation parrainage</p>
                          <p className="text-[11px] text-white/40 mt-0.5">
                            Code <span className="font-mono font-bold text-white">{refCode}</span> — {settings.loyalty_currency_name} bonus à l'inscription
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Redirect notice */}
                <AnimatePresence>
                  {mode === 'login' && redirectPath !== '/compte' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.24 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/8 px-4 py-3 flex items-start gap-2">
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-white/50 leading-relaxed">
                          Après connexion → <span className="text-emerald-300 font-semibold">{redirectLabel}</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* Full name (register) */}
                  <AnimatePresence initial={false}>
                    {mode === 'register' && (
                      <motion.div
                        key="fullname"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <GlowInput
                          id="fullname" type="text" value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          label="Nom complet" icon={User}
                          autoComplete="name" required
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email */}
                  <GlowInput
                    id="email" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    label="Adresse email" icon={Mail}
                    autoComplete={mode === 'login' ? 'email' : 'username'}
                    required
                  />

                  {/* Password */}
                  <div className="space-y-3">
                    <GlowInput
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      label="Mot de passe" icon={Lock}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required minLength={mode === 'register' ? 8 : 6}
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-white/25 hover:text-white/60 transition-colors duration-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />

                    {/* Strength indicator */}
                    <AnimatePresence>
                      {mode === 'register' && password.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 flex gap-1 h-[3px]">
                              {[1, 2, 3].map((s) => (
                                <div
                                  key={s}
                                  className={`flex-1 rounded-full transition-colors duration-300 ${passwordScore >= s ? strengthColor : 'bg-white/10'}`}
                                />
                              ))}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${passwordScore === 1 ? 'text-red-400' : passwordScore === 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {strengthLabel}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { ok: hasMinPasswordLength, label: '8+ chars' },
                              { ok: hasLetter, label: 'Lettre' },
                              { ok: hasNumber, label: 'Chiffre' },
                            ].map((rule) => (
                              <span
                                key={rule.label}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all duration-300 ${rule.ok ? 'bg-emerald-500/15 border-emerald-400/20 text-emerald-300' : 'bg-white/[0.03] border-white/[0.08] text-white/25'}`}
                              >
                                {rule.ok ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                                {rule.label}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Confirm password (register) */}
                  <AnimatePresence initial={false}>
                    {mode === 'register' && (
                      <motion.div
                        key="confirm-pw"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="space-y-1.5">
                          <GlowInput
                            id="confirm-pw"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            label="Confirmer le mot de passe" icon={Lock}
                            autoComplete="new-password" required minLength={8}
                            state={confirmPassword.length === 0 ? 'default' : passwordsMatch ? 'success' : 'error'}
                            rightSlot={
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="text-white/25 hover:text-white/60 transition-colors duration-200"
                              >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            }
                          />
                          <AnimatePresence>
                            {confirmPassword.length > 0 && (
                              <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.18 }}
                                className={`flex items-center gap-1 text-xs font-medium ${passwordsMatch ? 'text-violet-400' : 'text-red-400'}`}
                              >
                                {passwordsMatch
                                  ? <><Check className="w-3 h-3" /> Mots de passe identiques</>
                                  : <><X className="w-3 h-3" /> Ne correspondent pas</>}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Remember me + forgot password */}
                  <AnimatePresence initial={false}>
                    {mode === 'login' && (
                      <motion.div
                        key="login-extras"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                        className="flex items-center justify-between"
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={rememberMe}
                            onClick={() => setRememberMe(!rememberMe)}
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-all duration-200 shrink-0 ${rememberMe ? 'bg-gradient-to-br from-emerald-500 to-green-500 border-emerald-400/60' : 'border-white/20 group-hover:border-white/40'}`}
                          >
                            {rememberMe && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                          </button>
                          <span className="text-xs text-white/30 group-hover:text-white/60 transition-colors duration-200">
                            Se souvenir de moi
                          </span>
                        </label>
                        <Link
                          to="/mot-de-passe-oublie"
                          className="text-xs text-white/25 hover:text-emerald-400 transition-colors duration-200"
                        >
                          Mot de passe oublié ?
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error / Success */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.22 }}
                        className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                      >
                        <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-red-400 text-sm">{error}</p>
                      </motion.div>
                    )}
                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.22 }}
                        className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3"
                      >
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <p className="text-emerald-300 text-sm">{success}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit button */}
                  <div className="relative">
                    {isLoading && <AIScanLine />}
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileTap={isLoading ? {} : { scale: 0.98 }}
                      className="relative w-full overflow-hidden rounded-2xl py-4 font-black text-[13px] uppercase tracking-wider text-white disabled:opacity-60 disabled:cursor-not-allowed group"
                      style={{
                        background: 'linear-gradient(135deg, #059669, #10b981, #047857)',
                        backgroundSize: '200% 200%',
                        boxShadow: '0 0 30px rgba(16,185,129,0.25), 0 4px 20px rgba(4,120,87,0.15)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 50px rgba(16,185,129,0.45), 0 4px 30px rgba(4,120,87,0.25)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(16,185,129,0.25), 0 4px 20px rgba(4,120,87,0.15)';
                      }}
                    >
                      {/* Shimmer */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Connexion en cours…
                          </>
                        ) : (
                          <>
                            {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                          </>
                        )}
                      </span>
                    </motion.button>
                  </div>
                </form>
              </div>

              {/* Card footer */}
              <div className="px-6 sm:px-8 pb-6 border-t border-white/[0.05] pt-4 relative z-10">
                <p className="text-center text-white/20 text-xs leading-relaxed">
                  En créant un compte, vous acceptez nos{' '}
                  <Link to="/mentions-legales" className="text-emerald-400/60 hover:text-emerald-400 transition-colors duration-200 hover:underline">
                    conditions générales
                  </Link>
                  . Vous devez avoir 18 ans ou plus.
                </p>
              </div>
            </div>

            {/* Trust strip */}
            <div className="mt-5 flex items-center justify-center gap-5 text-white/20">
              {[
                { icon: Shield, label: 'SSL' },
                { icon: Lock, label: 'RGPD' },
                { icon: Leaf, label: 'IA Certifiée' },
              ].map((item, i) => (
                <div key={item.label} className="contents">
                  {i > 0 && <span className="w-1 h-1 rounded-full bg-white/10" />}
                  <div className="flex items-center gap-1.5">
                    <item.icon className="w-3 h-3 text-emerald-400/30" />
                    <span className="text-[10px] uppercase tracking-widest font-semibold">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
