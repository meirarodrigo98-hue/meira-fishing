import { ISCABOX_GUIDES } from '../data/iscabox-guides.js';

const GUIDE_BY_ID = Object.fromEntries(ISCABOX_GUIDES.map((g) => [g.id, g]));

/** Área do catálogo → guia regional */
const AREA_GUIDE = {
  'Centro / RJ': 'baia-guanabara',
  'Aterro / RJ': 'baia-guanabara',
  'Glória / RJ': 'baia-guanabara',
  'Flamengo / RJ': 'baia-guanabara',
  'Botafogo / RJ': 'baia-guanabara',
  'Urca / RJ': 'baia-guanabara',
  'Leme / RJ': 'baia-guanabara',
  'Copacabana / RJ': 'baia-guanabara',
  'Ipanema / RJ': 'baia-guanabara',
  'Leblon / RJ': 'baia-guanabara',
  'São Conrado / RJ': 'baia-guanabara',
  'Joatinga / RJ': 'baia-guanabara',
  'Barra da Tijuca / RJ': 'baia-guanabara',
  'Recreio / RJ': 'baia-guanabara',
  'Prainha / RJ': 'baia-guanabara',
  'Grumari / RJ': 'baia-guanabara',
  'Lagoa / RJ': 'lagoa-rodrigo-freitas',
  'Charitas / Niterói': 'niteroi',
  'Icaraí / Niterói': 'niteroi',
  'São Francisco / Niterói': 'niteroi',
  'Jurujuba / Niterói': 'niteroi',
  'Itaipu / Niterói': 'niteroi',
  'Camboinhas / Niterói': 'niteroi',
  'Piratininga / Niterói': 'niteroi',
  'Centro / Niterói': 'niteroi',
  'Niterói / RJ': 'niteroi',
  'Baía de Guanabara / RJ': 'baia-guanabara',
  'Entrada da Baía / RJ': 'baia-guanabara',
  'Mar de Ipanema / RJ': 'pesca-mar-aberto-rio',
  'Costa do Rio / RJ': 'pesca-mar-aberto-rio',
  'Ao largo da Barra / RJ': 'pesca-mar-aberto-rio',
  'Ao largo do Leme / RJ': 'pesca-mar-aberto-rio',
  'Ao largo de Copacabana / RJ': 'pesca-mar-aberto-rio',
  'Ao largo do Arpoador / RJ': 'pesca-mar-aberto-rio',
  'Entrada oceânica da Guanabara / RJ': 'baia-guanabara',
  'Sul das Cagarras / RJ': 'pesca-mar-aberto-rio',
  'Entre Cagarras e Tijucas / RJ': 'pesca-mar-aberto-rio',
  'Sul das Tijucas / RJ': 'pesca-mar-aberto-rio',
};

/** Palavras-chave no nome/área → guia */
const KEYWORD_GUIDE = [
  [/lagoa|cantagalo|patins|garças|jardim botânico/i, 'lagoa-rodrigo-freitas'],
  [/niterói|icaraí|jurujuba|charitas|camboinhas|piratininga|itaipu|são francisco/i, 'niteroi'],
  [/guanabara|paquetá|urca|flamengo|botafogo|centro|aterro|glória|pier mauá/i, 'baia-guanabara'],
  [/offshore|mar aberto|cagarras|tijucas|anchova|garoupa/i, 'pesca-mar-aberto-rio'],
  [/sepetiba|marambaia|guaratiba|itacoaí|itacoatiara/i, 'baia-sepetiba'],
  [/arraial|cabo frio|búzios|saquarema|maricá|lagoa de araruama/i, 'regiao-dos-lagos'],
];

/** Espécies do guia → rótulo curto do app */
const SPECIES_SHORT = {
  'robalo-peva': 'Robalo',
  robalo: 'Robalo',
  carapeba: 'Carapeba',
  tainha: 'Tainha',
  pescada: 'Pescada',
  corvina: 'Corvina',
  xaréu: 'Xaréu',
  xareu: 'Xaréu',
  anchova: 'Anchova',
  tilápia: 'Tilápia',
  tilapia: 'Tilápia',
  traíra: 'Traíra',
  traira: 'Traíra',
  garoupa: 'Garoupa',
};

