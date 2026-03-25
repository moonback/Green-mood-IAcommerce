import { motion } from 'motion/react';
import { Leaf } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

/**
 * Animated typing indicator shown while the bot is composing a response.
 * Displays the bot avatar alongside three pulsing dots.
 */
export default function BudTenderTypingIndicator() {
    const { resolvedTheme } = useTheme();
    const isLightTheme = resolvedTheme === 'light';

    return (
        <div className="flex justify-start items-end gap-3 sm:gap-4 budtender-typing-indicator">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center mb-1 flex-shrink-0 ${isLightTheme ? 'bg-white border-emerald-500/15 shadow-[0_10px_24px_rgba(15,23,42,0.08)]' : 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_rgba(57,255,20,0.1)]'}`}>
                <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div
                className={`px-6 py-5 rounded-[1.5rem] sm:rounded-[1.75rem] rounded-bl-none flex gap-1.5 border shadow-xl pointer-events-none ${isLightTheme ? 'border-slate-200' : 'border-white/10'}`}
                style={{
                    backgroundColor: isLightTheme ? 'rgba(255, 255, 255, 0.88)' : 'rgba(24, 24, 27, 0.7)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: isLightTheme
                        ? '0 10px 24px rgba(15,23,42,0.08), inset 0 1px 1px rgba(255,255,255,0.5)'
                        : 'inset 0 1px 1px rgba(255,255,255,0.05)'
                }}
            >
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="w-2 h-2 bg-emerald-500 rounded-full"
                        animate={{
                            opacity: [0.3, 1, 0.3],
                            scale: [0.8, 1.1, 0.8],
                            boxShadow: [
                                '0 0 0 rgba(57,255,20,0)',
                                '0 0 8px rgba(57,255,20,0.4)',
                                '0 0 0 rgba(57,255,20,0)'
                            ]
                        }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                    />
                ))}
            </div>
        </div>
    );
}
