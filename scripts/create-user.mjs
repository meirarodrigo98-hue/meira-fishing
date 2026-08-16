/**
 * Cria usuário no Supabase (service role) — funciona em qualquer aparelho.
 * Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-user.mjs login senha "Nome"
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [username, password, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ') || username;
const admin = process.argv.includes('--admin');

if (!url || !serviceKey || !username || !password) {
  console.error('Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-user.mjs <login> <senha> [nome] [--admin]');
  process.exit(1);
}

const user = username.trim().toLowerCase();
const email = `${user}@meira.app`;

const sb = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 500 });
const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);

if (existing) {
  await sb.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { username: user, display_name: name, is_admin: admin },
  });
  await sb.from('profiles').upsert({
    id: existing.id,
    username: user,
    display_name: name,
    is_admin: admin,
  });
  console.log(`Usuário @${user} atualizado.`);
} else {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: user, display_name: name, is_admin: admin },
  });
  if (error) throw error;
  await sb.from('profiles').upsert({
    id: data.user.id,
    username: user,
    display_name: name,
    is_admin: admin,
  });
  console.log(`Usuário @${user} criado.`);
}

console.log(`Login: ${user} / ${password}`);
