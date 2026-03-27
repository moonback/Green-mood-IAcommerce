import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users, Copy, Check, Share2, Gift, ChevronRight,
  Clock, CheckCircle2, Coins, Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { Referral } from '../lib/types';
import AccountPageLayout from '../components/AccountPageLayout';

export default function Referrals() {
  const { profile } = useAuthStore();
  const { settings } = useSettingsStore();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile?.id) loadReferrals();
  }, [profile]);

  async function loadReferrals() {
    setIsLoading(true);
    const { data } = await supabase
      .from('referrals')
      .select('*, referee:profiles!referee_id(full_name, created_at)')
      .eq('referrer_id', profile?.id)
      .order('created_at', { ascending: false });
    if (data) setReferrals(data as Referral[]);
    setIsLoading(false);
  }

  const referralCode = profile?.referral_code || 'GRN-XXXXXX';
  const referralLink = `${window.location.origin}/connexion?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalRewards = referrals.reduce((acc, curr) => acc + (curr.points_awarded || 0), 0);
  const completedCount = referrals.filter((r) => r.status === 'completed').length;

  if (!settings.referral_program_enabled) {
    return (
      <AccountPageLayout
        seoTitle={`Parrainage — ${settings.store_name}`}
        seoDescription="Le programme de parrainage est temporairement désactivé."
        icon={Users}
        iconColor="#a855f7"
        title="Parrainage"
        footerText={null}
      >
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: '#a855f715', border: '1px solid #a855f725' }}>
            <Gift className="w-7 h-7 text-[#a855f7]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[color:var(--color-text)]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Programme Suspendu
            </h2>
            <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed max-w-md mx-auto">
              Le programme de parrainage est temporairement désactivé. Revenez plus tard.
            </p>
          </div>
        </div>
      </AccountPageLayout>
    );
  }

  const welcomeBonus = settings.referral_welcome_bonus || 0;

  return (
    <AccountPageLayout
      seoTitle={`Parrainage — ${settings.store_name} Privilège`}
      seoDescription={`Parrainez vos amis et gagnez des ${settings.loyalty_currency_name}.`}
      icon={Users}
      iconColor="#a855f7"
      title="Parrainage"
      subtitle={`Invitez vos amis · ${settings.referral_reward_points} ${settings.loyalty_currency_name} par parrainage réussi`}
      stat={referrals.length}
      statLabel="Invités"
      footerText={`Programme ambassadeur ${settings.store_name}`}
    >
      <div className="space-y-6">
        {/* ── Referral link card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[2rem] p-6 md:p-8 overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
            border: '1px solid #a855f725',
          }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, #a855f708, transparent 70%)', transform: 'translate(30%, -30%)' }} />

          <div className="relative space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#a855f7]" />
              <p className="text-[10px] uppercase tracking-widest text-[color:var(--color-text-muted)]"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                Votre lien unique
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 px-4 py-3 rounded-xl font-mono text-sm text-[color:var(--color-text-muted)] truncate flex items-center"
                style={{ background: 'color-mix(in srgb, var(--color-bg) 100%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)' }}>
                {referralLink}
              </div>
              <button
                onClick={copyToClipboard}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300"
                style={{
                  background: copied ? '#a855f7' : 'color-mix(in srgb, var(--color-card) 85%, transparent)',
                  border: `1px solid ${copied ? '#a855f7' : '#a855f728'}`,
                  color: copied ? 'white' : 'var(--color-text)',
                }}
              >
                {copied ? <><Check className="w-4 h-4" /> Copié !</> : <><Copy className="w-4 h-4" /> Copier</>}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3 md:gap-4"
        >
          {[
            { icon: Users, label: 'Invités', value: referrals.length, color: '#a855f7' },
            { icon: CheckCircle2, label: 'Réussis', value: completedCount, color: 'var(--color-primary)' },
            { icon: Coins, label: `${settings.loyalty_currency_name} gagnés`, value: totalRewards, color: '#eab308' },
          ].map((stat, i) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="rounded-[1.75rem] p-5 transition-all duration-300"
              style={{ background: 'color-mix(in srgb, var(--color-card) 85%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${stat.color}30`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = ''; }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}25` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-black text-[color:var(--color-text)] leading-none"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                {stat.value}
              </p>
              <p className="text-[10px] text-[color:var(--color-text-muted)] uppercase tracking-wider mt-1"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Activity list ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#a855f7]" />
            <h3 className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-text-muted)]"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              Activité
            </h3>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-[1.5rem] animate-pulse"
                  style={{ background: 'color-mix(in srgb, var(--color-card) 85%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)' }} />
              ))}
            </div>
          ) : referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 rounded-[2rem]"
              style={{ background: 'color-mix(in srgb, var(--color-card) 85%, transparent)', border: '1px dashed color-mix(in srgb, var(--color-border) 100%, transparent)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--color-bg) 100%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)' }}>
                <Share2 className="w-6 h-6 text-[color:var(--color-text-muted)]" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-[color:var(--color-text)]"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                  Pas encore de filleuls
                </p>
                <p className="text-[10px] text-[color:var(--color-text-muted)] uppercase tracking-widest"
                  style={{ fontFamily: "'DM Mono', monospace" }}>
                  Partagez votre lien pour commencer !
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((r, i) => (
                <motion.div key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  className="group flex items-center justify-between p-4 md:p-5 rounded-[1.5rem] transition-all duration-300"
                  style={{ background: 'color-mix(in srgb, var(--color-card) 85%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#a855f728'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = ''; }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:bg-[#a855f715] group-hover:text-[#a855f7]"
                      style={{ background: 'color-mix(in srgb, var(--color-bg) 100%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)', color: 'var(--color-text-muted)' }}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[color:var(--color-text)]">{r.referee?.full_name || 'Ami invité'}</p>
                      <p className="text-[10px] text-[color:var(--color-text-muted)] uppercase tracking-wider mt-0.5"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        Inscrit le {new Date(r.referee?.created_at || r.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {r.status === 'completed' ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg"
                          style={{ fontFamily: "'DM Mono', monospace", background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)', color: 'var(--color-primary)' }}>
                          <CheckCircle2 className="w-3 h-3" /> Succès
                        </span>
                        <Link to="/compte/fidelite"
                          className="text-xs font-black text-[color:var(--color-text)] hover:text-[color:var(--color-primary)] transition-colors block"
                          style={{ fontFamily: "'DM Mono', monospace" }}>
                          +{r.points_awarded} {settings.loyalty_currency_name}
                        </Link>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg"
                        style={{ fontFamily: "'DM Mono', monospace", background: 'color-mix(in srgb, var(--color-bg) 100%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)', color: 'var(--color-text-muted)' }}>
                        <Clock className="w-3 h-3" /> En attente
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Rules ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-[1.75rem] p-6 space-y-4"
          style={{ background: 'color-mix(in srgb, var(--color-card) 85%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)' }}>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-text-muted)]"
            style={{ fontFamily: "'DM Mono', monospace" }}>
            Règles du Programme
          </p>
          <ul className="space-y-2.5">
            {[
              `Le filleul doit être un nouvel utilisateur ${settings.store_name}.`,
              welcomeBonus > 0 ? `Le filleul reçoit ${welcomeBonus} ${settings.loyalty_currency_name} dès son inscription.` : null,
              'La récompense est créditée dès que la commande du filleul est réglée.',
              'Pas de limite sur le nombre de parrainages.',
              `Les ${settings.loyalty_currency_name} sont valables sur toute la boutique.`,
            ].filter(Boolean).map((rule, i) => (
              <li key={i} className="flex gap-3 text-xs text-[color:var(--color-text-muted)] leading-relaxed">
                <ChevronRight className="w-3.5 h-3.5 text-[#a855f7] shrink-0 mt-0.5" />
                {rule}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </AccountPageLayout>
  );
}
