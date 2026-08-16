/** Gera SQL para importar js/data/points.js no Supabase. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { POINTS } from '../js/data/points.js';
import { ADMIN_POINTS } from '../js/data/admin-points.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function esc(text) {
  return String(text ?? '').replace(/'/g, "''");
}

function rowSql(p, source) {
  const coast = p.coast ? `'${esc(JSON.stringify(p.coast))}'::jsonb` : 'null';
  const species = `array[${(p.species || []).map((s) => `'${esc(s)}'`).join(',')}]::text[]`;
  return `(
    '${esc(p.id)}', '${source}'::point_source, '${esc(p.mode)}'::point_mode,
    '${esc(p.name)}', '${esc(p.area)}', ${p.lat}, ${p.lng},
    '${esc(p.type)}', ${p.confidence ?? 70}, ${species},
    '${esc(p.access || '')}', ${coast},
    ${source === 'admin'}, ${source === 'admin'}, ${source === 'admin'}
  )`;
}

const catalog = POINTS.map((p) => rowSql(p, 'catalog'));
const admin = (ADMIN_POINTS || []).map((p) => rowSql(p, 'admin'));
const all = [...catalog, ...admin];

const sql = `-- Gerado por scripts/export-points-sql.mjs — ${all.length} pontos
-- Rode no Supabase SQL Editor depois da migration inicial.

insert into public.fishing_points (
  id, source, mode, name, area, lat, lng, point_type, confidence, species,
  access_note, coast, is_personal, is_protected, is_admin_point
) values
${all.join(',\n')}
on conflict (id) do update set
  source = excluded.source,
  mode = excluded.mode,
  name = excluded.name,
  area = excluded.area,
  lat = excluded.lat,
  lng = excluded.lng,
  point_type = excluded.point_type,
  confidence = excluded.confidence,
  species = excluded.species,
  access_note = excluded.access_note,
  coast = excluded.coast,
  is_personal = excluded.is_personal,
  is_protected = excluded.is_protected,
  is_admin_point = excluded.is_admin_point,
  updated_at = now();
`;

const outDir = join(root, 'supabase', 'seed');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'catalog_points.sql');
writeFileSync(out, sql, 'utf8');
console.log(`Wrote ${all.length} points → ${out}`);
