import { getSupabase, emailToUsername, usernameToEmail } from './supabase-client.js';

export function rowToPoint(row) {
  if (!row) return null;
  return {
    id: row.id,
    mode: row.mode,
    name: row.name,
    area: row.area,
    lat: row.lat,
    lng: row.lng,
    type: row.point_type,
    confidence: row.confidence,
    species: row.species || [],
    access: row.access_note || '',
    coast: row.coast || undefined,
    accuracy: row.accuracy_m ?? null,
    personal: row.is_personal,
    protected: row.is_protected,
    admin: row.is_admin_point,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function pointToRow(point, ownerId) {
  return {
    id: point.id,
    source: 'user',
    owner_id: ownerId,
    mode: point.mode || 'land',
    name: point.name,
    area: point.area || 'Meus pontos',
    lat: point.lat,
    lng: point.lng,
    point_type: point.type || 'Pedra',
    confidence: point.confidence ?? 78,
    species: point.species || ['Robalo', 'Xaréu'],
    access_note: point.access || '',
    coast: point.coast || null,
    accuracy_m: point.accuracy ?? null,
    is_personal: true,
    is_protected: true,
    is_admin_point: false,
    updated_at: point.updatedAt || new Date().toISOString(),
  };
}

export async function fetchPublicPoints() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('fishing_points')
    .select('*')
    .in('source', ['catalog', 'admin'])
    .order('id');
  if (error) throw error;
  return (data || []).map(rowToPoint).filter(Boolean);
}

export async function fetchMyRemotePoints() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData.user) return null;
  const { data, error } = await sb
    .from('fishing_points')
    .select('*')
    .eq('source', 'user')
    .eq('owner_id', userData.user.id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToPoint).filter(Boolean);
}

export async function upsertRemotePoint(point) {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return { ok: false };
  const row = pointToRow(point, userData.user.id);
  const { error } = await sb.from('fishing_points').upsert(row, { onConflict: 'id' });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteRemotePoint(id) {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return { ok: false };
  const { error } = await sb
    .from('fishing_points')
    .delete()
    .eq('id', id)
    .eq('owner_id', userData.user.id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function fetchRemoteProfile() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', userData.user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveRemoteProfile({ name, style, level, gear }) {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return { ok: false };
  const patch = {};
  if (name != null) patch.display_name = name;
  if (style != null) patch.style = style;
  if (level != null) patch.level = level;
  if (gear != null) patch.gear = gear;
  const { error } = await sb.from('profiles').update(patch).eq('id', userData.user.id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function createRemoteUser({ username, password, name, admin = false }) {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: 'Nuvem desligada.' };

  const email = usernameToEmail(username);
  const { data: before } = await sb.auth.getSession();
  const adminSession = before?.session ?? null;

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: name || username,
        is_admin: !!admin,
      },
    },
  });

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('already') || msg.includes('registered')) {
      return { ok: false, message: 'Usuário já existe na nuvem.' };
    }
    return { ok: false, message: error.message };
  }

  if (data.user?.identities?.length === 0) {
    return { ok: false, message: 'Usuário já cadastrado na nuvem.' };
  }

  // signUp pode trocar a sessão para o usuário novo — restaura admin
  if (adminSession) {
    await sb.auth.setSession({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    });
  } else if (data.session) {
    await sb.auth.signOut();
  }

  if (data.user && !data.session) {
    return {
      ok: false,
      message:
        'Conta criada na nuvem, mas o login está bloqueado. Desative confirmação de e-mail em Supabase → Authentication → Email.',
    };
  }

  return { ok: true, user: username };
}

export async function usernameExistsRemote(username) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('check_username_exists', {
    p_username: (username || '').trim().toLowerCase(),
  });
  if (error) return null;
  return !!data;
}

export function profileToSession(profile, authUser) {
  if (!profile && !authUser) return null;
  return {
    user: profile?.username || emailToUsername(authUser?.email),
    name: profile?.display_name || profile?.username || 'Pescador',
    admin: !!profile?.is_admin,
    supabase: true,
    at: Date.now(),
    expires: Date.now() + 30 * 864e5,
  };
}
