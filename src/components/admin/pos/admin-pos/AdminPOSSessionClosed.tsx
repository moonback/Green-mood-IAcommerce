import { motion } from 'motion/react';
import { History as HistoryIcon, Lock, LogOut } from 'lucide-react';

interface AdminPOSSessionClosedProps {
  isLightTheme: boolean;
  onExit?: () => void;
  onOpenHistory: () => void;
  onRequestUnlock: () => void;
}

export function AdminPOSSessionClosed({ isLightTheme, onExit, onOpenHistory, onRequestUnlock }: AdminPOSSessionClosedProps) {
  return (
    <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-xl rounded-[3rem] border shadow-2xl m-1 transition-all ${isLightTheme ? 'bg-white/80 border-emerald-100' : 'bg-zinc-950/80 border-zinc-800'}`}>
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`flex flex-col items-center text-center p-12 border rounded-[3rem] shadow-2xl max-w-lg transition-all ${isLightTheme ? 'bg-white border-emerald-100 shadow-emerald-200/50' : 'bg-zinc-900/50 border-zinc-800 shadow-black/50'}`}>
        <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-8 border transition-all ${isLightTheme ? 'bg-red-50 border-red-100' : 'bg-red-600/10 border-red-600/20'}`}><Lock className="w-12 h-12 text-red-500 animate-pulse" /></div>
        <h2 className={`text-4xl font-black mb-4 tracking-tighter uppercase transition-colors ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Caisse Clôturée</h2>
        <p className={`text-lg font-medium leading-[1.6] mb-10 transition-colors ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-400'}`}>La journée de vente est terminée.<br />Le rapport Z a été validé et sécurisé.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={onOpenHistory} className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all border ${isLightTheme ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500'}`}><HistoryIcon className="w-5 h-5" />Consulter l'Historique</button>
          <button onClick={onRequestUnlock} className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all border ${isLightTheme ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:text-white' : 'bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white'}`}><Lock className="w-5 h-5" />Forcer Ouverture</button>
          {onExit && <button onClick={onExit} className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all border w-full sm:w-auto justify-center ${isLightTheme ? 'bg-emerald-50 text-emerald-400 border-emerald-100 hover:text-emerald-600' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-500'}`}><LogOut className="w-5 h-5" />Quitter la Caisse</button>}
        </div>
        <p className={`mt-12 text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${isLightTheme ? 'text-emerald-200' : 'text-zinc-600'}`}>Prêt pour la réouverture demain matin</p>
      </motion.div>
    </div>
  );
}
