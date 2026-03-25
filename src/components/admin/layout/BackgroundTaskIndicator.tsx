import { motion, AnimatePresence } from 'motion/react';
import { Brain, Cpu } from 'lucide-react';
import { useBackgroundTaskStore } from '../../../store/backgroundTaskStore';

export default function BackgroundTaskIndicator() {
  const { isSyncingAI, aiSyncProgress, isSyncingVectors, vectorSyncProgress } = useBackgroundTaskStore();

  const showAI = isSyncingAI && aiSyncProgress;
  const showVectors = isSyncingVectors && vectorSyncProgress;

  if (!showAI && !showVectors) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 w-80">
      <AnimatePresence>
        {showAI && (
          <motion.div
            key="ai-sync"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="bg-slate-900/70/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider">Traitement IA massif</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      {aiSyncProgress!.done} / {aiSyncProgress!.total} produits
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-purple-400">{Math.round((aiSyncProgress!.done / aiSyncProgress!.total) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-slate-900/80/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(aiSyncProgress!.done / aiSyncProgress!.total) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-[9px] text-slate-400 mt-2 italic">Vous pouvez naviguer, l'opération continue...</p>
            </div>
          </motion.div>
        )}

        {showVectors && (
          <motion.div
            key="vector-sync"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="bg-slate-900/70/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-green-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider">Sync Vecteurs</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      {vectorSyncProgress!.done} / {vectorSyncProgress!.total} produits
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-green-400">{Math.round((vectorSyncProgress!.done / vectorSyncProgress!.total) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-slate-900/80/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-500 to-[#06b6d4]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(vectorSyncProgress!.done / vectorSyncProgress!.total) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-[9px] text-slate-400 mt-2 italic">Vous pouvez naviguer, l'opération continue...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}