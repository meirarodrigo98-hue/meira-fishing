import { clearPointWeather, setPointWeather, state } from './state.js';

/** Open-Meteo — clima e mar por coordenada do ponto. */
const FETCH_MS = 6000;
const BATCH_CONCURRENCY = 4;

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('unavailable');
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

function fallbackBundle() {
  return {
    weather: { current: { wind_speed_10m: 12, wind_gusts_10m: 16, precipitation: 0 } },
    marine: { current: { wave_height: 0.7, wave_period: 8, sea_surface_temperature: 23 } },
    tide: null,
  };
}

/** Maré: compara nível do mar agora vs próxima hora (Open-Meteo Marine). */
export function parseTide(marine) {
  const hourly = marine?.hourly?.sea_level_height_msl;
  if (hourly?.length >= 2) {
    const now = hourly[0];
    const next = hourly[1];
    const delta = next - now;
    if (Math.abs(delta) < 0.04) {
      return { level: now, trend: 'slack', label: 'Maré parada' };
    }
    if (delta > 0) {
      return { level: now, trend: 'rising', label: 'Maré subindo' };
    }
    return { level: now, trend: 'falling', label: 'Maré descendo' };
  }

  const level = marine?.current?.sea_level_height_msl;
  if (level == null) return null;
  return { level, trend: 'unknown', label: 'Maré —' };
}

function buildUrls(lat, lng) {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
    '&timezone=America%2FSao_Paulo';
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
    '&current=wave_height,wave_direction,wave_period,sea_surface_temperature,sea_level_height_msl' +
    '&hourly=sea_level_height_msl,wave_height' +
    '&forecast_hours=3&timezone=America%2FSao_Paulo&cell_selection=sea';
  return { weatherUrl, marineUrl };
}

export async function loadPointWeather(point) {
  const { weatherUrl, marineUrl } = buildUrls(point.lat, point.lng);
  try {
    const [weather, marine] = await Promise.all([
      fetchJson(weatherUrl),
      fetchJson(marineUrl).catch(() => ({ current: {}, hourly: {} })),
    ]);
    const data = { weather, marine, tide: parseTide(marine) };
    return { data, estimated: false };
  } catch {
    return { data: fallbackBundle(), estimated: true };
  }
}

async function loadPoints(points, onProgress, { clear = false } = {}) {
  if (clear) clearPointWeather();
  if (!points.length) return { estimated: false, loaded: 0 };

  let done = 0;
  let anyEstimated = false;
  const queue = [...points];

  async function worker() {
    while (queue.length) {
      const point = queue.shift();
      if (!point) break;
      const { data, estimated } = await loadPointWeather(point);
      setPointWeather(point.id, data, estimated);
      if (estimated) anyEstimated = true;
      done += 1;
      onProgress?.(done, points.length, point.name);
    }
  }

  const workers = Array.from({ length: Math.min(BATCH_CONCURRENCY, points.length) }, () => worker());
  await Promise.all(workers);

  return { estimated: anyEstimated, loaded: done };
}

export async function loadWeatherBatch(points, onProgress) {
  return loadPoints(points, onProgress, { clear: true });
}

/** Só busca pontos que ainda não têm clima (ex.: troca de filtro). */
export async function loadMissingWeather(points, onProgress) {
  const missing = points.filter((p) => !state.weatherByPoint.has(p.id));
  return loadPoints(missing, onProgress, { clear: false });
}

/** Compat — carrega um único ponto (ex.: fallback). */
export async function loadWeather(pos) {
  if (!pos) {
    return { data: fallbackBundle(), estimated: true };
  }
  const fake = { id: '_user', lat: pos.lat, lng: pos.lng };
  const result = await loadPointWeather(fake);
  setPointWeather('_user', result.data, result.estimated);
  return result;
}
