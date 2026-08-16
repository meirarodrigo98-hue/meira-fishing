/** Utilitários gerais e DOM. */
export const $ = (id) => document.getElementById(id);

let toastTimer = null;
export function toast(message) {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

export const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));

export function km(a, b) {
  const R = 6371;
  const dlat = ((b.lat - a.lat) * Math.PI) / 180;
  const dlng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dlat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dlng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const fmtKm = (n) => (n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`);

/** Raio do radar — pontos além disso ficam fora após ligar. */
export const NEARBY_KM = 30;
export const NEARBY_LIMIT = 12;
/** Marca pessoal só entra no modo Terra se estiver perto de um ponto costeiro real. */
export const PERSONAL_SHORE_KM = 0.35;

const SHORE_TYPES = new Set(['Orla', 'Praia', 'Pedra', 'Costão', 'Pier', 'Canal']);
const SHORE_WATERS = new Set(['bay', 'ocean', 'canal']);
const INLAND_HINT =
  /rodovia|br-\d{2,3}|autoestrada|linha amarela|linha vermelha|túnel|viaduto|highway|via light|posto de pedágio|km \d{2,3}/i;

let shoreCatalog = [];

export function setShoreCatalog(points) {
  shoreCatalog = (points || []).filter((p) => isCatalogShorePoint(p));
}

function isCatalogShorePoint(point) {
  if (point.mode !== 'land' || point.personal) return false;
  if (point.type === 'Lagoa' || point.coast?.water === 'lagoon') return false;
  if (isReferencePoint(point)) return false;
  if (!point.coast || !SHORE_WATERS.has(point.coast.water)) return false;
  return SHORE_TYPES.has(point.type);
}

function isPersonalOnShore(point) {
  if (!point.personal || !shoreCatalog.length) return false;
  const text = `${point.name || ''} ${point.access || ''}`;
  if (INLAND_HINT.test(text)) return false;
  return shoreCatalog.some((ref) => km(point, ref) <= PERSONAL_SHORE_KM);
}

/** Ponto de pesca de costa (mar/baía/canal) — exclui lagoa, barco, referência e marcas em terra firme. */
export function isShorePoint(point) {
  if (point.mode !== 'land') return false;
  if (point.type === 'Lagoa' || point.coast?.water === 'lagoon') return false;
  if (isReferencePoint(point)) return false;
  if (point.personal) return isPersonalOnShore(point);
  return isCatalogShorePoint(point);
}

export function filterNearby(rows, maxKm = NEARBY_KM, limit = NEARBY_LIMIT) {
  const near = rows.filter((r) => r.distance != null && r.distance <= maxKm);
  const pool = near.length ? near : rows.filter((r) => r.distance != null);
  return pool.slice(0, limit);
}

export function matchesFilter(point, filter) {
  if (filter === 'meus') return point.personal === true;
  if (filter === 'costa' || filter === 'terra') return isShorePoint(point);
  if (filter === 'barco') return point.mode === 'boat';
  if (filter === 'lagoa') return point.type === 'Lagoa';
  return true;
}

/** Pontos de referência (barco/offshore) só aparecem no filtro Barco. */
export function isReferencePoint(point) {
  return !!point.reference;
}

export function mapPointIds(points, filter) {
  return points
    .filter((p) => matchesFilter(p, filter))
    .filter((p) => filter === 'barco' || !isReferencePoint(p))
    .map((p) => p.id);
}

export function pointModeLabel(point) {
  if (point.personal) return 'Seu ponto';
  if (point.type === 'Lagoa') return 'Lagoa';
  if (point.mode === 'boat') return point.reference ? 'Referência barco' : 'Barco';
  return 'Costa';
}

export function travelModeFor(point) {
  return point.mode === 'boat' ? 'driving' : 'walking';
}

export function mapsUrl(point) {
  const dest = `${point.lat},${point.lng}`;
  const mode = travelModeFor(point);
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=${mode}`;
}
