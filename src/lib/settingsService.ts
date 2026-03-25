import { supabase } from './supabase';
import { type StoreSettings } from '../store/settingsStore';

/**
 * Persist all store settings to the `store_settings` table via upsert.
 * Used by AdminSettingsTab and AdminSetupWizard to avoid duplicated logic.
 */
export async function saveStoreSettings(settings: Partial<StoreSettings>): Promise<void> {
    const payload = Object.entries(settings)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => ({
            key,
            value,
            updated_at: new Date().toISOString(),
        }));

    const { error } = await supabase
        .from('store_settings')
        .upsert(payload, { onConflict: 'key' });

    if (error) throw error;
}
