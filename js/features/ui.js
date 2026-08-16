import { $, fmtKm, km, mapsUrl, toast } from '../lib/utils.js';
import { state, setFilter, setNavigating, setPointsRevealed, setSelected } from '../lib/state.js';
import { rankPoints, verdict } from '../lib/scoring.js';
import {
  clearRoute,
  drawRoute,
  flyToPoint,
  invalidateMapSize,
  recenterUser,
  renderMarkers,
  setBestPointId,
  updateRoute,
} from './map.js';
import { collapseSheet, openSheet, snapTo } from './sheet.js';

/** Lista, detalhe na faixa e navegação — mobile first. */
let onRefresh = null;
let pointsRef = [];
let detailOpen = false;
let carouselRows = [];
let carouselIndex = 0;
let lastCarouselId = null;

function revealPoints() {
  setPointsRevealed(true);
}

function hidePoints() {
  if (state.navigating) return;
  setPointsRevealed(false);
  renderMarkers(pointsRef);
}

function updateWeatherNote() {
  const el = $('weatherNote');
  if (!el) return;
  el.classList.toggle('hidden', !state.weatherEstimated);
}

function showFab() {
  $('openPoints')?.classList.remove('hidden');
}

function hideFab() {
  const fab = $('openPoints');
  if (!fab) return;
  fab.classList.add('hidden');
  fab.classList.remove('is-open');
  fab.setAttribute('aria-label', 'Pontos próximos');
}

function setFabOpen(open) {
  const fab = $('openPoints');
  if (!fab) return;
  fab.classList.toggle('is-open', open);
  fab.setAttribute('aria-label', open ? 'Fechar pontos' : 'Pontos próximos');
}

function togglePointsSheet() {
  const fab = $('openPoints');
  if (!fab || fab.classList.contains('hidden')) return;

  if (fab.classList.contains('is-open')) {
    resetDetailView();
    collapseSheet();
    hidePoints();
    setFabOpen(false);
    return;
  }

  revealPoints();
  openSheet();
  renderList(pointsRef);
  setFabOpen(true);
}

export function bindUi({ onRelocate }) {
  onRefresh = () => renderList(pointsRef);

  $('filters').querySelectorAll('[data-filter]').forEach((btn) => {
    btn.onclick = () => {
      setFilter(btn.dataset.filter);
      $('filters').querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === btn));
      renderList(pointsRef);
    };
  });

  $('openPoints').onclick = togglePointsSheet;

  $('pointPrev').onclick = () => stepPoint(-1);
  $('pointNext').onclick = () => stepPoint(1);

  $('relocate').onclick = onRelocate;
  $('retryGps').onclick = onRelocate;
  $('closeDetail').onclick = closeDetail;
  $('goNow').onclick = goNow;
  $('stopNav').onclick = stopNav;

  return { showBoot, showFallback, hideOverlays, ready, renderList: () => renderList(pointsRef) };
}

export function onSheetSnap(name) {
  if (name === 'hidden') {
    resetDetailView();
    hidePoints();
    if (!state.navigating) {
      showFab();
      setFabOpen(false);
    }
    return;
  }

  if (!state.navigating && !detailOpen) {
    revealPoints();
    showFab();
    setFabOpen(true);
    if (onRefresh) onRefresh();
  }
}

function resetDetailView() {
  detailOpen = false;
  $('sheetDetail').classList.remove('show');
  $('sheetList').classList.remove('hide');
  $('sheetFooter').classList.remove('show');
}

export function setPoints(points) {
  pointsRef = points;
}

export function renderPlaces(places, onPick) {
  $('places').innerHTML = places
    .map((p) => `<button type="button" data-place="${p.name}">${p.name}</button>`)
    .join('');
  $('places').querySelectorAll('[data-place]').forEach((btn) => {
    btn.onclick = () => onPick(places.find((x) => x.name === btn.dataset.place));
  });
}

export function showBoot() {
  $('boot').classList.remove('hidden');
  $('fallback').classList.add('hidden');
  $('statusLine').textContent = 'Achando você…';
  hideFab();
}

export function showBootLight() {
  $('boot').classList.add('hidden');
  $('fallback').classList.add('hidden');
  $('statusLine').textContent = 'Buscando GPS…';
  hideFab();
}

export function showFallback() {
  $('boot').classList.add('hidden');
  $('fallback').classList.remove('hidden');
  hideFab();
}

export function hideOverlays() {
  $('boot').classList.add('hidden');
  $('fallback').classList.add('hidden');
  invalidateMapSize();
}

export function ready(label) {
  hideOverlays();
  $('statusLine').textContent = label;
  showFab();
  setFabOpen(false);
  updateWeatherNote();
  if (onRefresh) onRefresh();
}

export function openPoint(point) {
  revealPoints();
  openSheet();
  setSelected(point);
  lastCarouselId = point.id;
  if (carouselRows.length) carouselIndex = indexForPointId(point.id);
  detailOpen = true;
  refreshDetail(point);
  $('sheetList').classList.add('hide');
  $('sheetDetail').classList.add('show');
  $('sheetFooter').classList.add('show');
  hideFab();
  snapTo('mid');
  flyToPoint(point);
  renderMarkers(pointsRef);
}

