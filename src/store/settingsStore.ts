import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const SETTINGS_CACHE_TTL_MS = 60_000;
let inflightSettingsRequest: Promise<StoreSettings> | null = null;
let cachedSettings: { data: StoreSettings; fetchedAt: number } | null = null;

export function __resetSettingsStoreCacheForTests() {
    inflightSettingsRequest = null;
    cachedSettings = null;
}

export interface HomeCategory {
    id: string;
    name: string;
    icon: string;
    tag: string;
    emoji: string;
    img_url?: string;
}

export interface StoreSettings {
    delivery_fee: number;
    delivery_free_threshold: number;
    store_name: string;
    store_address: string;
    store_phone: string;
    store_hours: string;
    store_siret: string;
    store_tva_intra: string;
    banner_text: string;
    banner_enabled: boolean;
    social_instagram: string;
    social_facebook: string;
    social_twitter: string;
    social_tiktok: string;
    budtender_chat_enabled: boolean;
    budtender_voice_enabled: boolean;
    budtender_voice_name: string;
    subscriptions_enabled: boolean;
    referral_reward_points: number;
    referral_welcome_bonus: number;
    referral_program_enabled: boolean;
    search_enabled: boolean;
    home_reviews_enabled: boolean;
    home_best_sellers_enabled: boolean;
    empty_cart_suggestions_enabled: boolean;
    age_gate_enabled: boolean;
    loyalty_program_enabled: boolean;
    splash_enabled: boolean;
    splash_media_url: string;
    splash_media_type: 'video' | 'image';
    ticker_messages: string[];
    store_logo_url: string;
    store_logo_dark_url: string;
    store_email: string;
    store_url: string;
    budtender_name: string;
    loyalty_tiers: {
        id: string;
        name: string;
        min_points: number;
        multiplier: number;
        free_shipping_threshold: number | null;
        vip_discount: number;
        benefits: string[];
    }[];
    ai_model: string;
    ai_temperature: number;
    ai_max_tokens: number;
    loyalty_earn_rate: number;
    loyalty_redeem_rate: number;
    loyalty_currency_name: string;
    pos_background_url: string;
    store_tagline: string;
    store_description: string;
    store_sector: string;
    store_brand_range: string;
    store_city: string;
    home_categories: HomeCategory[];
    invoice_tax_rate: number;
    invoice_legal_text: string;
    budtender_base_prompt: string;
    // Hero/background image fields
    hero_bg_url: string;
    home_hero_bg_url: string;
    home_section_bg_url: string;
    products_hero_bg_url: string;
    budtender_hero_bg_url: string;
    contact_bg_url: string;
    home_quality_bg_url: string;

    stripe_enabled: boolean;
    stripe_public_key: string;
    stripe_test_mode: boolean;

    // Theme Colors
    theme_color_neon: string;
    theme_color_dark: string;
    theme_color_primary: string;

    // Typography
    font_heading: string;
    font_heading_size_h1: number;
    font_heading_size_h2: number;
    font_heading_size_h3: number;
    font_heading_size_h4: number;
    font_heading_size_h5: number;
    font_heading_size_h6: number;
}

