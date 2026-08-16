/**
 * Extrai guias públicos da iscabox (RJ) e gera js/data/iscabox-guides.js
 * Uso: node scripts/import-iscabox-rj.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://www.iscabox.com';
const RJ_INDEX = `${BASE}/blog/locais/brasil/rio-de-janeiro`;

const REGION_PAGES = [
  `${BASE}/blog/locais/brasil/rio-de-janeiro/baixada-fluminense`,
  `${BASE}/blog/locais/brasil/rio-de-janeiro/litoral-sul-fluminense`,
  `${BASE}/blog/locais/brasil/rio-de-janeiro/norte-fluminense`,
  `${BASE}/blog/locais/brasil/rio-de-janeiro/regiao-dos-lagos`,
  `${BASE}/blog/locais/brasil/rio-de-janeiro/regiao-metropolitana-rio-de-janeiro`,
  `${BASE}/blog/locais/brasil/rio-de-janeiro/serra-dos-orgaos`,
];

const EXTRA_GUIDES = [
  `${BASE}/blog/locais/brasil/rio-de-janeiro/regiao-metropolitana-rio-de-janeiro/baia-guanabara-guia-completo`,
  `${BASE}/blog/locais/brasil/rio-de-janeiro/regiao-metropolitana-rio-de-janeiro/niteroi-guia-completo`,
  `${BASE}/blog/locais/brasil/rio-de-janeiro/regiao-metropolitana-rio-de-janeiro/lagoa-rodrigo-de-freitas-guia-completo`,
  `${BASE}/blog/locais/brasil/rio-de-janeiro/regiao-metropolitana-rio-de-janeiro/pesca-mar-aberto-rio-guia-completo`,
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MeiraFishing-Import/1.0 (+https://meirarodrigo98-hue.github.io/meira-fishing/)' },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

function extractGuideLinks(html) {
  const re = /href="(\/blog\/locais\/brasil\/rio-de-janeiro[^"]*guia-completo)"/g;
  const out = new Set();
  let m;
  while ((m = re.exec(html))) out.add(`${BASE}${m[1]}`);
  return [...out];
}

function parseJsonLd(html) {
  const blocks = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      /* skip */
    }
  }
  return blocks;
}

