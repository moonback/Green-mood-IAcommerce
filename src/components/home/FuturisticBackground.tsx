import React from 'react';
import { motion } from 'motion/react';

const FuturisticBackground: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[color:var(--color-bg)]">
      {/* Dynamic Mesh Gradients */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -left-[10%] top-[-5%] h-[800px] w-[800px] rounded-full bg-[color:var(--color-primary)]/15 blur-[120px] mix-blend-screen opacity-60"
      />
      
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, -30, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -right-[5%] top-[15%] h-[700px] w-[700px] rounded-full bg-indigo-500/10 blur-[100px] mix-blend-overlay opacity-40"
      />

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [20, -20, 20],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute left-[20%] top-[60%] h-[600px] w-[600px] rounded-full bg-fuchsia-500/5 blur-[150px] opacity-30"
      />

      {/* Cyber Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
        }}
      />

      {/* Moving Particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              x: Math.random() * 100 + '%', 
              y: Math.random() * 100 + '%' 
            }}
            animate={{ 
              opacity: [0, 0.5, 0],
              y: [null, '-=100']
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 20,
              ease: "linear"
            }}
            className="absolute h-1 w-1 rounded-full bg-[color:var(--color-primary)]/40 blur-[1px]"
          />
        ))}
      </div>

      {/* Futuristic Scanning Line */}
      <motion.div
        animate={{
          top: ['-10%', '110%']
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--color-primary)]/20 to-transparent z-10 opacity-30"
      />
    </div>
  );
};

export default FuturisticBackground;
