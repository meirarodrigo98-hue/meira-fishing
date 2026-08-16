import { login, isLoggedIn, getSession } from '../lib/auth.js';
import { enableAdmin } from '../lib/mypoints.js';
import { loadProfile, saveProfile } from '../lib/profile.js';
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
}

function syncProfileFromSession(session) {
  if (!session?.name) return;
  const profile = loadProfile();
  if (!profile.name?.trim()) {
    saveProfile({ ...profile, name: session.name });
  }
}

export function initLogin(onReady) {
  if (isLoggedIn()) {
    const session = getSession();
    if (session?.admin) enableAdmin();
    syncProfileFromSession(session);
    hideLogin();
    onReady?.();
    return;
  }

  document.body.classList.add('login-pending');

  const form = $('loginForm');
  const userInput = $('loginUser');
  const passInput = $('loginPass');
  const rememberInput = $('loginRemember');
  const submitBtn = $('loginSubmit');
  const togglePass = $('loginTogglePass');

  togglePass?.addEventListener('click', () => {
    const isPass = passInput.type === 'password';
    passInput.type = isPass ? 'text' : 'password';
    togglePass.setAttribute('aria-label', isPass ? 'Ocultar senha' : 'Mostrar senha');
    togglePass.textContent = isPass ? '🙈' : '👁';
  });

  passInput?.addEventListener('input', () => showError(''));
  userInput?.addEventListener('input', () => showError(''));

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');

    const result = await login(userInput.value, passInput.value, rememberInput?.checked !== false);

    submitBtn.disabled = false;
    submitBtn.classList.remove('is-loading');

    if (!result.ok) {
      showError(result.code === 'wrong_password' ? 'SENHA INCORRETA' : result.message);
      passInput.focus();
      passInput.select?.();
      return;
    }

    if (result.session?.admin) enableAdmin();
    syncProfileFromSession(result.session);
    hideLogin();
    toast(`Bem-vindo, ${result.session.name || result.session.user}!`);
    onReady?.();
  });

  requestAnimationFrame(() => userInput?.focus());
}

export { isLoggedIn, getSession };
