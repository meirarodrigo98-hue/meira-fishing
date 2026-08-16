/** Login — Supabase quando configurado; fallback local. */
import { hashPassword } from './password.js';
import { getUsersMap } from './user-store.js';
import { isSupabaseEnabled, getSupabase, usernameToEmail } from './supabase-client.js';
import { fetchRemoteProfile, profileToSession, usernameExistsRemote } from './supabase-sync.js';

const SESSION_KEY = 'mf_session';
const REMEMBER_DAYS = 30;
const SESSION_HOURS = 12;

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.user || !data?.expires) return null;
    if (Date.now() > data.expires) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession() {
  return readSession();
}

export async function refreshSessionFromSupabase() {
  if (!isSupabaseEnabled()) return null;
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  if (!data.session) return null;
  let profile = null;
  try {
    profile = await fetchRemoteProfile();
  } catch {
    /* perfil pode ainda não existir */
  }
  const session = profileToSession(profile, data.session.user);
  if (session) writeSession(session);
  return session;
}

export function isLoggedIn() {
  return Boolean(getSession());
}

export async function logout() {
  if (isSupabaseEnabled()) {
    try {
      await getSupabase().auth.signOut();
    } catch {
      /* ignore */
    }
  }
  localStorage.removeItem(SESSION_KEY);
}

async function loginLocal(username, password, remember) {
  const user = (username || '').trim().toLowerCase();
  const cred = getUsersMap()[user];
  if (!cred) return { ok: false, message: 'Usuário não encontrado.', code: 'user_not_found' };

  const hash = await hashPassword(password || '');
  if (hash !== cred.hash) return { ok: false, message: 'SENHA INCORRETA', code: 'wrong_password' };

  const ms = remember ? REMEMBER_DAYS * 864e5 : SESSION_HOURS * 36e5;
  const session = {
    user,
    name: cred.name,
    admin: !!cred.admin,
    at: Date.now(),
    expires: Date.now() + ms,
  };
  writeSession(session);
  return { ok: true, session };
}

async function loginSupabase(username, password, remember) {
  const sb = getSupabase();
  const user = (username || '').trim().toLowerCase();
  const email = usernameToEmail(user);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message?.toLowerCase() || '';
    const exists = await usernameExistsRemote(user);

    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
      return {
        ok: false,
        message: 'Conta pendente — desative confirmação de e-mail no Supabase ou confirme o cadastro.',
        code: 'email_not_confirmed',
      };
    }
    if (exists) {
      return { ok: false, message: 'SENHA INCORRETA', code: 'wrong_password' };
    }
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return { ok: false, message: 'Usuário não encontrado.', code: 'user_not_found' };
    }
    return { ok: false, message: error.message, code: 'auth_error' };
  }

  let profile = null;
  try {
    profile = await fetchRemoteProfile();
  } catch {
    /* ok */
  }

  const ms = remember ? REMEMBER_DAYS * 864e5 : SESSION_HOURS * 36e5;
  const session = {
    ...profileToSession(profile, data.user),
    at: Date.now(),
    expires: Date.now() + ms,
  };
  writeSession(session);
  return { ok: true, session };
}

export async function login(username, password, remember = true) {
  const user = (username || '').trim().toLowerCase();

  if (isSupabaseEnabled()) {
    try {
      const cloud = await loginSupabase(user, password, remember);
      if (cloud.ok) return cloud;

      const local = await loginLocal(user, password, remember);
      if (local.ok) return local;

      return cloud.code === 'wrong_password' ? cloud : local.code ? local : cloud;
    } catch {
      /* rede ou Supabase indisponível */
    }
  }
  return loginLocal(user, password, remember);
}

export function sessionLabel(session) {
  if (!session) return '';
  return session.name || session.user;
}

export { hashPassword };
