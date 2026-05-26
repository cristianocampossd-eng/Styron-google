import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing! Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY.");
}

export const supabase = createClient<Database>(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

// Cache current user
let cachedUser: any = null;

// Listen to auth changes to keep user cached synchronously (like firebase auth.currentUser)
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUser = session?.user || null;
});

// Seed initial session/user synchronously
supabase.auth.getSession().then(({ data }) => {
  cachedUser = data.session?.user || null;
});

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
