import { Tab, sidebarCategories, NavItem } from './AdminSidebar';
import { useSettingsStore } from '../../../store/settingsStore';
import { Activity, Clock3, Command, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PredictiveSearch from '../../../components/layout/PredictiveSearch';

interface AdminHeaderProps {
  currentTab: Tab;
}

export default function AdminHeader({ currentTab }: AdminHeaderProps) {
  const { settings } = useSettingsStore();
  const [time, setTime] = useState(new Date());
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredCategories = useMemo(
    () =>
      sidebarCategories.map((cat) => {
        if (cat.key !== 'clients') return cat;
        return {
          ...cat,
          items: cat.items.filter((item) => {
            if (!settings.loyalty_program_enabled && ['loyalty', 'birthdays', 'referrals'].includes(item.key)) {
              return false;
            }
            return true;
          }),
        };
      }),
    [settings.loyalty_program_enabled]
  );

  const category = filteredCategories.find((c) => c.items.some((i) => (i as NavItem).key === currentTab));
  const currentItem = filteredCategories.flatMap((c) => [...c.items] as NavItem[]).find((item) => item.key === currentTab);

  if (!currentItem) return null;

  const Icon = currentItem.icon;

  return (
    <header className="mb-8 rounded-3xl border border-slate-800/80 bg-gradient-to-r from-[#0f172a]/95 to-[#101a2b]/95 p-4 shadow-[0_20px_45px_rgba(2,6,23,0.4)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-green-neon/30 bg-green-neon/10 p-3 text-green-neon">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{category?.label}</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-green-neon/20 bg-green-neon/10 px-2 py-0.5 text-[10px] font-medium text-green-neon">
                <Sparkles className="h-3 w-3" /> Live
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-100">{currentItem.label}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(260px,1fr)_auto] md:items-center">
          <label className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              placeholder="Recherche vectorielle produits/catégories..."
              readOnly
              onFocus={() => setIsSearchOpen(true)}
              onClick={() => setIsSearchOpen(true)}
              className="h-11 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900/70 pl-10 pr-10 text-sm text-slate-100 outline-none transition focus:border-green-neon/60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">
              <Command className="inline h-3 w-3" />K
            </span>
          </label>

          <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-right">
            <p className="text-xs text-slate-400">{time.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
            <div className="mt-0.5 flex items-center justify-end gap-2 text-sm text-slate-200">
              <Clock3 className="h-4 w-4 text-green-neon" />
              {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              <Activity className="h-4 w-4 text-emerald-300" />
            </div>
          </div>
        </div>
      </div>
      <PredictiveSearch isOpen={isSearchOpen} setIsOpen={setIsSearchOpen} />
    </header>
  );
}
