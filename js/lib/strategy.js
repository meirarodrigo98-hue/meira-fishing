import { hasBait, hasExtra, hasSinker, gearPower, labelFor } from './gear.js';

/** Checklist no local — observações + material → estratégia. */
export const OBS_GROUPS = [
  {
    id: 'wave',
    label: 'Onda',
    options: [
      { id: 'calm', label: 'Calma' },
      { id: 'medium', label: 'Média' },
      { id: 'strong', label: 'Forte' },
    ],
  },
  {
    id: 'tide',
    label: 'Maré',
    options: [
      { id: 'rising', label: 'Subindo' },
      { id: 'falling', label: 'Vazando' },
      { id: 'slack', label: 'Parada' },
      { id: 'unknown', label: 'Não sei' },
    ],
  },
  {
    id: 'wind',
    label: 'Vento',
    options: [
      { id: 'light', label: 'Fraco' },
      { id: 'moderate', label: 'Moderado' },
      { id: 'strong', label: 'Forte' },
    ],
  },
  {
    id: 'structure',
    label: 'Estrutura',
    options: [
      { id: 'rocks', label: 'Rochas / costão' },
      { id: 'channel', label: 'Canal / corrente' },
      { id: 'vegetation', label: 'Vegetação' },
      { id: 'sand', label: 'Areia / mole' },
    ],
  },
  {
    id: 'activity',
    label: 'Movimento',
    options: [
      { id: 'birds', label: 'Pássaros' },
      { id: 'splashes', label: 'Salpicos' },
      { id: 'nothing', label: 'Nada visível' },
    ],
  },
  {
    id: 'water',
    label: 'Água',
    options: [
      { id: 'clear', label: 'Limpa' },
      { id: 'murky', label: 'Turva' },
    ],
  },
];

export function emptyObservations() {
  return Object.fromEntries(OBS_GROUPS.map((g) => [g.id, null]));
}

function pickBait(point, gear, obs) {
  const sp = point.species[0];
  const candidates = [];

  if (point.type === 'Lagoa') {
    if (hasBait(gear, 'minhoca')) candidates.push({ id: 'minhoca', why: 'Margem com vegetação — traíra e tilápia' });
    if (hasBait(gear, 'milho')) candidates.push({ id: 'milho', why: 'Lagoa responde bem a isca vegetal' });
    if (hasBait(gear, 'spinner')) candidates.push({ id: 'spinner', why: 'Spinner devagar perto de junco' });
  } else if (sp === 'Robalo' || sp === 'Corvina') {
    if (hasBait(gear, 'camarao')) candidates.push({ id: 'camarao', why: `${sp} na estrutura com maré` });
    if (hasBait(gear, 'minnow')) candidates.push({ id: 'minnow', why: 'Arremesso paralelo à estrutura' });
    if (hasBait(gear, 'jig')) candidates.push({ id: 'jig', why: 'Jig trabalhado no retorno da onda' });
  } else if (sp === 'Xaréu') {
    if (hasBait(gear, 'sabiki')) candidates.push({ id: 'sabiki', why: 'Sabiki na corrente ou quebra' });
    if (hasBait(gear, 'jig')) candidates.push({ id: 'jig', why: 'Jig pequeno com movimento' });
  } else if (sp === 'Anchova' || sp === 'Garoupa' || sp === 'Olho-de-boi') {
    if (hasBait(gear, 'sardinha')) candidates.push({ id: 'sardinha', why: 'Isca natural grande no fundo' });
    if (hasBait(gear, 'jig')) candidates.push({ id: 'jig', why: 'Jig pesado na quebra ou fundo' });
  }

  if (obs.activity === 'birds' && hasBait(gear, 'sabiki')) {
    candidates.unshift({ id: 'sabiki', why: 'Pássaros indicam cardume — sabiki rápido' });
  }
  if (obs.water === 'murky' && hasBait(gear, 'camarao')) {
    candidates.unshift({ id: 'camarao', why: 'Água turva — cheiro de camarão ajuda' });
  }
  if (obs.water === 'clear' && hasBait(gear, 'minnow')) {
    candidates.unshift({ id: 'minnow', why: 'Água limpa — artificial naturalista' });
  }

  if (!candidates.length && gear.baits.length) {
    return { id: gear.baits[0], why: 'Use o que você tem e varie o ritmo' };
  }
  return candidates[0] ?? null;
}

function pickSetup(gear, obs, point) {
  const power = gearPower(gear);
  const parts = [`${labelFor('rod', gear.rod)} + ${labelFor('line', gear.line)}`];

  if (obs.wave === 'strong' || obs.wind === 'strong') {
    if (hasSinker(gear, 'pesado')) parts.push('chumbo pesado');
    else if (hasSinker(gear, 'medio')) parts.push('chumbo médio (considere mais peso)');
    else parts.push('arremessos curtos — falta chumbo pesado');
  } else if (hasSinker(gear, 'leve')) {
    parts.push('chumbo leve');
  }

  if ((point.type === 'Costão' || point.type === 'Pedra') && hasExtra(gear, 'leader')) {
    parts.push('leader obrigatório na rebentação');
  }

  if (power < 4 && (obs.wave === 'strong' || point.type === 'Offshore')) {
    parts.push('⚠ equipamento leve para essa condição');
  }

  return parts.join(' · ');
}

