import { AnimatePresence, motion } from 'motion/react';
import { Brain, ChevronDown, ChevronRight, Coins, Eye, LogOut, Maximize, Monitor, Moon, Package, RotateCcw, Settings, Sun, FileText, History as HistoryIcon, Lock } from 'lucide-react';

interface AdminPOSHeaderProps {
  cartLength: number;
  isLightTheme: boolean;
  onExit?: () => void;
  onGenerateReport: (mode?: 'view' | 'close') => void;
  onLoadProducts: () => void;
  onOpenAIPreferences: () => void;
  onOpenCustomerDisplay: () => void;
  onToggleAdminMenu: () => void;
  onToggleFullScreen: () => void;
  onToggleHistory: () => void;
  onToggleTheme: () => void;
  onToggleTodayTotal: () => void;
  selectedCustomerHasAI: boolean;
  settings: { store_logo_url?: string | null; store_logo_dark_url?: string | null; store_name?: string | null };
  showAdminMenu: boolean;
  showHistory: boolean;
  showTodayTotal: boolean;
  todayTotal: number;
}

export function AdminPOSHeader(props: AdminPOSHeaderProps) {
  return (
    <header className={`relative z-50 flex items-center justify-between px-4 sm:px-6 py-2 sm:py-2.5 backdrop-blur-2xl border-b transition-all duration-500 ${props.isLightTheme ? 'bg-white/70 border-emerald-100/50 shadow-[0_8px_32px_rgba(16,185,129,0.05)]' : 'bg-[#0a0a0b]/80 border-zinc-800/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] md:rounded-b-[2rem]'}`}>
      <div className="flex items-center gap-3 sm:gap-5">
        <motion.div whileHover={{ scale: 1.05 }} className="relative group cursor-pointer flex items-center gap-2 sm:gap-3">
          <div className="absolute -inset-4 bg-green-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
          <img src={(props.isLightTheme ? props.settings.store_logo_url : (props.settings.store_logo_dark_url || props.settings.store_logo_url)) || '/logo.png'} alt={props.settings.store_name || 'Store logo'} className="h-10 w-10 sm:h-12 sm:w-auto object-contain transition-all duration-500 group-hover:glow-logo" />
        </motion.div>
      </div>

      <div className="hidden md:flex items-center gap-4 lg:gap-8">
        <button onClick={props.onToggleTodayTotal} className="flex items-center gap-3 group hover:opacity-80 transition-opacity">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${props.isLightTheme ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-800/50 text-zinc-500 group-hover:bg-green-500/10 group-hover:text-green-400'}`}>
            {props.showTodayTotal ? <Coins className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-40" />}
          </div>
          <div className="flex flex-col text-left">
            <span className={`text-[8px] uppercase font-black tracking-widest mb-0 ${props.isLightTheme ? 'text-emerald-600/40' : 'text-zinc-600'}`}>Ventes du jour</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-lg font-black leading-none tracking-tight transition-all duration-300 ${!props.showTodayTotal ? 'blur-md select-none opacity-20' : ''} ${props.isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{props.todayTotal.toFixed(2)}<span className="text-[10px] ml-0.5 opacity-50">€</span></span>
              {!props.showTodayTotal && <span className="text-[7px] font-black uppercase tracking-tighter text-zinc-500 animate-pulse">Voir</span>}
            </div>
          </div>
        </button>

        <div className={`h-8 w-px ${props.isLightTheme ? 'bg-emerald-100' : 'bg-zinc-800'}`} />
        <div className="flex items-center gap-3 group">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${props.isLightTheme ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-800/50 text-zinc-500 group-hover:bg-blue-500/10 group-hover:text-blue-400'}`}>
            <Package className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className={`text-[8px] uppercase font-black tracking-widest mb-0 ${props.isLightTheme ? 'text-emerald-600/40' : 'text-zinc-600'}`}>Panier actuel</span>
            <span className={`text-lg font-black leading-none tracking-tight ${props.isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{props.cartLength}<span className="text-[9px] ml-1 opacity-40 uppercase">Articles</span></span>
          </div>
        </div>

        {props.selectedCustomerHasAI && (
          <>
            <div className={`h-8 w-px ${props.isLightTheme ? 'bg-emerald-100' : 'bg-zinc-800'}`} />
            <motion.button whileHover={{ y: -2 }} onClick={props.onOpenAIPreferences} className={`flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border transition-all shadow-sm ${props.isLightTheme ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-white hover:border-emerald-300' : 'bg-green-500/5 border-green-500/20 text-green-400 hover:bg-green-500/10 hover:border-green-500/40'}`}>
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center ${props.isLightTheme ? 'bg-emerald-600 text-white' : 'bg-green-500 text-black'}`}>
                <Brain className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-[7px] font-black uppercase tracking-widest leading-none mb-0.5 opacity-60">Client Profile</p>
                <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${props.isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Intelligence IA</p>
              </div>
            </motion.button>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {props.selectedCustomerHasAI && (
          <button onClick={props.onOpenAIPreferences} className={`md:hidden p-2 rounded-lg transition-all hover:scale-105 active:scale-95 ${props.isLightTheme ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200' : 'bg-green-500 text-black shadow-sm shadow-green-500/20'}`} title="Intelligence IA">
            <Brain className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-0.5 p-1 rounded-lg sm:rounded-xl bg-zinc-800/10 backdrop-blur-sm border border-zinc-800/5 transition-all">
          <button onClick={props.onToggleTheme} className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all hover:scale-105 active:scale-95 ${props.isLightTheme ? 'bg-amber-100 text-amber-600 shadow-sm shadow-amber-200' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`} title={props.isLightTheme ? 'Thème Sombre' : 'Thème Clair'}>
            {props.isLightTheme ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button onClick={props.onToggleFullScreen} className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all hover:scale-105 active:scale-95 hidden sm:flex ${props.isLightTheme ? 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`} title="Plein écran">
            <Maximize className="w-3.5 h-3.5" />
          </button>
          <button onClick={props.onLoadProducts} className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all hover:scale-105 active:scale-95 ${props.isLightTheme ? 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`} title="Actualiser">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative">
          <button onClick={props.onToggleAdminMenu} className={`group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[8px] sm:text-[9px] uppercase tracking-widest transition-all border shadow-sm ${props.showAdminMenu ? (props.isLightTheme ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-green-500 text-black shadow-green-500/20') : (props.isLightTheme ? 'bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-50' : 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800')}`}>
            <Settings className={`w-3 h-3 transition-transform duration-500 ${props.showAdminMenu ? 'rotate-90' : 'group-hover:rotate-45'}`} />
            <span className="hidden sm:inline">Gestion</span>
            <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-300 ${props.showAdminMenu ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {props.showAdminMenu && (
              <motion.div initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.95 }} className={`absolute right-0 mt-3 w-64 border rounded-[2rem] shadow-2xl overflow-hidden z-[110] transition-all backdrop-blur-3xl ${props.isLightTheme ? 'bg-white/95 border-emerald-100 shadow-emerald-200/50' : 'bg-[#0a0a0b]/95 border-zinc-800 shadow-black'}`}>
                <div className="p-3 space-y-1">
                  <button onClick={props.onToggleHistory} className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${props.isLightTheme ? 'text-emerald-950 hover:bg-emerald-50' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                    <div className="flex items-center gap-3"><HistoryIcon className="w-4 h-4 opacity-50" />{props.showHistory ? 'Catalogue' : 'Historique'}</div>
                    <ChevronRight className="w-3 h-3 opacity-30" />
                  </button>
                  <button onClick={() => props.onGenerateReport('view')} className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${props.isLightTheme ? 'text-emerald-950 hover:bg-emerald-50' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                    <div className="flex items-center gap-3"><FileText className="w-4 h-4 opacity-50" />Lecture X</div>
                    <ChevronRight className="w-3 h-3 opacity-30" />
                  </button>
                  <div className={`h-px mx-4 my-2 transition-colors ${props.isLightTheme ? 'bg-emerald-100/50' : 'bg-zinc-800/50'}`} />
                  <button onClick={() => props.onGenerateReport('close')} className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-red-500 hover:bg-red-500/10 transition-all">
                    <div className="flex items-center gap-3"><Lock className="w-4 h-4 opacity-50" />Clôture Z</div>
                    <ChevronRight className="w-3 h-3 opacity-30" />
                  </button>
                  <div className={`h-px mx-4 my-2 transition-colors ${props.isLightTheme ? 'bg-emerald-100/50' : 'bg-zinc-800/50'}`} />
                  <button onClick={props.onOpenCustomerDisplay} className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${props.isLightTheme ? 'text-emerald-950 hover:bg-emerald-50' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                    <div className="flex items-center gap-3"><Monitor className="w-4 h-4 opacity-50" />Écran Client</div>
                    <ChevronRight className="w-3 h-3 opacity-30" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {props.onExit && (
          <button onClick={props.onExit} className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all group ${props.isLightTheme ? 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white border border-emerald-100 hover:border-red-100' : 'bg-red-900 text-red-600 border border-zinc-800 hover:text-white hover:border-zinc-500 shadow-xl'}`} title="Fermer le point de vente">
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:-translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </header>
  );
}
