# Meira Fishing

App de pescaria — GPS, radar de pontos próximos e veredito **Ir agora / Esperar / Evitar**.

Site: https://meirarodrigo98-hue.github.io/meira-fishing/

## Estrutura (edite onde precisar)

| Arquivo | O que muda |
|---------|------------|
| `js/data/points.js` | Pontos de pesca (nome, lat/lng, espécie, tipo) |
| `js/data/places.js` | Bairros do fallback sem GPS |
| `js/lib/scoring.js` | Regras de **Ir agora / Esperar / Evitar** |
| `js/lib/gear.js` | Cadastro do material do pescador |
| `js/lib/strategy.js` | Checklist no local + estratégia pelo material |
| `js/lib/weather.js` | API de clima e mar (Open-Meteo) |
| `js/features/map.js` | Mapa, marcadores e rota |
| `js/features/ui.js` | Card de pontos, filtros e HUD |
| `js/features/location.js` | GPS e fallback manual |
| `js/boot-cache.js` | Auto-update quando sair versão nova |
| `css/app.css` | Visual |
| `index.html` | Estrutura das telas (só HTML) |
| `supabase/migrations/` | Schema PostgreSQL (Supabase) |
| `docs/SUPABASE.md` | Como criar o banco no Supabase |

## Banco Supabase

Pontos, perfis e equipamento podem ficar no Supabase. Passo a passo: **`docs/SUPABASE.md`**.

## Fluxo do app

1. Abre → toque em **Ligar radar de pontos**
2. Permite GPS (ou escolhe região manual)
3. Radar consulta clima de cada ponto próximo
4. Abre card com melhor ponto → **Checklist** (marca o que vê) ou **Ir agora**
5. Toque no **⚙** → **Meu perfil** ou **Material de pesca**

## Publicar

Cada push em `main` publica no GitHub Pages. O app detecta versão nova sozinho (`version.json` + `boot-cache.js`).

## Local

Abra `index.html` via servidor local (módulos ES não rodam em `file://`):

```bash
npx serve .
```
