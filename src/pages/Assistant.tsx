import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { applyProductImageFallback, getProductImageSrc } from "../lib/productImage";
import {
  Send,
  Sparkles,
  ChevronLeft,
  Plus,
  History as HistoryIcon,
  Trash2,
  Share2,
  Mic,
  StopCircle,
  Package,
  ArrowRight,
  User,
  Bot,
  MessageSquare,
  Award,
  Settings as SettingsIcon,
  ChevronRight,
  Info,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  ShoppingBag,
  Download
} from "lucide-react";

import { useCartStore } from "../store/cartStore";
import { useSettingsStore } from "../store/settingsStore";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";
import { useBudTenderMemory, SavedPrefs } from "../hooks/useBudTenderMemory";
import { useBudTenderQuiz } from "../hooks/useBudTenderQuiz";
import { useBudTenderChat } from "../hooks/useBudTenderChat";
import { getCachedProducts, getCachedSettings } from "../lib/budtenderCache";
import { Product } from "../lib/types";
import { BudTenderSettings } from "../lib/budtenderSettings";
import { useBudtenderStore } from "../store/budtenderStore";
import { useToastStore } from "../store/toastStore";
import { Message } from "../lib/budtenderHelpers";
import StarRating from "../components/StarRating";
import SEO from "../components/SEO";
import ToastContainer from "../components/Toast";
import CartSidebar from "../components/CartSidebar";
import VoiceAdvisor from "../components/VoiceAdvisor";
import { useTheme } from "../components/ThemeProvider";

const SoundWave = () => (
  <div className="flex items-center justify-center gap-1 h-8">
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        animate={{ height: [4, 16, 4] }}
        transition={{
          repeat: Infinity,
          duration: 0.8,
          delay: i * 0.1,
          ease: "easeInOut"
        }}
        className="w-1 bg-cyan-400 rounded-full"
      />
    ))}
  </div>
);

