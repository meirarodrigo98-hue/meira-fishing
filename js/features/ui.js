import { $, fmtKm, km, mapsUrl, toast } from '../lib/utils.js';
import { state, setFilter, setNavigating, setSelected } from '../lib/state.js';
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
import { collapseSheet, expandFull, openSheet, snapTo } from './sheet.js';

/** Lista, detalhe na faixa e navegação — mobile first. */
let onRefresh = null;
let pointsRef = [];
let detailOpen = false;

export function bindUi({ onRelocate }) {
  onRefresh = () => renderList(pointsRef);

  $('filters').querySelectorAll('[data-filter]').forEach((btn) => {
    btn.onclick = () => {
      setFilter(btn.dataset.filter);
      $('filters').querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === btn));
      renderList(pointsRef);
    };
  });

  $('openPoints').onclick = () => {
    openSheet();
    $('openPoints').classList.add('hidden');
    renderList(pointsRef);
  };

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
    if (!state.navigating) $('openPoints').classList.remove('hidden');
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
  $('openPoints').classList.add('hidden');
}

export function showFallback() {
  $('boot').classList.add('hidden');
  $('fallback').classList.remove('hidden');
  $('openPoints').classList.add('hidden');
}

export function hideOverlays() {
  $('boot').classList.add('hidden');
  $('fallback').classList.add('hidden');
  invalidateMapSize();
}

export function ready(label) {
  hideOverlays();
  $('statusLine').textContent = label;
  $('openPoints').classList.remove('hidden');
  if (onRefresh) onRefresh();
}

export function openPoint(point) {
  openSheet();
  setSelected(point);
  detailOpen = true;
  refreshDetail(point);
  $('sheetList').classList.add('hide');
  $('sheetDetail').classList.add('show');
  $('sheetFooter').classList.add('show');
  $('openPoints').classList.add('hidden');
  snapTo('mid');
  flyToPoint(point);
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
  $('dWhy').textContent = v.why;
}

export function closeDetail() {
  resetDetailView();
  $('openPoints').classList.add('hidden');
  snapTo('mini');
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
  } else {
    toast('Ative a localização para ver a rota.');
  }

  resetDetailView();
  collapseSheet();
  $('openPoints').classList.add('hidden');
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
  $('openPoints').classList.remove('hidden');
}

function bindPointActions(container, points) {
  container.querySelectorAll('[data-id]').forEach((btn) => {
    btn.onclick = () => openPoint(points.find((p) => p.id === btn.dataset.id));
  });
  container.querySelectorAll('[data-go]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      goNowFromPoint(points.find((p) => p.id === btn.dataset.go));
    };
  });
  const seeMore = container.querySelector('[data-see-more]');
  if (seeMore) seeMore.onclick = () => expandFull();
}

export function renderList(points) {
  const rows = rankPoints(points, state.userPos, state.filter, state.weather);
  const top = rows.slice(0, 10);

  $('listSub').textContent = state.userPos
    ? `${top.length} pontos perto de você`
    : 'Escolha um bairro para medir distância';

  setBestPointId(top[0]?.p?.id ?? null);

  if (!top.length) {
    $('list').innerHTML = '<div class="empty">Nenhum ponto neste filtro.</div>';
    renderMarkers(points);
    return;
  }

  const hero = top[0];
  const compact = top.slice(1, 4);
  const rest = top.slice(4);

  let html = `
    <button class="hero" type="button" data-id="${hero.p.id}">
      <span class="hero-label">Melhor agora</span>
      <b>${hero.p.name}</b>
      <span class="hero-meta">${hero.distance == null ? '—' : fmtKm(hero.distance)} · ${hero.p.species.slice(0, 2).join(' / ')}</span>
      <div class="hero-row">
        <span class="verdict ${hero.v.key}">${hero.v.label}</span>
        <button class="hero-go" type="button" data-go="${hero.p.id}">Ir agora</button>
      </div>
    </button>`;

  html += compact
    .map(
      ({ p, distance, v }) => `
    <button class="card" type="button" data-id="${p.id}">
      <div><b>${p.name}</b><small>${distance == null ? '—' : fmtKm(distance)} · ${p.species[0] || '—'}</small></div>
      <span class="verdict ${v.key}">${v.label}</span>
    </button>`,
    )
    .join('');

  if (rest.length) {
    html += rest
      .map(
        ({ p, distance, v }) => `
      <button class="card sheet-more" type="button" data-id="${p.id}">
        <div><b>${p.name}</b><small>${distance == null ? '—' : fmtKm(distance)}</small></div>
        <span class="verdict ${v.key}">${v.label}</span>
      </button>`,
      )
      .join('');
    html += `<button class="see-more" type="button" data-see-more>Ver todos (${top.length})</button>`;
  }

  $('list').innerHTML = html;
  bindPointActions($('list'), points);
  renderMarkers(points);

  if (detailOpen && state.selected) refreshDetail(state.selected);
}

export function onUserMoved() {
  if (onRefresh) onRefresh();
  if (state.navigating && state.selected && state.userPos) {
    updateRoute(state.userPos, state.selected);
    $('navMeta').textContent = `${fmtKm(km(state.userPos, state.selected))} · rota no mapa`;
  }
}
