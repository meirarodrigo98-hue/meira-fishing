import { scores, verdict } from './scoring.js';
import { fmtKm } from './utils.js';

/** Checklist e estratégia — leitura completa do ponto + condições. */
function timeSlot() {
  const h = new Date().getHours();
  if (h >= 5 && h < 8) return { key: 'dawn', label: 'Amanhecer', prime: true };
  if (h >= 17 && h < 20) return { key: 'dusk', label: 'Entardecer', prime: true };
  if (h >= 20 || h < 5) return { key: 'night', label: 'Noite', prime: false };
  return { key: 'day', label: 'Pleno dia', prime: false };
}

function gearFor(point) {
  if (point.type === 'Lagoa') {
    return 'Vara leve/média (1,80–2,10 m), molinete 1000–3000, linha 0,20–0,28 mm';
  }
  if (point.type === 'Costão' || point.type === 'Pedra') {
    return 'Vara pesada (2,70–3,60 m), carretilha/molinete forte, linha 0,35–0,45 mm, leader de aço/flúor';
  }
  if (point.mode === 'boat' && point.type === 'Offshore') {
    return 'Equipamento pesado, linha 0,40–0,60 mm, molinete 6000+, chumbos 200–400 g';
  }
  if (point.mode === 'boat') {
    return 'Vara média/pesada, molinete 4000–6000, linha 0,30–0,40 mm, GPS/sonda se possível';
  }
  return 'Vara média (2,10–2,70 m), molinete 3000–4000, linha 0,25–0,35 mm';
}

function baitFor(point, tide) {
  const sp = point.species[0];
  const map = {
    Robalo: 'Camarão vivo, sabiki de peixinho ou isca artificial (minnow/jig)',
    Xaréu: 'Sabiki, molusco, isca pequena viva ou artificial tipo jig',
    Corvina: 'Camarão, siri, isca de fundo ou artificial de corpo longo',
    Anchova: 'Isca natural grande (sardinha, lula) ou jig de 80–150 g',
    Garoupa: 'Isca de fundo (sardinha, corrico) ou jig vertical',
    'Olho-de-boi': 'Isca viva média, jig ou corrico lento',
    Tilápia: 'Minhoca, milho, massa ou isca vegetal',
    Traíra: 'Minhoca, isca viva pequena ou spinner',
  };
  let bait = map[sp] || 'Isca natural local e artificial compatível com a espécie';

  if (point.type === 'Lagoa') bait = 'Minhoca, milho ou isca vegetal — traíra responde a spinner';
  if ((point.type === 'Costão' || point.type === 'Pedra') && tide?.trend === 'rising') {
    bait += ' · priorize arremessos na rebentação com maré enchendo';
  }
  return bait;
}

function techniqueFor(point, wx, tide) {
  const wind = wx?.weather?.current?.wind_speed_10m ?? 12;
  const wave = wx?.marine?.current?.wave_height ?? 0.7;

  if (point.type === 'Lagoa') {
    return wind > 16
      ? 'Pesque abrigado na margem; arremessos curtos perto de vegetação'
      : 'Vara ao longo das margens e estruturas; trabalhe devagar perto de junco/pedras';
  }
  if (point.type === 'Costão' || point.type === 'Pedra') {
    if (wave > 1.4) return 'Evite arremessos na rebentação — pescaria só em bolsões abrigados';
    if (tide?.trend === 'rising') return 'Arremessos paralelos ao costão, trabalhe isca na volta da onda';
    if (tide?.trend === 'falling') return 'Foque canais e reentrâncias com maré vazando';
    return 'Arremessos do costão para o mar; varie distância até achar cardume';
  }
  if (point.type === 'Canal') {
    return 'Pescaria de fundo ou meia-água na corrente; posicione na saída/entrada do canal';
  }
  if (point.mode === 'boat' && point.type === 'Offshore') {
    return wave > 1.2
      ? 'Deriva lenta com chumbo pesado; jig vertical na quebra'
      : 'Deriva ou fundeadouro na quebra; alterne jig e corrico';
  }
  if (point.mode === 'boat') {
    return 'Circule a estrutura (ilha/canal); fundeadouro ou deriva com isca na meia-água/fundo';
  }
  if (wind > 20) return 'Arremessos mais curtos, chumbo extra e paciência com vento de frente';
  return 'Arremessos médios da orla; varie distância e profundidade a cada 10–15 min';
}

function positionFor(point, tide) {
  const tips = {
    Orla: 'Quebra de onda, bóias, moles e pontos de desembocadura',
    Praia: 'Reentrâncias, correntes laterais e fundo variado',
    Pier: 'Pilares, sombra do píer e saída de água',
    Costão: 'Pontos de rocha com reentrada e bolsões abrigados',
    Pedra: 'Canal entre pedras e borda onde a onda quebra',
    Canal: 'Centro do canal na corrente ou bordas na maré parada',
    Lagoa: 'Margens com vegetação, pontes e bordas de parque',
    Ilhas: 'Paredão da ilha, fundo variado e sombra da estrutura',
    Ilha: 'Contorno da ilha e fundo de 8–20 m',
    'Mar aberto': 'Cardumes na deriva; atenção a aves e variação de fundo',
    Offshore: 'Quebra de 18–40 m, cabeços e bordas de canal',
  };
  let base = tips[point.type] || 'Estruturas naturais e variação de fundo';

  if (tide?.trend === 'rising' && point.mode === 'land') {
    base += ' · maré enchendo puxa peixe para a estrutura';
  } else if (tide?.trend === 'falling' && (point.type === 'Costão' || point.type === 'Pedra')) {
    base += ' · maré vazando expõe canais entre rochas';
  }
  return base;
}

