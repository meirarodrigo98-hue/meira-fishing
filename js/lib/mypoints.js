/** Pontos marcados pelo usuário — salvos no aparelho. */
const KEY = 'mf_mypoints';

const DEFAULT_COAST = {
  exposure: 'media',
  facing: 180,
  bottom: 'misto',
  bestTide: 'both',
  water: 'ocean',
};

export function loadMyPoints() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function mergePoints(base) {
  return [...base, ...loadMyPoints()];
}

export function addMyPoint({ name, lat, lng, type = 'Pedra', note = '', accuracy = null }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, message: 'Localização inválida.' };
  }
  const label = (name || '').trim() || `Meu ponto ${loadMyPoints().length + 1}`;
  const point = {
    id: `M${Date.now().toString(36)}`,
    mode: 'land',
    personal: true,
    name: label,
    area: 'Meus pontos',
    lat: Number(lat.toFixed(7)),
    lng: Number(lng.toFixed(7)),
    type,
    confidence: 78,
    species: ['Robalo', 'Xaréu'],
    access: note.trim() || 'Marcado por você neste local exato',
    accuracy: accuracy ?? null,
    coast: { ...DEFAULT_COAST },
  };
  const list = loadMyPoints();
  list.push(point);
  persist(list);
  return { ok: true, point };
}

export function removeMyPoint(id) {
  persist(loadMyPoints().filter((p) => p.id !== id));
}

export function myPointsSummary() {
  const n = loadMyPoints().length;
  return n ? `${n} ponto${n > 1 ? 's' : ''}` : 'Nenhum ainda';
}
