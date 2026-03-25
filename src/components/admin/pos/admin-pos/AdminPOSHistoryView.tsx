import { Calendar, ChevronRight, History as HistoryIcon, Package } from 'lucide-react';
import { HistoryDaySummary } from './types';

interface AdminPOSHistoryViewProps {
  historyDays: HistoryDaySummary[];
  isLightTheme: boolean;
  isLoadingHistory: boolean;
  onClose: () => void;
  onSelectDay: (date: string) => void;
}

export function AdminPOSHistoryView({ historyDays, isLightTheme, isLoadingHistory, onClose, onSelectDay }: AdminPOSHistoryViewProps) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-xl font-black uppercase tracking-tight transition-colors ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Historique</h3>
          <p className={`text-xs font-medium transition-colors ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-500'}`}>Les 30 derniers jours d'activité boutique</p>
        </div>
        <button onClick={onClose} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isLightTheme ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
          Fermer
        </button>
      </div>

      {isLoadingHistory ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((index) => <div key={index} className="h-24 bg-zinc-800/20 rounded-[2rem] animate-pulse" />)}
        </div>
      ) : historyDays.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 text-zinc-700">
          <div className="w-20 h-20 rounded-full bg-zinc-800/30 flex items-center justify-center mb-6">
            <HistoryIcon className="w-10 h-10 opacity-20" />
          </div>
          <p className="font-bold uppercase tracking-widest text-xs">Aucun historique disponible</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {historyDays.map((day) => (
            <button
              key={day.date}
              onClick={() => onSelectDay(day.date)}
              className={`rounded-xl p-3 flex items-center justify-between group transition-all border ${isLightTheme ? 'bg-white border-emerald-100 hover:border-emerald-300 shadow-sm shadow-emerald-100/20' : 'bg-zinc-800/20 hover:bg-zinc-800/50 border-zinc-800/50 hover:border-green-500/30'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shadow-inner border transition-all ${isLightTheme ? 'bg-emerald-50 border-emerald-100' : 'bg-zinc-900 border-zinc-800'}`}>
                  <Calendar className={`w-3 h-3 mb-0.5 transition-colors ${isLightTheme ? 'text-emerald-400' : 'text-zinc-600'}`} />
                  <span className={`text-base font-black transition-colors ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit' })}</span>
                </div>
                <div className="text-left">
                  <p className={`text-base font-black transition-colors ${isLightTheme ? 'text-emerald-900 group-hover:text-emerald-600' : 'text-white group-hover:text-green-400'}`}>{new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', month: 'long' })}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Package className={`w-3 h-3 transition-colors ${isLightTheme ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <p className={`text-xs font-bold uppercase tracking-wider transition-colors ${isLightTheme ? 'text-emerald-400' : 'text-zinc-500'}`}>{day.count} ventes</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className={`text-xl font-black leading-none transition-colors ${isLightTheme ? 'text-emerald-600' : 'text-green-400'}`}>{day.total.toFixed(2)} €</p>
                  <p className={`text-[9px] uppercase font-black tracking-widest mt-0.5 transition-colors ${isLightTheme ? 'text-emerald-600/40' : 'text-zinc-600'}`}>Total Journalier</p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isLightTheme ? 'bg-emerald-50 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-zinc-800 text-zinc-400 group-hover:bg-green-500 group-hover:text-black'}`}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
