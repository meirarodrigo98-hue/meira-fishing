import { setWeather } from './state.js';

/** Open-Meteo — edite aqui se trocar a fonte de clima/mar. */
const FETCH_MS = 7000;

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

function fallbackWeather() {
  return {
    weather: { current: { wind_speed_10m: 12, wind_gusts_10m: 16, precipitation: 0 } },
    marine: { current: { wave_height: 0.7, wave_period: 8, sea_surface_temperature: 23 } },
  };
}

export async function loadWeather(pos) {
  if (!pos) {
    const fallback = fallbackWeather();
    setWeather(fallback, true);
    return { data: fallback, estimated: true };
  }

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lng}` +
    '&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
    '&timezone=America%2FSao_Paulo';
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${pos.lat}&longitude=${pos.lng}` +
    '&current=wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,sea_level_height_msl' +
    '&timezone=America%2FSao_Paulo&cell_selection=sea';

  try {
    const [weather, marine] = await Promise.all([
      fetchJson(weatherUrl),
      fetchJson(marineUrl).catch(() => ({ current: {} })),
    ]);
    const data = { weather, marine };
    setWeather(data, false);
    return { data, estimated: false };
  } catch {
    const fallback = fallbackWeather();
    setWeather(fallback, true);
    return { data: fallback, estimated: true };
  }
}
