import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { NAV_LINKS } from "../../../constants/navigation";

export default function NavDesktop() {
  const location = useLocation();

  return (
    <nav className="relative z-[1001] hidden lg:flex items-center justify-center pt-2 pb-6">
      <div className="flex items-center gap-1 p-1 bg-white/[0.02] border border-white/[0.04] rounded-2xl backdrop-blur-md">
        {NAV_LINKS.map((link) => {
          const isActive =
            location.pathname === link.path ||
            (link.path !== "/" && location.pathname.startsWith(link.path));
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`relative px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.25em] transition-all duration-500 group ${isActive ? "text-emerald-400" : "text-zinc-500 hover:text-white"
                }`}
            >
              <span className="relative z-10 transition-transform duration-300 group-hover:scale-105 inline-block">
                {link.name}
              </span>

              {isActive ? (
                <motion.div
                  layoutId="nav-active-premium"
                  className="absolute inset-0 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)] -z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              ) : (
                <div className="absolute inset-0 bg-transparent rounded-xl group-hover:bg-white/[0.03] transition-all duration-300 -z-0" />
              )}

              {isActive && (
                <motion.span
                  layoutId="nav-glow-dot"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-px bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
