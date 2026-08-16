/** Perfil costeiro do ponto — usado no score de terra. */
const EXPOSURE_WAVE = { baixa: 0.45, media: 0.75, alta: 1.15 };

export function isLagoon(point) {
  return point.coast?.water === 'lagoon' || point.type === 'Lagoa';
}

export function waveAtPoint(point, waveHeight) {
  if (waveHeight == null || isLagoon(point)) return 0;
  const mul = EXPOSURE_WAVE[point.coast?.exposure ?? 'media'] ?? 0.75;
  return waveHeight * mul;
}

/** Diferença angular: 0° = vento vindo do mar, 180° = vento de terra. */
export function windSeaAngle(windFrom, facing) {
  if (windFrom == null || facing == null) return null;
  let diff = Math.abs(windFrom - facing) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function scoreWindForCoast(point, windFrom, windSpeed) {
  if (windSpeed == null || isLagoon(point)) return 0;
  const facing = point.coast?.facing;
  if (facing == null) return windSpeed <= 18 ? 4 : -4;

  const angle = windSeaAngle(windFrom, facing);
  const exp = point.coast?.exposure ?? 'media';
  let score = 0;

  if (angle <= 50) {
    score -= exp === 'alta' ? 8 : exp === 'media' ? 5 : 2;
  } else if (angle >= 130) {
    score += exp === 'alta' ? 6 : 4;
  }

  if (windSpeed <= 14) score += 3;
  else if (windSpeed > 22) score -= exp === 'alta' ? 6 : 4;

  return score;
}

export function scoreTideForCoast(point, tide) {
  if (!tide || isLagoon(point)) return 0;
  const best = point.coast?.bestTide ?? 'rising';
  const trend = tide.trend;

  if (best === 'both') {
    if (trend === 'rising' || trend === 'falling') return 5;
    if (trend === 'slack') return -2;
    return 0;
  }
  if (best === 'rising' && trend === 'rising') return 8;
  if (best === 'falling' && trend === 'falling') return 6;
  if (best === 'rising' && trend === 'falling') return -2;
  if (best === 'falling' && trend === 'rising') return -1;
  if (trend === 'slack') return -3;
  return 0;
}

export function scoreLagoon(point, data) {
  const w = data?.weather?.current || {};
  const wind = w.wind_speed_10m ?? 12;
  let fish = 0;
  if (wind <= 12) fish += 8;
  else if (wind <= 16) fish += 4;
  else fish -= 5;
  if ((w.precipitation ?? 0) > 2) fish -= 3;
  return fish;
}

export function coastLabel(point) {
  const c = point.coast;
  if (!c) return '';
  const exp = { baixa: 'abrigo', media: 'médio', alta: 'exposto' }[c.exposure] ?? '';
  const water = { bay: 'baía', ocean: 'costa aberta', lagoon: 'lagoa', canal: 'canal' }[c.water] ?? '';
  return [water, exp].filter(Boolean).join(' · ');
}

export function coastWhyExtra(point, data) {
  if (isLagoon(point)) {
    const wind = data?.weather?.current?.wind_speed_10m;
    return wind != null && wind <= 14 ? 'Lagoa calma — margem com vegetação.' : 'Vento na lagoa — pesque abrigado.';
  }

  const c = point.coast;
  if (!c) return '';

  const tide = data?.tide?.trend;
  const bits = [];
  if (c.exposure === 'alta') bits.push('spot exposto');
  if (c.exposure === 'baixa') bits.push('baía abrigada');
  if (tide === 'rising' && c.bestTide === 'rising') bits.push('maré enchendo ideal aqui');
  if (tide === 'falling' && c.bestTide === 'falling') bits.push('maré vazando ideal aqui');

  const windFrom = data?.weather?.current?.wind_direction_10m;
  const angle = windSeaAngle(windFrom, c.facing);
  if (angle != null && angle <= 50) bits.push('vento de mar');
  if (angle != null && angle >= 130) bits.push('vento de terra');

  return bits.length ? bits.join(', ') + '.' : '';
}
