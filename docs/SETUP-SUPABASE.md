# Configurar Supabase — só 1 vez (5 minutos)

Você não precisa saber SQL. Siga estes passos e me avise — o resto roda sozinho.

## Passo 1 — Copiar 5 valores do Supabase

No [dashboard Supabase](https://supabase.com/dashboard) → seu projeto → **Settings**:

| Onde | Secret no GitHub | Nome |
|------|------------------|------|
| **General → Reference ID** | `SUPABASE_PROJECT_REF` | ex: `abcdefghijklmnop` |
| **API → Project URL** | `SUPABASE_URL` | `https://xxx.supabase.co` |
| **API → anon public** | `SUPABASE_ANON_KEY` | `eyJhbG...` |
| **API → service_role** | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` (secreto!) |
| **Database → password** | `SUPABASE_DB_PASSWORD` | senha que você criou no projeto |

Em **Account → Access Tokens** crie um token → secret `SUPABASE_ACCESS_TOKEN`

Opcional: `ADMIN_PASSWORD` = senha do login `rd` (padrão `100751rm`)

## Passo 2 — Colar no GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret**

Crie cada secret da tabela acima.

## Passo 3 — Rodar setup automático

GitHub → **Actions** → **Supabase setup** → **Run workflow**

Isso vai:
- Criar todas as tabelas
- Importar **104 pontos** de pesca
- Criar usuário **rd** (admin)

## Passo 4 — Desligar confirmação de email (importante)

Supabase → **Authentication** → **Providers** → **Email** → desmarque **Confirm email**

Senão novos usuários não entram direto.

## Pronto

O próximo deploy do site já usa a nuvem. Login continua:
- **Usuário:** `rd`
- **Senha:** a que você definiu (`100751rm` ou `ADMIN_PASSWORD`)

## O que fica na nuvem

- Pontos do catálogo
- Seus pontos marcados (sincronizam entre aparelhos)
- Perfil + equipamento
- Usuários cadastrados no menu **Usuários**

Sem Supabase configurado, o app continua funcionando offline como antes.
