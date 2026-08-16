# Meira Fishing — Supabase

Banco de dados para pontos, perfis, equipamento e cache de clima.

## 1. Criar o projeto

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → escolha região (ex.: South America)
3. Anote **Project URL** e **anon public key** (Settings → API)

## 2. Rodar a migration (schema)

**Opção A — SQL Editor (mais fácil)**

1. Supabase → **SQL Editor** → **New query**
2. Cole o conteúdo de `supabase/migrations/20260816120000_initial_schema.sql`
3. **Run**

**Opção B — CLI**

```bash
npm i -g supabase
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

## 3. Importar pontos do catálogo (~128 spots)

No seu PC, na pasta do repo:

```bash
node scripts/export-points-sql.mjs
```

Isso gera `supabase/seed/catalog_points.sql`. Cole no **SQL Editor** e rode.

## 4. Criar usuário admin (RD)

1. Supabase → **Authentication** → **Users** → **Add user**
2. Email: seu email (ex.: `rd@meira.fishing`)
3. Senha: a que quiser usar no app
4. Depois, no SQL Editor:

```sql
update public.profiles
set username = 'rd', display_name = 'RD', is_admin = true
where id = (
  select id from auth.users where email = 'SEU_EMAIL@exemplo.com'
);
```

## 5. Variáveis no app (próximo passo)

Copie `.env.example` para `.env.local` (não commitar):

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

## Tabelas

| Tabela | Conteúdo |
|--------|----------|
| `profiles` | Usuário, admin, perfil pesca, gear (JSON) |
| `fishing_points` | Catálogo + admin + pontos pessoais |
| `places` | Bairros fallback GPS |
| `weather_cache` | Clima por ponto (opcional) |
| `point_snapshots` | Backup histórico dos pontos do usuário |

## Segurança (RLS)

- Catálogo/admin: leitura para logados
- Pontos pessoais: só o dono edita
- Admin: acesso total
- Perfil/gear: cada um edita o seu

## GitHub

Com o repo linkado, você pode ativar **Supabase GitHub Integration** para aplicar migrations automaticamente em push na pasta `supabase/migrations/`.
