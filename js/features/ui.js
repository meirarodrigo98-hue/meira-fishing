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
import { collapseSheet, openSheet } from './sheet.js';

/** Painel de pontos — um card, setas grandes, zero arraste. */
let onRefresh = null;
let pointsRef = [];
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
  $('weatherNote')?.classList.toggle('hidden', !state.weatherEstimated);
}

function showFab() {
  $('openPoints')?.classList.remove('hidden');
}

function hideFab() {
  $('openPoints')?.classList.add('hidden');
}

function openPanel() {
  revealPoints();
  openSheet();
  renderList(pointsRef);
  hideFab();
}

function closePanel() {
  collapseSheet();
  hidePoints();
  showFab();
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

  $('openPoints').onclick = openPanel;
  $('closePanel').onclick = closePanel;
  $('pointPrev').onclick = () => stepPoint(-1);
  $('pointNext').onclick = () => stepPoint(1);
  $('cardGo').onclick = () => {
    const row = carouselRows[carouselIndex];
    if (row) goNowFromPoint(row.p);
  };
  $('relocate').onclick = onRelocate;
  $('retryGps').onclick = onRelocate;
  $('stopNav').onclick = stopNav;

  return { showBoot, showFallback, hideOverlays, ready, renderList: () => renderList(pointsRef) };
}

export function onSheetSnap(name) {
  if (name === 'hidden') {
    hidePoints();
    if (!state.navigating) showFab();
  }
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
  updateWeatherNote();
  if (onRefresh) onRefresh();
}

export function openPoint(point) {
  setSelected(point);
  lastCarouselId = point.id;
  if (!carouselRows.length) renderList(pointsRef);
  openPanel();
  showPointAt(indexForPointId(point.id), { fly: true });
}

function updateCard(row, index) {
  const { p, distance, v } = row;
  $('cardRank').textContent = index === 0 ? 'Melhor agora' : `#${index + 1}`;
  $('cardName').textContent = p.name;
  $('cardMeta').textContent = `${distance == null ? '—' : fmtKm(distance)} · ${p.species.slice(0, 2).join(' / ')}`;
  $('cardVerdict').textContent = v.label;
  $('cardVerdict').className = `verdict ${v.key}`;
  const why = state.weatherEstimated ? `${v.why} (estimado)` : v.why;
  $('cardWhy').textContent = why;
  $('panelCard').classList.toggle('is-best', index === 0);
  $('cardGo').disabled = false;
}

function updatePointNav() {
  const total = carouselRows.length;
  const nav = $('pointsNav');
  const card = $('panelCard');

  if (!total) {
    nav?.classList.add('hidden');
    $('cardName').textContent = 'Nenhum ponto';
    $('cardMeta').textContent = 'Tente outro filtro';
    $('cardWhy').textContent = '';
    $('cardVerdict').textContent = '—';
    $('cardVerdict').className = 'verdict lendo';
    $('cardGo').disabled = true;
    $('pointCounter').textContent = '—';
    return;
  }

  nav?.classList.remove('hidden');
  card?.classList.remove('hidden');
  $('pointCounter').textContent = `${carouselIndex + 1} / ${total}`;
  $('pointPrev').disabled = carouselIndex <= 0;
  $('pointNext').disabled = carouselIndex >= total - 1;
}

function showPointAt(index, { fly = true } = {}) {
  if (!carouselRows.length) return;

  carouselIndex = Math.max(0, Math.min(carouselRows.length - 1, index));
  const row = carouselRows[carouselIndex];
  lastCarouselId = row.p.id;
  setSelected(row.p);

  updateCard(row, carouselIndex);
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
    ? `${total} ponto${total !== 1 ? 's' : ''} perto de você`
    : 'Escolha um bairro para continuar';
  updateWeatherNote();

  if (!total) {
    carouselIndex = 0;
    updatePointNav();
    setBestPointId(null);
    renderMarkers(points);
    return;
  }

  const preserveId =
    lastCarouselId && carouselRows.some((r) => r.p.id === lastCarouselId)
      ? lastCarouselId
      : carouselRows[0]?.p?.id;

  const panelOpen = $('sheet')?.classList.contains('open');
  showPointAt(indexForPointId(preserveId), { fly: panelOpen });
}

function goNowFromPoint(point) {
  if (!point) return;
  setSelected(point);

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

  closePanel();
  window.open(mapsUrl(point), '_blank', 'noopener');
}

function stopNav() {
  clearRoute();
  $('navStrip').classList.remove('show');
  setNavigating(false);
  recenterUser();
  hidePoints();
  showFab();
}

export function onUserMoved() {
  if (onRefresh) onRefresh();
  if (state.navigating && state.selected && state.userPos) {
    updateRoute(state.userPos, state.selected);
    $('navMeta').textContent = `${fmtKm(km(state.userPos, state.selected))} · rota no mapa`;
  }
}
