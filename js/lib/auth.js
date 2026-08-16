/** Sessão de login — estática, salva no aparelho. */
const SESSION_KEY = 'mf_session';
const REMEMBER_DAYS = 30;
const SESSION_HOURS = 12;

/** SHA-256 de "100751rm" — altere a senha em hashPassword() e cole o novo hash aqui. */
const USERS = {
  rd: {
    hash: 'e0adc2679d19b5405000c985be5b763fed121e380dfcc0d8592c084e7326c163',
    name: 'RD',
    admin: true,
  },
};

async function hashPassword(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

export function getSession() {
  return readSession();
}

export function isLoggedIn() {
  return Boolean(getSession());
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export async function login(username, password, remember = true) {
  const user = (username || '').trim().toLowerCase();
  const cred = USERS[user];
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
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, session };
}

export function sessionLabel(session) {
  if (!session) return '';
  return session.name || session.user;
}

/** Gera hash para trocar senha — rode no console: hashPassword('nova-senha') */
export { hashPassword };
