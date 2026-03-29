import { supabase } from './supabase';

// ─── Shared BudTender Settings Logic ──────────────────────────────────────────

export interface QuizOption {
    label: string;
    value: string;
    emoji: string;
}

export interface QuizStep {
    id: string;
    question: string;
    options: QuizOption[];
}

export interface BudTenderSettings {
    enabled: boolean;
    ai_enabled: boolean;
    ai_model: string;
    ai_temperature: number;
    ai_max_tokens: number;
    recommendations_count: number;
    typing_speed: 'normal' | 'fast' | 'slow';
    memory_enabled: boolean;
    threshold_arcade: number;
    threshold_flippers: number;
    threshold_others: number;
    welcome_message: string;
    pulse_delay: number;
    quiz_steps: QuizStep[];
    quiz_mode: 'static' | 'dynamic';
    custom_quiz_prompt: string;
    custom_chat_prompt: string;
    voice_close_session_enabled: boolean;
}

export const TECH_ADVISOR_DEFAULT_QUIZ: QuizStep[] = [
    {
        id: 'tech_goal',
        question: 'Quel est votre objectif principal ?',
        options: [
            { label: 'Gaming & Performance', value: 'gaming', emoji: '🎮' },
            { label: 'Productivité & Bureau', value: 'work', emoji: '💻' },
            { label: 'Création de contenu', value: 'creation', emoji: '🎨' },
            { label: 'Maison Connectée', value: 'smart_home', emoji: '🏠' },
        ],
    },
    {
        id: 'experience_level',
        question: 'Quel est votre niveau d\'expertise ?',
        options: [
            { label: 'Débutant / Simple Curieux', value: 'beginner', emoji: '🌱' },
            { label: 'Amateur Éclairé', value: 'enthusiast', emoji: '⚡' },
            { label: 'Professionnel / Power User', value: 'pro', emoji: '🏗️' },
            { label: 'Expert / Hardware Specialist', value: 'expert', emoji: '🛠️' },
        ],
    },
    {
        id: 'budget_range',
        question: 'Quelle est votre gamme de budget ?',
        options: [
            { label: 'Accessibles / Entrée de gamme', value: 'entry', emoji: '💶' },
            { label: 'Balanced / Milieu de gamme', value: 'mid', emoji: '💳' },
            { label: 'Premium / High-End', value: 'high', emoji: '💎' },
            { label: 'Extreme / Enthusiast', value: 'ultra', emoji: '👑' },
        ],
    },
    {
        id: 'platform_preference',
        question: 'Quelle plateforme préférez-vous ?',
        options: [
            { label: 'Windows Ecosystem', value: 'windows', emoji: '🪟' },
            { label: 'Apple / macOS', value: 'macos', emoji: '🍎' },
            { label: 'Mobile / Android', value: 'android', emoji: '🤖' },
            { label: 'Open Source / Linux', value: 'linux', emoji: '🐧' },
        ],
    },
    {
        id: 'priority_features',
        question: 'Quelle est votre priorité absolue ?',
        options: [
            { label: 'Performance Max', value: 'performance', emoji: '🚀' },
            { label: 'Autonomie & Portabilité', value: 'battery', emoji: '🔋' },
            { label: 'Design & Esthétique', value: 'design', emoji: '✨' },
            { label: 'Facilité d\'utilisation', value: 'ease', emoji: '👌' },
        ],
    },
    {
        id: 'interest',
        question: 'Quel est votre centre d\'intérêt principal ?',
        options: [
            { label: 'High-Tech & Gadgets', value: 'tech', emoji: '🔌' },
            { label: 'Mode & Lifestyle', value: 'lifestyle', emoji: '👕' },
            { label: 'Maison & Déco', value: 'home', emoji: '🏠' },
            { label: 'Bien-être & Santé', value: 'wellness', emoji: '🧘' },
        ],
    },
    {
        id: 'audience',
        question: 'Pour qui cherchez-vous un produit ?',
        options: [
            { label: 'Pour moi-même', value: 'self', emoji: '🙋' },
            { label: 'Un cadeau (Anniversaire/Noël)', value: 'gift', emoji: '🎁' },
            { label: 'Un enfant / Ado', value: 'child', emoji: '👶' },
            { label: 'Usage Professionnel', value: 'pro', emoji: '💼' },
        ],
    },
];

export const TECH_ADVISOR_DEFAULTS: BudTenderSettings = {
    enabled: true,
    ai_enabled: true,
    ai_model: 'google/gemini-2.0-flash-lite-001',
    ai_temperature: 0.7,
    ai_max_tokens: 1500,
    recommendations_count: 3,
    typing_speed: 'normal',
    memory_enabled: true,
    threshold_arcade: 60,
    threshold_flippers: 30,
    threshold_others: 45,
    welcome_message: "Bonjour ! Je suis votre conseiller high-tech. Comment puis-je vous aider à configurer votre setup idéal ?",
    pulse_delay: 3,
    quiz_steps: TECH_ADVISOR_DEFAULT_QUIZ,
    quiz_mode: 'dynamic',
    custom_quiz_prompt: "Oriente toujours le client vers des composants compatibles entre eux. Si le client mentionne le gaming, demande-lui sa résolution cible (1080p, 1440p, 4K). Termine par un conseil expert sur l'entretien du matériel.",
    custom_chat_prompt: "",
    voice_close_session_enabled: true,
};

/**
 * Helper to migrate old settings keys (gemini_*) to new generic AI keys
 */
function migrateSettings(raw: any): BudTenderSettings {
    const migrated = { ...TECH_ADVISOR_DEFAULTS, ...raw };

    // Migrate old keys if present and new ones aren't specifically set in the raw data
    if (raw.gemini_enabled !== undefined && raw.ai_enabled === undefined) {
        migrated.ai_enabled = raw.gemini_enabled;
    }
    if (raw.gemini_temperature !== undefined && raw.ai_temperature === undefined) {
        migrated.ai_temperature = raw.gemini_temperature;
    }
    if (raw.gemini_max_tokens !== undefined && raw.ai_max_tokens === undefined) {
        migrated.ai_max_tokens = raw.gemini_max_tokens;
    }

    // Ensure ai_model is set to a valid OpenRouter default if missing
    if (!migrated.ai_model || migrated.ai_model === 'google/gemini-2.0-flash-lite-preview-02-05:free') {
        migrated.ai_model = TECH_ADVISOR_DEFAULTS.ai_model;
    }

    return migrated;
}

let inMemorySettings: BudTenderSettings | null = null;

/**
 * Synchronous access always returns in-memory settings or safe defaults.
 * Admin configuration is intentionally not persisted in localStorage.
 */
export function getBudTenderSettings(): BudTenderSettings {
    return inMemorySettings ?? TECH_ADVISOR_DEFAULTS;
}

/**
 * Fetch BudTender settings from Supabase (source of truth).
 * We keep only an in-memory cache for the current runtime.
 */
export async function fetchBudTenderSettings(forceRefresh = false): Promise<BudTenderSettings> {
    if (!forceRefresh && inMemorySettings) return inMemorySettings;

    try {
        const { data, error } = await supabase
            .from('store_settings')
            .select('value')
            .eq('key', 'budtender_config')
            .maybeSingle();

        if (error) throw error;
        if (data?.value) {
            inMemorySettings = migrateSettings(data.value);
            return inMemorySettings;
        }
    } catch (err) {
        if (import.meta.env.DEV) console.warn('[budtenderSettings] No config found in DB, using defaults');
    }

    inMemorySettings = TECH_ADVISOR_DEFAULTS;
    return inMemorySettings;
}
