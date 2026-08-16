import { clamp } from './utils.js';

/** Motor de score e veredito — edite aqui para mudar "Ir agora / Esperar / Evitar". */
export function scores(point, data) {
  const w = data?.weather?.current || {};
  const m = data?.marine?.current || {};
  let safe = 100;
  let fish = 50 + point.confidence * 0.35;
  const wind = w.wind_speed_10m ?? 12;
  const wave = m.wave_height ?? 0.7;
  const gust = w.wind_gusts_10m ?? wind;
  const period = m.wave_period ?? 8;
  const sst = m.sea_surface_temperature ?? 23;

  if (point.mode === 'boat') {
    safe -= Math.max(0, (wind - 12) * 2.2);
    safe -= Math.max(0, (gust - 22) * 1.4);
    safe -= Math.max(0, (wave - 1) * 30);
  } else {
    safe -= Math.max(0, (wind - 18) * 1.5);
    safe -= Math.max(0, (wave - 1.3) * 28);
  }

  if (point.type === 'Lagoa') {
    safe = clamp(safe + 18);
    fish += wind <= 14 ? 4 : 0;
  }

  fish += wave >= 0.3 && wave <= 1.1 ? 8 : -4;
  fish += period >= 7 && period <= 12 ? 7 : 0;
  fish += wind <= 18 ? 6 : -5;
  fish += sst >= 20 && sst <= 26 ? 7 : 0;
  if ((w.precipitation ?? 0) > 4) fish -= 4;

  return { safe: Math.round(clamp(safe)), fish: Math.round(clamp(fish)) };
}

export function verdict(point, data) {
  if (!data) {
    return { key: 'lendo', label: 'Lendo…', why: 'Buscando condição da região.', fish: null, safe: null };
  }

  const s = scores(point, data);
  const wave = data.marine?.current?.wave_height ?? 0;
  const rock = point.type === 'Costão' || point.type === 'Pedra';

  if (rock && wave > 1.4) {
    return { key: 'evitar', label: 'Evitar', why: 'Mar alto no costão. Melhor outro ponto.', ...s };
  }
  if (s.safe < 50) {
    return { key: 'evitar', label: 'Evitar', why: 'Condição insegura agora.', ...s };
  }
  if (s.fish >= 70 && s.safe >= 60) {
    return { key: 'ir', label: 'Ir agora', why: 'Boa janela perto de você.', ...s };
  }
  if (s.fish >= 55) {
    return { key: 'esperar', label: 'Esperar', why: 'Dá para ir, mas não é o pico.', ...s };
  }
  return { key: 'esperar', label: 'Esperar', why: 'Condição morna nesta região.', ...s };
}

/** Prioriza perto + vale agora; evita pontos "Evitar" no topo. */
export function rankPoints(points, userPos, filter, weather) {
  return points
    .filter((p) => {
      if (filter === 'terra') return p.mode === 'land' && p.type !== 'Lagoa';
      if (filter === 'barco') return p.mode === 'boat';
      if (filter === 'lagoa') return p.type === 'Lagoa';
      return true;
    })
    .map((p) => {
      const v = verdict(p, weather);
      const distance = userPos ? kmBetween(userPos, p) : null;
      const rank =
        v.key === 'ir' ? 0 : v.key === 'esperar' ? 1 : v.key === 'lendo' ? 2 : 3;
      return { p, distance, v, rank };
    })
    .sort((a, b) => {
      if (a.distance == null || b.distance == null) return 0;
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
