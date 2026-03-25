import { Product } from './types';
import { BudTenderSettings, QuizOption } from './budtenderSettings';
import { getQuizPrompt, getChatPrompt } from './budtenderPrompts';
import { CATEGORY_SLUGS } from './constants';
import { supabase } from './supabase';
import { useSettingsStore } from '../store/settingsStore';

export interface TechChip {
    label: string;
    emoji: string;
    group: 'hardware' | 'style';
}

export const TECH_CHIPS: TechChip[] = [
    // Hardware Features
    { label: 'Écran 4K', emoji: '🖥️', group: 'hardware' },
    { label: 'Multijoueur', emoji: '👥', group: 'hardware' },
    { label: 'Monnayeur', emoji: '🪙', group: 'hardware' },
    { label: 'Rétro-éclairé', emoji: '🌈', group: 'hardware' },
    { label: 'Wi-Fi / Connecté', emoji: '🌐', group: 'hardware' },
    { label: 'Import Japon', emoji: '🇯🇵', group: 'hardware' },
    { label: 'Force Feedback', emoji: '🏎️', group: 'hardware' },
    { label: 'Stéréo Boost', emoji: '🔊', group: 'hardware' },
    // Ambiance / Style
    { label: 'Compétition', emoji: '🏆', group: 'style' },
    { label: 'Vintage 80s', emoji: '🕹️', group: 'style' },
    { label: 'Immersion', emoji: '🥽', group: 'style' },
    { label: 'Convivialité', emoji: '🤝', group: 'style' },
    { label: 'Performance', emoji: '🚀', group: 'style' },
    { label: 'Showroom', emoji: '🏬', group: 'style' },
];

export type Answers = Record<string, string>;

export function scoreProduct(product: Product, answers: Answers): number {
    let score = 0;
    const cat = product.category?.slug ?? '';
    const name = product.name.toLowerCase();
    const desc = (product.description ?? '').toLowerCase();

    // Mapping new tech goals
    if (answers.tech_goal === 'gaming') {
        if (name.includes('gaming') || desc.includes('rtx') || desc.includes('fps') || desc.includes('performance')) score += 5;
        if (cat === 'gpu' || cat === 'pc-gaming' || cat === 'moniteurs') score += 3;
    }
    if (answers.tech_goal === 'work') {
        if (desc.includes('productivité') || desc.includes('ergonomique') || desc.includes('bureau') || desc.includes('autonomie')) score += 5;
        if (cat === 'laptops' || cat === 'peripheriques') score += 3;
    }
    if (answers.tech_goal === 'creation') {
        if (desc.includes('rendu') || desc.includes('couleur') || desc.includes('adobe') || desc.includes('photo')) score += 5;
        if (cat === 'stations-de-travail' || cat === 'ecrans-pro') score += 4;
    }
    if (answers.tech_goal === 'smart_home') {
        if (desc.includes('connecté') || desc.includes('domotique') || desc.includes('wifi')) score += 5;
        if (cat === 'iot' || cat === 'securite') score += 4;
    }

    // Experience Level Scoring
    if (answers.experience_level === 'beginner') {
        if (desc.includes('facile') || desc.includes('complet') || name.includes('pack')) score += 3;
        if (product.is_bundle) score += 2;
    }
    if (answers.experience_level === 'expert' || answers.experience_level === 'pro') {
        if (desc.includes('overclock') || desc.includes('custom') || desc.includes('premium')) score += 4;
    }

    // Platform Preferences
    if (answers.platform_preference === 'windows' && (desc.includes('windows') || desc.includes('pc'))) score += 4;
    if (answers.platform_preference === 'macos' && (desc.includes('apple') || desc.includes('mac') || desc.includes('m1') || desc.includes('m2'))) score += 5;
    if (answers.platform_preference === 'linux' && desc.includes('compatible linux')) score += 4;

    // Budget Scoring
    const price = product.price;
    if (answers.budget_range === 'entry' && price < 500) score += 5;
    if (answers.budget_range === 'mid' && price >= 500 && price <= 1500) score += 5;
    if (answers.budget_range === 'high' && price > 1500 && price <= 3000) score += 5;
    if (answers.budget_range === 'ultra' && price > 3000) score += 5;

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
    if (answers.tech_goal === 'gaming') lines.push('Pour le gaming, priorisez un GPU performant et un écran à haut taux de rafraîchissement.');
    if (answers.tech_goal === 'work') lines.push("Pour la productivité, privilégiez le confort ergonomique et une excellente autonomie.");
    if (answers.tech_goal === 'creation') lines.push('Pour la création, la précision des couleurs et la puissance de calcul CPU/RAM sont essentielles.');
    if (answers.tech_goal === 'smart_home') lines.push('Pour votre maison connectée, vérifiez la compatibilité avec votre écosystème actuel.');
    if (answers.experience_level === 'beginner') lines.push("Nos solutions clés en main sont idéales pour débuter sans configuration complexe.");
    if (priorityFeatures.length > 0) lines.push(`Vos critères prioritaires (${priorityFeatures.join(', ')}) nous guident vers les meilleurs composants.`);
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
