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
    threshold_fleurs: number;
    threshold_resines: number;
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
        id: 'effect_goal',
        question: 'Quel est l\'effet recherché ?',
        options: [
            { label: 'Relaxation & Détente', value: 'relaxation', emoji: '🧘' },
            { label: 'Sommeil Profond', value: 'sleep', emoji: '😴' },
            { label: 'Soulagement (Douleurs/Stress)', value: 'relief', emoji: '🌿' },
            { label: 'Énergie & Créativité', value: 'energy', emoji: '⚡' },
        ],
    },
    {
        id: 'experience_level',
        question: 'Quel est votre niveau de connaissance du CBD ?',
        options: [
            { label: 'Débutant / Curieux', value: 'beginner', emoji: '🌱' },
            { label: 'Consommateur occasionnel', value: 'casual', emoji: '🍃' },
            { label: 'Habitué / Connaisseur', value: 'regular', emoji: '🌿' },
            { label: 'Expert', value: 'expert', emoji: '🔬' },
        ],
    },
    {
        id: 'consumption_method',
        question: 'Comment préférez-vous consommer ?',
        options: [
            { label: 'Infusion & Alimentaire', value: 'edibles', emoji: '🍵' },
            { label: 'Vaporisation / E-cig', value: 'vaping', emoji: '💨' },
            { label: 'Huile Sublinguale', value: 'oil', emoji: '💧' },
            { label: 'Fleurs / Résines (Classique)', value: 'flower', emoji: '🍁' },
        ],
    },
    {
        id: 'flavor_profile',
        question: 'Quelles sont vos préférences aromatiques ?',
        options: [
            { label: 'Fruité & Sucré', value: 'fruity', emoji: '🍓' },
            { label: 'Terreux & Boisé', value: 'earthy', emoji: '🌲' },
            { label: 'Citrus & Acidulé', value: 'citrus', emoji: '🍋' },
            { label: 'Épicé & Floral', value: 'spicy', emoji: '🌶️' },
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
    threshold_fleurs: 14,
    threshold_resines: 20,
    threshold_others: 30,
    welcome_message: "Bonjour ! Je suis votre conseiller CBD. Comment puis-je vous aider aujourd'hui ?",
    pulse_delay: 3,
    quiz_steps: TECH_ADVISOR_DEFAULT_QUIZ,
    quiz_mode: 'dynamic',
    custom_quiz_prompt: "Oriente toujours le client vers des produits CBD adaptés à ses besoins (sommeil, stress, douleurs). Si le client débute, propose des huiles ou des infusions en priorité. Termine toujours par un conseil bienveillant.",
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