function pickTechnique(point, gear, obs, bait) {
  const b = bait?.id;

  if (point.type === 'Lagoa') {
    if (obs.structure === 'vegetation') return 'Arremessos curtos rente ao junco; recolhimento lento';
    return 'Vara ao longo da margem; mude de spot a cada 15 min';
  }

  if (point.type === 'Costão' || point.type === 'Pedra') {
    if (obs.wave === 'strong') return 'Não entre na rebentação — arremesse de bolsão abrigado';
    if (obs.tide === 'rising') return 'Arremessos paralelos ao costão com maré enchendo';
    if (obs.tide === 'falling') return 'Trabalhe canais entre rochas com maré vazando';
    if (b === 'jig') return 'Jig na volta da onda, 2–3 toques e pausa';
    return 'Arremessos do costão; varie distância até achar peixe';
  }

  if (obs.structure === 'channel') {
    return 'Isca de fundo ou meia-água na saída do canal';
  }

  if (point.mode === 'boat') {
    if (obs.activity === 'birds') return 'Deriva em direção aos pássaros; sabiki ou jig';
    if (obs.wind === 'strong') return 'Fundeadouro abrigado ou deriva lenta com chumbo extra';
    return 'Circule a estrutura; alterne fundo e meia-água';
  }

  if (obs.wind === 'strong') return 'Arremessos mais curtos com vento de frente';
  if (obs.activity === 'nothing') return 'Isca natural, recolhimento lento, teste 3 distâncias';
  return 'Arremessos médios; mude profundidade a cada 10 min';
}

function pickPosition(point, obs) {
  if (obs.structure === 'rocks') return 'Borda das rochas e reentrâncias — não fique no seco';
  if (obs.structure === 'channel') return 'Saída/entrada do canal onde a corrente acelera';
  if (obs.structure === 'vegetation') return 'Margem com vegetação ou sombra de ponte';
  if (obs.structure === 'sand') return 'Reentrâncias e mudança de fundo na praia';

  const byType = {
    Costão: 'Pontos de quebra com bolsão abrigado',
    Pedra: 'Canal entre pedras onde a onda passa',
    Pier: 'Pilares e sombra do píer',
    Orla: 'Quebra de onda e moles',
    Lagoa: 'Margens com estrutura e pontes',
    Offshore: 'Quebra de fundo e bordas de canal',
  };
  let pos = byType[point.type] || 'Estrutura com variação de fundo';

  if (obs.tide === 'rising') pos += ' · maré enchendo puxa peixe para dentro';
  if (obs.tide === 'falling') pos += ' · maré vazando expõe passagem';
  if (obs.activity === 'birds') pos += ' · siga os pássaros com cuidado';

  return pos;
}

function buildWarnings(point, gear, obs) {
  const w = [];
  const power = gearPower(gear);

  if (obs.wave === 'strong' && (point.type === 'Costão' || point.type === 'Pedra')) {
    w.push('Onda forte no costão — não vire costas para o mar');
  }
  if (obs.wave === 'strong' && power < 5) {
    w.push('Sua vara/linha estão leves para onda forte');
  }
  if (point.mode === 'boat' && !hasExtra(gear, 'boat')) {
    w.push('Ponto de barco — confirme se vai sair de barco');
  }
  if (point.mode === 'boat' && obs.wind === 'strong') {
    w.push('Vento forte no mar — evite sair sozinho');
  }
  if (obs.activity === 'nothing' && obs.tide === 'slack') {
    w.push('Maré parada e sem movimento — paciência ou mude de spot');
  }
  if (!hasExtra(gear, 'leader') && (point.type === 'Costão' || point.type === 'Pedra')) {
    w.push('Leader recomendado para rochas e dentes');
  }
  return w;
}

export function obsComplete(obs) {
  return OBS_GROUPS.every((g) => obs[g.id]);
}

export function obsProgress(obs) {
  const done = OBS_GROUPS.filter((g) => obs[g.id]).length;
  return { done, total: OBS_GROUPS.length };
}

export function buildLiveStrategy(point, gear, observations) {
  if (!obsComplete(observations)) {
    return {
      ready: false,
      headline: 'Marque o que você vê no local',
      detail: 'A estratégia aparece quando todas as opções estiverem preenchidas.',
      bait: null,
      setup: null,
      technique: null,
      position: null,
      warnings: [],
    };
  }

  const obs = observations;
  const bait = pickBait(point, gear, obs);
  const setup = pickSetup(gear, obs, point);
  const technique = pickTechnique(point, gear, obs, bait);
  const position = pickPosition(point, obs);
  const warnings = buildWarnings(point, gear, obs);

  let headline = 'Estratégia pronta para agora';
  if (obs.activity === 'birds' || obs.activity === 'splashes') headline = 'Tem movimento — vale insistir';
  if (obs.wave === 'strong') headline = 'Condição exigente — pescaria seletiva';
  if (obs.activity === 'nothing' && obs.tide === 'slack') headline = 'Condição parada — paciência e isca natural';

  return {
    ready: true,
    headline,
    detail: `${point.species.slice(0, 2).join(' / ')} · ${point.type}`,
    bait: bait ? { label: labelFor('baits', bait.id), why: bait.why } : null,
    setup,
    technique,
    position,
    warnings,
  };
}
