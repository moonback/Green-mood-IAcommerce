import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../lib/types';
import { QuizOption, BudTenderSettings } from '../lib/budtenderSettings';
import { SavedPrefs } from './useBudTenderMemory';
import { useAuthStore } from '../store/authStore';
import { Answers, Message, scoreProduct, scoreTechFeatures, generateAdvice, callAI, callAIDynamicStep, extractInsights } from '../lib/budtenderHelpers';

interface BudTenderMemoryLike {
    savePrefs: (prefs: SavedPrefs) => Promise<void> | void;
    updatePrefs: (newPrefs: Partial<SavedPrefs>) => Promise<void> | void;
    pastProducts: { product_name: string }[];
    savedPrefs: SavedPrefs | null;
    extractedInsights: string[];
    setExtractedInsights: (insights: string[]) => void;
}

interface UseBudTenderQuizParams {
    settings: BudTenderSettings;
    products: Product[];
    messages: Message[];
    answers: Answers;
    stepIndex: number;
    terpeneSelection: string[];
    memory: BudTenderMemoryLike;
    setStepIndex: React.Dispatch<React.SetStateAction<number>>;
    setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
    setAwaitingTerpene: React.Dispatch<React.SetStateAction<boolean>>;
    setTerpeneSelection: React.Dispatch<React.SetStateAction<string[]>>;
    setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    addBotMessage: (msg: Partial<Message>, delay?: number) => void;
    addUserMessage: (text: string) => void;
}