export const DEFAULT_SETTINGS: StoreSettings = {
    loyalty_earn_rate: 1,
    loyalty_redeem_rate: 5,
    loyalty_currency_name: 'Credits',
    delivery_fee: 0,
    delivery_free_threshold: 100,
    store_name: 'Green Mood',
    store_address: '1 Rue de l\'Innovation, 75001 Paris',
    store_phone: '01 00 00 00 00',
    store_hours: 'Lun–Ven 9h00–18h00',
    store_siret: '',
    store_tva_intra: '',
    banner_text: '🚀 Livraison gratuite dès 100€ !',
    banner_enabled: true,
    social_instagram: '',
    social_facebook: '',
    social_twitter: '',
    social_tiktok: '',
    budtender_chat_enabled: true,
    budtender_voice_enabled: true,
    budtender_voice_name: 'Kore',
    subscriptions_enabled: false,
    referral_reward_points: 500,
    referral_welcome_bonus: 0,
    referral_program_enabled: true,
    search_enabled: true,
    home_reviews_enabled: true,
    home_best_sellers_enabled: true,
    empty_cart_suggestions_enabled: true,
    age_gate_enabled: false,
    loyalty_program_enabled: true,
    splash_enabled: true,
    splash_media_url: '',
    splash_media_type: 'video',
    ticker_messages: [
        "✦ Livraison en France métropolitaine ✦",
        "✦ Paiement sécurisé ✦",
        "✦ Service client 7j/7 ✦",
        "✦ Paiement sécurisé ✦",
        "✦ Service client 7j/7 ✦",
    ],
    store_logo_url: '/logo.png',
    store_logo_dark_url: '/logo.png',
    store_email: 'contact@mystore.com',
    store_url: 'https://mystore.com',
    budtender_name: 'Mélina',
    loyalty_tiers: [
        {
            id: 'bronze',
            name: 'Bronze',
            min_points: 0,
            multiplier: 1,
            free_shipping_threshold: null,
            vip_discount: 0,
            benefits: ['1 point par euro', 'Accès aux offres membres']
        },
        {
            id: 'silver',
            name: 'Silver',
            min_points: 500,
            multiplier: 1.5,
            free_shipping_threshold: 300,
            vip_discount: 0,
            benefits: ['1.5x points par euro', 'Livraison offerte dès 300€']
        },
        {
            id: 'gold',
            name: 'Gold',
            min_points: 1500,
            multiplier: 2,
            free_shipping_threshold: 0,
            vip_discount: 0.15,
            benefits: ['2x points par euro', 'Livraison offerte illimitée', 'Remises VIP -15%']
        }
    ],
    ai_model: 'mistralai/mistral-small-creative',
    ai_temperature: 0.7,
    ai_max_tokens: 1000,
    pos_background_url: '/images/hero-bg-shop.png',
    // White-label fields
    store_tagline: 'Leader Français du CBD & Bien-être',
    store_description: 'Spécialiste de l\'importation et distribution de fleurs, résines, huiles et accessoires CBD en France.',
    store_sector: 'CBD & Bien-être',
    store_brand_range: 'Premium Series',
    store_city: 'Paris',
    home_categories: [
        { id: 'cbd', name: 'CBD', icon: 'Gamepad2', tag: 'Populaire', emoji: '🕹️' },
        { id: 'vapes', name: 'Vapes', icon: 'Zap', tag: 'Bestseller', emoji: '🎯' },
        { id: 'accessories', name: 'Accessories', icon: 'MonitorPlay', tag: 'Premium', emoji: '🏎️' },
        { id: 'edibles', name: 'Edibles', icon: 'Circle', tag: 'Nouveau', emoji: '🎱' },
    ],
    invoice_tax_rate: 20,
    invoice_legal_text: "Produits conformes aux normes CE et aux réglementations de sécurité en vigueur.\nGarantie constructeur 2 ans — Support technique 24/7.",
    budtender_base_prompt: '',
    // Hero/background image fields
    hero_bg_url: '/images/hero-bg-shop.png',
    home_hero_bg_url: '/images/hero-bg-shop.png',
    home_section_bg_url: '/images/solution-hero-bg.png',
    products_hero_bg_url: '/images/hero-bg-shop.png',
    budtender_hero_bg_url: '/images/budtender_hero_bg.png',
    contact_bg_url: '/images/lifestyle-relax.png',
    home_quality_bg_url: '/images/quality-hero-bg.png',
    // === Final CTA Content ===
    // === Stripe Payment ===
    stripe_enabled: false,
    stripe_public_key: '',
    stripe_test_mode: true,

    // Theme Colors
    theme_color_neon: '#6edf11',
    theme_color_dark: '#020408',
    theme_color_primary: '#6edf11',

    // Typography
    font_heading: 'Inter',
    font_heading_size_h1: 48,
    font_heading_size_h2: 36,
    font_heading_size_h3: 30,
    font_heading_size_h4: 24,
    font_heading_size_h5: 20,
    font_heading_size_h6: 18,
};

interface SettingsStore {
    settings: StoreSettings;
    isLoading: boolean;
    fetchSettings: (forceRefresh?: boolean) => Promise<void>;
    replaceSettingsInStore: (nextSettings: StoreSettings) => void;
    updateSettingsInStore: (newSettings: Partial<StoreSettings>) => void;
}

export async function fetchStoreSettings(forceRefresh = false): Promise<StoreSettings> {
    const now = Date.now();
    if (!forceRefresh && cachedSettings && now - cachedSettings.fetchedAt < SETTINGS_CACHE_TTL_MS) {
        return cachedSettings.data;
    }

    if (!forceRefresh && inflightSettingsRequest) {
        return inflightSettingsRequest;
    }

    inflightSettingsRequest = (async () => {
        const { data, error } = await supabase.from('store_settings').select('*');
        if (error) throw error;

        if (!data || data.length === 0) return DEFAULT_SETTINGS;

        const obj = data.reduce((acc: Record<string, any>, row: { key: string; value: any }) => {
            acc[row.key] = row.value;
            return acc;
        }, {});

        if (obj.budtender_enabled !== undefined && obj.budtender_chat_enabled === undefined) {
            obj.budtender_chat_enabled = obj.budtender_enabled;
            obj.budtender_voice_enabled = obj.budtender_enabled;
        }

        return { ...DEFAULT_SETTINGS, ...obj };
    })();

    try {
        const resolved = await inflightSettingsRequest;
        cachedSettings = { data: resolved, fetchedAt: Date.now() };
        return resolved;
    } finally {
        inflightSettingsRequest = null;
    }
}

export const useSettingsStore = create<SettingsStore>((set) => ({
    settings: DEFAULT_SETTINGS,
    isLoading: true,
    fetchSettings: async (forceRefresh = false) => {
        try {
            const settings = await fetchStoreSettings(forceRefresh);
            set({ settings, isLoading: false });
        } catch (err) {
            console.error('Error fetching settings:', err);
            set({ isLoading: false });
        }
    },
    replaceSettingsInStore: (nextSettings) => set({ settings: nextSettings }),
    updateSettingsInStore: (newSettings) => {
        set((state) => ({ settings: { ...state.settings, ...newSettings } }));
    },
}));
