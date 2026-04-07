import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore } from '../store/settingsStore';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Composant de Error Boundary global pour la boutique.
 * Capture les erreurs JavaScript dans les composants enfants et affiche un UI de repli.
 */
class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Met à jour l'état pour que le prochain rendu affiche l'UI de repli.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("[Uncaught Error]", error, errorInfo);
        // On pourrait ici envoyer l'erreur à un service de monitoring (ex: Sentry)
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined });
        window.location.reload();
    };

    private handleGoHome = () => {
        this.setState({ hasError: false, error: undefined });
        window.location.href = '/';
    };

    public render() {
        const { settings } = useSettingsStore.getState();
        const storeName = settings.store_name || 'Green Mood';

        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black flex items-center justify-center p-6 sm:p-10 relative overflow-hidden">
                    {/* Background Background */}
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(57,255,20,0.05)_0%,transparent_70%)]" />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-xl w-full bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center backdrop-blur-xl relative z-10 shadow-2xl"
                    >
                        <div className="w-20 h-20 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                            <AlertCircle className="w-10 h-10 text-red-500" />
                        </div>

                        <h2 className="text-3xl font-black text-white mb-6 tracking-tight">
                            Oops ! Un glitch s'est glissé dans la machine. 🕹️🔧
                        </h2>

                        <p className="text-zinc-400 mb-10 leading-relaxed max-w-md mx-auto">
                            Une erreur inattendue est survenue dans l'application. Nos ingénieurs {storeName} ont été notifiés (enfin, ils bossent déjà dessus !).
                        </p>

                        {/* Error Message Tooltip-style (optionnel, affiché seulement en dev ou pour les admins) */}
                        <div className="mb-10 p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl text-left overflow-auto max-h-32 scrollbar-hide">
                            <code className="text-[10px] text-zinc-500 font-mono break-all whitespace-pre-wrap">
                                {this.state.error?.toString()}
                            </code>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-green-400 text-black font-black py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(57,255,20,0.15)] hover:shadow-[0_0_30px_rgba(57,255,20,0.3)]"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Actualiser la page
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={this.handleGoHome}
                                className="flex-1 flex items-center justify-center gap-2 bg-zinc-800/50 hover:bg-zinc-800 text-white font-bold py-4 rounded-2xl border border-zinc-700/50 transition-all"
                            >
                                <Home className="w-5 h-5" />
                                Retour à l'accueil
                            </motion.button>
                        </div>

                        <div className="mt-12 flex items-center justify-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default group">
                            <img src={settings.store_logo_dark_url || settings.store_logo_url || "/logo.png"} alt={storeName} className="w-6 h-6 rounded-lg group-hover:rotate-12 transition-transform duration-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">{storeName} System</span>
                        </div>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
