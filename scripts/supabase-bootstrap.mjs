/**
 * Configura Supabase: migrations, admin rd, catálogo de pontos.
 * Requer env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: ADMIN_PASSWORD (default 100751rm)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { POINTS } from '../js/data/points.js';
import { ADMIN_POINTS } from '../js/data/admin-points.js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPass = process.env.ADMIN_PASSWORD || '100751rm';

if (!url || !serviceKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function rowFromPoint(p, source) {
  return {
    id: p.id,
    source,
    mode: p.mode,
    name: p.name,
    area: p.area,
    lat: p.lat,
    lng: p.lng,
    point_type: p.type,
    confidence: p.confidence ?? 70,
    species: p.species || [],
    access_note: p.access || '',
    coast: p.coast || null,
    is_personal: source === 'admin',
    is_protected: source === 'admin',
    is_admin_point: source === 'admin',
  };
}

async function runSqlFile(relativePath) {
  const sql = readFileSync(join(root, relativePath), 'utf8');
  const { error } = await sb.rpc('exec_sql', { query: sql });
  if (error && !String(error.message).includes('exec_sql')) {
    console.warn(`RPC exec_sql indisponível — rode manualmente: ${relativePath}`);
    return false;
  }
  return true;
}

async function ensureAdmin() {
  const email = 'rd@meira.app';
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = list?.users?.find((u) => u.email === email);

  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password: adminPass,
      email_confirm: true,
      user_metadata: { username: 'rd', display_name: 'RD', is_admin: true },
    });
    if (error) throw error;
    user = data.user;
    console.log('Admin rd criado.');
  } else {
    await sb.auth.admin.updateUserById(user.id, {
      password: adminPass,
      user_metadata: { username: 'rd', display_name: 'RD', is_admin: true },
    });
    console.log('Admin rd atualizado.');
  }

  await sb.from('profiles').upsert({
    id: user.id,
    username: 'rd',
    display_name: 'RD',
    is_admin: true,
  });
}

async function seedPoints() {
  const rows = [
    ...POINTS.map((p) => rowFromPoint(p, 'catalog')),
    ...(ADMIN_POINTS || []).map((p) => rowFromPoint(p, 'admin')),
  ];
  const chunk = 50;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await sb.from('fishing_points').upsert(part, { onConflict: 'id' });
    if (error) throw error;
    console.log(`Pontos ${Math.min(i + chunk, rows.length)}/${rows.length}`);
  }
}

async function main() {
  console.log('Meira Fishing — bootstrap Supabase');
  await runSqlFile('supabase/migrations/20260816120000_initial_schema.sql');
  await runSqlFile('supabase/migrations/20260816130000_public_catalog_read.sql');
  await ensureAdmin();
  await seedPoints();
  console.log('Pronto! Login: rd /', adminPass);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
