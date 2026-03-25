import { motion } from 'motion/react';
import { useTheme } from '../ThemeProvider';

export default function BudTenderBackground() {
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === 'light';

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base Gradient */}
      <div className={`absolute inset-0 ${isLightTheme ? 'bg-slate-50' : 'bg-zinc-950'}`} />
      <div className={`absolute inset-0 ${isLightTheme ? 'bg-gradient-to-br from-emerald-500/10 via-white to-slate-100' : 'bg-gradient-to-br from-emerald-500/5 via-transparent to-zinc-950'}`} />
      
      {/* Precision Grid */}
      <div
        className={`absolute inset-0 ${isLightTheme ? 'opacity-[0.05]' : 'opacity-[0.03]'}`}
        style={{
          backgroundImage: `linear-gradient(${isLightTheme ? 'rgba(16,185,129,0.18)' : '#39ff14'} 1px, transparent 1px), linear-gradient(90deg, ${isLightTheme ? 'rgba(16,185,129,0.18)' : '#39ff14'} 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Radial Glows */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] ${isLightTheme ? 'bg-emerald-500/15' : 'bg-emerald-500/20'}`}
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.05, 0.1, 0.05],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] ${isLightTheme ? 'bg-sky-400/12' : 'bg-emerald-500/10'}`}
      />

      {/* Scanning Beam */}
      <motion.div
        animate={{
          y: ['-100%', '200%'],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className={`absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent ${isLightTheme ? 'via-emerald-500/30' : 'via-emerald-500/20'} to-transparent blur-[1px] z-10`}
      />

      {/* Floating Precision Elements */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: Math.random() * 100 + '%', y: Math.random() * 100 + '%' }}
            animate={{ 
              opacity: [0, 0.3, 0],
              scale: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
            className={`absolute w-[1px] h-[40px] ${isLightTheme ? 'bg-emerald-500/30' : 'bg-emerald-500/40'}`}
          />
        ))}
      </div>
    </div>
  );
}