function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortSpecies(name) {
  const n = norm(name);
  for (const [key, label] of Object.entries(SPECIES_SHORT)) {
    if (n.includes(key)) return label;
  }
  return name.split(/[\s(-]/)[0]?.trim() || name;
}

function spotMatchesPoint(spotName, point) {
  const spot = norm(spotName);
  const name = norm(point.name);
  const area = norm(point.area);
  const tokens = spot.split(' ').filter((t) => t.length > 3);
  if (tokens.some((t) => name.includes(t) || area.includes(t))) return true;
  if (spot.includes('icarai') && area.includes('icarai')) return true;
  if (spot.includes('paqueta') && name.includes('paqueta')) return true;
  if (spot.includes('urca') && area.includes('urca')) return true;
  if (spot.includes('ponte') && name.includes('ponte')) return true;
  if (spot.includes('governador') && name.includes('governador')) return true;
  if (spot.includes('jurujuba') && area.includes('jurujuba')) return true;
  if (spot.includes('lagoa') && point.coast?.water === 'lagoon') return true;
  return false;
}

function pickGuide(point) {
  const byArea = AREA_GUIDE[point.area];
  if (byArea && GUIDE_BY_ID[byArea]) return GUIDE_BY_ID[byArea];

  const hay = `${point.name} ${point.area} ${point.access || ''}`;
  for (const [re, id] of KEYWORD_GUIDE) {
    if (re.test(hay) && GUIDE_BY_ID[id]) return GUIDE_BY_ID[id];
  }

  let best = null;
  let bestD = Infinity;
  for (const g of ISCABOX_GUIDES) {
    if (!g.geo) continue;
    const d = Math.hypot(g.geo.lat - point.lat, g.geo.lng - point.lng);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return bestD < 0.35 ? best : null;
}

function findSpotMatch(point, guide) {
  if (!guide?.spots?.length) return null;
  return (
    guide.spots.find((s) => spotMatchesPoint(s.name, point)) ||
    guide.spots.find((s) => spotMatchesPoint(s.name, { ...point, name: point.area })) ||
    null
  );
}

function pickSpotGuide(point, primary) {
  const spotFromPrimary = findSpotMatch(point, primary);
  if (spotFromPrimary) return { guide: primary, spot: spotFromPrimary };

  for (const id of ['baia-guanabara', 'niteroi', 'lagoa-rodrigo-freitas']) {
    const g = GUIDE_BY_ID[id];
    if (!g || g.id === primary?.id) continue;
    const spot = findSpotMatch(point, g);
    if (spot) return { guide: g, spot };
  }
  return { guide: primary, spot: null };
}

/** Dados de guia aplicáveis a um ponto do catálogo */
export function enrichPoint(point) {
  const primary = pickGuide(point);
  if (!primary) return null;

  const { guide, spot } = pickSpotGuide(point, primary);
  const speciesGuide = spot && guide.id !== primary.id ? guide : primary;

  const speciesFromGuide = (speciesGuide.species || []).map((s) => shortSpecies(s.name));
  const mergedSpecies = [...new Set([...(point.species || []), ...speciesFromGuide])];

  const technique = (speciesGuide.techniques || primary.techniques || [])[0] || null;
  const tips = {
    dos: [...(primary.tips?.dos || []), ...(guide.tips?.dos || [])].slice(0, 12),
    donts: [...(primary.tips?.donts || []), ...(guide.tips?.donts || [])].slice(0, 8),
  };

  return {
    guide: primary,
    spotGuide: guide,
    spot,
    species: mergedSpecies,
    technique,
    tips,
  };
}

function decodeText(s) {
  return (s || '')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

export function pointAreaPanel(point) {
  const e = enrichPoint(point);
  if (!e?.guide) return null;

  const guide = e.guide;
  const techniques = (guide.techniques || [])
    .slice(0, 2)
    .map((t) => ({
      title: t.title,
      steps: (t.steps || []).slice(0, 3).map(decodeText),
      gear: decodeText(t.gear),
    }));

  return {
    areaTitle: guide.title || point.area,
    intro: decodeText(guide.intro)?.slice(0, 320) || null,
    species: (e.species || []).slice(0, 6),
    spot: e.spot
      ? {
          name: e.spot.name,
          depth: e.spot.depth,
          bestTime: e.spot.bestTime,
        }
      : null,
    techniques,
    dos: (e.tips?.dos || []).filter((t) => t && !isOperatorTip(t)).slice(0, 5),
    donts: (e.tips?.donts || []).slice(0, 4),
  };
}

export function catalogSpeciesLabel(point) {
  const e = enrichPoint(point);
  if (!e?.species?.length) return point.species?.slice(0, 3).join(', ') || '';
  return e.species.slice(0, 4).join(', ');
}

function isOperatorTip(text) {
  return /reservar barco|operador experiente|contratar guia|contratar operador/i.test(text || '');
}

function firstUsefulTip(dos = []) {
  return dos.find((t) => t && !isOperatorTip(t)) || null;
}

export function pointInsights(point) {
  const e = enrichPoint(point);
  if (!e) return null;

  const lines = [];
  if (e.spot?.bestTime) lines.push(`⏱ ${e.spot.bestTime}`);
  if (e.spot?.depth) lines.push(`🌊 ${e.spot.depth}`);
  const tip = firstUsefulTip(e.tips.dos);
  if (!e.spot && tip) lines.push(`💡 ${tip}`);

  return lines.length ? { lines } : null;
}

export function pointStrategyExtras(point) {
  const e = enrichPoint(point);
  if (!e) return { steps: [], warnings: [], gearNote: null };

  return {
    steps: e.technique?.steps?.slice(0, 4) || [],
    warnings: e.tips.donts?.slice(0, 3) || [],
    gearNote: e.technique?.gear || null,
  };
}

export { GUIDE_BY_ID };
