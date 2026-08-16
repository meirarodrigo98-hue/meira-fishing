# Meira Fishing

App de pescaria — GPS automático, pontos próximos e veredito **Ir agora / Esperar / Evitar**.

Site: https://meirarodrigo98-hue.github.io/meira-fishing/

## Estrutura (edite onde precisar)

| Arquivo | O que muda |
|---------|------------|
| `js/data/points.js` | Pontos de pesca (nome, lat/lng, espécie, tipo) |
| `js/data/places.js` | Bairros do fallback sem GPS |
| `js/lib/scoring.js` | Regras de **Ir agora / Esperar / Evitar** |
| `js/lib/weather.js` | API de clima e mar |
| `js/features/map.js` | Mapa, marcadores e rota |
| `js/features/sheet.js` | Faixa arrastável (mini/meio/cheio) |
| `js/features/ui.js` | Lista, card destaque, detalhe na faixa |
| `js/features/location.js` | GPS e fallback |
| `css/app.css` | Visual |
| `index.html` | Estrutura das telas (só HTML) |

## Fluxo do app

1. Abre → pede GPS
2. Mostra mapa + lista dos pontos perto
3. Toque no card → detalhe → **Ir agora**

## Publicar

Cada push em `main` publica no GitHub Pages. O cliente só atualiza a página (F5).

## Local

Abra `index.html` via servidor local (módulos ES não rodam em `file://`):

```bash
npx serve .
```