export default function Assistant() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === 'light';
  const { settings: globalSettings } = useSettingsStore();
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const { addItem, openSidebar: openCart, items } = useCartStore();
  const itemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // UI States
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [cartConfirm, setCartConfirm] = useState<Product | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Quiz & Chat logic
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<BudTenderSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [techSelection, setTechSelection] = useState<string[]>([]);
  const [awaitingTech, setAwaitingTech] = useState(false);

  const memory = useBudTenderMemory();

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [p, s] = await Promise.all([
          getCachedProducts(),
          getCachedSettings(),
        ]);
        setProducts(p);
        setSettings(s);
      } catch (err) {
        console.error("[Assistant] Data fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);



  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const addBotMessage = useCallback((msg: any, delay?: number) => {
    const newMsg = { id: Math.random().toString(36), sender: "bot", ...msg };
    if (delay) {
      setTimeout(() => {
        setMessages(prev => [...prev, newMsg]);
      }, delay);
    } else {
      setMessages(prev => [...prev, newMsg]);
    }
  }, []);

  const addUserMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: Math.random().toString(36), sender: "user", text }]);
  }, []);

  const logQuestion = async (text: string) => {
    if (user) {
      await supabase.from("budtender_interactions").insert({
        user_id: user.id,
        interaction_type: "question",
        user_message: text,
      });
    }
  };

  // Feedback handler
  const handleFeedback = async (messageId: string, feedback: 'up' | 'down') => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedback } : m
    ));

    if (user) {
      await supabase.from('budtender_interactions').insert({
        user_id: user.id,
        interaction_type: 'feedback',
        quiz_answers: { message_id: messageId, feedback },
        created_at: new Date().toISOString()
      });

      addToast({
        message: feedback === 'up' ? "Merci pour votre retour positif !" : "Merci, nous allons nous améliorer.",
        type: feedback === 'up' ? 'success' : 'info'
      });
    }
  };

  // Helper to get all products mentioned in a message (explicit or from text)
  const getProductsFromMessage = useCallback((msg: any) => {
    const existing = msg.products || msg.recommended || [];
    if (msg.sender !== 'bot' || !msg.text) return existing;

    // Scan text for product names that aren't already in the list
    const fromText = products.filter(p =>
      msg.text.toLowerCase().includes(p.name.toLowerCase()) &&
      !existing.find((e: Product) => e.id === p.id)
    );

    return [...existing, ...fromText];
  }, [products]);

  // Sync mentioned products
  const [mentionedProducts, setMentionedProducts] = useState<Product[]>([]);
  useEffect(() => {
    const allP = messages.reduce((acc: Product[], msg) => {
      const items = getProductsFromMessage(msg);
      return [...acc, ...items];
    }, []);
    const unique = allP.reduce((acc: Product[], p) => {
      if (!acc.find(item => item.id === p.id)) acc.push(p);
      return acc;
    }, []);
    setMentionedProducts(unique.reverse()); // Latest mentioned first
  }, [messages, getProductsFromMessage]);

  // Auto-save history to DB
  useEffect(() => {
    if (messages.length > 0) {
      memory.saveChatHistory(messages);
    }
  }, [messages]);

  // Load history on mount
  useEffect(() => {
    memory.fetchAllSessions();
  }, []);

  const handleViewProduct = useCallback((p: Product) => {
    navigate(`/catalogue/${p.slug}`);
  }, [navigate]);

  // Integration with existing hooks
  const { handleSendMessage, handleRegenerateResponse } = useBudTenderChat({
    chatInput,
    isTyping,
    settings: settings || { ai_enabled: false } as any,
    messages,
    products,
    memory,
    setChatInput,
    setIsTyping,
    setMessages,
    addUserMessage,
    addBotMessage,
    addItem,
    openSidebar: openCart,
    onViewProduct: handleViewProduct,
    logQuestion,
  });

  const { startQuiz, handleAnswer, skipQuizAndRecommend, confirmTerpeneSelection } = useBudTenderQuiz({
    settings: settings || { quiz_steps: [] } as any,
    products,
    messages,
    answers,
    stepIndex,
    terpeneSelection: techSelection,
    memory,
    setStepIndex,
    setAnswers,
    setAwaitingTerpene: setAwaitingTech,
    setTerpeneSelection: setTechSelection,
    setIsTyping,
    setMessages,
    addBotMessage,
    addUserMessage,
  });

  const welcomedRef = useRef(false);

  // Welcome flow
  useEffect(() => {
    if (!isLoading && messages.length === 0 && !welcomedRef.current && (settings?.ai_enabled || globalSettings.budtender_chat_enabled)) {
      welcomedRef.current = true;
      const searchParams = new URLSearchParams(window.location.search);
      const productSlug = searchParams.get('product');

      const { userName, restockCandidates, savedPrefs } = memory;
      const greeting = userName ? `Hello ${userName} !` : "Bonjour !";

      if (productSlug && products.length > 0) {
        const product = products.find(p => p.slug === productSlug);
        if (product) {
          handleRegenerateResponse(`L'utilisateur vient de consulter le produit "${product.name}". Accueille-le chaleureusement et propose ton expertise sur ce produit précisément.`);
          return;
        }
      }

      let welcomeText = `${greeting} Je suis **${globalSettings.budtender_name || 'PlayAdvisor'}**, votre assistant expert. Prêt à configurer ensemble vos équipements de loisirs d'exception ?`;
      if (restockCandidates.length > 0) {
        welcomeText += "\n\n🔄 **Il est peut-être temps de renouveler vos favoris ?** J'ai quelques suggestions basées sur vos anciennes commandes.";
      }

      setMessages([{
        id: "welcome",
        sender: "bot",
        text: welcomeText,
        type: savedPrefs ? "skip-quiz" : (restockCandidates.length > 0 ? "restock" : "standard"),
        restockProducts: restockCandidates.length > 0 ? restockCandidates : undefined
      }] as Message[]);
    }
  }, [isLoading, memory, globalSettings.budtender_name, globalSettings.budtender_chat_enabled, products, messages.length, handleRegenerateResponse, settings]);


  const resetChat = () => {
    setMessages([]);
    setStepIndex(-1);
    setAnswers({});
    setTechSelection([]);
    memory.clearChatHistory();
    memory.setActiveDbId(null); // Key fix: Clear active session ID on reset
    // Force welcome message after reset
    setTimeout(() => {
      const welcome: Message = {
        id: Math.random().toString(36).substring(7),
        sender: 'bot',
        text: `Bonjour ! Je suis votre assistant expert. Comment puis-je vous aider aujourd'hui ?`,
        versions: [`Bonjour ! Je suis votre assistant expert. Comment puis-je vous aider aujourd'hui ?`],
        currentVersionIndex: 0
      };
      setMessages([welcome]);
    }, 100);
  };

  const handleDeleteAllHistories = async () => {
    setConfirmDialog({
      title: 'Tout effacer',
      message: 'Voulez-vous vraiment effacer TOUTES vos discussions ? Cette action est irréversible.',
      onConfirm: async () => {
        await memory.deleteAllSessions();
        resetChat();
        setShowSettings(false);
        addToast({
          message: "Toutes les discussions ont été effacées.",
          type: "success"
        });
        setConfirmDialog(null);
      }
    });
  };

  const exportAllHistories = () => {
    if (memory.allChatSessions.length === 0) return;

    const data = memory.allChatSessions.map(session => ({
      titre: session.title,
      date: session.created_at,
      messages: session.messages.map(m => ({
        auteur: m.sender === 'user' ? 'Vous' : (globalSettings.budtender_name || 'Assistant'),
        texte: m.text,
        date: m.id // Message ID can be used as unique identifier
      }))
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `playadvisor-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast({
      message: "Export réussi ! Le fichier a été téléchargé.",
      type: "success"
    });
  };

  const handleAddToCart = (p: Product) => {
    addItem(p, 1);
    setCartConfirm(p);
    setTimeout(() => setCartConfirm(null), 3500);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isLightTheme ? 'bg-slate-50' : 'bg-slate-950'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-emerald-500 font-black uppercase tracking-widest text-xs">Initialisation de l'IA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex overflow-hidden font-sans ${isLightTheme ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-white'}`}>
      <ToastContainer />
      <CartSidebar />

      {/* Confirm Dialog Overlay */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border ${isLightTheme ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className={`text-lg font-black mb-2 tracking-tight ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
                {confirmDialog.title}
              </h3>
              <p className={`text-sm mb-6 leading-relaxed ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                {confirmDialog.message}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-colors ${isLightTheme ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors shadow-lg shadow-red-500/25"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Confirmation Overlay */}
      <AnimatePresence>
        {cartConfirm && (
          <motion.div
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed top-6 right-6 z-[9999] w-80 backdrop-blur-2xl border border-emerald-500/30 rounded-3xl overflow-hidden ${isLightTheme ? 'bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.12)]' : 'bg-slate-900/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)] shadow-emerald-500/10'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="p-5 flex gap-4 items-start">
              <div className={`w-16 h-16 rounded-2xl overflow-hidden p-2 shrink-0 ${isLightTheme ? 'bg-slate-100 border border-slate-200' : 'bg-slate-950 border border-white/10'}`}>
                <img src={getProductImageSrc(cartConfirm.image_url)} className="w-full h-full object-contain" alt={cartConfirm.name} onError={applyProductImageFallback} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Ajouté au panier</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className={`text-sm font-bold truncate ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>{cartConfirm.name}</p>
                <p className="text-xs text-emerald-400 font-black mt-0.5">{cartConfirm.price}€</p>
              </div>
              <button
                onClick={() => setCartConfirm(null)}
                className={`transition-colors p-1 shrink-0 ${isLightTheme ? 'text-slate-400 hover:text-slate-900' : 'text-slate-500 hover:text-white'}`}
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => setCartConfirm(null)}
                className={`flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all ${isLightTheme ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'}`}
              >
                Continuer
              </button>
              <button
                onClick={() => { setCartConfirm(null); openCart(); }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-[10px] font-black uppercase hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-3 h-3" /> Voir Panier
              </button>
            </div>
            {/* Progress bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 3.5, ease: 'linear' }}
              className="h-0.5 bg-emerald-500 origin-left"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <SEO
        title={`${globalSettings.budtender_name || 'Assistant'} | PlayAdvisor Expert AI`}
        description="Bénéficiez de conseils personnalisés avec notre expert IA pour choisir vos machines de loisirs."
      />

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full blur-[100px] ${isLightTheme ? 'bg-white/60' : 'bg-slate-900/40'}`} />
      </div>

      {/* Sidebar - Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className={`hidden lg:flex flex-col backdrop-blur-3xl overflow-hidden pointer-events-auto ${isLightTheme ? 'border-r border-slate-200 bg-white/75' : 'border-r border-white/5 bg-slate-900/40'}`}
      >
        <div className="p-6 flex flex-col h-full gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-black text-sm uppercase tracking-wider">{globalSettings.budtender_name || 'PlayAdvisor'}</h1>
              <p className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">Expert Certifié</p>
            </div>
          </div>

          <button
            onClick={resetChat}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all group ${isLightTheme ? 'bg-slate-50 border-slate-200 hover:border-emerald-500/30 hover:bg-emerald-50' : 'bg-white/5 border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5'}`}
          >
            <Plus className={`w-4 h-4 ${isLightTheme ? 'text-slate-500 group-hover:text-emerald-500' : 'text-slate-400 group-hover:text-emerald-400'}`} />
            <span className={`text-sm font-bold ${isLightTheme ? 'text-slate-700 group-hover:text-slate-900' : 'text-slate-300 group-hover:text-white'}`}>Nouvelle Discussion</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 flex items-center justify-between">
                <span>Récent</span>
              </p>
              {memory.allChatSessions.slice(0, 5).map(session => (
                <div key={`${session.id}-${(session as any).dbId}`} className="group/item relative">
                  <button
                    onClick={() => {
                      setMessages((session as any).messages);
                      memory.setActiveDbId((session as any).dbId);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-colors group flex items-center gap-3 pr-10 ${isLightTheme ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}
                  >
                    <HistoryIcon className={`w-4 h-4 ${isLightTheme ? 'text-slate-400 group-hover:text-emerald-500' : 'text-slate-600 group-hover:text-emerald-400'}`} />
                    <span className={`text-xs truncate ${isLightTheme ? 'text-slate-500 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-white'}`}>{session.title}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDialog({
                        title: 'Supprimer la discussion',
                        message: 'Voulez-vous vraiment supprimer cette conversation ? Cette action est irréversible.',
                        onConfirm: () => {
                          memory.deleteSession((session as any).dbId);
                          setConfirmDialog(null);
                        }
                      });
                    }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all ${isLightTheme ? 'text-slate-300 hover:text-red-500' : 'text-slate-700 hover:text-red-400'}`}
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {memory.allChatSessions.length > 5 && (
                <button
                  onClick={() => setShowAllSessions(p => !p)}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-400 hover:bg-white/5 transition-all"
                >
                  {showAllSessions ? (
                    <>↑ Réduire</>
                  ) : (
                    <>↓ Voir tout ({memory.allChatSessions.length - 5} de plus)</>
                  )}
                </button>
              )}
              {showAllSessions && memory.allChatSessions.slice(5).map(session => (
                <div key={`${session.id}-${(session as any).dbId}-extra`} className="group/item relative">
                  <button
                    onClick={() => {
                      setMessages((session as any).messages);
                      memory.setActiveDbId((session as any).dbId);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-colors group flex items-center gap-3 pr-10 ${isLightTheme ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}
                  >
                    <HistoryIcon className={`w-4 h-4 ${isLightTheme ? 'text-slate-400 group-hover:text-emerald-500' : 'text-slate-600 group-hover:text-emerald-400'}`} />
                    <span className={`text-xs truncate ${isLightTheme ? 'text-slate-500 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-white'}`}>{session.title}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDialog({
                        title: 'Supprimer la discussion',
                        message: 'Voulez-vous vraiment supprimer cette conversation ? Cette action est irréversible.',
                        onConfirm: () => {
                          memory.deleteSession((session as any).dbId);
                          setConfirmDialog(null);
                        }
                      });
                    }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all ${isLightTheme ? 'text-slate-300 hover:text-red-500' : 'text-slate-700 hover:text-red-400'}`}
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Suggestions</p>
              {(() => {
                let suggestions = [
                  "Aidez-moi à choisir",
                  "Quels sont vos best-sellers ?",
                  "Informations livraison"
                ];
                
                if (messages.length > 0) {
                  const lastBotMessage = [...messages].reverse().find(m => m.sender === 'bot');
                  const text = lastBotMessage?.text?.toLowerCase() || '';
                  
                  if (text.includes("panier") || text.includes("ajouté")) {
                    suggestions = ["Terminer ma commande", "Revoir mon panier", "Des accessoires avec ça ?"];
                  } else if (text.includes("comparatif") || text.includes("vs")) {
                    suggestions = ["Lequel est le meilleur ?", "Différences de prix ?", "Recommandation finale"];
                  } else if (lastBotMessage?.products?.length || text.includes("€")) {
                    suggestions = ["Comparer ces options", "Une alternative moins chère ?", "Plus de détails"];
                  } else if (text.includes("commande") || text.includes("statut")) {
                    suggestions = ["Suivre ma livraison", "Politique de retour", "Service client"];
                  } else {
                    suggestions = ["Pouvez-vous détailler ?", "Quelles sont les alternatives ?", "Avez-vous des conseils ?"];
                  }
                }

                return suggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setChatInput(suggestion)}
                    className={`w-full text-left p-3 rounded-xl transition-colors group flex items-center gap-3 ${isLightTheme ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}
                  >
                    <MessageSquare className={`w-4 h-4 ${isLightTheme ? 'text-slate-400 group-hover:text-emerald-500' : 'text-slate-600 group-hover:text-emerald-400'}`} />
                    <span className={`text-xs truncate ${isLightTheme ? 'text-slate-500 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-white'}`}>{suggestion}</span>
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Settings Section */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0, scale: 0.95 }}
                animate={{ height: 'auto', opacity: 1, scale: 1 }}
                exit={{ height: 0, opacity: 0, scale: 0.95 }}
                className="overflow-hidden mb-4"
              >
                <div className={`p-4 rounded-2xl border space-y-4 shadow-xl ${isLightTheme ? 'bg-slate-50 border-slate-200 shadow-slate-200/50' : 'bg-white/5 border-white/5 shadow-black/20'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Réglages Assistant</h3>
                    <button onClick={() => setShowSettings(false)} className={`transition-colors ${isLightTheme ? 'text-slate-400 hover:text-slate-900' : 'text-slate-500 hover:text-white'}`}>
                      <span className="text-lg leading-none">×</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={exportAllHistories}
                      disabled={memory.allChatSessions.length === 0}
                      className={`w-full flex items-center justify-center gap-3 p-3.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider ${memory.allChatSessions.length === 0
                          ? 'opacity-50 cursor-not-allowed bg-slate-500/10 text-slate-500'
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 shadow-lg shadow-emerald-500/5'
                        }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exporter discussions
                    </button>

                    <button
                      onClick={handleDeleteAllHistories}
                      disabled={memory.allChatSessions.length === 0}
                      className={`w-full flex items-center justify-center gap-3 p-3.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider ${memory.allChatSessions.length === 0
                          ? 'opacity-50 cursor-not-allowed bg-slate-500/10 text-slate-500'
                          : 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 shadow-lg shadow-red-500/5'
                        }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Tout effacer ({memory.allChatSessions.length})
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`pt-6 space-y-2 ${isLightTheme ? 'border-t border-slate-200' : 'border-t border-white/5'}`}>
            <div className={`flex items-center gap-4 p-3 rounded-2xl border ${isLightTheme ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden ${isLightTheme ? 'bg-slate-100' : 'bg-slate-800'}`}>
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <User className={`w-4 h-4 ${isLightTheme ? 'text-slate-400' : 'text-slate-500'}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>{user?.email || 'Invité'}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{memory.loyaltyPoints} Points</p>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 transition-colors ${showSettings ? 'text-emerald-500' : isLightTheme ? 'text-slate-400 hover:text-slate-900' : 'text-slate-500 hover:text-white'}`}
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Header */}
        <header className={`h-20 shrink-0 flex items-center justify-between px-6 backdrop-blur-xl z-20 ${isLightTheme ? 'border-b border-slate-200 bg-white/80' : 'border-b border-white/5 bg-slate-950/40'}`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2.5 rounded-xl border transition-all hidden lg:block ${isLightTheme ? 'bg-slate-50 border-slate-200 hover:border-emerald-500/40' : 'bg-white/5 border-white/10 hover:border-emerald-500/40'}`}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${!isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="lg:hidden w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className={`text-base font-black uppercase tracking-tight leading-none ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Conversation Live</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest">Connecté avec l'expert</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={resetChat}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${isLightTheme ? 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            >
              <Trash2 className="w-3.5 h-3.5" /> Effacer
            </button>

            <button
              onClick={openCart}
              className={`relative p-2.5 rounded-xl border transition-all shadow-lg hover:border-emerald-500/30 ${isLightTheme ? 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
              title="Mon Panier"
            >
              <ShoppingBag className="w-4 h-4" />
              {itemsCount > 0 && (
                <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black flex items-center justify-center shadow-lg ${isLightTheme ? 'border border-white' : 'border border-slate-950'}`}>
                  {itemsCount}
                </span>
              )}
            </button>

            <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase text-emerald-500 hover:bg-emerald-500/20 transition-all">
              <Share2 className="w-3.5 h-3.5" /> Partager
            </button>

            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className={`p-2.5 rounded-xl border transition-all ${isRightSidebarOpen ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : isLightTheme ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-slate-400'}`}
              title="Produits Mentionnés"
            >
              <Package className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/')}
              className={`p-2.5 rounded-xl border transition-all ${isLightTheme ? 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            >
              Quitter
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-10 space-y-10 custom-scrollbar scroll-smooth"
        >
          <div className="max-w-7xl mx-auto w-full space-y-10">
            {messages.map((msg, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id || idx}
                className={`flex gap-4 sm:gap-6 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center border transition-all ${msg.sender === 'user'
                  ? isLightTheme
                    ? 'bg-slate-100 border-slate-200 text-slate-500'
                    : 'bg-white/5 border-white/10 text-slate-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                  }`}>
                  {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div className={`flex flex-col gap-3 max-w-[85%] sm:max-w-[75%] ${msg.sender === 'user' ? 'items-end' : ''}`}>
                  {msg.text && (
                    <div className={`group relative p-5 rounded-[1.75rem] text-sm leading-relaxed ${msg.sender === 'user'
                      ? isLightTheme
                        ? 'bg-emerald-500 text-white font-medium whitespace-pre-wrap'
                        : 'bg-emerald-500 text-slate-950 font-medium whitespace-pre-wrap'
                      : isLightTheme
                        ? 'bg-white border border-slate-200 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.06)]'
                        : 'bg-white/5 border border-white/10 text-slate-200'
                      }`}>
                      {msg.sender === 'bot' ? (
                        <div className="w-full overflow-hidden">
                          <ReactMarkdown
                            components={{
                              p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                              li: ({node, ...props}) => <li className="pl-1" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-extrabold text-emerald-600 dark:text-emerald-400" {...props} />,
                              em: ({node, ...props}) => <em className="italic text-emerald-600 dark:text-emerald-400" {...props} />,
                              h1: ({node, ...props}) => <h1 className="text-xl font-black mb-3 mt-4" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3 mt-4" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-3" {...props} />,
                              a: ({node, ...props}) => <a className="text-emerald-500 hover:text-emerald-400 underline decoration-1 underline-offset-2 break-all" {...props} />,
                              code: ({node, className, children, ...props}: any) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const isInline = !match && !className?.includes('language-');
                                return isInline ? <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm text-emerald-600 dark:text-emerald-400" {...props}>{children}</code> : <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl overflow-x-auto text-sm mb-3"><code {...props}>{children}</code></div>;
                              },
                              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-emerald-500/30 pl-4 italic text-slate-500 dark:text-slate-400 my-3" {...props} />
                            }}
                          >
                            {msg.text || ""}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        msg.text
                      )}

                      {msg.sender === 'bot' && msg.versions && msg.versions.length > 1 && (
                        <div className={`flex items-center gap-3 mt-4 pt-4 ${isLightTheme ? 'border-t border-slate-200' : 'border-t border-white/5'}`}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                const nextIdx = ((msg.currentVersionIndex || 0) - 1 + msg.versions!.length) % msg.versions!.length;
                                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, currentVersionIndex: nextIdx, text: m.versions![nextIdx] } : m));
                              }}
                              className="p-1 hover:text-emerald-400 transition-colors"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                              {(msg.currentVersionIndex || 0) + 1} / {msg.versions.length}
                            </span>
                            <button
                              onClick={() => {
                                const nextIdx = ((msg.currentVersionIndex || 0) + 1) % msg.versions!.length;
                                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, currentVersionIndex: nextIdx, text: m.versions![nextIdx] } : m));
                              }}
                              className="p-1 hover:text-emerald-400 transition-colors"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-widest italic ml-auto ${isLightTheme ? 'text-slate-400' : 'text-slate-600'}`}>Version sauvegardée</span>
                        </div>
                      )}

                      {msg.sender === 'bot' && (
                        <div className="absolute -bottom-10 right-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigator.clipboard.writeText(msg.text)}
                            className={`p-2 rounded-lg border transition-colors ${isLightTheme ? 'bg-white border-slate-200 text-slate-400 hover:text-slate-900' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-white'}`}
                            title="Copier"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
                              if (lastUserMsg) handleRegenerateResponse(lastUserMsg.text, msg.id);
                            }}
                            className={`p-2 rounded-lg border transition-colors ${isLightTheme ? 'bg-white border-slate-200 text-slate-400 hover:text-slate-900' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-white'}`}
                            title="Regénérer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <div className={`w-[1px] h-4 mx-1 ${isLightTheme ? 'bg-slate-200' : 'bg-white/10'}`} />
                          <button
                            onClick={() => handleFeedback(msg.id, 'up')}
                            className={`p-2 rounded-lg bg-slate-900 border border-white/5 transition-colors ${msg.feedback === 'up' ? 'text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'text-slate-500 hover:text-emerald-400'}`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${msg.feedback === 'up' ? 'fill-emerald-400' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, 'down')}
                            className={`p-2 rounded-lg bg-slate-900 border border-white/5 transition-colors ${msg.feedback === 'down' ? 'text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-slate-500 hover:text-red-400'}`}
                          >
                            <ThumbsDown className={`w-3.5 h-3.5 ${msg.feedback === 'down' ? 'fill-red-400' : ''}`} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quiz / Options */}
                  {(msg.isOptions || msg.type === "skip-quiz" || msg.type === "standard") && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.type === "skip-quiz" && (
                        <>
                          <button onClick={startQuiz} className={`px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all ${isLightTheme ? 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900 hover:border-emerald-500/40' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-emerald-500/40'}`}>Refaire diagnostic</button>
                          <button onClick={skipQuizAndRecommend} className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-[10px] font-black uppercase hover:bg-emerald-400 transition-all">Recommandations directes</button>
                        </>
                      )}
                      {msg.type === "standard" && (
                        <button onClick={startQuiz} className="px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 text-[10px] font-black uppercase hover:bg-emerald-400 transition-all flex items-center gap-2">
                          <Award className="w-4 h-4" /> Commencer le diagnostic
                        </button>
                      )}
                      {msg.isOptions && msg.options?.map((opt: any) => (
                        <button
                          key={opt.value}
                          onClick={() => handleAnswer(opt, msg.stepId)}
                          className={`px-5 py-3 rounded-xl border text-[11px] font-bold transition-all ${isLightTheme ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-500'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Results / Products / Comparison */}
                  {(() => {
                    const displayProducts = getProductsFromMessage(msg);
                    if (displayProducts.length === 0) return null;

                    return (
                      <div className={`mt-4 ${displayProducts.length > 2 ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}`}>
                        {displayProducts.map((p: Product) => (
                          <div key={p.id} className={`group p-5 backdrop-blur-xl border rounded-[2rem] hover:border-emerald-500/40 transition-all flex flex-col gap-4 shadow-xl ${isLightTheme ? 'bg-white border-slate-200 shadow-[0_16px_36px_rgba(15,23,42,0.08)]' : 'bg-slate-900/60 border-white/10'}`}>
                            <div className={`relative aspect-square rounded-[1.5rem] overflow-hidden p-4 group-hover:border-emerald-500/20 transition-all ${isLightTheme ? 'bg-slate-50 border border-slate-200' : 'bg-slate-950 border border-white/5'}`}>
                              <img
                                src={getProductImageSrc(p.image_url)}
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                onError={applyProductImageFallback}
                              />
                              <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black shadow-lg">
                                {p.price}€
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <h4 className={`text-sm font-bold truncate group-hover:text-emerald-400 transition-colors uppercase tracking-tight ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>{p.name}</h4>
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{p.category?.name}</p>
                                <StarRating rating={p.avg_rating || 0} size="sm" showCount={false} />
                              </div>
                            </div>

                            {msg.text?.includes("Comparatif") && (
                              <div className={`py-3 space-y-2 flex-1 ${isLightTheme ? 'border-t border-slate-200' : 'border-t border-white/5'}`}>
                                {(p.attributes?.specs as string[])?.slice(0, 3).map(spec => (
                                  <div key={spec} className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="truncate">{spec}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 mt-auto">
                              <button
                                onClick={() => navigate(`/catalogue/${p.slug}`)}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${isLightTheme ? 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                              >
                                Voir Détails
                              </button>
                              <button
                                onClick={() => handleAddToCart(p)}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-slate-950 text-[9px] font-black uppercase hover:bg-emerald-400 shadow-lg shadow-emerald-500/10 transition-all"
                              >
                                <Plus className="w-3 h-3" /> Panier
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isLightTheme ? 'text-slate-400' : 'text-slate-600'}`}>
                    {msg.sender === 'bot' ? (globalSettings.budtender_name || 'Advisor') : 'Vous'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <div className="flex gap-4 sm:gap-6">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse">
                  <Bot className="w-5 h-5" />
                </div>
                <div className={`p-5 rounded-[1.75rem] border flex items-center gap-1.5 ${isLightTheme ? 'bg-white border-slate-200' : 'bg-white/5 border border-white/10'}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '200ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className={`px-6 py-6 backdrop-blur-xl ${isLightTheme ? 'border-t border-slate-200 bg-white/80' : 'border-t border-white/5 bg-slate-950/40'}`}>
          <div className="max-w-4xl mx-auto">
            {useBudtenderStore.getState().isVoiceOpen && (
              <div className="flex justify-center mb-6">
                <div className="px-6 py-2 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center gap-4">
                  <SoundWave />
                  <span className="text-xs font-black uppercase tracking-widest text-cyan-400">Écoute en cours...</span>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSendMessage}
              className="relative group"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Posez une question à votre expert..."
                className={`w-full rounded-[1.75rem] pl-6 pr-32 py-5 text-sm focus:outline-none focus:border-emerald-500/40 transition-all font-medium ${isLightTheme ? 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white' : 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:bg-white/10'}`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (globalSettings.budtender_voice_enabled !== false) {
                      useBudtenderStore.getState().toggleVoice();
                    }
                  }}
                  className={`p-3 rounded-2xl transition-all ${useBudtenderStore.getState().isVoiceOpen ? 'text-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.2)] border border-cyan-400/20' : isLightTheme ? 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-900 hover:bg-slate-100' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
                  title="Mode Vocal"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isTyping}
                  className="p-3 rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
            <div className="hidden md:flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em]">
                <span className="w-1 h-1 rounded-full bg-emerald-500" /> IA Optimisée
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em]">
                <span className="w-1 h-1 rounded-full bg-emerald-500" /> Conseils Experts
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em]">
                <span className="w-1 h-1 rounded-full bg-emerald-500" /> Recommandations Intelligentes
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Mentioned Products */}
      <motion.aside
        initial={false}
        animate={{ width: isRightSidebarOpen ? 320 : 0, opacity: isRightSidebarOpen ? 1 : 0 }}
        className={`hidden xl:flex flex-col backdrop-blur-3xl overflow-hidden pointer-events-auto ${isLightTheme ? 'border-l border-slate-200 bg-white/75' : 'border-l border-white/5 bg-slate-900/40'}`}
      >
        <div className="p-6 flex flex-col h-full gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              <h2 className={`text-xs font-black uppercase tracking-widest ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Produits Cités</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black">
              {mentionedProducts.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
            {mentionedProducts.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-3xl ${isLightTheme ? 'border-slate-200' : 'border-white/5'}`}>
                <Info className={`w-8 h-8 mb-4 ${isLightTheme ? 'text-slate-300' : 'text-slate-700'}`} />
                <p className="text-xs text-slate-500 font-medium">Les produits cités par l'expert apparaîtront ici pour un accès rapide.</p>
              </div>
            ) : (
              mentionedProducts.map(p => (
                <div key={p.id} className={`group p-4 border rounded-2xl hover:border-emerald-500/30 transition-all space-y-3 ${isLightTheme ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex gap-3">
                    <div className={`w-12 h-12 rounded-xl overflow-hidden p-1.5 shrink-0 ${isLightTheme ? 'bg-slate-50 border border-slate-200' : 'bg-slate-950 border border-white/5'}`}>
                      <img src={getProductImageSrc(p.image_url)} className="w-full h-full object-contain" onError={applyProductImageFallback} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[11px] font-bold truncate group-hover:text-emerald-400 transition-colors uppercase ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>{p.name}</h4>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{p.category?.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-black text-emerald-500">{p.price}€</span>
                        <StarRating rating={p.avg_rating || 0} size="sm" showCount={false} />
                      </div>
                    </div>
                  </div>
                  <div className={`grid grid-cols-2 gap-2 pt-3 ${isLightTheme ? 'border-t border-slate-200' : 'border-t border-white/5'}`}>
                    <button
                      onClick={() => navigate(`/catalogue/${p.slug}`)}
                      className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${isLightTheme ? 'bg-slate-50 text-slate-500 hover:text-slate-900' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                      Détails
                    </button>
                    <button
                      onClick={() => handleAddToCart(p)}
                      className="py-2 rounded-lg bg-emerald-500 text-slate-950 text-[9px] font-black uppercase hover:bg-emerald-400 transition-all"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={`pt-6 ${isLightTheme ? 'border-t border-slate-200' : 'border-t border-white/5'}`}>
            <button
              onClick={openCart}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-500 group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative z-10 text-xs font-black uppercase tracking-widest text-slate-950">Voir Panier</span>
              <ArrowRight className="relative z-10 w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