export function useBudTenderQuiz({
    settings,
    products,
    messages,
    answers,
    stepIndex,
    terpeneSelection,
    memory,
    setStepIndex,
    setAnswers,
    setAwaitingTerpene,
    setTerpeneSelection,
    setIsTyping,
    setMessages,
    addBotMessage,
    addUserMessage,
}: UseBudTenderQuizParams) {
    const generateRecommendations = useCallback(async (finalAnswers: Answers) => {
        setIsTyping(true);
        memory.updatePrefs(finalAnswers as unknown as Partial<SavedPrefs>);

        const scored = [...products]
            .map((p) => ({ product: p, score: scoreProduct(p, finalAnswers) + scoreTechFeatures(p, terpeneSelection) }))
            .sort((a, b) => b.score - a.score)
            .filter((x) => x.score > 0)
            .slice(0, settings.recommendations_count)
            .map((x) => x.product);

        const ctxParts: string[] = [];
        if (memory.pastProducts.length > 0) {
            ctxParts.push(`Derniers achats : ${memory.pastProducts.slice(0, 3).map((p) => p.product_name).join(', ')}.`);
        }
        if (terpeneSelection.length > 0) {
            ctxParts.push(`Options techniques souhaitées : ${terpeneSelection.join(', ')}.`);
        }
        const geminiContext = ctxParts.join(' ') || undefined;

        const history = messages
            .filter((m) => m.text && !m.isResult)
            .map((m) => ({
                role: m.sender === 'user' ? 'user' : ('assistant' as const),
                content: m.text || '',
            }));
        
        // Use extracted insights for better context
        const aiResponse = await callAI(finalAnswers, products, settings, history, geminiContext, memory.extractedInsights);
        const aiText = aiResponse.text;
        const adviceText = aiText ?? generateAdvice(finalAnswers, terpeneSelection);

        setMessages((prev) => [...prev, {
            id: Math.random().toString(36).substring(7),
            sender: 'bot',
            text: adviceText,
            isResult: true,
            recommended: scored,
        }]);

        const { user } = useAuthStore.getState();
        if (user && scored.length > 0) {
            try {
                const { error } = await supabase.from('budtender_interactions').insert({
                    user_id: user.id,
                    interaction_type: 'recommendation',
                    recommended_products: scored.map((p) => p.id),
                    quiz_answers: finalAnswers,
                    created_at: new Date().toISOString(),
                });
                if (error) console.error('[Cortex] Recommendation log error:', error);
            } catch (err) {
                console.error('[Cortex] Recommendation log exception:', err);
            }
        }

        // Asynchronously update semantic insights for long-term memory
        if (history.length >= 2) {
            extractInsights(history, memory.extractedInsights).then(newInsights => {
                if (newInsights && newInsights.length > 0) {
                    memory.setExtractedInsights(newInsights);
                    // Also update prefs to sync to Supabase
                    memory.updatePrefs({ semantic_insights: newInsights });
                }
            });
        }

        setIsTyping(false);
    }, [memory, messages, products, setIsTyping, setMessages, settings, terpeneSelection]);

    const handleDynamicStep = useCallback(async (currentHistory: { role: string; content: string }[]) => {
        setIsTyping(true);

        const result = await callAIDynamicStep(products, settings, currentHistory);

        if (!result || result.status === 'complete') {
            await generateRecommendations(answers);
        } else {
            addBotMessage({
                text: result.question,
                isOptions: true,
                options: result.options,
                stepId: 'ai_dynamic',
            });
        }
        setIsTyping(false);
    }, [addBotMessage, answers, generateRecommendations, products, setIsTyping, settings]);

    const startQuiz = useCallback(() => {
        setStepIndex(0);

        if (settings.quiz_mode === 'dynamic') {
            handleDynamicStep([]);
            return;
        }

        const firstStep = settings.quiz_steps[0];
        if (firstStep) {
            addBotMessage({
                text: firstStep.question,
                isOptions: true,
                options: firstStep.options,
                stepId: firstStep.id,
            });
        }
    }, [addBotMessage, handleDynamicStep, setStepIndex, settings.quiz_mode, settings.quiz_steps]);

    const skipQuizAndRecommend = useCallback(async () => {
        if (!memory.savedPrefs) return;
        addBotMessage({ text: '✨ **Recherche en cours...** Je me base sur vos préférences habituelles pour vous proposer le meilleur du catalogue.' }, 200);

        const prefs = memory.savedPrefs;
        const answersFromPrefs: Answers = {
            effect_goal: prefs.effect_goal,
            experience_level: prefs.experience_level,
            consumption_method: prefs.consumption_method,
            flavor_profile: prefs.flavor_profile,
        };
        setAnswers(answersFromPrefs);
        await generateRecommendations(answersFromPrefs);
    }, [addBotMessage, generateRecommendations, memory.savedPrefs, setAnswers]);

    const handleAnswer = useCallback(async (option: QuizOption, stepId: string) => {
        addUserMessage(option.label);

        if (option.value === 'start_quiz') {
            startQuiz();
            return;
        }
        if (option.value === 'upsell_info') {
            addBotMessage({ text: "Excellent choix ! Ajouter des options multijoueurs ou des accessoires premium améliore l'expérience. Voici quelques suggestions complémentaires :" }, 400);
            await generateRecommendations(answers);
            return;
        }
        if (option.value === 'later') {
            addBotMessage({ text: "Pas de souci ! N'hésitez pas à me solliciter si vous avez besoin d'un conseil plus tard. 😊" }, 400);
            return;
        }

        const newAnswers = { ...answers, [stepId]: option.value };
        setAnswers(newAnswers);

        if (settings.quiz_mode === 'dynamic' && stepId !== 'proactive') {
            const currentHistory = messages
                .filter(m => m.text && !m.isResult && !m.isOptions) // Only actual exchange
                .map(m => ({
                    role: m.sender === 'user' ? 'user' : ('assistant' as const),
                    content: m.text || ''
                }));

            // Add current answer to history for AI context
            currentHistory.push({ role: 'user', content: option.label });

            await handleDynamicStep(currentHistory);
            return;
        }

        const nextIndex = stepIndex + 1;

        if (stepId === 'experience_level' && (option.value === 'expert' || option.value === 'pro')) {
            setStepIndex(nextIndex);
            setAwaitingTerpene(true);
            setTerpeneSelection([]);
            addBotMessage({
                type: 'tech-feature',
                text: '🛠️ Pour un setup sur-mesure, affinez vos critères ! Sélectionnez vos options techniques préférées (optionnel) :',
            });
            return;
        }

        if (nextIndex < settings.quiz_steps.length) {
            setStepIndex(nextIndex);
            const nextStep = settings.quiz_steps[nextIndex];
            addBotMessage({
                text: nextStep.question,
                isOptions: true,
                options: nextStep.options,
                stepId: nextStep.id,
            });
        } else {
            await generateRecommendations(newAnswers);
        }
    }, [addBotMessage, addUserMessage, answers, generateRecommendations, setAnswers, setAwaitingTerpene, setStepIndex, setTerpeneSelection, settings.quiz_steps, startQuiz, stepIndex]);

    const confirmTerpeneSelection = useCallback(() => {
        setAwaitingTerpene(false);
        if (terpeneSelection.length > 0) {
            addUserMessage(`Options techniques : ${terpeneSelection.join(', ')} ✨`);
        } else {
            addUserMessage('Je passe cette étape →');
        }

        const nextStep = settings.quiz_steps[stepIndex];
        if (nextStep) {
            addBotMessage({
                text: nextStep.question,
                isOptions: true,
                options: nextStep.options,
                stepId: nextStep.id,
            });
        } else {
            generateRecommendations(answers);
        }
    }, [addBotMessage, addUserMessage, answers, generateRecommendations, setAwaitingTerpene, settings.quiz_steps, stepIndex, terpeneSelection]);

    return {
        startQuiz,
        skipQuizAndRecommend,
        handleAnswer,
        confirmTerpeneSelection,
        generateRecommendations,
    };
}
