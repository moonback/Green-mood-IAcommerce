import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { useSettingsStore } from "../store/settingsStore";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";
import { useBudTenderMemory } from "../hooks/useBudTenderMemory";
import { useBudTenderQuiz } from "../hooks/useBudTenderQuiz";
import { useBudTenderChat } from "../hooks/useBudTenderChat";
import { getCachedProducts, getCachedSettings } from "../lib/budtenderCache";
import { Product } from "../lib/types";
import { BudTenderSettings } from "../lib/budtenderSettings";
import { useBudtenderStore } from "../store/budtenderStore";
import { useToastStore } from "../store/toastStore";

// Extracted UI Components
import {
  BudTenderWidget,
  BudTenderBackground,
} from "./budtender-ui";
import VoiceAdvisor from "./VoiceAdvisor";
import BudTenderHeader from "./budtender/BudTenderHeader";
import BudTenderHistoryPanel from "./budtender/BudTenderHistoryPanel";
import BudTenderChatInterface from "./budtender/BudTenderChatInterface";
import { useTheme } from "./ThemeProvider";

export default function BudTender() {
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === 'light';
  const navigate = useNavigate();
  const { addItem, items: cartItems, openSidebar, closeSidebar } = useCartStore();
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  const openSidebarWithAutoClose = useCallback(() => {
    openSidebar();
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      closeSidebar();
    }, 5000);
  }, [openSidebar, closeSidebar]);
  const { settings: globalSettings } = useSettingsStore();
  const { addToast } = useToastStore();
  const { user } = useAuthStore();

  const {
    isChatOpen: isOpen,
    isVoiceOpen,
    openChat,
    closeChat,
    openVoice,
    closeVoice,
    activeProduct
  } = useBudtenderStore();

  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === 'function') {
      // If needed, we could support function updates, but simple toggles are enough
    } else {
      val ? openChat() : closeChat();
    }
  };

  const setIsVoiceOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === 'function') {
      // 
    } else {
      val ? openVoice() : closeVoice();
    }
  };

  const [isShrink, setIsShrink] = useState(false);
  const [viewMode, setViewMode] = useState<'fullscreen' | 'bubble'>(() => {
    return (localStorage.getItem('budtender-view-mode') as 'fullscreen' | 'bubble') || 'fullscreen';
  });

  const toggleViewMode = () => {
    setViewMode(m => {
      const next = m === 'fullscreen' ? 'bubble' : 'fullscreen';
      localStorage.setItem('budtender-view-mode', next);
      return next;
    });
  };
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [pulse, setPulse] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // States for quiz
  const [stepIndex, setStepIndex] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [awaitingTech, setAwaitingTech] = useState(false);
  const [techSelection, setTechSelection] = useState<string[]>([]);
  const [hasShared, setHasShared] = useState(false);
  const [showPromoTooltip, setShowPromoTooltip] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<BudTenderSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const memory = useBudTenderMemory();

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
        console.error("[BudTender] Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const addBotMessage = (msg: string | Partial<any>, options?: any) => {
    setMessages((prev) => {
      const id = Math.random().toString(36).substring(7);
      if (typeof msg === "string") {
        return [...prev, { id, sender: "bot", text: msg, ...options }];
      }
      return [...prev, { id, sender: "bot", ...msg }];
    });
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(7), sender: "user", text },
    ]);
  };

  const logQuestion = async (question: string) => {
    if (user) {
      await supabase.from("budtender_interactions").insert({
        user_id: user.id,
        interaction_type: "question",
        user_message: question,
        created_at: new Date().toISOString(),
      });
    }
  };

  // Welcome Messages logic
  const buildWelcomeMessages = () => {
    const { userName, isLoggedIn, restockCandidates, savedPrefs } = memory;
    const greeting = userName ? `Hello ${userName} !` : "Bonjour !";

    let welcomeText = `${greeting} Je suis ${globalSettings.budtender_name || 'BudTender'} votre BudTender personnel. Prêt à optimiser votre setup ou à trouver le gadget de vos rêves ?`;

    if (restockCandidates.length > 0) {
      welcomeText += "\n\n**Il est peut-être temps de mettre à jour votre équipement ?** 🔄";
    }

    if (savedPrefs) {
      welcomeText += "\n\nJe vois que nous avons déjà configuré votre profil ! Souhaites-tu découvrir de nouvelles recommandations basées sur tes objectifs, ou préfères-tu refaire le diagnostic ?";
    }

    addBotMessage({
      text: welcomeText,
      type: savedPrefs ? "skip-quiz" : (restockCandidates.length > 0 ? "restock" : "standard"),
      restockProducts: restockCandidates.length > 0 ? restockCandidates : undefined
    });
  };

  useEffect(() => {
    if (isOpen) {
      setIsShrink(false);
      if (messages.length === 0) {
        buildWelcomeMessages();
      }
    }
  }, [isOpen]);

  const handleOpen = () => {
    setPulse(false);
    setIsOpen(true);
  };

  const {
    startQuiz,
    skipQuizAndRecommend,
    handleAnswer,
    confirmTerpeneSelection: confirmTechSelection,
  } = useBudTenderQuiz({
    settings: settings || { quiz_mode: "static", quiz_steps: [] } as any,
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
    addBotMessage: addBotMessage as any,
    addUserMessage,
  });

  const reset = () => {
    memory.clearChatHistory();
    setMessages([]);
    setStepIndex(-1);
    setAnswers({});
    setTechSelection([]);
    setAwaitingTech(false);
    setHasShared(false);
    setTimeout(() => buildWelcomeMessages(), 100);
  };

  const { handleSendMessage, handleRegenerateResponse, confirmPendingAction, cancelPendingAction } = useBudTenderChat({
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
    addBotMessage: addBotMessage as any,
    addItem,
    openSidebar: openSidebarWithAutoClose,
    onViewProduct: (product) => {
      navigate(`/catalogue/${product.slug}`);
      setIsShrink(true);
    },
    logQuestion,
  });

  const handleRegenerate = useCallback(() => {
    if (isTyping) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.sender === "user" && m.text);
    if (!lastUserMsg) return;
    setMessages((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].sender === "bot" && arr[i].text) { arr.splice(i, 1); break; }
      }
      return arr;
    });
    handleRegenerateResponse(lastUserMsg.text!);
  }, [isTyping, messages, handleRegenerateResponse, setMessages]);

  const handleShare = async () => {
    const shareData = {
      title: `${globalSettings.store_name || 'TechStore'} — Ma configuration Cortex`,
      text: `Je viens de configurer mon setup idéal avec Cortex IA chez ${globalSettings.store_name || 'TechStore'} ! Découvrez vos recommandations ici :`,
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setHasShared(true);
      } else {
        await navigator.clipboard.writeText(
          `${shareData.text} ${shareData.url}`
        );
        setHasShared(true);
        addToast({
          type: "success",
          message: "Lien copié dans le presse-papier ! Partagez-le pour débloquer votre code.",
        });
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setShowPromoTooltip(true);
    setTimeout(() => setShowPromoTooltip(false), 2000);
  };

  return (
    <>
      <AnimatePresence>
        {(isOpen && !isShrink) ? null : (
          ((globalSettings?.budtender_chat_enabled ?? true) ||
            (globalSettings?.budtender_voice_enabled ?? true)) && (
            <BudTenderWidget
              onClick={() => {
                if (isShrink) {
                  setIsShrink(false);
                } else if (globalSettings?.budtender_chat_enabled !== false) {
                  handleOpen();
                } else if (globalSettings?.budtender_voice_enabled !== false) {
                  setIsVoiceOpen(true);
                }
              }}
              isChatEnabled={globalSettings?.budtender_chat_enabled ?? true}
              onVoiceClick={
                (globalSettings?.budtender_voice_enabled ?? true)
                  ? () => setIsVoiceOpen(!isVoiceOpen)
                  : undefined
              }
              isVoiceActive={isVoiceOpen}
              pulse={pulse}
              mode={isShrink ? "expand" : "default"}
              budtenderName={globalSettings.budtender_name}
            />
          )
        )}
      </AnimatePresence>

      <VoiceAdvisor
        products={products}
        activeProduct={activeProduct}
        pastProducts={memory.pastProducts}
        pastOrders={memory.pastOrders}
        savedPrefs={memory.savedPrefs}
        userName={memory.userName}
        isOpen={isVoiceOpen}
        cartItems={cartItems}
        customPrompt={settings?.custom_chat_prompt || ""}
        loyaltyPoints={memory.loyaltyPoints}
        allowCloseSession={settings?.voice_close_session_enabled ?? true}
        onClose={() => setIsVoiceOpen(false)}
        onHangup={() => setIsVoiceOpen(false)}
        onAddItem={(product, quantity) => {
          addItem(product, quantity);
          openSidebarWithAutoClose();
        }}
        onViewProduct={(product) => navigate(`/catalogue/${product.slug}`)}
        onNavigate={(path) => navigate(path)}
        onOpenModal={(modalName) => {
          window.dispatchEvent(new CustomEvent('cortex-open-modal', { detail: modalName }));
        }}
        onSavePrefs={memory.updatePrefs}
        showUI={true}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={
              isShrink
                ? { opacity: 0, scale: 0.8, y: 100, pointerEvents: "none" }
                : { opacity: 1, scale: 1, y: 0, pointerEvents: "auto" }
            }
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={
              viewMode === 'fullscreen'
                ? `fixed inset-0 z-[9999] ${isLightTheme ? 'bg-slate-50' : 'bg-zinc-950'} flex flex-col overflow-hidden origin-bottom-right`
                : `fixed bottom-32 sm:bottom-24 right-4 sm:right-8 z-[9999] w-[400px] max-w-[calc(100vw-1rem)] h-[640px] max-h-[calc(100vh-7rem)] ${isLightTheme ? 'bg-white border-slate-200 shadow-[0_24px_60px_rgba(15,23,42,0.12)]' : 'bg-zinc-950 border-white/10 shadow-[0_8px_60px_rgba(0,0,0,0.8)]'} flex flex-col overflow-hidden rounded-2xl border origin-bottom-right`
            }
          >
            {viewMode === 'fullscreen' && <BudTenderBackground />}

            <BudTenderHeader
              budtenderName={globalSettings.budtender_name || "Cortex"}
              userName={memory.userName}
              isLoggedIn={memory.isLoggedIn}
              isVoiceEnabled={globalSettings?.budtender_voice_enabled ?? true}
              onVoiceClick={() => setIsVoiceOpen(true)}
              onHistoryClick={() => {
                setIsHistoryOpen(!isHistoryOpen);
                if (!isHistoryOpen) memory.fetchAllSessions();
              }}
              isHistoryOpen={isHistoryOpen}
              onReset={reset}
              onClose={() => setIsOpen(false)}
              viewMode={viewMode}
              onToggleView={toggleViewMode}
              showSkipQuizActions={
                messages.some((m) => m.type === "skip-quiz") &&
                stepIndex === -1 &&
                !isTyping &&
                !messages.some((m) => m.isOptions || m.isResult)
              }
              onSkipQuiz={skipQuizAndRecommend}
              onStartQuiz={startQuiz}
            />

            <BudTenderHistoryPanel
              isOpen={isHistoryOpen}
              onClose={() => setIsHistoryOpen(false)}
              isLoggedIn={memory.isLoggedIn}
              isLoading={memory.isHistoryLoading}
              sessions={memory.allChatSessions}
              onSelectSession={(session) => {
                setMessages(session.messages as any);
                setIsHistoryOpen(false);
              }}
            />

            <BudTenderChatInterface
              messages={messages}
              isTyping={isTyping}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onSendMessage={handleSendMessage}
              onReset={reset}
              onStartQuiz={startQuiz}
              onSkipQuiz={skipQuizAndRecommend}
              onAddToCart={(product) => {
                addItem(product);
                openSidebarWithAutoClose();
                setIsShrink(true);
              }}
              onViewProduct={(slug) => {
                navigate(`/catalogue/${slug}`);
                setIsShrink(true);
              }}
              onToggleTerpene={(label) => {
                setTechSelection((prev) =>
                  prev.includes(label)
                    ? prev.filter((t) => t !== label)
                    : [...prev, label]
                );
              }}
              onConfirmTerpenes={confirmTechSelection}
              onAnswerQuiz={handleAnswer}
              stepIndex={stepIndex}
              answers={answers}
              terpeneSelection={techSelection}
              awaitingTerpene={awaitingTech}
              settings={settings || { quiz_steps: [] }}
              products={products}
              isHistoryOpen={isHistoryOpen}
              hasShared={hasShared}
              onShare={handleShare}
              onCopyPromoCode={copyPromoCode}
              showPromoTooltip={showPromoTooltip}
              budtenderName={globalSettings.budtender_name || "Cortex"}
              onRegenerate={handleRegenerate}
              onConfirmAction={confirmPendingAction}
              onCancelAction={cancelPendingAction}
              isCompact={viewMode === 'bubble'}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