function safetyItems(point, wx, s) {
  const wave = wx?.marine?.current?.wave_height ?? 0.7;
  const wind = wx?.weather?.current?.wind_speed_10m ?? 12;
  const gust = wx?.weather?.current?.wind_gusts_10m ?? wind;
  const items = [];

  items.push({ status: 'info', label: 'Calçado antiderrapante e protetor solar' });

  if (point.type === 'Costão' || point.type === 'Pedra') {
    items.push({ status: wave > 1.2 ? 'bad' : 'warn', label: 'Nunca vire costas para o mar' });
    if (wave > 1.4) items.push({ status: 'bad', label: 'Onda forte — evite pescar na rebentação' });
  }
  if (point.mode === 'boat') {
    items.push({ status: 'info', label: 'Coletes, rádio/celular seco e combustível cheio' });
    if (wind > 18 || gust > 25) items.push({ status: 'warn', label: 'Vento forte — evite sair sozinho' });
    if (wave > 1.5) items.push({ status: 'bad', label: 'Mar agitado — considere adiar a saída' });
  }
  if (s.safe < 50) items.push({ status: 'bad', label: 'Condição insegura neste ponto agora' });
  if ((wx?.weather?.current?.precipitation ?? 0) > 2) {
    items.push({ status: 'warn', label: 'Chuva — capa impermeável e cuidado com piso escorregadio' });
  }
  return items;
}

function item(status, label, detail = '') {
  return { status, label, detail };
}

export function buildPointChecklist(point, { weather, distance, estimated = false } = {}) {
  const wx = weather;
  const v = verdict(point, wx);
  const s = wx ? scores(point, wx) : null;
  const tide = wx?.tide;
  const slot = timeSlot();
  const wind = wx?.weather?.current?.wind_speed_10m;
  const wave = wx?.marine?.current?.wave_height;
  const sst = wx?.marine?.current?.sea_surface_temperature;

  const items = [];

  // Leitura do ponto
  items.push(
    item('info', `Ponto: ${point.name}`, `${point.type} · ${point.area}`),
    item('info', `Espécies-alvo: ${point.species.join(', ')}`),
  );
  if (distance != null) items.push(item('info', `Distância: ${fmtKm(distance)}`, 'Do seu GPS atual'));

  // Condições ao vivo
  if (!wx) {
    items.push(item('warn', 'Clima ainda carregando', 'Aguarde ou reabra o checklist'));
  } else {
    const cond = [];
    if (wind != null) cond.push(`vento ${Math.round(wind)} km/h`);
    if (wave != null) cond.push(`onda ${wave.toFixed(1)} m`);
    if (tide?.label) cond.push(tide.label.toLowerCase());
    if (sst != null) cond.push(`mar ${Math.round(sst)} °C`);
    items.push(
      item(estimated ? 'warn' : 'ok', estimated ? 'Condições estimadas' : 'Condições ao vivo', cond.join(' · ') || '—'),
    );
    items.push(
      item(v.key === 'ir' ? 'ok' : v.key === 'evitar' ? 'bad' : 'warn', `Veredito: ${v.key === 'ir' ? 'Vale ir' : v.label}`, v.why),
    );
  }

  // Timing
  items.push(
    item(slot.prime ? 'ok' : 'warn', `Horário: ${slot.label}`, slot.prime ? 'Janela clássica de alimentação' : 'Peixe mais lento — paciência e isca natural'),
  );

  if (tide) {
    const tideTip =
      tide.trend === 'rising'
        ? 'Maré enchendo — peixes sobem para estruturas e alimentam'
        : tide.trend === 'falling'
          ? 'Maré vazando — trabalhe canais e saídas de água'
          : tide.trend === 'slack'
            ? 'Maré parada — isca lenta e mais tempo no mesmo lugar'
            : 'Observe a maré local antes de escolher o spot exato';
    items.push(item(tide.trend === 'rising' ? 'ok' : 'info', tide.label, tideTip));
  }

  // Estratégia
  items.push(item('info', 'Equipamento', gearFor(point)));
  items.push(item('ok', 'Isca / artificial', baitFor(point, tide)));
  items.push(item('ok', 'Técnica', techniqueFor(point, wx, tide)));
  items.push(item('ok', 'Onde posicionar', positionFor(point, tide)));

  // Preparo prático
  items.push(
    item('info', 'Levar na mochila', 'Água, iscas reserva, alicate, passador, headlamp se for ficar'),
    item('info', 'Abordagem', point.mode === 'boat' ? 'Saída pelo ponto de apoio mais próximo' : 'Chegue 15 min antes para montar sem pressa'),
  );

  safetyItems(point, wx, s ?? { safe: 100 }).forEach((safety) => items.push(safety));

  const headline =
    v.key === 'ir'
      ? `Estratégia agressiva — ${point.species[0]} em ${point.type.toLowerCase()}`
      : v.key === 'evitar'
        ? `Cuidado — condição difícil, ajuste expectativa`
        : `Estratégia moderada — paciência e isca natural`;

  return { headline, items, verdict: v, estimated };
}
