/** Pontos marcados — backup local + IndexedDB + exportável para o repo (admin). */
import { ADMIN_POINTS } from '../data/admin-points.js';
import {
  initPointStore,
  loadStoredPoints,
  saveStoredPoints,
  mergePointLists,
  listSnapshots,
  restoreSnapshot,
} from './point-store.js';
import { isSupabaseEnabled } from './supabase-client.js';
import { fetchMyRemotePoints, upsertRemotePoint, deleteRemotePoint } from './supabase-sync.js';

const ADMIN_KEY = 'mf_admin';

export async function initMyPoints() {
  await initPointStore();
  let local = loadMyPoints();
  if (isSupabaseEnabled()) {
    try {
      const remote = await fetchMyRemotePoints();
      if (remote?.length) {
        local = mergePointLists(local, remote);
        saveStoredPoints(local);
      }
    } catch {
      /* offline — usa local */
    }
  }
  return local;
}

export function isAdmin() {
  try {
    return localStorage.getItem(ADMIN_KEY) === '1';
  } catch {
    return false;
  }
}

export function enableAdmin() {
  try {
    localStorage.setItem(ADMIN_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export function loadMyPoints() {
  return loadStoredPoints();
}

function persist(list) {
  saveStoredPoints(list);
}

function stamp(point, touch = true) {
  const now = new Date().toISOString();
  if (!point.createdAt) point.createdAt = now;
  if (touch) point.updatedAt = now;
  return point;
}

function adminPointsNormalized() {
  return ADMIN_POINTS.map((p) =>
    stamp({
      ...p,
      personal: true,
      protected: true,
      admin: true,
    }, false),
  );
}

export function mergePoints(base) {
  const personal = loadMyPoints();
  return mergePointLists(base, adminPointsNormalized(), personal);
}

export function addMyPoint({ name, lat, lng, type = 'Pedra', note = '', accuracy = null }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, message: 'Localização inválida.' };
  }
  const label = (name || '').trim() || `Meu ponto ${loadMyPoints().length + 1}`;
  const point = stamp({
    id: `M${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    mode: 'land',
    personal: true,
    protected: true,
    name: label,
    area: 'Meus pontos',
    lat: Number(lat.toFixed(7)),
    lng: Number(lng.toFixed(7)),
    type,
    confidence: 78,
    species: ['Robalo', 'Xaréu'],
    access: note.trim() || 'Marcado por você neste local exato',
    accuracy: accuracy ?? null,
  });
  const list = loadMyPoints();
  list.push(point);
  persist(list);
  if (isSupabaseEnabled()) upsertRemotePoint(point).catch(() => {});
  return { ok: true, point };
}

export function removeMyPoint(id, { confirmed = false } = {}) {
  const list = loadMyPoints();
  const target = list.find((p) => p.id === id);
  if (!target) return { ok: false, message: 'Ponto não encontrado.' };
  if (target.admin) {
    return { ok: false, message: 'Ponto do admin no app — remova em admin-points.js no repo.' };
  }
  if (target.protected && !confirmed) {
    return { ok: false, needsConfirm: true, message: 'Este ponto está protegido. Confirme para remover.' };
  }
  persist(list.filter((p) => p.id !== id));
  if (isSupabaseEnabled()) deleteRemotePoint(id).catch(() => {});
  return { ok: true };
}

export function myPointsSummary() {
  const n = loadMyPoints().length + adminPointsNormalized().length;
  return n ? `${n} ponto${n > 1 ? 's' : ''}` : 'Nenhum ainda';
}

export function exportMyPointsFile() {
  const payload = {
    v: 1,
    exportedAt: new Date().toISOString(),
    points: loadMyPoints(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meira-pontos-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return payload.points.length;
}

export function importMyPointsFromJson(text, { replace = false } = {}) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: 'Arquivo inválido.' };
  }
  const incoming = Array.isArray(data) ? data : data.points;
  if (!Array.isArray(incoming) || !incoming.length) {
    return { ok: false, message: 'Nenhum ponto no arquivo.' };
  }
  const valid = incoming.filter((p) => p?.id && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!valid.length) {
    return { ok: false, message: 'Pontos sem coordenadas válidas.' };
  }
  const merged = replace ? valid.map((p) => stamp({ ...p, protected: true, personal: true })) : mergePointLists(loadMyPoints(), valid);
  persist(merged);
  return { ok: true, count: merged.length, added: valid.length };
}

export function exportAdminPointsSnippet() {
  const points = loadMyPoints().map(({ id, mode, name, area, lat, lng, type, confidence, species, access, coast, accuracy }) => ({
    id,
    mode,
    name,
    area,
    lat,
    lng,
    type,
    confidence,
    species,
    access,
    ...(accuracy != null ? { accuracy } : {}),
    ...(coast ? { coast } : {}),
  }));
  return `/** Cole em js/data/admin-points.js e faça push — pontos permanentes no site. */\nexport const ADMIN_POINTS = ${JSON.stringify(points, null, 2)};\n`;
}

export { listSnapshots, restoreSnapshot };
