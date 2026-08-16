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

/** Card de pontos estilo mapa nativo — abrir, navegar, ir. */
let onRefresh = null;
let pointsRef = [];
let rows = [];
let index = 0;
let lastId = null;

const els = () => ({
  body: document.body,
  card: $('spotsCard'),
  dim: $('mapDim'),
  entry: $('spotsEntry'),
  entryBtn: $('openPoints'),
});

function isOpen() {
  return els().body.classList.contains('spots-open');
}

function openSpots() {
  setPointsRevealed(true);
  els().body.classList.add('spots-open');
  els().card?.setAttribute('aria-hidden', 'false');
  els().dim?.classList.add('show');
  els().entry?.classList.add('hidden');
  invalidateMapSize();
  if (rows.length) showAt(index, { fly: true });
  else renderList(pointsRef);
}

function closeSpots() {
  if (state.navigating) return;
  setPointsRevealed(false);
  els().body.classList.remove('spots-open');
  els().card?.setAttribute('aria-hidden', 'true');
  els().dim?.classList.remove('show');
  els().entry?.classList.remove('hidden');
  renderMarkers(pointsRef);
  invalidateMapSize();
}

export function bindUi({ onRelocate }) {
  onRefresh = () => renderList(pointsRef);

  $('filters').querySelectorAll('[data-filter]').forEach((btn) => {
    btn.onclick = () => {
      setFilter(btn.dataset.filter);
      $('filters').querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === btn));
      renderList(pointsRef);
    };
  });

  $('openPoints').onclick = openSpots;
  $('mapDim').onclick = closeSpots;
  $('pointPrev').onclick = () => step(-1);
  $('pointNext').onclick = () => step(1);
  $('cardGo').onclick = () => {
    const row = rows[index];
    if (row) goNow(row.p);
  };
  $('relocate').onclick = onRelocate;
  $('retryGps').onclick = onRelocate;
  $('stopNav').onclick = stopNav;

  return { showBoot, showFallback, hideOverlays, ready, renderList: () => renderList(pointsRef) };
}

export function setPoints(points) {
  pointsRef = points;
}

export function renderPlaces(places, onPick) {
  $('places').innerHTML = places.map((p) => `<button type="button" data-place="${p.name}">${p.name}</button>`).join('');
  $('places').querySelectorAll('[data-place]').forEach((btn) => {
    btn.onclick = () => onPick(places.find((x) => x.name === btn.dataset.place));
  });
}

function setEntryVisible(show) {
  els().entry?.classList.toggle('hidden', !show);
}

export function showBoot() {
  $('boot').classList.remove('hidden');
  $('fallback').classList.add('hidden');
  $('statusLine').textContent = 'Achando você…';
  setEntryVisible(false);
}

export function showBootLight() {
  $('boot').classList.add('hidden');
  $('fallback').classList.add('hidden');
  $('statusLine').textContent = 'Buscando GPS…';
  setEntryVisible(false);
}

export function showFallback() {
  $('boot').classList.add('hidden');
  $('fallback').classList.remove('hidden');
  setEntryVisible(false);
}

export function hideOverlays() {
  $('boot').classList.add('hidden');
  $('fallback').classList.add('hidden');
}

export function ready(label) {
  hideOverlays();
  $('statusLine').textContent = label;
  $('weatherNote')?.classList.toggle('hidden', !state.weatherEstimated);
  setEntryVisible(true);
  if (onRefresh) onRefresh();
}

export function openPoint(point) {
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
  $('cardVerdict').textContent = v.label;
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
    renderMarkers(pointsRef);
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
  renderMarkers(pointsRef);
  if (fly && isOpen()) flyToPoint(row.p);
}

function step(delta) {
  if (!rows.length) return;
  showAt(index + delta, { fly: true });
}

export function renderList(points) {
  rows = rankPoints(points, state.userPos, state.filter, state.weather);
  $('weatherNote')?.classList.toggle('hidden', !state.weatherEstimated);

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
    renderMarkers(pointsRef);
  } else {
    toast('Ative a localização para ver a rota.');
    return;
  }
  closeSpots();
  els().entry?.classList.add('hidden');
  window.open(mapsUrl(point), '_blank', 'noopener');
}

function stopNav() {
  clearRoute();
  $('navStrip').classList.remove('show');
  setNavigating(false);
  recenterUser();
  setPointsRevealed(false);
  renderMarkers(pointsRef);
  setEntryVisible(true);
}

export function onUserMoved() {
  if (onRefresh) onRefresh();
  if (state.navigating && state.selected && state.userPos) {
    updateRoute(state.userPos, state.selected);
    $('navMeta').textContent = `${fmtKm(km(state.userPos, state.selected))} · rota no mapa`;
  }
}

// compat — app.js antigo
export function onSheetSnap() {}
export function initSheet() {}
