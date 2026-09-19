import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Global protection against expired/invalid Supabase refresh token crashes
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const firstArg = args[0];
    const msg =
      typeof firstArg === 'string'
        ? firstArg
        : firstArg?.message ||
          firstArg?.error_description ||
          String(firstArg || '');

    if (
      msg.includes('Invalid Refresh Token') ||
      msg.includes('Refresh Token Not Found') ||
      msg.includes('invalid_grant')
    ) {
      console.warn('Sessão expirada do Supabase detectada. Limpando credenciais locais...');
      try {
        if (window.localStorage) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => window.localStorage.removeItem(k));
        }
      } catch (_) {}
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg =
      typeof reason === 'string'
        ? reason
        : reason?.message ||
          reason?.error_description ||
          String(reason || '');

    if (
      msg.includes('Invalid Refresh Token') ||
      msg.includes('Refresh Token Not Found') ||
      msg.includes('invalid_grant')
    ) {
      event.preventDefault();
      console.warn('Sessão expirada tratada com sucesso.');
      try {
        if (window.localStorage) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => window.localStorage.removeItem(k));
        }
      } catch (_) {}
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('Invalid Refresh Token') ||
      msg.includes('Refresh Token Not Found') ||
      msg.includes('invalid_grant')
    ) {
      event.preventDefault();
    }
  });
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const isPlaceholder = !supabaseUrl || !supabaseAnonKey;

if (isPlaceholder) {
  console.warn("Supabase credentials missing! Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY.");
}

export const supabase = createClient<Database>(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

// Cache current user
let cachedUser: any = null;

if (!isPlaceholder) {
  // Listen to auth changes to keep user cached synchronously (like firebase auth.currentUser)
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      cachedUser = null;
    } else {
      cachedUser = session?.user || null;
    }
  });

  // Seed initial session/user synchronously
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      const msg = error.message || '';
      if (
        msg.includes('Invalid Refresh Token') ||
        msg.includes('Refresh Token Not Found') ||
        msg.includes('invalid_grant')
      ) {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    }
    cachedUser = data?.session?.user || null;
  }).catch(err => {
    const msg = String(err?.message || err);
    if (
      !msg.includes('Invalid Refresh Token') &&
      !msg.includes('Refresh Token Not Found') &&
      !msg.includes('invalid_grant')
    ) {
      console.warn("Failed to fetch Supabase session:", err);
    }
  });
}

export const auth = {
  get currentUser() {
    if (cachedUser) {
      return {
        uid: cachedUser.id,
        email: cachedUser.email,
        displayName: cachedUser.user_metadata?.full_name || '',
      };
    }
    return null;
  }
};
