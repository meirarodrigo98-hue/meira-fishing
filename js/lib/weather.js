import { setWeather } from './state.js';

/** Open-Meteo — edite aqui se trocar a fonte de clima/mar. */
export async function loadWeather(pos) {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lng}` +
    '&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
    '&timezone=America%2FSao_Paulo';
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${pos.lat}&longitude=${pos.lng}` +
    '&current=wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,sea_level_height_msl' +
    '&timezone=America%2FSao_Paulo&cell_selection=sea';

  try {
    const [weatherRes, marineRes] = await Promise.all([fetch(weatherUrl), fetch(marineUrl)]);
    if (!weatherRes.ok) throw new Error('weather unavailable');
    const data = {
      weather: await weatherRes.json(),
      marine: marineRes.ok ? await marineRes.json() : { current: {} },
    };
    setWeather(data);
    return data;
  } catch {
    const fallback = {
      weather: { current: { wind_speed_10m: 12, wind_gusts_10m: 16, precipitation: 0 } },
      marine: { current: { wave_height: 0.7, wave_period: 8, sea_surface_temperature: 23 } },
    };
    setWeather(fallback);
    return fallback;
  }
}
