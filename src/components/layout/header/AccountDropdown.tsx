import { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { User, Clock, QrCode, ShieldCheck, LogOut } from "lucide-react";
import { useOutsideClick } from "../../../hooks/useOutsideClick";
import { useSettingsStore } from "../../../store/settingsStore";

interface AccountDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: any;
  signOut: () => void;
  setIsLoyaltyModalOpen: (open: boolean) => void;
}

export default function AccountDropdown({
  isOpen,
  onClose,
  user,
  profile,
  signOut,
  setIsLoyaltyModalOpen,
}: AccountDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useOutsideClick(containerRef, () => {
    if (isOpen) onClose();
  });

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <button
        onClick={onClose}
        className={`flex items-center gap-2.5 p-1 rounded-full border transition-all duration-500 relative group/user ${
          isOpen
            ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_20px_rgba(57,255,20,0.4)]"
            : "bg-white/[0.03] border-white/10 text-zinc-300 hover:border-emerald-500/50 hover:bg-white/[0.08]"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
            isOpen
              ? "bg-black/20"
              : "bg-white/[0.08] group-hover/user:bg-emerald-500/20 group-hover/user:text-emerald-400"
          }`}
        >
          <User className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] pr-3 hidden lg:inline">
          {profile?.full_name?.split(" ")[0] ?? "Profil"}
        </span>
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl opacity-0 group-hover/user:opacity-100 transition-opacity duration-700 -z-10" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="absolute right-0 top-full mt-4 w-64 bg-zinc-900/95 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden z-[1010]"
          >
            <div className="p-2 space-y-1">
              <Link
                to="/compte"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/[0.05] hover:text-emerald-400 rounded-xl transition-all group/item"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center group-hover/item:bg-emerald-500/10 transition-colors">
                  <User className="h-3.5 w-3.5" />
                </div>
                Tableau de bord
              </Link>

              <Link
                to="/compte/commandes"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/[0.05] hover:text-emerald-400 rounded-xl transition-all group/item"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center group-hover/item:bg-emerald-500/10 transition-colors">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                Mes Commandes
              </Link>

              {useSettingsStore.getState().settings.loyalty_program_enabled && (
                <button
                  onClick={() => {
                    setIsLoyaltyModalOpen(true);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/[0.05] hover:text-amber-400 rounded-xl transition-all group/item"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center group-hover/item:bg-amber-400/10 transition-colors">
                    <QrCode className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  Ma Fidélité
                </button>
              )}

              {profile?.is_admin && (
                <Link
                  to="/admin"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500 hover:text-black rounded-xl transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  Administration
                </Link>
              )}

              <div className="h-px bg-white/[0.03] my-2 mx-2" />

              <button
                onClick={() => {
                  signOut();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all group/item"
              >
                <div className="w-8 h-8 rounded-lg bg-red-400/5 flex items-center justify-center group-hover/item:bg-red-400/10 transition-colors">
                  <LogOut className="h-3.5 w-3.5" />
                </div>
                Déconnexion
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
