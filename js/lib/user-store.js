import { APP_USERS } from '../data/users.js';
import { hashPassword } from './password.js';
import { createRemoteUser } from './supabase-sync.js';
import { isSupabaseEnabled } from './supabase-client.js';

const LOCAL_KEY = 'mf_users';
const SESSION_KEY = 'mf_session';

/** Conta principal — sempre existe no código. */
const BUILTIN = {
  rd: {
    hash: 'e0adc2679d19b5405000c985be5b763fed121e380dfcc0d8592c084e7326c163',
    name: 'RD',
    admin: true,
    locked: true,
  },
};

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.user || !data?.expires || Date.now() > data.expires) return null;
    return data;
  } catch {
    return null;
  }
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLocal(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

function normalizeUsername(raw) {
  return (raw || '').trim().toLowerCase().replace(/\s+/g, '');
}

function validUsername(user) {
  return /^[a-z0-9._-]{2,24}$/.test(user);
}

function requireAdmin() {
  const session = readSession();
  if (!session?.admin) return { ok: false, message: 'Somente admin pode fazer isso.' };
  return { ok: true, session };
}

export function getUsersMap() {
  const map = {};
  for (const [user, cred] of Object.entries(BUILTIN)) {
    map[user] = { ...cred };
  }
  for (const row of APP_USERS) {
    if (!row?.user) continue;
    map[row.user] = {
      hash: row.hash,
      name: row.name || row.user,
      admin: !!row.admin,
      locked: !!row.locked,
      source: 'repo',
    };
  }
  for (const row of readLocal()) {
    if (!row?.user) continue;
    map[row.user] = {
      hash: row.hash,
      name: row.name || row.user,
      admin: !!row.admin,
      locked: false,
      source: 'local',
    };
  }
  return map;
}

export function listUsers() {
  const map = getUsersMap();
  return Object.entries(map)
    .map(([user, cred]) => ({
      user,
      name: cred.name || user,
      admin: !!cred.admin,
      locked: !!cred.locked,
      source: cred.source || (BUILTIN[user] ? 'builtin' : 'local'),
    }))
    .sort((a, b) => a.user.localeCompare(b.user));
}

export function usersSummary() {
  const n = listUsers().length;
  return n === 1 ? '1 usuário' : `${n} usuários`;
}

export async function addUser({ username, password, name, admin = false }) {
  const gate = requireAdmin();
  if (!gate.ok) return gate;

  if (isSupabaseEnabled()) {
    const user = normalizeUsername(username);
    if (!validUsername(user)) {
      return { ok: false, message: 'Usuário inválido (2–24 letras/números).' };
    }
    if ((password || '').length < 4) {
      return { ok: false, message: 'Senha muito curta (mín. 4 caracteres).' };
    }
    if (getUsersMap()[user]) {
      return { ok: false, message: 'Usuário já existe.' };
    }
    const cloud = await createRemoteUser({
      username: user,
      password,
      name: (name || '').trim() || user,
      admin: !!admin,
    });
    if (!cloud.ok) return cloud;
    const hash = await hashPassword(password);
    const list = readLocal();
    list.push({ user, hash, name: (name || '').trim() || user, admin: !!admin });
    writeLocal(list);
    return { ok: true, user };
  }

  const user = normalizeUsername(username);
  if (!validUsername(user)) {
    return { ok: false, message: 'Usuário inválido (2–24 letras/números).' };
  }
  if ((password || '').length < 4) {
    return { ok: false, message: 'Senha muito curta (mín. 4 caracteres).' };
  }
  if (getUsersMap()[user]) {
    return { ok: false, message: 'Usuário já existe.' };
  }

  const hash = await hashPassword(password);
  const display = (name || '').trim() || user;
  const list = readLocal();
  list.push({ user, hash, name: display, admin: !!admin });
  writeLocal(list);
  return { ok: true, user };
}

export async function updateUserPassword(username, password) {
  const gate = requireAdmin();
  if (!gate.ok) return gate;

  const user = normalizeUsername(username);
  if (!getUsersMap()[user]) return { ok: false, message: 'Usuário não encontrado.' };
  if ((password || '').length < 4) return { ok: false, message: 'Senha muito curta.' };

  const hash = await hashPassword(password);
  if (BUILTIN[user] && !readLocal().some((r) => r.user === user)) {
    const list = readLocal();
    list.push({ user, hash, name: BUILTIN[user].name, admin: BUILTIN[user].admin });
    writeLocal(list);
    return { ok: true };
  }

  const list = readLocal().map((row) => (row.user === user ? { ...row, hash } : row));
  if (!list.some((r) => r.user === user)) {
    const cred = getUsersMap()[user];
    list.push({ user, hash, name: cred.name, admin: cred.admin });
  }
  writeLocal(list);
  return { ok: true };
}

export function removeUser(username) {
  const gate = requireAdmin();
  if (!gate.ok) return gate;
  const session = gate.session;

  const user = normalizeUsername(username);
  const cred = getUsersMap()[user];
  if (!cred) return { ok: false, message: 'Usuário não encontrado.' };
  if (cred.locked || BUILTIN[user]) {
    return { ok: false, message: 'Este usuário não pode ser removido.' };
  }
  if (cred.source === 'repo' && !readLocal().some((r) => r.user === user)) {
    return { ok: false, message: 'Usuário do site — remova em js/data/users.js.' };
  }
  if (session.user === user) {
    return { ok: false, message: 'Não remova a conta em que você está logado.' };
  }

  const list = readLocal().filter((row) => row.user !== user);
  writeLocal(list);
  return { ok: true };
}

export function exportUsersSnippet() {
  const rows = listUsers().map(({ user, name, admin }) => {
    const cred = getUsersMap()[user];
    return {
      user,
      hash: cred.hash,
      name,
      admin: !!admin,
      ...(cred.locked ? { locked: true } : {}),
    };
  });
  return `/** Cole em js/data/users.js e faça push — logins permanentes no site. */\nexport const APP_USERS = ${JSON.stringify(rows, null, 2)};\n`;
}

export function isSessionAdmin() {
  return !!readSession()?.admin;
}
