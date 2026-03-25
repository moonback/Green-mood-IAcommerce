import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Ghost } from 'lucide-react';
import SEO from '../components/SEO';
import { useSettingsStore } from '../store/settingsStore';

export default function NotFound() {
    const settings = useSettingsStore((s) => s.settings);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springConfig = { damping: 25, stiffness: 150 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[color:var(--color-bg)]">
            {/* Grain texture */}
            <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Mouse-follow glow */}
            <motion.div
                style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
                className="absolute z-0 w-[600px] h-[600px] bg-[color:var(--color-primary)]/10 rounded-full blur-[140px] pointer-events-none opacity-20 mix-blend-screen"
            />
            <SEO
                title={`Page Introuvable | ${settings.store_name}`}
                description="Désolé, la page que vous recherchez n'existe pas ou a été déplacée."
            />

            {/* Background Decorative Glows */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[color:var(--color-primary)]/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[color:var(--color-primary)]/5 rounded-full blur-[100px]" />

            <div className="max-w-md w-full text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="mb-8 flex justify-center"
                >
                    <div className="relative">
                        <Ghost className="w-24 h-24 text-[color:var(--color-primary)]/20" />
                        <motion.div
                            animate={{
                                y: [0, -10, 0],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <span className="text-7xl font-black text-[color:var(--color-text)] tracking-tighter drop-shadow-[0_0_15px_rgba(57,255,20,0.5)]">
                                404
                            </span>
                        </motion.div>
                    </div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-black text-[color:var(--color-text)] mb-4 tracking-tight"
                >
                    Oups ! Vous semblez perdu dans l'espace 🌿
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-[color:var(--color-text-muted)] mb-10 leading-relaxed"
                >
                    La page que vous cherchez n'existe pas ou nous l'avons déplacée pour faire de la place à nos nouvelles pépites N10.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row gap-4"
                >
                    <Link
                        to="/"
                        className="flex-1 flex items-center justify-center gap-2 bg-[color:var(--color-primary)] hover:brightness-110 text-[color:var(--color-primary-contrast)] font-black py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(57,255,20,0.2)] hover:shadow-[0_0_30px_rgba(57,255,20,0.4)]"
                    >
                        <Home className="w-5 h-5" />
                        Retour à l'accueil
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="flex-1 flex items-center justify-center gap-2 bg-[color:var(--color-bg-elevated)]/70 hover:bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text)] font-bold py-4 rounded-2xl border border-[color:var(--color-border)] transition-all backdrop-blur-md"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Page précédente
                    </button>
                </motion.div>

                {/* Quick Links */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-12 pt-8 border-t border-[color:var(--color-border)]"
                >
                    <p className="text-xs font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] mb-4">Besoin d'aide ?</p>
                    <div className="flex justify-center gap-6 text-sm">
                        <Link to="/catalogue" className="text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] transition-colors">Notre Catalogue</Link>
                        <Link to="/contact" className="text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] transition-colors">Contactez-nous</Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
