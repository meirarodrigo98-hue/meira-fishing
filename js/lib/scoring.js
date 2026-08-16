import { clamp } from './utils.js';
import {
  isLagoon,
  waveAtPoint,
  scoreWindForCoast,
  scoreTideForCoast,
  scoreLagoon,
  coastLabel,
  coastWhyExtra,
} from './coast.js';

/** Motor de score e veredito — edite aqui para mudar "Ir agora / Esperar / Evitar". */
export function scores(point, data) {
  const w = data?.weather?.current || {};
  const m = data?.marine?.current || {};
  const tide = data?.tide;
  let safe = 100;
  let fish = 50 + point.confidence * 0.35;
  const wind = w.wind_speed_10m ?? 12;
  const waveRaw = m.wave_height ?? 0.7;
  const wave = waveAtPoint(point, waveRaw);
  const gust = w.wind_gusts_10m ?? wind;
  const period = m.wave_period ?? 8;
  const sst = m.sea_surface_temperature ?? 23;
  const windFrom = w.wind_direction_10m;

  if (isLagoon(point)) {
    safe = clamp(safe + 15);
    fish += scoreLagoon(point, data);
    if ((w.precipitation ?? 0) > 4) fish -= 4;
    return { safe: Math.round(clamp(safe)), fish: Math.round(clamp(fish)) };
  }

  if (point.mode === 'boat') {
    safe -= Math.max(0, (wind - 12) * 2.2);
    safe -= Math.max(0, (gust - 22) * 1.4);
    safe -= Math.max(0, (waveRaw - 1) * 30);
  } else if (point.coast) {
    const exp = point.coast.exposure ?? 'media';
    const waveLimit = exp === 'alta' ? 1.1 : exp === 'media' ? 1.3 : 1.5;
    const windLimit = exp === 'alta' ? 16 : 18;
    safe -= Math.max(0, (wind - windLimit) * (exp === 'alta' ? 1.8 : 1.4));
    safe -= Math.max(0, (wave - waveLimit) * (exp === 'alta' ? 32 : 24));
    fish += scoreWindForCoast(point, windFrom, wind);
    fish += scoreTideForCoast(point, tide);
  } else {
    safe -= Math.max(0, (wind - 18) * 1.5);
    safe -= Math.max(0, (wave - 1.3) * 28);
  }

  if (point.type === 'Lagoa') {
    safe = clamp(safe + 18);
    fish += wind <= 14 ? 4 : 0;
  } else if (!point.coast) {
    if (tide?.trend === 'rising') {
      fish += point.mode === 'land' ? 7 : 4;
    } else if (tide?.trend === 'falling' && (point.type === 'Costão' || point.type === 'Pedra')) {
      fish += 3;
    } else if (tide?.trend === 'slack') {
      fish -= 2;
    }
  }

  if (!isLagoon(point)) {
    fish += wave >= 0.3 && wave <= 1.1 ? 8 : -4;
    fish += period >= 7 && period <= 12 ? 7 : 0;
    if (!point.coast) {
      fish += wind <= 18 ? 6 : -5;
    }
    fish += sst >= 20 && sst <= 26 ? 7 : 0;
  }

  if ((w.precipitation ?? 0) > 4) fish -= 4;

  return { safe: Math.round(clamp(safe)), fish: Math.round(clamp(fish)) };
}

export function formatConditions(data) {
  if (!data) return '';
  const w = data.weather?.current || {};
  const m = data.marine?.current || {};
  const parts = [];

  if (w.wind_speed_10m != null) parts.push(`Vento ${Math.round(w.wind_speed_10m)} km/h`);
  if (m.wave_height != null) parts.push(`Onda ${m.wave_height.toFixed(1)} m`);
  if ((w.precipitation ?? 0) > 0.2) parts.push(`Chuva ${w.precipitation.toFixed(1)} mm`);
  if (data.tide?.label) parts.push(data.tide.label);

  return parts.join(' · ');
}

function whyFor(point, data, s) {
  const wave = data.marine?.current?.wave_height;
  const wind = data.weather?.current?.wind_speed_10m;
  const tide = data.tide?.label;
  const bits = [];

  const coast = coastLabel(point);
  if (coast) bits.push(coast);

  if (wind != null) bits.push(`vento ${Math.round(wind)} km/h`);
  if (wave != null && !isLagoon(point)) bits.push(`onda ${wave.toFixed(1)} m`);
  if (tide && !isLagoon(point)) bits.push(tide.toLowerCase());

  const extra = coastWhyExtra(point, data);
  if (extra) bits.push(extra.replace(/\.$/, ''));

  const cond = bits.length ? bits.join(', ') : 'condição local';

  if (s.fish >= 70 && s.safe >= 60) return `Boa janela: ${cond}.`;
  if (s.fish >= 55) return `Dá para ir: ${cond}.`;
  return `Condição morna: ${cond}.`;
}

export function verdict(point, data) {
  if (!data) {
    return { key: 'lendo', label: 'Lendo…', why: 'Consultando clima neste ponto.', fish: null, safe: null };
  }

  const s = scores(point, data);
  const waveRaw = data.marine?.current?.wave_height ?? 0;
  const wave = waveAtPoint(point, waveRaw);
  const rock = point.type === 'Costão' || point.type === 'Pedra';
  const exp = point.coast?.exposure;

  if (rock && wave > (exp === 'alta' ? 1.2 : 1.4)) {
    return { key: 'evitar', label: 'Evitar', why: 'Mar alto no costão — onda forte aqui.', ...s };
  }
  if (point.coast?.exposure === 'alta' && waveRaw > 1.6) {
    return { key: 'evitar', label: 'Evitar', why: 'Spot exposto com swell forte.', ...s };
  }
  if (s.safe < 50) {
    return { key: 'evitar', label: 'Evitar', why: 'Condição insegura neste ponto.', ...s };
  }
  if (s.fish >= 70 && s.safe >= 60) {
    return { key: 'ir', label: 'Ir agora', why: whyFor(point, data, s), ...s };
  }
  if (s.fish >= 55) {
    return { key: 'esperar', label: 'Esperar', why: whyFor(point, data, s), ...s };
  }
  return { key: 'esperar', label: 'Esperar', why: whyFor(point, data, s), ...s };
}

function resolveWeather(point, getWeather) {
  if (typeof getWeather === 'function') return getWeather(point);
  return getWeather ?? null;
}

/** Prioriza perto + vale agora; evita pontos "Evitar" no topo. */
export function rankPoints(points, userPos, filter, getWeather) {
  const rows = points
    .filter((p) => {
      if (filter === 'terra') return p.mode === 'land' && p.type !== 'Lagoa';
      if (filter === 'barco') return p.mode === 'boat';
      if (filter === 'lagoa') return p.type === 'Lagoa';
      return true;
    })
    .map((p) => {
      const v = verdict(p, resolveWeather(p, getWeather));
      const distance = userPos ? kmBetween(userPos, p) : null;
      const rank =
        v.key === 'ir' ? 0 : v.key === 'esperar' ? 1 : v.key === 'lendo' ? 2 : 3;
      return { p, distance, v, rank };
    });

  const hasScores = rows.some((r) => r.v.key !== 'lendo');

  return rows.sort((a, b) => {
    if (a.distance == null || b.distance == null) return 0;
    if (!hasScores) return a.distance - b.distance;
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (Math.abs(a.distance - b.distance) > 0.3) return a.distance - b.distance;
    return (b.v.fish ?? 0) - (a.v.fish ?? 0);
  });
}

function kmBetween(a, b) {
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
