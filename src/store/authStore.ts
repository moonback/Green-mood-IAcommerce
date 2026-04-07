import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';
import { useSettingsStore } from './settingsStore';

let authInitializationCleanup: (() => void) | null = null;

export function __resetAuthStoreInitializationForTests() {
  authInitializationCleanup?.();
  authInitializationCleanup = null;
}

export const DEVICE_ID_STORAGE_KEY = 'gm_device_id';

export function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) return existing;

  const deviceId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}

function getDeviceName() {
  const ua = navigator.userAgent;
  let browser = 'Navigateur';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  if (/Android|iPhone|iPad|iPod/i.test(ua)) return `Mobile (${browser})`;
  if (/Macintosh|Mac OS X/i.test(ua)) return `Mac (${browser})`;
  if (/Windows/i.test(ua)) return `Windows (${browser})`;
  if (/Linux/i.test(ua)) return `Linux (${browser})`;
  return `${browser} sur Appareil Inconnu`;
}

async function cleanupOldSessions(userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await supabase
    .from('user_active_sessions')
    .delete()
    .eq('user_id', userId)
    .lt('last_seen', thirtyDaysAgo.toISOString());
}

async function touchUserSession(userId: string) {
  const deviceId = getDeviceId();
  
  // Cleanup old sessions first
  await cleanupOldSessions(userId);

  await supabase
    .from('user_active_sessions')
    .upsert({
      user_id: userId,
      device_id: deviceId,
      device_name: getDeviceName(),
      user_agent: navigator.userAgent,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,device_id' });
}

async function isSessionValid(userId: string) {
  const deviceId = getDeviceId();
  const { data, error } = await supabase
    .from('user_active_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .maybeSingle();
  
  return !!data;
}

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  initialize: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  setProfile: (profile: Profile | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isLoading: true,

  initialize: () => {
    if (authInitializationCleanup) {
      return authInitializationCleanup;
    }

    // On s'appuie uniquement sur onAuthStateChange (pattern recommandé Supabase).
    // INITIAL_SESSION est toujours émis au chargement — avec ou sans session.
    // TOKEN_REFRESHED est émis après un refresh automatique du token.
    // Cela évite la race condition entre getSession() et onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, profile: null, isLoading: false });
        return;
      }

      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          set({ session, user: session.user });
          await get().fetchProfile(session.user.id);
          touchUserSession(session.user.id);
        }
        // isLoading: false toujours setté après INITIAL_SESSION,
        // qu'il y ait une session ou non.
        set({ isLoading: false });
        return;
      }

      // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        touchUserSession(session.user.id);
        get().fetchProfile(session.user.id);
      } else {
        set({ profile: null });
      }
    });

    // Periodic validation every 30 seconds (révocation admin)
    const interval = setInterval(async () => {
      const { user, signOut } = get();
      if (user) {
        const valid = await isSessionValid(user.id);
        if (!valid) {
          await signOut();
        } else {
          touchUserSession(user.id);
        }
      }
    }, 30000);

    authInitializationCleanup = () => {
      clearInterval(interval);
      subscription.unsubscribe();
      authInitializationCleanup = null;
    };

    return authInitializationCleanup;
  },

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (import.meta.env.DEV) console.error('[authStore] fetchProfile error:', error.code, error.message, error.hint);
      return;
    }

    if (data) set({ profile: data as Profile });
  },

  setProfile: (profile: Profile | null) => set({ profile }),

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, fullName, referralCode?: string) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      },
    });

    if (error) throw error;

    if (authData.user) {
      try {
        // ALWAYS try to give 100 points as a signup bonus if no referral code
        // If referral code exists, the RPC handles it (potentially with a different amount)
        if (referralCode) {
          const { data: bonusSetting } = await supabase
            .from('store_settings')
            .select('value')
            .eq('key', 'referral_welcome_bonus')
            .maybeSingle();

          const welcomeBonus = bonusSetting ? parseInt(bonusSetting.value as string) : 100;

          await supabase.rpc('create_referral_record', {
            p_referral_code: referralCode.trim().toUpperCase(),
            p_referee_id: authData.user.id,
            p_welcome_bonus: welcomeBonus,
          });
        } else {
          // General signup bonus (no referral)
          // We try to update directly. This might fail if email confirmation is required,
          // but if auto-confirm is on (common in this project), it works perfectly.
          const INITIAL_BONUS = 100;
          await supabase
            .from('profiles')
            .update({ loyalty_points: INITIAL_BONUS })
            .eq('id', authData.user.id);
            
          // We also log the transaction if possible
          await supabase.from('loyalty_transactions').insert({
            user_id: authData.user.id,
            type: 'earned',
            points: INITIAL_BONUS,
            balance_after: INITIAL_BONUS,
            note: `Cadeau de bienvenue ${useSettingsStore.getState().settings.store_name || 'Eco CBD'}`,
          });
        }
      } catch (err) {
        console.warn('Signup bonus credit failed (likely RLS/pending confirmation):', err);
      }
    }
  },

  signOut: async () => {
    const { user } = get();
    if (user) {
      const deviceId = getDeviceId();
      await supabase
        .from('user_active_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('device_id', deviceId);
    }
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null });
  },

  requestPasswordReset: async (email) => {
    const redirectTo = `${window.location.origin}/reinitialiser-mot-de-passe`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },
}));
