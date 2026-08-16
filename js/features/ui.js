import { $, fmtKm, km, mapsUrl, toast, filterNearby } from '../lib/utils.js';
import { state, setFilter, setNavigating, setSelected } from '../lib/state.js';
import { rankPoints, verdict } from '../lib/scoring.js';
import {
  clearRoute,
  drawRoute,
  flyToPoint,
  fitNearby,
  invalidateMapSize,
  recenterUser,
  renderMarkers,
  setBestPointId,
  updateRoute,
  onMapBackgroundClick,
} from './map.js';

/** Card de pontos estilo mapa nativo — abrir, navegar, ir. */
let onRefresh = null;
let pointsRef = [];
let rows = [];
let index = 0;
let lastId = null;
let shouldAutoOpen = true;

const LOADING_HINTS = [
  'Ligando radar…',
  'Capturando sua posição…',
  'Escaneando pontos próximos…',
  'Calculando o melhor agora…',
];
let loadingTimer = null;

const els = () => ({
  body: document.body,
  card: $('spotsCard'),
  dim: $('mapDim'),
  entry: $('spotsEntry'),
});

function isRadarOn() {
  return document.body.classList.contains('app-ready');
}

function isOpen() {
  return document.body.classList.contains('spots-open');
}

function rankAll(points) {
  return rankPoints(points, state.userPos, state.filter, state.weather);
}

function applyRows(points, { nearby = isRadarOn() } = {}) {
  const all = rankAll(points);
  rows = nearby && state.userPos ? filterNearby(all) : all;
  return rows;
}

function syncChrome() {
  if (!isRadarOn()) return;
  const count = rows.length;
  $('statusLine').textContent = count ? `${count} pontos no radar` : 'Radar ligado';
  $('openPointsLabel').textContent = count ? `${count} pontos próximos` : 'Ver pontos próximos';
  $('weatherNote')?.classList.toggle('is-hidden', !state.weatherEstimated);
}

function openSpots() {
  if (!isRadarOn()) {
    toast('Ligue o radar para ver os pontos.');
    return;
  }
  document.body.classList.add('spots-open');
  els().card?.setAttribute('aria-hidden', 'false');
  els().dim?.classList.add('show');
  els().entry?.classList.add('is-hidden');
  invalidateMapSize();
  if (rows.length) showAt(index, { fly: true });
  else renderList(pointsRef);
}

function closeSpots() {
  if (state.navigating) return;
  document.body.classList.remove('spots-open');
  els().card?.setAttribute('aria-hidden', 'true');
  els().dim?.classList.remove('show');
  if (isRadarOn()) els().entry?.classList.remove('is-hidden');
  invalidateMapSize();
}

export function bindUi({ onCapture, onRelocate }) {
  onRefresh = () => renderList(pointsRef);

  $('captureLocation').onclick = onCapture;

  $('filters').querySelectorAll('[data-filter]').forEach((btn) => {
    btn.onclick = () => {
      setFilter(btn.dataset.filter);
      $('filters').querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === btn));
      renderList(pointsRef);
    };
  });

  $('openPoints').onclick = openSpots;
  $('mapDim').onclick = closeSpots;
  onMapBackgroundClick(() => {
    if (isOpen()) closeSpots();
  });
  $('pointPrev').onclick = () => step(-1);
  $('pointNext').onclick = () => step(1);
  $('cardGo').onclick = () => {
    const row = rows[index];
    if (row) goNow(row.p);
  };
  $('relocate').onclick = onRelocate;
  $('retryGps').onclick = onRelocate;
  $('stopNav').onclick = stopNav;
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

function setEntryVisible(show) {
  els().entry?.classList.toggle('is-hidden', !show);
}

function setRadarDockVisible(show) {
  $('radarDock')?.classList.toggle('is-hidden', !show);
}

function stopLoadingHints() {
  if (loadingTimer != null) {
    clearInterval(loadingTimer);
    loadingTimer = null;
  }
}

export function showAwaitingPermission() {
  $('permWait')?.classList.remove('is-hidden');
  setRadarDockVisible(false);
  $('recover')?.classList.add('is-hidden');
  $('radarScan')?.classList.add('is-hidden');
  $('statusLine').textContent = 'Aguardando permissão…';
  setEntryVisible(false);
}

export function hideAwaitingPermission() {
  $('permWait')?.classList.add('is-hidden');
}

export function showSearching() {
  stopLoadingHints();
  hideAwaitingPermission();
  $('radarScan')?.classList.remove('is-hidden');
  setRadarDockVisible(false);
  $('recover')?.classList.add('is-hidden');
  $('statusLine').textContent = 'Radar ativo…';
  setEntryVisible(false);

  let i = 0;
  const hint = $('bootLoadingHint');
  if (hint) hint.textContent = LOADING_HINTS[0];
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_HINTS.length;
    if (hint) hint.textContent = LOADING_HINTS[i];
  }, 1600);
}

export function showPermissionDenied() {
  stopLoadingHints();
  hideAwaitingPermission();
  $('radarScan')?.classList.add('is-hidden');
  setRadarDockVisible(false);
  $('recover')?.classList.remove('is-hidden');
  $('recoverDenied')?.classList.remove('is-hidden');
  $('recoverGps')?.classList.add('is-hidden');
  setEntryVisible(false);
}

