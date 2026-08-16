import { login, isLoggedIn, getSession, refreshSessionFromSupabase, logout } from '../lib/auth.js';
import { enableAdmin } from '../lib/mypoints.js';
import { loadProfile, saveProfile, emptyProfile } from '../lib/profile.js';
import { loadGear, saveGear, emptyGear } from '../lib/gear.js';
import { isSupabaseEnabled } from '../lib/supabase-client.js';
import { fetchRemoteProfile } from '../lib/supabase-sync.js';
import { toast } from '../lib/utils.js';

function $(id) {
  return document.getElementById(id);
}

function showError(msg) {
  const el = $('loginError');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('is-hidden', !msg);
}

function hideLogin() {
  $('loginScreen')?.classList.add('is-hidden');
  document.body.classList.remove('login-pending');
  document.body.classList.add('login-done');
  document.body.style.removeProperty('top');
  window.scrollTo(0, 0);
}

function syncProfileFromSession(session) {
  if (!session?.name) return;
  const profile = loadProfile();
  if (!profile.name?.trim()) {
    saveProfile({ ...profile, name: session.name });
  }
}

async function pullProfileFromCloud() {
  if (!isSupabaseEnabled()) return;
  try {
    const remote = await fetchRemoteProfile();
    if (!remote) return;
    saveProfile({
      ...emptyProfile(),
      name: remote.display_name || '',
      style: remote.style || 'todos',
      level: remote.level || 'iniciante',
    });
    if (remote.gear) {
      saveGear({ ...emptyGear(), ...remote.gear });
    }
  } catch {
    /* offline */
  }
}

export async function initLogin(onReady) {
  if (isSupabaseEnabled()) {
    try {
      await refreshSessionFromSupabase();
    } catch {
      /* offline ou Supabase ainda não configurado */
    }
  }

  if (isLoggedIn()) {
    const session = getSession();
    if (session?.admin) enableAdmin();
    await pullProfileFromCloud();
    syncProfileFromSession(session);
    hideLogin();
    onReady?.();
    return;
  }

  document.body.classList.add('login-pending');

  const form = $('loginForm');
  const userInput = $('loginUser');
  const passInput = $('loginPass');
  const submitBtn = $('loginSubmit');
  const togglePass = $('loginTogglePass');

  togglePass?.addEventListener('click', () => {
    const isPass = passInput.type === 'password';
    passInput.type = isPass ? 'text' : 'password';
    togglePass.classList.toggle('is-visible', isPass);
    togglePass.setAttribute('aria-label', isPass ? 'Ocultar senha' : 'Mostrar senha');
  });

  passInput?.addEventListener('input', () => showError(''));
  userInput?.addEventListener('input', () => showError(''));

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');

    const result = await login(userInput.value, passInput.value, true);

    submitBtn.disabled = false;
    submitBtn.classList.remove('is-loading');

    if (!result.ok) {
      showError(result.code === 'wrong_password' ? 'SENHA INCORRETA' : result.message);
      passInput.focus();
      passInput.select?.();
      return;
    }

    if (result.session?.admin) enableAdmin();
    await pullProfileFromCloud();
    syncProfileFromSession(result.session);
    hideLogin();
    toast(`Bem-vindo, ${result.session.name || result.session.user}!`);
    onReady?.();
  });

  requestAnimationFrame(() => userInput?.focus());
}

export { isLoggedIn, getSession, logout };
