/** Material do pescador — salvo no aparelho (localStorage). */
const KEY = 'mf_gear';

export const GEAR = {
  rod: [
    { id: 'leve', label: 'Leve', detail: '1,6–2,1 m' },
    { id: 'media', label: 'Média', detail: '2,1–2,7 m' },
    { id: 'pesada', label: 'Pesada', detail: '2,7–3,6 m' },
    { id: 'surf', label: 'Surf', detail: '3,0 m+' },
  ],
  reel: [
    { id: '1000-3000', label: '1000–3000' },
    { id: '3000-5000', label: '3000–5000' },
    { id: '5000+', label: '5000+' },
  ],
  line: [
    { id: 'leve', label: 'Leve', detail: 'até 0,28 mm' },
    { id: 'media', label: 'Média', detail: '0,30–0,40 mm' },
    { id: 'pesada', label: 'Pesada', detail: '0,45 mm+' },
  ],
  baits: [
    { id: 'camarao', label: 'Camarão' },
    { id: 'minhoca', label: 'Minhoca' },
    { id: 'sabiki', label: 'Sabiki' },
    { id: 'sardinha', label: 'Sardinha' },
    { id: 'milho', label: 'Milho / massa' },
    { id: 'jig', label: 'Jig' },
    { id: 'minnow', label: 'Minnow / plug' },
    { id: 'spinner', label: 'Spinner' },
  ],
  sinkers: [
    { id: 'leve', label: 'Chumbo leve' },
    { id: 'medio', label: 'Chumbo médio' },
    { id: 'pesado', label: 'Chumbo pesado' },
  ],
  extras: [
    { id: 'leader', label: 'Leader flúor/aço' },
    { id: 'boat', label: 'Tenho barco' },
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
  const baits = gear.baits.map((id) => labelFor('baits', id)).join(', ');
  return `${labelFor('rod', gear.rod)} · ${labelFor('line', gear.line)} · ${baits}`;
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
