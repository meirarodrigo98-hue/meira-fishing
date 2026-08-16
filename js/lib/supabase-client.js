import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ENABLED, AUTH_EMAIL_DOMAIN } from '../config.js';

let client = null;

export function isSupabaseEnabled() {
  return SUPABASE_ENABLED;
}

export function getSupabase() {
  if (!SUPABASE_ENABLED) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export function usernameToEmail(username) {
  return `${(username || '').trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export function emailToUsername(email) {
  const e = (email || '').toLowerCase();
  const suffix = `@${AUTH_EMAIL_DOMAIN}`;
  return e.endsWith(suffix) ? e.slice(0, -suffix.length) : e.split('@')[0];
}