function refreshDetail(point = state.selected) {
  if (!point) return;
  const distance = state.userPos ? km(state.userPos, point) : null;
  const v = verdict(point, state.weather);
  const type = point.mode === 'boat' ? 'Embarcado' : point.type;
  $('dName').textContent = point.name;
  $('dLine').textContent = [
    distance == null ? null : fmtKm(distance),
    point.species.slice(0, 2).join(' / '),
    v.label,
    type,
  ]
    .filter(Boolean)
    .join(' · ');
  const why = v.why;
  $('dWhy').textContent = state.weatherEstimated ? `${why} Condições estimadas.` : why;
}

export function closeDetail() {
  resetDetailView();
  showFab();
  setFabOpen(true);
  snapTo('mini');
  if (state.selected) showPointAt(indexForPointId(state.selected.id), { fly: false });
}

function goNowFromPoint(point) {
  if (!point) return;
  setSelected(point);
  revealPoints();

  if (state.userPos) {
    drawRoute(state.userPos, point);
    $('navTitle').textContent = point.name;
    $('navMeta').textContent = `${fmtKm(km(state.userPos, point))} · rota no mapa`;
    $('navStrip').classList.add('show');
    setNavigating(true);
    renderMarkers(pointsRef);
  } else {
    toast('Ative a localização para ver a rota.');
  }

  resetDetailView();
  collapseSheet();
  hideFab();
  window.open(mapsUrl(point), '_blank', 'noopener');
}

function goNow() {
  goNowFromPoint(state.selected);
}

function stopNav() {
  clearRoute();
  $('navStrip').classList.remove('show');
  setNavigating(false);
  recenterUser();
  hidePoints();
  showFab();
  setFabOpen(false);
}

function bindPointActions(container, points) {
  container.querySelectorAll('[data-id]').forEach((el) => {
    el.onclick = () => openPoint(points.find((p) => p.id === el.dataset.id));
  });
  container.querySelectorAll('[data-go]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      goNowFromPoint(points.find((p) => p.id === btn.dataset.go));
    };
  });
}

function updatePointNav() {
  const total = carouselRows.length;
  const nav = $('pointsNav');
  if (!nav) return;

  if (!total) {
    nav.classList.add('hidden');
    return;
  }

  nav.classList.remove('hidden');
  $('pointCounter').textContent = `${carouselIndex + 1} / ${total}`;
  $('pointPrev').disabled = carouselIndex <= 0;
  $('pointNext').disabled = carouselIndex >= total - 1;
}

function renderPointCard({ p, distance, v }, index) {
  const rank = index === 0 ? 'Melhor agora' : `#${index + 1}`;
  const bestClass = index === 0 ? ' is-best' : '';
  return `
    <article class="point-card" data-id="${p.id}">
      <div class="slide-inner${bestClass}" role="button" tabindex="0" data-id="${p.id}">
        <span class="slide-rank">${rank}</span>
        <b class="slide-name">${p.name}</b>
        <span class="slide-meta">${distance == null ? '—' : fmtKm(distance)} · ${p.species.slice(0, 2).join(' / ')}</span>
        <div class="slide-row">
          <span class="verdict ${v.key}">${v.label}</span>
          <button class="slide-go" type="button" data-go="${p.id}">Ir agora</button>
        </div>
      </div>
    </article>`;
}

function showPointAt(index, { fly = true } = {}) {
  if (!carouselRows.length) return;

  carouselIndex = Math.max(0, Math.min(carouselRows.length - 1, index));
  const row = carouselRows[carouselIndex];
  lastCarouselId = row.p.id;

  $('list').innerHTML = renderPointCard(row, carouselIndex);
  bindPointActions($('list'), pointsRef);
  updatePointNav();

  setBestPointId(row.p.id);
  renderMarkers(pointsRef);
  if (fly) flyToPoint(row.p);
}

function stepPoint(delta) {
  if (!carouselRows.length) return;
  showPointAt(carouselIndex + delta, { fly: true });
}

function indexForPointId(id) {
  const i = carouselRows.findIndex((r) => r.p.id === id);
  return i >= 0 ? i : 0;
}

export function renderList(points) {
  carouselRows = rankPoints(points, state.userPos, state.filter, state.weather);
  const total = carouselRows.length;

  $('listSub').textContent = state.userPos
    ? `${total} ponto${total !== 1 ? 's' : ''} · use ↑ ↓`
    : 'Escolha um bairro para medir distância';
  updateWeatherNote();

  if (!total) {
    carouselIndex = 0;
    $('list').innerHTML = '<div class="empty">Nenhum ponto neste filtro.</div>';
    updatePointNav();
    setBestPointId(null);
    renderMarkers(points);
    return;
  }

  const preserveId =
    lastCarouselId && carouselRows.some((r) => r.p.id === lastCarouselId)
      ? lastCarouselId
      : carouselRows[0]?.p?.id;

  showPointAt(indexForPointId(preserveId), { fly: !detailOpen });

  if (detailOpen && state.selected) refreshDetail(state.selected);
}

export function onUserMoved() {
  if (onRefresh) onRefresh();
  if (state.navigating && state.selected && state.userPos) {
    updateRoute(state.userPos, state.selected);
    $('navMeta').textContent = `${fmtKm(km(state.userPos, state.selected))} · rota no mapa`;
  }
}