function stripTags(s) {
  return decodeHtml((s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function decodeHtml(s) {
  return s
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function sanitizeIntro(text) {
  return decodeHtml(text || '')
    .replace(/^Com base em informações compiladas pela iscabox[^,]*,\s*/i, '')
    .replace(/^Com base em informações compiladas pela iscabox,\s*/i, '')
    .trim();
}

function sectionAfter(html, headingPart) {
  const re = new RegExp(
    `<h2[^>]*>[\\s\\S]*?${headingPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?</h2>([\\s\\S]*?)(?=<h2|<section class="mt-16"|$)`,
    'i',
  );
  const m = html.match(re);
  return m ? m[1] : '';
}

function parseSpecies(html) {
  const block = sectionAfter(html, 'Peixes mais populares');
  if (!block) return [];
  const items = [];
  const seen = new Set();
  const cardRe = /<a[^>]*href="\/blog\/especies[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = cardRe.exec(block))) {
    const chunk = m[1];
    const name =
      stripTags((chunk.match(/<h3[^>]*>([^<]+)<\/h3>/i) || [])[1]) ||
      stripTags((chunk.match(/alt="([^"]+)"/i) || [])[1]);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const latin = stripTags((chunk.match(/<p[^>]*>([^<]+)<\/p>/i) || [])[1]) || undefined;
    items.push({ name, latin: latin || undefined });
  }
  return items;
}

function parseTechniques(html) {
  const block = sectionAfter(html, 'melhores pescarias');
  if (!block) return [];
  const items = [];
  const cardRe = /<div class="bg-gray-50[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="bg-gray-50|<\/div>\s*<\/div>|$)/gi;
  let m;
  while ((m = cardRe.exec(block))) {
    const chunk = m[1];
    const title = stripTags((chunk.match(/<h3[^>]*>([^<]+)<\/h3>/i) || [])[1]);
    if (!title) continue;
    const steps = [...chunk.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((x) => stripTags(x[1]));
    const gear = stripTags((chunk.match(/Equipamento:<\/span>\s*(?:<!--\s*-->)?\s*([^<]+)/i) || [])[1] || '');
    items.push({ title, steps, gear: gear || undefined });
  }
  return items;
}

function parseSpots(html) {
  const block = sectionAfter(html, 'pontos de pesca mais produtivos');
  if (!block) return [];
  const items = [];
  const cardRe =
    /<h3 class="flex-1 font-semibold[^"]*">([^<]+)<\/h3>[\s\S]*?<span class="truncate[^"]*">([^<]+)<\/span>[\s\S]*?<span class="truncate[^"]*">([^<]+)<\/span>/gi;
  let m;
  while ((m = cardRe.exec(block))) {
    items.push({
      name: stripTags(m[1]),
      depth: stripTags(m[2]) || undefined,
      bestTime: stripTags(m[3]) || undefined,
    });
  }
  return items;
}

function parseTips(html) {
  const dos = [];
  const donts = [];
  const doBlock = html.match(/O que fazer<\/h3><ul[^>]*>([\s\S]*?)<\/ul>/i);
  const dontBlock = html.match(/O que evitar<\/h3><ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (doBlock?.[1]) {
    for (const m of doBlock[1].matchAll(/<span>([^<]+)<\/span>/gi)) dos.push(stripTags(m[1]));
  }
  if (dontBlock?.[1]) {
    for (const m of dontBlock[1].matchAll(/<span>([^<]+)<\/span>/gi)) donts.push(stripTags(m[1]));
  }
  return { dos: dos.slice(0, 16), donts: donts.slice(0, 10) };
}

function parseGuide(html, url) {
  const jsonLd = parseJsonLd(html);
  const attraction = jsonLd.find((b) => b['@type'] === 'TouristAttraction');
  const article = jsonLd.find((b) => b['@type'] === 'Article');
  const title =
    stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]) ||
    attraction?.name ||
    article?.headline ||
    url.split('/').pop();

  const intro = stripTags(attraction?.description || article?.description || '').slice(0, 800);

  const localityRaw = attraction?.address?.addressLocality || '';
  const locality = localityRaw.split(',')[0]?.trim() || localityRaw || null;

  return {
    id: url.split('/').pop().replace(/-guia-completo$/, ''),
    title: title.replace(/: guia completo$/i, '').trim(),
    url,
    source: 'iscabox.com',
    updated: article?.dateModified || article?.datePublished || null,
    geo: attraction?.geo
      ? { lat: Number(attraction.geo.latitude), lng: Number(attraction.geo.longitude) }
      : null,
    locality,
    intro: sanitizeIntro(intro) || undefined,
    species: parseSpecies(html),
    techniques: parseTechniques(html),
    spots: parseSpots(html),
    tips: parseTips(html),
  };
}

async function main() {
  console.log('Coletando links RJ…');
  const indexHtml = await fetchText(RJ_INDEX);
  const links = new Set(extractGuideLinks(indexHtml));

  for (const region of REGION_PAGES) {
    try {
      const html = await fetchText(region);
      extractGuideLinks(html).forEach((l) => links.add(l));
      await sleep(400);
    } catch (e) {
      console.warn('Região ignorada:', region, e.message);
    }
  }
  EXTRA_GUIDES.forEach((u) => links.add(u));

  const urls = [...links].sort();
  console.log(`${urls.length} guias encontrados`);

  const guides = [];
  for (const url of urls) {
    try {
      const html = await fetchText(url);
      guides.push(parseGuide(html, url));
      console.log('OK', guides.at(-1).title);
      await sleep(500);
    } catch (e) {
      console.warn('Falha', url, e.message);
    }
  }

  const outPath = join(ROOT, 'js', 'data', 'iscabox-guides.js');
  const exportGuides = guides.map(({ url, source, ...rest }) => rest);
  const body = `/** Guias regionais (RJ) — gerado por scripts/import-iscabox-rj.mjs */
export const ISCABOX_GUIDES = ${JSON.stringify(exportGuides, null, 2)};
`;
  writeFileSync(outPath, body, 'utf8');
  console.log(`Salvo ${guides.length} guias em ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
