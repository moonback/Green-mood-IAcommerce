import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../ThemeProvider';

type MessageType = 'standard' | 'restock' | 'skip-quiz' | 'terpene';

export interface BudTenderMessageProps {
    sender: 'bot' | 'user';
    text?: string;
    type?: MessageType;
    isTyping?: boolean;
    children?: React.ReactNode;
    budtenderName?: string;
    onCopy?: () => void;
    isCopied?: boolean;
    timestamp?: Date;
}

function formatTime(date: Date): string {
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "À l'instant";
    if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)}m`;
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function BudTenderMessage({
    sender,
    text,
    type: _type,
    isTyping: _isTyping,
    children,
    budtenderName = 'Cortex',
    onCopy,
    isCopied,
    timestamp,
}: BudTenderMessageProps) {
    const [isHovered, setIsHovered] = useState(false);
    const { resolvedTheme } = useTheme();
    const isLightTheme = resolvedTheme === 'light';

    const markdownComponents = {
        p: ({ children }: { children: React.ReactNode }) => (
            <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
        ),
        strong: ({ children }: { children: React.ReactNode }) => (
            <strong className={`font-black ${sender === 'bot' ? 'text-emerald-400' : 'text-black opacity-90'}`}>
                {children}
            </strong>
        ),
        em: ({ children }: { children: React.ReactNode }) => (
            <em className="italic opacity-80">{children}</em>
        ),
        ul: ({ children }: { children: React.ReactNode }) => (
            <ul className="list-none ml-0 my-3 space-y-2">{children}</ul>
        ),
        ol: ({ children }: { children: React.ReactNode }) => (
            <ol className="list-decimal ml-5 my-3 space-y-2">{children}</ol>
        ),
        li: ({ children }: { children: React.ReactNode }) => (
            <li className="leading-relaxed flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 bg-emerald-500/60 rounded-full flex-shrink-0" />
                <span>{children}</span>
            </li>
        ),
        code: ({ children, className }: { children: React.ReactNode; className?: string }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
                return (
                    <code className={`block px-4 py-3 rounded-xl text-[0.8em] font-mono border my-2 overflow-x-auto ${isLightTheme ? 'bg-slate-100 text-emerald-700 border-emerald-500/15' : 'bg-zinc-950/60 text-emerald-400/90 border-emerald-500/10'}`}>
                        {children}
                    </code>
                );
            }
            return (
                <code className={`px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border ${isLightTheme ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/15' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {children}
                </code>
            );
        },
        blockquote: ({ children }: { children: React.ReactNode }) => (
            <blockquote className={`border-l-2 border-emerald-500/30 pl-3 my-2 italic ${isLightTheme ? 'text-slate-500' : 'text-zinc-400'}`}>
                {children}
            </blockquote>
        ),
        h3: ({ children }: { children: React.ReactNode }) => (
            <h3 className={`font-black text-sm uppercase tracking-wider mt-3 mb-1 ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>{children}</h3>
        ),
    };

    const isBot = sender === 'bot';

    return (
        <div className={`flex ${isBot ? 'justify-start budtender-msg-bot' : 'justify-end budtender-msg-user'} items-end gap-3 sm:gap-4 group/msg`}>
            {/* Bot avatar */}
            {isBot && (
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center mb-1 flex-shrink-0 relative overflow-hidden group ${isLightTheme ? 'bg-white border-emerald-500/15 shadow-[0_10px_24px_rgba(15,23,42,0.08)]' : 'bg-zinc-900 border-emerald-500/20 shadow-[0_0_15px_rgba(57,255,20,0.08)]'}`}>
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 relative z-10" />
                </div>
            )}

            <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col gap-1 ${isBot ? 'items-start' : 'items-end'}`}>
                {/* Bot label + timestamp */}
                {isBot && text && (
                    <div className="flex items-center gap-2 ml-1">
                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
                        <span className="text-[11px] font-mono text-emerald-400/50 tracking-tighter uppercase">
                            {budtenderName}
                        </span>
                        {timestamp && (
                            <span className={`text-[10px] font-mono opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200 ${isLightTheme ? 'text-slate-400' : 'text-zinc-700'}`}>
                                · {formatTime(timestamp)}
                            </span>
                        )}
                    </div>
                )}

                {/* Bubble */}
                {text && (
                    <div
                        className="relative"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                            className={`px-5 py-3.5 sm:px-6 sm:py-4 text-sm sm:text-base leading-relaxed relative ${isBot
                                    ? isLightTheme
                                        ? 'rounded-2xl rounded-bl-sm text-slate-800 font-medium border border-slate-200 shadow-[0_16px_32px_rgba(15,23,42,0.08)]'
                                        : 'rounded-2xl rounded-bl-sm text-zinc-100 font-medium border border-white/[0.06] shadow-2xl'
                                    : isLightTheme
                                        ? 'rounded-2xl rounded-br-sm bg-gradient-to-br from-emerald-500 to-emerald-400 text-white font-bold shadow-[0_12px_28px_rgba(16,185,129,0.18)]'
                                        : 'rounded-2xl rounded-br-sm bg-gradient-to-br from-emerald-500 to-emerald-400 text-black font-bold shadow-[0_8px_24px_rgba(57,255,20,0.12)]'
                                }`}
                            style={isBot ? {
                                backgroundColor: isLightTheme ? 'rgba(255, 255, 255, 0.92)' : 'rgba(28, 28, 32, 0.65)',
                                backdropFilter: 'blur(16px)',
                                boxShadow: isLightTheme
                                    ? '0 12px 28px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.5)'
                                    : '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
                            } : {}}
                        >
                            {isBot ? (
                                <ReactMarkdown components={markdownComponents as any}>
                                    {text}
                                </ReactMarkdown>
                            ) : (
                                <span>{text}</span>
                            )}

                            {/* Corner accent */}
                            {isBot && (
                                <div className="absolute top-0 right-0 w-px h-6 bg-gradient-to-b from-emerald-500/20 to-transparent rounded-tr-2xl" />
                            )}
                        </motion.div>

                        {/* Copy button – bot only, shows on hover */}
                        {isBot && onCopy && (
                            <AnimatePresence>
                                {isHovered && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.75 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.75 }}
                                        transition={{ duration: 0.15 }}
                                        onClick={onCopy}
                                        className={`absolute -top-2.5 -right-2.5 w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shadow-lg ${isLightTheme ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-emerald-500/40' : 'bg-zinc-800 border-white/10 text-zinc-400 hover:text-white hover:border-emerald-500/40'}`}
                                        title="Copier"
                                    >
                                        {isCopied
                                            ? <Check className="w-3 h-3 text-emerald-400" />
                                            : <Copy className="w-3 h-3" />
                                        }
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        )}
                    </div>
                )}

                {/* User timestamp */}
                {!isBot && timestamp && (
                    <span className={`text-[10px] font-mono opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200 mr-1 ${isLightTheme ? 'text-slate-400' : 'text-zinc-700'}`}>
                        {formatTime(timestamp)}
                    </span>
                )}

                {/* Slot for cards, quiz, feedback, etc. */}
                {children}
            </div>
        </div>
    );
}
