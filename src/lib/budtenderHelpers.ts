import { Product } from './types';
import { BudTenderSettings, QuizOption } from './budtenderSettings';
import { getQuizPrompt } from './budtenderPrompts';
import { CATEGORY_SLUGS } from './constants';
import { supabase } from './supabase';
import { useSettingsStore } from '../store/settingsStore';

export interface CBDChip {
    label: string;
    emoji: string;
    group: 'effect' | 'flavor';
}

export const CBD_CHIPS: CBDChip[] = [
    // Effects
    { label: 'Détente Profonde', emoji: '🧘', group: 'effect' },
    { label: 'Aide au Sommeil', emoji: '😴', group: 'effect' },
    { label: 'Apaisement', emoji: '🌿', group: 'effect' },
    { label: 'Vitalité', emoji: '⚡', group: 'effect' },
    // Flavors
    { label: 'Fruité', emoji: '🍓', group: 'flavor' },
    { label: 'Terreux', emoji: '🌲', group: 'flavor' },
    { label: 'Agrumes', emoji: '🍋', group: 'flavor' },
    { label: 'Épicé', emoji: '🌶️', group: 'flavor' },
];

export type Answers = Record<string, string>;

export function scoreProduct(product: Product, answers: Answers): number {
    let score = 0;
    const cat = product.category?.slug ?? '';
    const name = product.name.toLowerCase();
    const desc = (product.description ?? '').toLowerCase();

    // Effect mapping
    if (answers.effect_goal === 'relaxation') {
        if (name.includes('relax') || desc.includes('détente') || desc.includes('calme')) score += 5;
        if (cat === CATEGORY_SLUGS.FLEURS || cat === CATEGORY_SLUGS.RESINES) score += 3;
    }
    if (answers.effect_goal === 'sleep') {
        if (desc.includes('sommeil') || desc.includes('nuit') || desc.includes('dormir')) score += 5;
        if (cat === CATEGORY_SLUGS.HUILES || cat === CATEGORY_SLUGS.GUMMIES) score += 4;
    }
    if (answers.effect_goal === 'relief') {
        if (desc.includes('douleur') || desc.includes('soulagement') || desc.includes('stress')) score += 5;
        if (cat === CATEGORY_SLUGS.HUILES) score += 4;
    }
    if (answers.effect_goal === 'energy') {
        if (desc.includes('énergie') || desc.includes('jour') || desc.includes('vitalité')) score += 5;
        if (cat === CATEGORY_SLUGS.FLEURS) score += 3;
    }

    // Experience Level
    if (answers.experience_level === 'beginner') {
        if (cat === CATEGORY_SLUGS.HUILES || cat === CATEGORY_SLUGS.GUMMIES || desc.includes('doux') || desc.includes('facile')) score += 4;
    }
    if (answers.experience_level === 'expert') {
        if (cat === CATEGORY_SLUGS.RESINES || desc.includes('puissant') || desc.includes('intense')) score += 4;
    }

    // Consumption Method
    if (answers.consumption_method === 'edibles' && (cat === CATEGORY_SLUGS.GUMMIES || name.includes('infusion'))) score += 5;
    if (answers.consumption_method === 'vaping' && cat === CATEGORY_SLUGS.VAPES) score += 5;
    if (answers.consumption_method === 'oil' && cat === CATEGORY_SLUGS.HUILES) score += 5;
    if (answers.consumption_method === 'flower' && (cat === CATEGORY_SLUGS.FLEURS || cat === CATEGORY_SLUGS.RESINES)) score += 5;

    if (product.stock_quantity > 0) score += 1;
    if (product.is_featured) score += 2;

    return score;
}

export function scoreTechFeatures(product: Product, selected: string[]): number {
    if (selected.length === 0) return 0;
    const productSpecs: string[] = (product.attributes?.specs ?? []).map((a: string) => a.toLowerCase());
    const productBenefits: string[] = (product.attributes?.benefits ?? []).map((b: string) => b.toLowerCase());
    const productDesc = (product.description ?? '').toLowerCase();
    let bonus = 0;

    for (const chip of selected) {
        const chipLow = chip.toLowerCase();
        if (productSpecs.some(s => s.includes(chipLow) || chipLow.includes(s))) bonus += 6;
        if (productBenefits.some(b => b.includes(chipLow) || chipLow.includes(b))) bonus += 4;
        if (productDesc.includes(chipLow)) bonus += 2;
    }
    return bonus;
}

export function generateAdvice(answers: Answers, priorityFeatures: string[] = []): string {
    const lines: string[] = [];
    if (answers.effect_goal === 'relaxation') lines.push('Pour la détente, nous vous conseillons des fleurs douces ou des résines classiques.');
    if (answers.effect_goal === 'sleep') lines.push("Pour le sommeil, nos huiles de CBD enrichies en CBN sont particulièrement efficaces.");
    if (answers.effect_goal === 'relief') lines.push('Pour le soulagement, privilégiez des huiles à spectre complet pour profiter de l\'effet d\'entourage.');
    if (answers.effect_goal === 'energy') lines.push('Pour un coup de boost, orientez-vous vers des fleurs à dominance Sativa.');
    if (answers.experience_level === 'beginner') lines.push("Si vous débutez, commencez par de faibles concentrations (huiles ou infusions).");
    if (priorityFeatures.length > 0) lines.push(`Vos préférences (${priorityFeatures.join(', ')}) nous ont guidés dans notre sélection.`);
    return lines.join(' ');
}

