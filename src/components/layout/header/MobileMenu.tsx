import { motion, AnimatePresence } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { X, User, QrCode, LogOut, ShieldCheck, Zap, ArrowRight, Home } from "lucide-react";
import { NAV_LINKS } from "../../../constants/navigation";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: any;
  signOut: () => void;
  setIsLoyaltyModalOpen: (open: boolean) => void;
  settings: any;
}

import { useTheme } from "../../ThemeProvider";


export default function MobileMenu({
  isOpen,
  onClose,
  user,
  profile,
  signOut,
  setIsLoyaltyModalOpen,
  settings,
}: MobileMenuProps) {
  const { resolvedTheme } = useTheme();
  const location = useLocation();

  const logoUrl = resolvedTheme === 'dark' 
    ? (settings.store_logo_dark_url || settings.store_logo_url || '/logo.png')
    : (settings.store_logo_url || '/logo.png');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 200 }}
          className="fixed inset-0 z-[100] lg:hidden bg-[#050505] flex flex-col overflow-hidden"
        >
          {/* Decorative Glows */}
          <div className="absolute top-0 right-0 w-[100%] h-[50%] bg-emerald-500/[0.03] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[80%] h-[40%] bg-emerald-500/[0.02] blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

          {/* Header Area */}
          <div className="flex items-center justify-between px-6 h-24 relative z-10 border-b border-white/[0.04] bg-black/40 backdrop-blur-3xl">
            <Link to="/" className="flex items-center" onClick={onClose}>
              <img
                src={logoUrl}

                alt={settings.store_name}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <button
              onClick={onClose}
              className="p-3 text-zinc-400 hover:text-white rounded-2xl bg-white/[0.03] border border-white/[0.06] active:scale-90 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-6 py-8 relative z-10 scrollbar-none">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-black tracking-[0.4em] text-zinc-600 mb-6 ml-4">
                Navigation
              </span>
              {NAV_LINKS.map((link, i) => {
                const isActive = location.pathname === link.path;
                return (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      to={link.path}
                      onClick={onClose}
                      className={`group flex items-center justify-between px-6 py-5 rounded-[2rem] border transition-all duration-300 ${
                        isActive
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-white/[0.02] border-white/[0.04] text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="text-2xl font-serif font-black tracking-tight italic">
                        {link.name}
                      </span>
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          isActive
                            ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                            : "bg-white/5 text-zinc-600 group-hover:bg-emerald-500/20 group-hover:text-emerald-400"
                        }`}
                      >
                        {isActive ? <ArrowRight className="w-5 h-5" /> : <Zap className="w-4 h-4" />}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </nav>

          {/* Footer Area / User Account */}
          <div className="px-6 pb-12 pt-6 border-t border-white/[0.06] bg-black/60 backdrop-blur-3xl relative z-20">
            {user ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 p-5 bg-white/[0.03] rounded-3xl border border-white/[0.06] shadow-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center text-emerald-400 border border-emerald-500/10">
                    <User className="w-7 h-7" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-0.5">
                      Session Active
                    </span>
                    <span className="text-xl font-serif font-black text-white truncate italic">
                      {profile?.full_name ?? "Client Mood"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/compte"
                    onClick={onClose}
                    className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-2.5xl hover:bg-white/[0.06] transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
                      <Home className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                      Mon Compte
                    </span>
                  </Link>

                  {settings.loyalty_program_enabled && (
                    <button
                      onClick={() => {
                        setIsLoyaltyModalOpen(true);
                        onClose();
                      }}
                      className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-2.5xl hover:bg-white/[0.06] transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                        Ma Carte
                      </span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {profile?.is_admin && (
                    <Link
                      to="/admin"
                      onClick={onClose}
                      className="flex items-center justify-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2.5xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                    >
                      <ShieldCheck className="h-4 w-4" /> Administration
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      signOut();
                      onClose();
                    }}
                    className={`flex items-center justify-center gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-2.5xl hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all group ${!profile?.is_admin ? "col-span-2" : ""}`}
                  >
                    <LogOut className="h-4.5 w-4.5 text-zinc-500 group-hover:text-red-400 group-hover:scale-110 transition-all" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-red-400">
                      Déconnexion
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/connexion"
                onClick={onClose}
                className="flex items-center justify-center gap-4 p-5 bg-emerald-500 text-black rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                <User className="h-5 w-5" /> Accéder à mon espace
              </Link>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