export function showRecover(reason = 'unknown') {
  stopLoadingHints();
  hideAwaitingPermission();
  $('radarScan')?.classList.add('is-hidden');
  setRadarDockVisible(false);
  $('recover')?.classList.remove('is-hidden');
  $('recoverDenied')?.classList.add('is-hidden');
  $('recoverGps')?.classList.remove('is-hidden');

  const hints = {
    timeout: 'Demorou demais — escolha sua região ou tente de novo.',
    unavailable: 'Não achamos sinal de GPS — escolha sua região.',
    insecure: 'Localização só funciona em HTTPS.',
    unsupported: 'Seu navegador não suporta GPS.',
  };
  const el = $('recoverHint');
  if (el) el.textContent = hints[reason] || 'Escolha sua região para ligar o radar.';
  setEntryVisible(false);
}

export function hideRecover() {
  $('recover')?.classList.add('is-hidden');
  $('recoverDenied')?.classList.add('is-hidden');
  $('recoverGps')?.classList.add('is-hidden');
}

export function hideOverlays() {
  stopLoadingHints();
  hideAwaitingPermission();
  hideRecover();
  $('radarScan')?.classList.add('is-hidden');
}

export function ready() {
  hideOverlays();
  document.body.classList.add('app-ready');
  setRadarDockVisible(false);
  syncChrome();
  setEntryVisible(true);

  fitNearby(pointsRef, rows.map((r) => r.p));

  if (shouldAutoOpen) {
    shouldAutoOpen = false;
    requestAnimationFrame(() => openSpots());
  }
}

export function openPoint(point) {
  if (!isRadarOn()) {
    toast('Ligue o radar para ver os pontos.');
    return;
  }
  setSelected(point);
  lastId = point.id;
  if (!rows.length) renderList(pointsRef);
  openSpots();
  showAt(idxOf(point.id), { fly: true });
}

function idxOf(id) {
  const i = rows.findIndex((r) => r.p.id === id);
  return i >= 0 ? i : 0;
}

function paint(row, i) {
  const { p, distance, v } = row;
  $('cardRank').textContent = i === 0 ? 'Melhor agora' : `Ponto ${i + 1}`;
  $('cardName').textContent = p.name;
  $('cardMeta').textContent = `${distance == null ? '—' : fmtKm(distance)} · ${p.species.slice(0, 2).join(', ')}`;
  $('cardVerdict').textContent = v.key === 'ir' ? 'Vale ir' : v.label;
  $('cardVerdict').className = `pill ${v.key}`;
  $('cardWhy').textContent = state.weatherEstimated ? `${v.why} (estimado)` : v.why;
  $('spotsBody').classList.toggle('is-best', i === 0);
  $('cardGo').disabled = false;
}

function paintEmpty() {
  $('cardRank').textContent = '—';
  $('cardName').textContent = 'Nenhum ponto';
  $('cardMeta').textContent = 'Mude o filtro acima';
  $('cardVerdict').textContent = '—';
  $('cardVerdict').className = 'pill lendo';
  $('cardWhy').textContent = '';
  $('cardGo').disabled = true;
  $('pointCounter').textContent = '—';
  $('pointPrev').disabled = true;
  $('pointNext').disabled = true;
}

function showAt(i, { fly = true } = {}) {
  if (!rows.length) {
    paintEmpty();
    setBestPointId(null);
    renderMarkers(pointsRef, []);
    return;
  }

  index = Math.max(0, Math.min(rows.length - 1, i));
  const row = rows[index];
  lastId = row.p.id;
  setSelected(row.p);
  paint(row, index);

  $('pointCounter').textContent = `${index + 1} / ${rows.length}`;
  $('pointPrev').disabled = index <= 0;
  $('pointNext').disabled = index >= rows.length - 1;

  setBestPointId(row.p.id);
  renderMarkers(pointsRef, rows.map((r) => r.p.id));
  if (fly && isOpen()) flyToPoint(row.p);
}

function step(delta) {
  if (!rows.length) return;
  showAt(index + delta, { fly: true });
}

export function renderList(points, opts = {}) {
  applyRows(points, opts);
  syncChrome();

  const preserve = lastId && rows.some((r) => r.p.id === lastId) ? lastId : rows[0]?.p?.id;
  showAt(idxOf(preserve), { fly: isOpen() });
}

function goNow(point) {
  setSelected(point);
  if (state.userPos) {
    drawRoute(state.userPos, point);
    $('navTitle').textContent = point.name;
    $('navMeta').textContent = `${fmtKm(km(state.userPos, point))} · rota no mapa`;
    $('navStrip').classList.add('show');
    setNavigating(true);
    renderMarkers(pointsRef, rows.map((r) => r.p.id));
  } else {
    toast('Ligue o radar para ver a rota.');
    return;
  }
  closeSpots();
  els().entry?.classList.add('is-hidden');
  window.open(mapsUrl(point), '_blank', 'noopener');
}

function stopNav() {
  clearRoute();
  $('navStrip').classList.remove('show');
  setNavigating(false);
  recenterUser();
  renderMarkers(pointsRef, rows.map((r) => r.p.id));
  setEntryVisible(true);
}

export function onUserMoved() {
  if (onRefresh) onRefresh();
  if (state.navigating && state.selected && state.userPos) {
    updateRoute(state.userPos, state.selected);
    $('navMeta').textContent = `${fmtKm(km(state.userPos, state.selected))} · rota no mapa`;
  }
}

// compat
export function onSheetSnap() {}
export function initSheet() {}
