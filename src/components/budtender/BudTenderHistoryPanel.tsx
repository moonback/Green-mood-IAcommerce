import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, History, Calendar, Leaf, ChevronRight } from "lucide-react";

interface BudTenderHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  isLoading: boolean;
  sessions: any[];
  onSelectSession: (session: any) => void;
}

export default function BudTenderHistoryPanel({
  isOpen,
  onClose,
  isLoggedIn,
  isLoading,
  sessions,
  onSelectSession,
}: BudTenderHistoryPanelProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute inset-0 z-30 bg-zinc-950 flex flex-col"
        >
          <div className="flex items-center gap-4 px-6 py-6 border-b border-white/5 bg-zinc-900/50">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black text-white tracking-tight">
              HISTORIQUE DES CHATS
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-zinc-950 to-zinc-900">
            {!isLoggedIn ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                  <History className="w-8 h-8 text-zinc-600" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Connectez-vous</p>
                  <p className="text-zinc-500 text-sm max-w-xs mx-auto mt-1">
                    L'historique des conversations est réservé aux membres de
                    notre boutique.
                  </p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-zinc-900/50 rounded-2xl animate-pulse border border-white/5"
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                  <History className="w-8 h-8 text-zinc-800" />
                </div>
                <p className="text-zinc-400 font-medium">
                  Aucune conversation trouvée.
                </p>
              </div>
            ) : (
              sessions.map((session) => (
                <motion.button
                  key={session.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelectSession(session)}
                  className="w-full text-left bg-zinc-900/40 hover:bg-zinc-900 border border-white/5 hover:border-emerald-500/30 p-5 rounded-2xl transition-all group shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-zinc-400">
                          {new Date(session.created_at).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white line-clamp-2 group-hover:text-emerald-400 transition-colors leading-relaxed">
                        {session.title || "Conseil machines de loisirs personnalisé"}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-[11px] text-zinc-500 font-medium">
                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                          <Leaf className="w-3 h-3 text-emerald-400" />
                          {session.messages.length} messages
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all flex-shrink-0">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
