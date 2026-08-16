import { $, fmtKm, km, mapsUrl, toast, filterNearby } from '../lib/utils.js';
import { getPointWeather, isPointWeatherEstimated, state, setFilter, setNavigating, setSelected } from '../lib/state.js';
import { rankPoints, formatConditions } from '../lib/scoring.js';
import { OBS_GROUPS, emptyObservations, buildLiveStrategy, obsProgress } from '../lib/strategy.js';
import { loadGear, isGearReady, gearSummary } from '../lib/gear.js';
import { initGearUi, loadGearDraft, saveGearDraft as persistGearDraft } from './gear-ui.js';
import { STYLE, LEVEL, loadProfile, saveProfile, profileSummary } from '../lib/profile.js';
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
let onFilterChange = null;
let pointsRef = [];
let rows = [];
let index = 0;
let lastId = null;
let shouldAutoOpen = true;
let checklistObs = emptyObservations();
let checklistPoint = null;
let draftProfile = loadProfile();
let sheetOrigin = null;

export function setRadarProgress(done, total, name) {
  const hint = $('bootLoadingHint');
  if (!hint) return;
  if (name) {
    hint.textContent = `Ponto ${done}/${total} · ${name.split('—')[0].trim()}`;
    return;
  }
  hint.textContent = `Consultando ${done}/${total}…`;
}
let radarSafetyTimer = null;

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
  return rankPoints(points, state.userPos, state.filter, (p) => getPointWeather(p.id));
}

function applyRows(points, { nearby = isRadarOn() } = {}) {
  const all = rankAll(points);
  rows = nearby && state.userPos ? filterNearby(all) : all;
  return rows;
}

function setTopbarVisible(show) {
  $('topbar')?.classList.toggle('is-hidden', !show);
}

function syncChrome() {
  if (!isRadarOn()) return;
  const count = rows.length;
  $('hudCount').textContent = count ? `${count} pontos próximos` : 'Buscando…';
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
  closeChecklist();
  document.body.classList.remove('spots-open');
  els().card?.setAttribute('aria-hidden', 'true');
  els().dim?.classList.remove('show');
  if (isRadarOn()) els().entry?.classList.remove('is-hidden');
  invalidateMapSize();
}

