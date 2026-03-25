import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const isTestEnv = Boolean(import.meta.env.VITEST) || import.meta.env.MODE === 'test';

if ((!supabaseUrl || !supabaseAnonKey) && !isTestEnv) {
  throw new Error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes dans .env');
}

export const SUPABASE_URL = supabaseUrl || 'https://test-project.supabase.co';
export const SUPABASE_ANON_KEY = supabaseAnonKey || 'test-anon-key';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Vérifie côté serveur (Edge Function) que l'utilisateur courant est admin.
 * Ne dépend pas de l'état client/localStorage.
 */
export async function verifyServerAdmin(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('admin-action', {
    body: { action: 'authorize' },
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.error('[verifyServerAdmin] function invoke failed:', error.message);
    }
    return false;
  }

  return Boolean(data?.is_admin);
}
