import { useSettingsStore, type StoreSettings } from '../settingsStore';

export type BrandingSettings = Pick<StoreSettings,
  | 'store_name'
  | 'store_tagline'
  | 'store_description'
  | 'store_logo_url'
  | 'store_logo_dark_url'
  | 'store_email'
  | 'store_phone'
  | 'store_address'
  | 'store_city'
  | 'theme_color_neon'
  | 'theme_color_dark'
  | 'theme_color_primary'
  | 'font_heading'
>;

export type DeliverySettings = Pick<StoreSettings,
  | 'delivery_fee'
  | 'delivery_free_threshold'
  | 'store_hours'
  | 'invoice_tax_rate'
  | 'invoice_legal_text'
>;

export type FeatureFlagsSettings = Pick<StoreSettings,
  | 'search_enabled'
  | 'age_gate_enabled'
  | 'splash_enabled'
  | 'subscriptions_enabled'
  | 'referral_program_enabled'
  | 'loyalty_program_enabled'
  | 'stripe_enabled'
  | 'home_reviews_enabled'
  | 'home_best_sellers_enabled'
  | 'empty_cart_suggestions_enabled'
>;

export const useBrandingSettings = () => useSettingsStore((s) => ({
  store_name: s.settings.store_name,
  store_tagline: s.settings.store_tagline,
  store_description: s.settings.store_description,
  store_logo_url: s.settings.store_logo_url,
    store_logo_dark_url: s.settings.store_logo_dark_url,
    store_email: s.settings.store_email,
  store_phone: s.settings.store_phone,
  store_address: s.settings.store_address,
  store_city: s.settings.store_city,
  theme_color_neon: s.settings.theme_color_neon,
  theme_color_dark: s.settings.theme_color_dark,
  theme_color_primary: s.settings.theme_color_primary,
  font_heading: s.settings.font_heading,
}));

export const useDeliverySettings = () => useSettingsStore((s) => ({
  delivery_fee: s.settings.delivery_fee,
  delivery_free_threshold: s.settings.delivery_free_threshold,
  store_hours: s.settings.store_hours,
  invoice_tax_rate: s.settings.invoice_tax_rate,
  invoice_legal_text: s.settings.invoice_legal_text,
}));

export const useFeatureFlagsSettings = () => useSettingsStore((s) => ({
  search_enabled: s.settings.search_enabled,
  age_gate_enabled: s.settings.age_gate_enabled,
  splash_enabled: s.settings.splash_enabled,
  subscriptions_enabled: s.settings.subscriptions_enabled,
  referral_program_enabled: s.settings.referral_program_enabled,
  loyalty_program_enabled: s.settings.loyalty_program_enabled,
  stripe_enabled: s.settings.stripe_enabled,
  home_reviews_enabled: s.settings.home_reviews_enabled,
  home_best_sellers_enabled: s.settings.home_best_sellers_enabled,
  empty_cart_suggestions_enabled: s.settings.empty_cart_suggestions_enabled,
}));
