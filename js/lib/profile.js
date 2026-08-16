/** Perfil do pescador — salvo no aparelho. */
const KEY = 'mf_profile';

export const STYLE = [
  { id: 'todos', label: 'Todos' },
  { id: 'terra', label: 'Terra' },
  { id: 'barco', label: 'Barco' },
  { id: 'lagoa', label: 'Lagoa' },
];

export const LEVEL = [
  { id: 'iniciante', label: 'Iniciante' },
  { id: 'intermediario', label: 'Intermediário' },
  { id: 'avancado', label: 'Avançado' },
];

export function emptyProfile() {
  return { name: '', style: 'todos', level: 'iniciante' };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProfile();
    return { ...emptyProfile(), ...JSON.parse(raw) };
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {}
}

export function profileSummary(profile) {
  const name = profile.name?.trim();
  if (!name) return 'Perfil não preenchido';
  const style = STYLE.find((s) => s.id === profile.style)?.label ?? 'Todos';
  return `${name} · ${style}`;
}

export function isProfileReady(profile) {
  return Boolean(profile.name?.trim());
}