export async function callAI(
    answers: Answers,
    products: Product[],
    settings: BudTenderSettings,
    history: { role: string; content: string }[] = [],
    context?: string
): Promise<string | null> {
    if (!settings.ai_enabled) return null;

    const topScored = [...products]
        .map(p => ({ p, s: scoreProduct(p, answers) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 15);

    const catalog = topScored
        .map(({ p }) => {
            const specs = (p.attributes?.specs ?? []).join(', ');
            const benefits = (p.attributes?.benefits ?? []).join(', ');
            return `- ${p.name} (${p.category?.slug}, ${p.price}€). ${p.description ?? ''} ${specs ? 'Specs: ' + specs : ''} ${benefits ? 'Points forts: ' + benefits : ''}`.trim();
        })
        .join('\n');

    const settingsInStore = useSettingsStore.getState().settings;
    const budtenderName = settingsInStore.budtender_name || 'Assistant';
    const storeName = settingsInStore.store_name || 'My Store';
    const systemPromptMessage = {
        role: 'system',
        content: getQuizPrompt(answers, settings.quiz_steps, catalog, context, settings.custom_quiz_prompt, budtenderName, storeName)
    };

    const messages = [
        systemPromptMessage,
        ...history
    ];

    if (messages[messages.length - 1].role !== 'user') {
        messages.push({ role: 'user', content: "Basé sur mon profil et nos échanges, quel setup technique me recommandez-vous ?" });
    }

    const modelToUse = settings.ai_model || 'google/gemini-2.0-flash-lite-001';

    try {
        const { data: json, error } = await supabase.functions.invoke('ai-chat', {
            body: {
                model: modelToUse,
                messages,
                temperature: settings.ai_temperature,
                max_tokens: settings.ai_max_tokens,
                x_title: `${storeName} ${budtenderName}`,
            },
        });
        if (error) return null;
        return json?.choices?.[0]?.message?.content ?? null;
    } catch (err) {
        return null;
    }
}

export interface DynamicQuizStep {
    status: 'question' | 'complete';
    question?: string;
    options?: QuizOption[];
    reason?: string;
}

export async function callAIDynamicStep(
    products: Product[],
    settings: BudTenderSettings,
    history: { role: string; content: string }[] = [],
    context?: string
): Promise<DynamicQuizStep | null> {
    if (!settings.ai_enabled) return null;

    // Provide a snapshot of the catalog
    const catalog = products
        .slice(0, 20)
        .map(p => `- ${p.name} (${p.category?.slug}, ${p.price}€). ${p.description?.slice(0, 50)}...`)
        .join('\n');

    const settingsInStore = useSettingsStore.getState().settings;
    const budtenderName = settingsInStore.budtender_name || 'BudTender';
    const storeName = settingsInStore.store_name || 'Eco CBD';
    const prompt = (await import('./budtenderPrompts')).getDynamicQuizPrompt(
        history,
        catalog,
        context,
        settings.custom_quiz_prompt,
        budtenderName,
        storeName
    );

    const modelToUse = settings.ai_model || 'mistralai/mistral-small-creative';

    try {
        const { data: json, error } = await supabase.functions.invoke('ai-chat', {
            body: {
                model: modelToUse,
                messages: [{ role: 'system', content: prompt }],
                temperature: 0.1, // Low temperature for consistent JSON
                max_tokens: 500,
                x_title: `${storeName} BudTender Quiz`,
            },
        });

        if (error) throw error;

        let content = json?.choices?.[0]?.message?.content ?? '';

        // 1. Extract JSON block more reliably
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            content = content.substring(firstBrace, lastBrace + 1);
        }

        // 2. Remove actual control characters that break JSON.parse.
        // Replacing newlines/tabs with spaces is safe for both structural whitespace 
        // and illegal raw newlines inside strings.
        content = content.replace(/[\r\n\t\b\f]/g, ' ');

        try {
            return JSON.parse(content) as DynamicQuizStep;
        } catch (parseErr) {
            console.error('[BudTender] JSON parse failed. Content preview:', content.slice(0, 100));
            return null;
        }
    } catch (err) {
        console.error('[BudTender] callAIDynamicStep error:', err);
        return null;
    }
}



export type MessageType = 'standard' | 'restock' | 'skip-quiz' | 'tech-feature' | 'tool_confirm';

export interface Message {
    id: string;
    sender: 'bot' | 'user';
    text?: string;
    type?: MessageType | string;
    isResult?: boolean;
    isOptions?: boolean;
    options?: QuizOption[];
    stepId?: string;
    recommended?: Product[];
    products?: Product[];
    versions?: string[];
    currentVersionIndex?: number;
    feedback?: 'up' | 'down';
    restockProduct?: any;
    restockProducts?: any[];
    toolName?: string;
    _confirmed?: boolean;
}