export function bindUi({ onCapture, onRelocate, onFilterChange: onFilter }) {
  onRefresh = () => renderList(pointsRef);
  onFilterChange = onFilter;

  $('captureLocation').onclick = onCapture;

  $('filters').querySelectorAll('[data-filter]').forEach((btn) => {
    btn.onclick = () => {
      setFilter(btn.dataset.filter);
      $('filters').querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === btn));
      renderList(pointsRef);
      onFilterChange?.(rows.map((r) => r.p));
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
  $('cardChecklist').onclick = () => openChecklist();
  $('checklistClose').onclick = closeChecklist;
  $('editGearFromChecklist').onclick = () => showGearEditor({ fromChecklist: true });
  $('gearEditorClose').onclick = () => hideGearEditor();
  $('gearSave').onclick = () => {
    const result = persistGearDraft();
    if (!result.ok) {
      toast(result.message);
      return;
    }
    syncGearBar();
    syncMenuMeta();
    toast('Material salvo.');
    hideGearEditor();
    if (checklistPoint) updateStrategy(checklistPoint);
  };
  initGearUi();
  renderProfileForm();
  syncGearBar();
  syncMenuMeta();
  $('gearBtn').onclick = openOptionsMenu;
  $('optionsMenuClose').onclick = closeAllSheets;
  $('openProfile').onclick = () => showProfileEditor();
  $('openGearFromMenu').onclick = () => showGearEditor({ fromMenu: true });
  $('profileClose').onclick = () => hideProfileEditor();
  $('profileSave').onclick = saveProfileDraft;
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

function clearRadarSafety() {
  if (radarSafetyTimer != null) {
    clearTimeout(radarSafetyTimer);
    radarSafetyTimer = null;
  }
}

function stopLoadingHints() {
  clearRadarSafety();
}

export function showSearching() {
  stopLoadingHints();
  hideAwaitingPermission();
  $('radarScan')?.classList.remove('is-hidden');
  setRadarDockVisible(false);
  setTopbarVisible(false);
  $('recover')?.classList.add('is-hidden');
  setEntryVisible(false);

  const hint = $('bootLoadingHint');
  if (hint) hint.textContent = 'Consultando clima de cada ponto…';

  clearRadarSafety();
  radarSafetyTimer = setTimeout(() => {
    if (!$('radarScan')?.classList.contains('is-hidden')) {
      toast('Radar demorou — tentando concluir…');
    }
  }, 20000);
}

export function hideAwaitingPermission() {
  $('permWait')?.classList.add('is-hidden');
}

export function showAwaitingPermission() {
  stopLoadingHints();
  $('permWait')?.classList.remove('is-hidden');
  setRadarDockVisible(false);
  setTopbarVisible(false);
  $('recover')?.classList.add('is-hidden');
  $('radarScan')?.classList.add('is-hidden');
  setEntryVisible(false);
}

export function showPermissionDenied() {
  stopLoadingHints();
  hideAwaitingPermission();
  setTopbarVisible(false);
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
  setTopbarVisible(false);
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
  setTopbarVisible(true);
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
  const wx = getPointWeather(p.id);
  const est = isPointWeatherEstimated(p.id);

  $('cardRank').textContent = i === 0 ? 'Melhor agora' : `Ponto ${i + 1}`;
  $('cardName').textContent = p.name;
  $('cardMeta').textContent = `${distance == null ? '—' : fmtKm(distance)} · ${p.species.slice(0, 2).join(', ')}`;
  $('cardConditions').textContent = formatConditions(wx) || 'Consultando condições…';
  $('cardVerdict').textContent = v.key === 'ir' ? 'Vale ir' : v.label;
  $('cardVerdict').className = `pill ${v.key}`;
  $('cardWhy').textContent = est ? `${v.why} (estimado)` : v.why;
  $('spotsBody').classList.toggle('is-best', i === 0);
  $('cardGo').disabled = false;
  $('cardChecklist').disabled = false;
}

function paintEmpty() {
  $('cardRank').textContent = '—';
  $('cardName').textContent = 'Nenhum ponto';
  $('cardMeta').textContent = 'Mude o filtro acima';
  $('cardConditions').textContent = '';
  $('cardVerdict').textContent = '—';
  $('cardVerdict').className = 'pill lendo';
  $('cardWhy').textContent = '';
  $('cardGo').disabled = true;
  $('cardChecklist').disabled = true;
  $('pointCounter').textContent = '—';
  $('pointPrev').disabled = true;
  $('pointNext').disabled = true;
}

function showAt(i, { fly = true } = {}) {
  closeChecklist();
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

function closeChecklist() {
  const panel = $('checklistPanel');
  panel?.classList.remove('show');
  panel?.setAttribute('aria-hidden', 'true');
  if (sheetOrigin === 'checklist') closeAllSheets();
  else {
    hideGearEditor();
    $('checklistObserve')?.classList.remove('is-hidden');
  }
}

function showSheet(id) {
  const el = $(id);
  if (!el) return;
  el.setAttribute('aria-hidden', 'false');
  el.classList.remove('show');
  requestAnimationFrame(() => el.classList.add('show'));
}

function hideSheet(id) {
  const el = $(id);
  el?.classList.remove('show');
  el?.setAttribute('aria-hidden', 'true');
}

function closeAllSheets() {
  hideSheet('optionsMenu');
  hideSheet('profilePanel');
  hideSheet('gearPanel');
  sheetOrigin = null;
  $('checklistObserve')?.classList.remove('is-hidden');
}

function openOptionsMenu() {
  sheetOrigin = 'menu';
  syncMenuMeta();
  showSheet('optionsMenu');
}

function syncMenuMeta() {
  const profile = loadProfile();
  const gear = loadGear();
  $('menuProfileMeta').textContent = profileSummary(profile);
  $('menuGearMeta').textContent = isGearReady(gear) ? gearSummary(gear) : 'Cadastre vara, linha e iscas';
}

function showProfileEditor() {
  draftProfile = loadProfile();
  renderProfileForm();
  hideSheet('optionsMenu');
  showSheet('profilePanel');
}

function hideProfileEditor() {
  hideSheet('profilePanel');
  if (sheetOrigin === 'menu') showSheet('optionsMenu');
  else sheetOrigin = null;
}

function renderProfileForm() {
  $('profileName').value = draftProfile.name || '';

  const renderChips = (rootId, group, key, options) => {
    const root = $(rootId);
    if (!root) return;
    root.innerHTML = options
      .map((opt) => {
        const on = draftProfile[key] === opt.id;
        return `<button type="button" class="gear-chip${on ? ' on' : ''}" data-profile-key="${key}" data-profile-id="${opt.id}">${opt.label}</button>`;
      })
      .join('');
    root.querySelectorAll('[data-profile-key]').forEach((chip) => {
      chip.onclick = () => {
        draftProfile[chip.dataset.profileKey] = chip.dataset.profileId;
        renderProfileForm();
      };
    });
  };

  renderChips('profileStyle', 'style', 'style', STYLE);
  renderChips('profileLevel', 'level', 'level', LEVEL);
}

function saveProfileDraft() {
  draftProfile.name = $('profileName').value.trim();
  if (!draftProfile.name) {
    toast('Digite seu nome.');
    return;
  }
  saveProfile(draftProfile);
  syncMenuMeta();
  toast('Perfil salvo.');
  hideProfileEditor();
}

function showGearEditor({ fromChecklist = false, fromMenu = false } = {}) {
  if (fromChecklist) sheetOrigin = 'checklist';
  else if (fromMenu) sheetOrigin = 'menu';

  loadGearDraft();
  if (fromChecklist) $('checklistObserve')?.classList.add('is-hidden');

  hideSheet('optionsMenu');
  showSheet('gearPanel');

  if (fromChecklist) {
    const checklist = $('checklistPanel');
    if (!checklist?.classList.contains('show')) {
      checklist?.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => checklist?.classList.add('show'));
    }
  }
}

function hideGearEditor() {
  hideSheet('gearPanel');

  if (sheetOrigin === 'menu') {
    syncMenuMeta();
    showSheet('optionsMenu');
    return;
  }
  if (sheetOrigin === 'checklist') {
    $('checklistObserve')?.classList.remove('is-hidden');
    sheetOrigin = null;
    return;
  }
  sheetOrigin = null;
}

function syncGearBar() {
  const gear = loadGear();
  const bar = $('gearBar');
  const text = $('gearBarText');
  if (!text || !bar) return;
  text.textContent = gearSummary(gear);
  bar.classList.toggle('missing', !isGearReady(gear));
}

function renderObsGroups() {
  const root = $('obsGroups');
  if (!root) return;

  root.innerHTML = OBS_GROUPS.map((group) => {
    const chips = group.options
      .map((opt) => {
        const on = checklistObs[group.id] === opt.id;
        return `<button type="button" class="obs-chip${on ? ' on' : ''}" data-obs-group="${group.id}" data-obs-id="${opt.id}">${opt.label}</button>`;
      })
      .join('');
    return `<div class="obs-group"><p class="obs-group-label">${group.label}</p><div class="obs-options">${chips}</div></div>`;
  }).join('');

  root.querySelectorAll('[data-obs-group]').forEach((chip) => {
    chip.onclick = () => {
      const group = chip.dataset.obsGroup;
      const id = chip.dataset.obsId;
      checklistObs[group] = checklistObs[group] === id ? null : id;
      renderObsGroups();
      if (checklistPoint) updateStrategy(checklistPoint);
    };
  });
}

function updateStrategy(point) {
  const gear = loadGear();
  const box = $('strategyBox');
  const headline = $('strategyHeadline');
  const detail = $('strategyDetail');
  const steps = $('strategySteps');
  const warns = $('strategyWarns');
  const progress = obsProgress(checklistObs);

  if (!isGearReady(gear)) {
    box?.classList.add('pending');
    headline.textContent = 'Cadastre seu material primeiro';
    detail.textContent = 'A estratégia usa o que você tem na mochila.';
    steps.innerHTML = '';
    warns.innerHTML = '';
    return;
  }

  if (progress.done < progress.total) {
    box?.classList.add('pending');
    headline.textContent = `Marque o local (${progress.done}/${progress.total})`;
    detail.textContent = 'Toque nas opções de acordo com o que você vê agora.';
    steps.innerHTML = '';
    warns.innerHTML = '';
    return;
  }

  const plan = buildLiveStrategy(point, gear, checklistObs);
  box?.classList.toggle('pending', !plan.ready);

  headline.textContent = plan.headline;
  detail.textContent = plan.detail;

  const rows = [];
  if (plan.bait) rows.push(`<li><b>Isca:</b> ${plan.bait.label} — ${plan.bait.why}</li>`);
  if (plan.setup) rows.push(`<li><b>Montagem:</b> ${plan.setup}</li>`);
  if (plan.technique) rows.push(`<li><b>Técnica:</b> ${plan.technique}</li>`);
  if (plan.position) rows.push(`<li><b>Posição:</b> ${plan.position}</li>`);
  steps.innerHTML = rows.join('');
  warns.innerHTML = plan.warnings.map((w) => `<li>${w}</li>`).join('');
}

function openChecklist() {
  const row = rows[index];
  if (!row) return;

  closeAllSheets();
  checklistPoint = row.p;
  checklistObs = emptyObservations();

  const panel = $('checklistPanel');
  panel?.classList.remove('show');
  panel?.setAttribute('aria-hidden', 'false');
  hideGearEditor();
  requestAnimationFrame(() => panel?.classList.add('show'));

  $('checklistTitle').textContent = row.p.name;
  syncGearBar();
  renderObsGroups();
  updateStrategy(row.p);
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

let moveTimer = null;

export function onUserMoved() {
  clearTimeout(moveTimer);
  moveTimer = setTimeout(() => {
    if (onRefresh) onRefresh();
    if (state.navigating && state.selected && state.userPos) {
      updateRoute(state.userPos, state.selected);
      $('navMeta').textContent = `${fmtKm(km(state.userPos, state.selected))} · rota no mapa`;
    }
  }, 800);
}

// compat
export function onSheetSnap() {}
export function initSheet() {}
