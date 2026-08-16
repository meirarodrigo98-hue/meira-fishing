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

export function filterNearby(rows, maxKm = NEARBY_KM, limit = NEARBY_LIMIT) {
  const near = rows.filter((r) => r.distance != null && r.distance <= maxKm);
  const pool = near.length ? near : rows.filter((r) => r.distance != null);
  return pool.slice(0, limit);
}

export function matchesFilter(point, filter) {
  if (filter === 'meus') return point.personal === true;
  if (filter === 'terra') return point.mode === 'land' && point.type !== 'Lagoa';
  if (filter === 'barco') return point.mode === 'boat';
  if (filter === 'lagoa') return point.type === 'Lagoa';
  return true;
}

/** IDs de todos os pontos visíveis no mapa (filtro ativo, sem limite de distância). */
export function mapPointIds(points, filter) {
  return points.filter((p) => matchesFilter(p, filter)).map((p) => p.id);
}

export function travelModeFor(point) {
  return point.mode === 'boat' ? 'driving' : 'walking';
}

export function mapsUrl(point) {
  const dest = `${point.lat},${point.lng}`;
  const mode = travelModeFor(point);
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=${mode}`;
}
