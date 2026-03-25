import { useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SendHorizontal, Sparkles, ChevronDown, Zap, X, Mic, MicOff, RotateCcw, Download, Check, ShoppingCart, Eye } from "lucide-react";
import { BudTenderMessage, BudTenderTypingIndicator, BudTenderFeedback } from "../budtender-ui";
import BudTenderHero from "./BudTenderHero";
import RestockCard from "./RestockCard";
import TechFeatureSelector from "./TechFeatureSelector";
import QuizOptions from "./QuizOptions";
import ProductRecommendation from "./ProductRecommendation";
import AmbassadorCard from "./AmbassadorCard";
import { Product } from "../../lib/types";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../ThemeProvider";

interface BudTenderChatInterfaceProps {
  messages: any[];
  isTyping: boolean;
  chatInput: string;
  setChatInput: (input: string) => void;
  onSendMessage: () => void;
  onReset: () => void;
  onStartQuiz: () => void;
  onSkipQuiz: () => void;
  onAddToCart: (product: any) => void;
  onViewProduct: (slug: string) => void;
  onToggleTerpene: (label: string) => void;
  onConfirmTerpenes: () => void;
  onAnswerQuiz: (opt: any, stepId: string) => void;
  onRegenerate?: () => void;
  onConfirmAction?: (msgId: string) => void;
  onCancelAction?: (msgId: string) => void;
  stepIndex: number;
  answers: Record<string, any>;
  terpeneSelection: string[];
  awaitingTerpene: boolean;
  settings: any;
  products: Product[];
  isHistoryOpen: boolean;
  hasShared: boolean;
  onShare: () => void;
  onCopyPromoCode: (code: string) => void;
  showPromoTooltip: boolean;
  budtenderName?: string;
  isCompact?: boolean;
}

// ── Feature 5: Detect active context from recent messages ────────────────────
function detectContext(messages: any[]): string | null {
  const recent = messages.slice(-8).map((m) => m.text || "").join(" ").toLowerCase();
  if (!recent.trim()) return null;
  if (/arcade|borne|jeu vid[eé]o|flipper/.test(recent)) return "Bornes Arcade";
  if (/simulateur|simulation|conduite|course/.test(recent)) return "Simulateurs";
  if (/billard|babyfoot|baby.foot/.test(recent)) return "Jeux de table";
  if (/flippers?|pinball/.test(recent)) return "Flippers";
  if (/occasion|neuf|achat|budget/.test(recent)) return "Achat";
  if (/pi[eèê]ces|r[eé]paration|maintenance|entretien/.test(recent)) return "Maintenance";
  if (/location|louer|[eé]v[eé]nement|f[eê]te/.test(recent)) return "Location";
  if (/divertissement|loisirs|salle|espace/.test(recent)) return "Loisirs";
  return null;
}

// Contextual quick-reply suggestions
function getQuickSuggestions(
  messages: any[],
  chatInput: string,
  isTyping: boolean
): string[] {
  if (chatInput.trim() || isTyping) return [];

  const hasUserMsg = messages.some((m) => m.sender === "user");
  if (!hasUserMsg) {
    return [
      "Quelle machine pour une salle de loisirs ?",
      "Différence entre borne arcade et simulateur",
      "Flippers disponibles en occasion",
      "Vos best-sellers du moment",
    ];
  }

  const lastBot = [...messages]
    .reverse()
    .find((m) => m.sender === "bot" && m.text && !m.isOptions);

  if (lastBot?.isResult) {
    return [
      "Comment installer cette machine ?",
      "Quelle superficie faut-il prévoir ?",
      "Y a-t-il une garantie ?",
      "Des alternatives similaires ?",
    ];
  }

  if (messages.length <= 6) {
    return ["Dis-m'en plus", "Quelles machines recommandes-tu ?"];
  }

  return [];
}

const CHAR_LIMIT = 500;

