/** Material do pescador — salvo no aparelho (localStorage). */
const KEY = 'mf_gear';

export const GEAR = {
  rod: [
    { id: 'leve', label: 'Leve', detail: '1,6–2,1 m', icon: '〰' },
    { id: 'media', label: 'Média', detail: '2,1–2,7 m', icon: '🎣' },
    { id: 'pesada', label: 'Pesada', detail: '2,7–3,6 m', icon: '⚓' },
    { id: 'surf', label: 'Surf', detail: '3,0 m+', icon: '🌊' },
  ],
  reel: [
    { id: '1000-3000', label: '1000–3000', detail: 'Leve / lagoa', icon: '◎' },
    { id: '3000-5000', label: '3000–5000', detail: 'Versátil', icon: '◉' },
    { id: '5000+', label: '5000+', detail: 'Mar / pesado', icon: '●' },
  ],
  line: [
    { id: 'leve', label: 'Leve', detail: 'até 0,28 mm', icon: '─' },
    { id: 'media', label: 'Média', detail: '0,30–0,40 mm', icon: '═' },
    { id: 'pesada', label: 'Pesada', detail: '0,45 mm+', icon: '▬' },
  ],
  baits: [
    { id: 'camarao', label: 'Camarão', icon: '🦐' },
    { id: 'minhoca', label: 'Minhoca', icon: '🪱' },
    { id: 'sabiki', label: 'Sabiki', icon: '🪝' },
    { id: 'sardinha', label: 'Sardinha', icon: '🐟' },
    { id: 'milho', label: 'Milho', icon: '🌽' },
    { id: 'jig', label: 'Jig', icon: '🔻' },
    { id: 'minnow', label: 'Minnow', icon: '🐠' },
    { id: 'spinner', label: 'Spinner', icon: '✦' },
  ],
  sinkers: [
    { id: 'leve', label: 'Leve', icon: '·' },
    { id: 'medio', label: 'Médio', icon: '●' },
    { id: 'pesado', label: 'Pesado', icon: '⬤' },
  ],
  extras: [
    { id: 'leader', label: 'Leader', icon: '🔗' },
    { id: 'boat', label: 'Barco', icon: '🚤' },
  ],
};

export function emptyGear() {
  return { rod: null, reel: null, line: null, baits: [], sinkers: [], extras: [] };
}

export function loadGear() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyGear();
    const data = JSON.parse(raw);
    return { ...emptyGear(), ...data, baits: data.baits || [], sinkers: data.sinkers || [], extras: data.extras || [] };
  } catch {
    return emptyGear();
  }
}

export function saveGear(gear) {
  try {
    localStorage.setItem(KEY, JSON.stringify(gear));
  } catch {}
}

export function isGearReady(gear) {
  return Boolean(gear?.rod && gear?.line && gear?.baits?.length);
}

export function labelFor(group, id) {
  return GEAR[group]?.find((o) => o.id === id)?.label ?? '—';
}

export function gearSummary(gear) {
  if (!isGearReady(gear)) return 'Material não cadastrado';
  const baits = gear.baits.slice(0, 2).map((id) => labelFor('baits', id)).join(', ');
  const more = gear.baits.length > 2 ? ` +${gear.baits.length - 2}` : '';
  return `${labelFor('rod', gear.rod)} · ${labelFor('line', gear.line)} · ${baits}${more}`;
}

export function gearPower(gear) {
  const rod = { leve: 1, media: 2, pesada: 3, surf: 4 }[gear.rod] ?? 0;
  const line = { leve: 1, media: 2, pesada: 3 }[gear.line] ?? 0;
  const reel = { '1000-3000': 1, '3000-5000': 2, '5000+': 3 }[gear.reel] ?? 1;
  return rod + line + reel;
}

export function hasBait(gear, id) {
  return gear.baits.includes(id);
}

export function hasSinker(gear, id) {
  return gear.sinkers.includes(id);
}

export function hasExtra(gear, id) {
  return gear.extras.includes(id);
}
