import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Cake, Gift, Mail, Star, ChevronRight, Sparkles, CalendarDays, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../lib/types';
import { useSettingsStore } from '../../store/settingsStore';

interface BirthdayProfile extends Profile {
  daysUntil: number;
  birthdayThisYear: Date;
  alreadyGifted: boolean;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daysUntilBirthday(birthdayStr: string): { days: number; date: Date } {
  const today = new Date();
  const bday = new Date(birthdayStr);
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
  const diffMs = thisYear.getTime() - today.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return { days, date: thisYear };
}

function birthdayLabel(days: number): { text: string; color: string } {
  if (days === 0) return { text: "Aujourd'hui 🎉", color: 'text-green-400 bg-green-400/10 border-green-400/20' };
  if (days === 1) return { text: 'Demain', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' };
  if (days <= 7) return { text: `Dans ${days} jours`, color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' };
  return { text: `Dans ${days} jours`, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' };
}

export default function AdminBirthdaysTab() {
  const [profiles, setProfiles] = useState<BirthdayProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [daysWindow, setDaysWindow] = useState(30);
  const [filter, setFilter] = useState<'all' | 'gifted' | 'pending'>('all');
  const { settings } = useSettingsStore();

  useEffect(() => {
    fetchBirthdays();
  }, []);

  const fetchBirthdays = async () => {
    setIsLoading(true);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .not('birthday', 'is', null)
      .order('birthday');

    if (!data) { setIsLoading(false); return; }

    const today = new Date();
    const enriched: BirthdayProfile[] = (data as Profile[])
      .map(p => {
        const { days, date } = daysUntilBirthday(p.birthday!);
        const alreadyGifted = p.last_birthday_gift_at
          ? new Date(p.last_birthday_gift_at).getFullYear() === today.getFullYear()
          : false;
        return { ...p, daysUntil: days, birthdayThisYear: date, alreadyGifted };
      })
      .filter(p => p.daysUntil <= 365) // all upcoming
      .sort((a, b) => a.daysUntil - b.daysUntil);

    setProfiles(enriched);
    setIsLoading(false);
  };

  const filtered = profiles.filter(p => {
    if (p.daysUntil > daysWindow) return false;
    if (filter === 'gifted') return p.alreadyGifted;
    if (filter === 'pending') return !p.alreadyGifted;
    return true;
  });

  const todayBirthdays = profiles.filter(p => p.daysUntil === 0);
  const thisWeek = profiles.filter(p => p.daysUntil > 0 && p.daysUntil <= 7);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center">
            <Cake className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Anniversaires à Venir</h2>
            <p className="text-xs text-zinc-500">Anticipez les cadeaux et fidélisez vos clients</p>
          </div>
        </div>
        <button
          onClick={fetchBirthdays}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:bg-white/[0.07]"
        >
          Actualiser
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-pink-500/10 to-rose-500/5 border border-pink-500/20 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5 text-pink-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-pink-400">Aujourd'hui</span>
          </div>
          <p className="text-4xl font-black text-white">{todayBirthdays.length}</p>
          <p className="text-xs text-zinc-500 mt-1">anniversaire{todayBirthdays.length > 1 ? 's' : ''} ce jour</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <CalendarDays className="w-5 h-5 text-yellow-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">Cette semaine</span>
          </div>
          <p className="text-4xl font-black text-white">{thisWeek.length}</p>
          <p className="text-xs text-zinc-500 mt-1">anniversaire{thisWeek.length > 1 ? 's' : ''} dans 7 jours</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Total enregistrés</span>
          </div>
          <p className="text-4xl font-black text-white">{profiles.length}</p>
          <p className="text-xs text-zinc-500 mt-1">clients avec date connue</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1">
          {[
            { val: 7, label: '7 jours' },
            { val: 15, label: '15 jours' },
            { val: 30, label: '30 jours' },
            { val: 60, label: '2 mois' },
            { val: 365, label: 'Tous' },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setDaysWindow(opt.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                daysWindow === opt.val
                  ? 'bg-emerald-500 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1">
          {[
            { val: 'all', label: 'Tous' },
            { val: 'pending', label: '🎁 Cadeau à envoyer' },
            { val: 'gifted', label: '✓ Déjà offert' },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setFilter(opt.val as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === opt.val
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
            <Cake className="w-8 h-8 text-zinc-700" />
          </div>
          <p className="text-lg font-bold text-white mb-1">Aucun anniversaire trouvé</p>
          <p className="text-sm text-zinc-500">Essayez d'élargir la fenêtre temporelle.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p, i) => {
            const { text: bdayText, color: bdayColor } = birthdayLabel(p.daysUntil);
            const month = p.birthdayThisYear.toLocaleDateString('fr-FR', { month: 'long', day: 'numeric' });
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 bg-white/[0.025] border border-white/[0.06] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group"
              >
                {/* Days badge */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border ${bdayColor}`}>
                  <Cake className="w-5 h-5 mb-0.5" />
                  <span className="text-[9px] font-bold uppercase leading-none">
                    {p.daysUntil === 0 ? 'Auj.' : `J-${p.daysUntil}`}
                  </span>
                </div>

                {/* Name & info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white truncate">{p.full_name ?? 'Anonyme'}</p>
                    {p.alreadyGifted && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                        <Gift className="w-3 h-3" /> Cadeau offert
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${bdayColor}`}>
                      {bdayText}
                    </span>
                    <span className="text-xs text-zinc-500 capitalize">{month}</span>
                    {p.email && (
                      <span className="text-xs text-zinc-600 truncate hidden md:block">{p.email}</span>
                    )}
                  </div>
                </div>

                {/* Loyalty points */}
                <div className="flex-shrink-0 text-right hidden sm:block">
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-3.5 h-3.5" />
                    <span className="text-sm font-bold">{p.loyalty_points.toLocaleString('fr-FR')}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600">{settings.loyalty_currency_name}</p>
                </div>

                {/* Email action */}
                {p.email && (
                  <a
                    href={`mailto:${p.email}?subject=Joyeux%20Anniversaire%20!&body=Bonjour%20${encodeURIComponent(p.full_name ?? '')}%2C%0A%0ANous%20vous%20souhaitons%20un%20joyeux%20anniversaire%20!%0A%0A%C3%80%20bient%C3%B4t%20chez%20${encodeURIComponent(useSettingsStore.getState().settings.store_name || 'Eco CBD')}%20!`}
                    className="flex-shrink-0 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-all opacity-0 group-hover:opacity-100"
                    title="Envoyer un email d'anniversaire"
                    onClick={e => e.stopPropagation()}
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}

                <ChevronRight className="flex-shrink-0 w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