// ── Feature 4: Export conversation ───────────────────────────────────────────
function exportConversation(messages: any[], budtenderName: string) {
  const lines = messages
    .filter((m) => m.text)
    .map((m) => `[${m.sender === "bot" ? budtenderName : "Vous"}]\n${m.text}`)
    .join("\n\n---\n\n");
  const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `playadvisor-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BudTenderChatInterface({
  messages,
  isTyping,
  chatInput,
  setChatInput,
  onSendMessage,
  onReset: _onReset,
  onStartQuiz,
  onSkipQuiz: _onSkipQuiz,
  onAddToCart,
  onViewProduct,
  onToggleTerpene,
  onConfirmTerpenes,
  onAnswerQuiz,
  onRegenerate,
  onConfirmAction,
  onCancelAction,
  stepIndex,
  answers,
  terpeneSelection,
  awaitingTerpene,
  settings,
  products,
  isHistoryOpen: _isHistoryOpen,
  hasShared,
  onShare,
  onCopyPromoCode,
  showPromoTooltip,
  budtenderName = "PlayAdvisor",
  isCompact = false,
}: BudTenderChatInterfaceProps) {
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === 'light';
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAtBottomRef = useRef(true);
  const msgTimestamps = useRef<Map<string, Date>>(new Map());
  const recognitionRef = useRef<any>(null);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [pendingSend, setPendingSend] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // ── Feature 2: mic support detection ─────────────────────────────────────
  const hasMicSupport =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Record timestamp the first time each message appears (in effect, not during render)
  useEffect(() => {
    messages.forEach((msg) => {
      if (!msgTimestamps.current.has(msg.id)) {
        msgTimestamps.current.set(msg.id, new Date());
      }
    });
  }, [messages]);

  // Auto-send when a suggestion chip was clicked
  useEffect(() => {
    if (pendingSend && chatInput.trim()) {
      setPendingSend(false);
      onSendMessage();
    }
  }, [chatInput, pendingSend]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [chatInput]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (isAtBottomRef.current) {
      const lastMsg = messages[messages.length - 1];

      // If the AI is typing or just sent a message, we scroll to the TOP of that message
      // so the user sees the start of the response, not the end.
      if (isTyping || lastMsg?.sender === "bot") {
        const botEls = el.querySelectorAll(".budtender-msg-bot, .budtender-typing-indicator");
        const lastBotEl = botEls[botEls.length - 1];
        if (lastBotEl instanceof HTMLElement) {
          lastBotEl.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          el.scrollTop = el.scrollHeight;
        }
      } else {
        el.scrollTop = el.scrollHeight;
      }
      setNewMsgCount(0);
    } else {
      setNewMsgCount((prev) => prev + 1);
    }
  }, [messages, isTyping]);

  // Stop recognition when component unmounts
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distFromBottom < 80;
    setShowScrollBtn(distFromBottom > 200);
    if (distFromBottom < 80) setNewMsgCount(0);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setNewMsgCount(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.trim() && !isTyping && chatInput.length <= CHAR_LIMIT) {
        onSendMessage();
      }
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => { });
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleFeedback = async (
    type: string,
    reason: string | undefined,
    msgIndex: number,
    aiResponse: string | null
  ) => {
    const { user } = useAuthStore.getState();
    let userText: string | null = null;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].sender === "user" && messages[i].text) {
        userText = messages[i].text!;
        break;
      }
    }
    if (user) {
      try {
        await supabase.from("budtender_interactions").insert({
          user_id: user.id,
          interaction_type: "feedback",
          feedback: type,
          feedback_reason: reason ?? null,
          user_message: userText,
          ai_response: aiResponse,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("[BudTender] Feedback log exception:", err);
      }
    }
  };

  // ── Feature 2: toggle microphone ─────────────────────────────────────────
  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setChatInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // ── Memoized derived values ───────────────────────────────────────────────
  const lastOptionsIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].isOptions) return i;
    }
    return -1;
  }, [messages]);

  const showStartButton = useMemo(
    () =>
      stepIndex === -1 &&
      !isTyping &&
      messages.length > 0 &&
      !messages.some(
        (m) =>
          m.type === "skip-quiz" ||
          m.type === "restock" ||
          m.isOptions ||
          settings.quiz_steps.some((s: any) => s.question === m.text)
      ),
    [stepIndex, isTyping, messages, settings.quiz_steps]
  );

  // ── Feature 3: show regenerate when last message is a plain bot text ──────
  const showRegenerate = useMemo(() => {
    if (isTyping || !onRegenerate || messages.length <= 1) return false;
    const last = [...messages].reverse().find((m) => m.text);
    return last?.sender === "bot" && !last?.isResult && !last?.isOptions;
  }, [isTyping, onRegenerate, messages]);

  const allSuggestions = useMemo(
    () => getQuickSuggestions(messages, chatInput, isTyping),
    [messages, chatInput, isTyping]
  );
  const suggestions = isCompact ? allSuggestions.slice(0, 2) : allSuggestions;
  const charCount = chatInput.length;
  const isNearLimit = charCount > CHAR_LIMIT * 0.8;
  const isOverLimit = charCount > CHAR_LIMIT;
  const canSend = chatInput.trim().length > 0 && !isTyping && !isOverLimit;

  // ── Feature 5: active context pill ───────────────────────────────────────
  const activeContext = useMemo(() => detectContext(messages), [messages]);
  const hasExportableMessages = messages.some((m) => m.text);

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      {/* ── Messages Area ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar relative z-10"
      >
        <div className={`max-w-7xl mx-auto w-full space-y-4 ${isCompact ? 'px-3 py-4' : 'px-4 sm:px-8 py-8 space-y-6'}`}>
          {messages.length === 0 && <BudTenderHero />}

          {messages.map((msg, msgIndex) => {
            const isLastOptionsMessage = msgIndex === lastOptionsIdx;

            return (
              <BudTenderMessage
                key={msg.id}
                sender={msg.sender}
                text={msg.text}
                type={msg.type}
                isTyping={isTyping}
                budtenderName={budtenderName}
                timestamp={msgTimestamps.current.get(msg.id)}
                onCopy={
                  msg.sender === "bot" && msg.text
                    ? () => handleCopyMessage(msg.id, msg.text!)
                    : undefined
                }
                isCopied={copiedMsgId === msg.id}
              >
                {/* Restock cards */}
                {(msg.type === "restock" || msg.restockProduct || msg.restockProducts) && (
                  <div className="space-y-3 mt-2">
                    {msg.restockProduct && (
                      <RestockCard
                        product={msg.restockProduct}
                        onAddToCart={() => {
                          const p = products.find((pr) => pr.id === msg.restockProduct!.product_id);
                          if (p) onAddToCart(p);
                        }}
                        onView={() => onViewProduct(msg.restockProduct!.slug)}
                      />
                    )}
                    {msg.restockProducts?.map((candidate: any, i: number) => (
                      <RestockCard
                        key={candidate.product_id || i}
                        product={candidate}
                        onAddToCart={() => {
                          const p = products.find((pr) => pr.id === candidate.product_id);
                          if (p) onAddToCart(p);
                        }}
                        onView={() => onViewProduct(candidate.slug)}
                      />
                    ))}
                  </div>
                )}

                {/* Tech features selector */}
                {msg.type === "tech-feature" && awaitingTerpene && (
                  <TechFeatureSelector
                    selectedFeatures={terpeneSelection}
                    onToggleFeature={onToggleTerpene}
                    onConfirm={onConfirmTerpenes}
                  />
                )}

                {/* Quiz options */}
                {msg.isOptions && msg.options && (
                  <QuizOptions
                    options={msg.options}
                    stepId={msg.stepId!}
                    selectedAnswer={answers[msg.stepId!]}
                    hasAnsweredNext={messages.some(
                      (m) =>
                        m.sender === "user" &&
                        m.text ===
                        msg.options.find((o: any) => o.value === answers[msg.stepId!])?.label
                    )}
                    isDisabled={
                      msg.stepId === "proactive"
                        ? false
                        : settings.quiz_mode === "dynamic"
                          ? !isLastOptionsMessage
                          : stepIndex !==
                          settings.quiz_steps.findIndex((s: any) => s.id === msg.stepId)
                    }
                    onAnswer={onAnswerQuiz}
                  />
                )}

                {/* Results */}
                {msg.isResult && msg.recommended && (
                  <div className="space-y-4 pt-3">
                    <p className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase px-1">
                      Machines recommandées
                    </p>
                    {msg.recommended.map((product: any) => (
                      <ProductRecommendation
                        key={product.id}
                        product={product}
                        onAddToCart={onAddToCart}
                        onView={() => onViewProduct(product.slug)}
                      />
                    ))}

                    <BudTenderFeedback
                      onFeedback={(type, reason) =>
                        handleFeedback(type, reason, msgIndex, msg.text ?? null)
                      }
                    />

                    <AmbassadorCard
                      hasShared={hasShared}
                      onShare={onShare}
                      onCopyPromoCode={onCopyPromoCode}
                      showPromoTooltip={showPromoTooltip}
                    />
                  </div>
                )}

                {/* Tool confirmation buttons */}
                {msg.type === 'tool_confirm' && !msg._confirmed && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 mt-3"
                  >
                    <button
                      onClick={() => onConfirmAction?.(msg.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-xl transition-all shadow-[0_0_16px_rgba(16,185,129,0.3)] hover:shadow-[0_0_22px_rgba(16,185,129,0.45)] active:scale-95"
                    >
                      {msg.toolName === 'add_to_cart'
                        ? <ShoppingCart className="w-4 h-4" />
                        : <Eye className="w-4 h-4" />}
                      Confirmer
                    </button>
                    <button
                      onClick={() => onCancelAction?.(msg.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all active:scale-95 border ${isLightTheme ? 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 bg-white' : 'border-white/10 text-zinc-400 hover:text-white hover:border-white/20 bg-zinc-900/50'}`}
                    >
                      <X className="w-4 h-4" />
                      Annuler
                    </button>
                  </motion.div>
                )}
              </BudTenderMessage>
            );
          })}

          {isTyping && <BudTenderTypingIndicator />}

          {/* ── Feature 3: Regenerate button ── */}
          <AnimatePresence>
            {showRegenerate && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                className="flex justify-center"
              >
                <button
                  onClick={onRegenerate}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] border rounded-full transition-all ${isLightTheme ? 'text-slate-500 hover:text-slate-900 border-slate-200 hover:border-slate-300 bg-white/70' : 'text-zinc-600 hover:text-zinc-300 border-white/[0.06] hover:border-white/15'}`}
                >
                  <RotateCcw className="w-3 h-3" />
                  Régénérer la réponse
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start quiz CTA */}
          {showStartButton && (
            <div className="flex justify-center py-6">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onStartQuiz}
                className="px-8 py-4 bg-emerald-500 text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_16px_40px_rgba(57,255,20,0.25)] hover:shadow-[0_20px_50px_rgba(57,255,20,0.4)] transition-all flex items-center gap-3"
              >
                <Sparkles className="w-5 h-5" />
                Lancer mon Projet Loisirs
              </motion.button>
            </div>
          )}

          {/* Spacer so last message isn't clipped */}
          <div className="h-2" />
        </div>
      </div>

      {/* ── Scroll-to-bottom button ── */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToBottom}
            className={`absolute bottom-[172px] right-5 z-30 flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-xl backdrop-blur-sm transition-colors ${isLightTheme ? 'bg-white/95 border-slate-200 hover:border-emerald-500/40 text-slate-500 hover:text-slate-900' : 'bg-zinc-800/90 border-white/10 hover:border-emerald-500/40 text-zinc-400 hover:text-white'}`}
          >
            <ChevronDown className="w-4 h-4" />
            {newMsgCount > 0 && (
              <span className="text-[11px] font-bold text-emerald-400">
                {newMsgCount} nouveau{newMsgCount > 1 ? "x" : ""}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Input Area ── */}
      <div className={`relative z-20 border-t backdrop-blur-2xl ${isLightTheme ? 'border-slate-200 bg-white/88' : 'border-white/[0.12] bg-zinc-900/90'} ${isCompact ? 'px-3 pt-3 pb-3' : 'px-4 sm:px-6 pt-4 pb-6 sm:pb-8'}`}>
        <div className="max-w-4xl mx-auto space-y-3">

          {/* ── Feature 5: Active context pill ── */}
          <AnimatePresence>
            {activeContext && messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2"
              >
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${isLightTheme ? 'bg-emerald-50 border-emerald-500/15' : 'bg-zinc-800/40 border-emerald-500/15'}`}>
                  <span className="text-[9px] font-mono text-emerald-400/50 uppercase tracking-widest">
                    Contexte
                  </span>
                  <span className={`text-[11px] ${isLightTheme ? 'text-slate-600' : 'text-zinc-400'}`}>{activeContext}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick suggestion chips */}
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                className="flex flex-wrap gap-2"
              >
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setChatInput(s);
                      setPendingSend(true);
                    }}
                    className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] transition-all whitespace-nowrap backdrop-blur-xl ${isLightTheme ? 'bg-white/90 border-slate-200 hover:border-emerald-500/40 hover:bg-slate-50 text-slate-600 hover:text-slate-900' : 'bg-zinc-900/70 border-white/[0.10] hover:border-emerald-500/40 hover:bg-zinc-800/90 text-zinc-400 hover:text-zinc-100'}`}
                  >
                    <Zap className="w-3 h-3 text-emerald-400/40 group-hover:text-emerald-400/70 transition-colors flex-shrink-0" />
                    {s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea container */}
          <div className={`relative rounded-2xl border transition-all overflow-hidden backdrop-blur-2xl ${isLightTheme ? 'bg-white/92 border-slate-200 hover:border-slate-300 focus-within:border-emerald-500/60 focus-within:ring-4 focus-within:ring-emerald-500/10 shadow-[0_18px_40px_rgba(15,23,42,0.08)]' : 'bg-zinc-900/80 border-white/[0.18] hover:border-white/30 focus-within:border-emerald-500/60 focus-within:ring-4 focus-within:ring-emerald-500/8 shadow-[0_10px_35px_rgba(0,0,0,0.35)]'}`}>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.10),transparent_40%,rgba(56,189,248,0.08))]" />
            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question… (Shift+↵ pour un saut de ligne)"
              rows={1}
              maxLength={CHAR_LIMIT + 20}
              className={`relative z-10 w-full bg-transparent pt-4 pb-4 pl-5 pr-32 outline-none resize-none text-sm sm:text-base leading-relaxed ${isLightTheme ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-zinc-400'}`}
              style={{ minHeight: "56px", maxHeight: "128px" }}
            />

            {/* Right controls */}
            <div className="absolute right-3 bottom-3 z-10 flex items-center gap-1.5">
              {/* Char counter */}
              {isNearLimit && (
                <span
                  className={`text-[10px] font-mono transition-colors ${isOverLimit ? "text-red-400" : isLightTheme ? "text-slate-400" : "text-zinc-500"}`}
                >
                  {charCount}/{CHAR_LIMIT}
                </span>
              )}

              {/* ── Feature 2: Mic button ── */}
              {hasMicSupport && (
                <button
                  onClick={toggleMic}
                  title={isListening ? "Arrêter la dictée" : "Dicter un message"}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isListening
                      ? "text-red-400 animate-pulse bg-red-400/10"
                      : isLightTheme
                        ? "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                        : "text-zinc-500 hover:text-emerald-400/70 hover:bg-white/5"
                    }`}
                >
                  {isListening
                    ? <MicOff className="w-3.5 h-3.5" />
                    : <Mic className="w-3.5 h-3.5" />
                  }
                </button>
              )}

              {/* ── Feature 1: Clear button ── */}
              <AnimatePresence>
                {chatInput.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => { setChatInput(""); textareaRef.current?.focus(); }}
                    title="Effacer"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isLightTheme ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Send button */}
              <button
                onClick={onSendMessage}
                disabled={!canSend}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${canSend
                  ? "border-emerald-300 bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:scale-105 active:scale-95"
                  : isLightTheme
                    ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "border-white/10 bg-white/5 text-zinc-600 cursor-not-allowed"
                  }`}
                title="Envoyer (↵)"
              >
                <SendHorizontal className="w-4 h-4 translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Footer hints */}
          {!isCompact && (
            <div className="flex items-center justify-between px-1">
              <p className={`text-[10px] font-mono uppercase tracking-wide ${isLightTheme ? 'text-slate-400' : 'text-zinc-700'}`}>
                ↵ Envoyer&nbsp;&nbsp;·&nbsp;&nbsp;Shift+↵ Saut de ligne
              </p>
              <div className="flex items-center gap-3">
                {hasExportableMessages && (
                  <button
                    onClick={() => exportConversation(messages, budtenderName)}
                    title="Exporter la conversation"
                    className={`flex items-center gap-1 transition-colors ${isLightTheme ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-700 hover:text-zinc-400'}`}
                  >
                    <Download className="w-3 h-3" />
                    <span className="text-[9px] font-mono uppercase tracking-widest">Export</span>
                  </button>
                )}
                <p className={`text-[9px] font-mono uppercase tracking-widest ${isLightTheme ? 'text-slate-400' : 'text-zinc-600'}`}>
                  Neural Engine v2.4
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
