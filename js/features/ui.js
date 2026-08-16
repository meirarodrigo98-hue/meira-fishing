import { $, fmtKm, km, mapsUrl, toast, filterNearby, mapPointIds } from '../lib/utils.js';
import { getPointWeather, isPointWeatherEstimated, state, setFilter, setNavigating, setSelected, setFollowUser } from '../lib/state.js';
import { rankPoints, formatConditions } from '../lib/scoring.js';
import { loadMissingWeather } from '../lib/weather.js';
import { POINTS } from '../data/points.js';
import { addMyPoint, loadMyPoints, mergePoints, myPointsSummary, removeMyPoint, exportMyPointsFile, importMyPointsFromJson, exportAdminPointsSnippet, listSnapshots, restoreSnapshot, isAdmin, enableAdmin } from '../lib/mypoints.js';
import { logout, getSession, sessionLabel } from '../lib/auth.js';
import { OBS_GROUPS, emptyObservations, buildLiveStrategy, obsProgress } from '../lib/strategy.js';
import { loadGear, isGearReady, gearSummary } from '../lib/gear.js';
import { initGearUi, loadGearDraft, saveGearDraft as persistGearDraft } from './gear-ui.js';
import { STYLE, LEVEL, loadProfile, saveProfile, profileSummary } from '../lib/profile.js';
import { coastLabel } from '../lib/coast.js';
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
  syncMapPoints,
  removeMapMarker,
  beginMarkMode,
  endMarkMode,
  getMarkDraftPos,
  setMarkDraftPos,
} from './map.js';
import { capturePrecisePosition } from './location.js';
import {
  getLocationSettingsGuide,
  getLocationPlatform,
  openAndroidLocationSettings,
  openLocationSettings,
} from '../lib/location-settings.js';

let onRelocateRef = null;

function syncLocSettingsButtons() {
  const guide = getLocationSettingsGuide();
  const label = getLocationPlatform().isIOS
    ? 'Como liberar localização'
    : guide.openLabel || 'Como liberar localização';
  ['openLocSettingsRecover', 'openLocSettingsPerm', 'openLocSettingsHud', 'locSettingsOpen'].forEach((id) => {
    const el = $(id);
    if (el) el.textContent = label;
  });
}

function showLocationHelp() {
  const guide = getLocationSettingsGuide();
  $('locSettingsTitle').textContent = guide.title;
  const steps = $('locSettingsSteps');
  if (steps) steps.innerHTML = guide.steps.map((s) => `<li>${s}</li>`).join('');
  const openBtn = $('locSettingsOpen');
  if (openBtn) {
    openBtn.textContent = guide.openLabel || 'Abrir configurações de localização';
    openBtn.classList.toggle('is-hidden', !guide.openLabel);
  }
  showSheet('locSettingsPanel');
}

function handleOpenLocationSettings() {
  openLocationSettings(showLocationHelp);
}

const MARK_TYPES = [
  { id: 'Pedra', label: 'Pedra' },
  { id: 'Costão', label: 'Costão' },
  { id: 'Orla', label: 'Orla' },
  { id: 'Pier', label: 'Pier' },
  { id: 'Canal', label: 'Canal' },
];
let markType = 'Pedra';

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

function renderMapMarkers() {
  renderMarkers(pointsRef, mapPointIds(pointsRef, state.filter));
}

function reloadAllPoints() {
  const pts = mergePoints(POINTS);
  pointsRef = pts;
  syncMapPoints(pts, openPoint);
  renderList(pts, { nearby: isRadarOn() });
  syncMenuMeta();
  return pts;
}

function setMarkFabVisible(show) {
  $('markFab')?.classList.toggle('is-hidden', !show);
}

function renderMarkTypeOptions() {
  const root = $('markPointType');
  if (!root) return;
  root.innerHTML = MARK_TYPES.map(
    (t) => `<button type="button" class="gear-chip${markType === t.id ? ' on' : ''}" data-mark-type="${t.id}">${t.label}</button>`,
  ).join('');
  root.querySelectorAll('[data-mark-type]').forEach((btn) => {
    btn.onclick = () => {
      markType = btn.dataset.markType;
      renderMarkTypeOptions();
    };
  });
}

function fmtCoords(lat, lng) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function fmtAccuracy(acc) {
  if (acc == null || !Number.isFinite(acc)) return 'calculando…';
  if (acc <= 8) return `±${Math.round(acc)} m — excelente`;
  if (acc <= 20) return `±${Math.round(acc)} m — bom`;
  return `±${Math.round(acc)} m — aguarde ou arraste o pin`;
}

function syncMarkPanel(pos) {
  const coords = $('markPointCoords');
  const accEl = $('markPointAccuracy');
  if (!pos) {
    if (coords) coords.textContent = '—';
    if (accEl) accEl.textContent = 'Buscando GPS fino…';
    return;
  }
  if (coords) coords.textContent = fmtCoords(pos.lat, pos.lng);
  if (accEl) accEl.textContent = fmtAccuracy(pos.accuracy);
}

function openMarkPointSheet() {
  if (!isRadarOn()) {
    toast('Ligue o radar primeiro.');
    return;
  }
  if (state.userPos?.approx) {
    toast('Permita GPS no celular — localização de rede não é precisa o suficiente.');
    return;
  }

  closeSpots();
  closeAllSheets();
  sheetOrigin = 'mark';
  $('markPointName').value = '';
  $('markPointNote').value = '';
  markType = 'Pedra';
  renderMarkTypeOptions();
  syncMarkPanel(null);
  showSheet('markPointPanel');

  const start = state.userPos?.gps ? { ...state.userPos } : null;
  if (start) {
    beginMarkMode(start, syncMarkPanel);
    syncMarkPanel(getMarkDraftPos());
  }

  capturePrecisePosition()
    .then((reading) => {
      setMarkDraftPos(reading);
      syncMarkPanel(getMarkDraftPos());
      toast(`GPS fino: ±${Math.round(reading.accuracy ?? 0)} m`);
    })
    .catch(() => {
      if (state.userPos?.gps) {
        syncMarkPanel(getMarkDraftPos());
        toast('Use o pin no mapa — arraste para o local exato.');
      } else {
        toast('Sem GPS fino — permita localização e tente de novo.');
        endMarkMode();
        hideSheet('markPointPanel');
      }
    });
}

async function saveMarkedPoint() {
  const draft = getMarkDraftPos();
  if (!draft) {
    toast('Aguardando GPS — tente de novo em instantes.');
    return;
  }
  if (state.userPos?.approx) {
    toast('GPS necessário para marcar com precisão.');
    return;
  }
  const result = addMyPoint({
    name: $('markPointName').value,
    lat: draft.lat,
    lng: draft.lng,
    type: markType,
    note: $('markPointNote').value,
    accuracy: draft.accuracy,
  });
  if (!result.ok) {
    toast(result.message);
    return;
  }
  endMarkMode();
  hideSheet('markPointPanel');
  reloadAllPoints();
  await loadMissingWeather([result.point], setRadarProgress);
  setFilter('meus');
  $('filters')?.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.filter === 'meus'));
  renderList(pointsRef, { nearby: isRadarOn() });
  openPoint(result.point);
  toast('Ponto salvo com backup automático.');
}

function closeMarkPointSheet() {
  endMarkMode();
  hideSheet('markPointPanel');
  if (sheetOrigin === 'menu') showSheet('optionsMenu');
  sheetOrigin = null;
}

function renderMyPointsList() {
  const root = $('myPointsList');
  if (!root) return;
  const list = loadMyPoints();
  const snaps = $('myPointsSnaps');
  if (snaps) {
    listSnapshots().then((items) => {
      if (!items.length) {
        snaps.innerHTML = '<p class="checklist-hint">Backup automático ativo a cada salvamento.</p>';
        return;
      }
      snaps.innerHTML = `<p class="checklist-hint">Backups: ${items.slice(0, 3).map((s) => `<button type="button" class="snap-restore" data-snap-at="${s.at}">${s.count} pts · ${s.at.slice(0, 16).replace('T', ' ')}</button>`).join(' ')}</p>`;
      snaps.querySelectorAll('[data-snap-at]').forEach((btn) => {
        btn.onclick = async () => {
          if (!confirm('Restaurar este backup? Seus pontos atuais serão mesclados (nada se perde).')) return;
          const merged = await restoreSnapshot(btn.dataset.snapAt);
          if (!merged) {
            toast('Backup indisponível.');
            return;
          }
          reloadAllPoints();
          renderMyPointsList();
          toast(`${merged.length} pontos após restaurar backup.`);
        };
      });
    });
  }
  if (!list.length) {
    root.innerHTML = '<p class="checklist-hint">Nenhum ponto ainda — marque onde você pesca.</p>';
    return;
  }
  root.innerHTML = list
    .map(
      (p) => `<div class="my-point-row">
        <button type="button" class="my-point-open" data-my-id="${p.id}">
          <b>${p.name}</b>
          <small>${p.type} · ${p.access.slice(0, 48)}</small>
        </button>
        <button type="button" class="my-point-del" data-del-id="${p.id}" aria-label="Remover">✕</button>
      </div>`,
    )
    .join('');
  root.querySelectorAll('[data-my-id]').forEach((btn) => {
    btn.onclick = () => {
      const p = loadMyPoints().find((x) => x.id === btn.dataset.myId);
      if (!p) return;
      closeAllSheets();
      openPoint(p);
    };
  });
  root.querySelectorAll('[data-del-id]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.delId;
      const first = removeMyPoint(id);
      if (first.needsConfirm) {
        if (!confirm('Remover este ponto? Ele ainda existe nos backups automáticos.')) return;
        const second = removeMyPoint(id, { confirmed: true });
        if (!second.ok) {
          toast(second.message);
          return;
        }
      } else if (!first.ok) {
        toast(first.message);
        return;
      }
      removeMapMarker(id);
      reloadAllPoints();
      renderMyPointsList();
      toast('Ponto removido (backup guardado).');
    };
  });
}

function downloadMyPointsBackup() {
  const n = exportMyPointsFile();
  toast(n ? `Backup baixado (${n} pontos).` : 'Nada para exportar.');
}

function importMyPointsBackup() {
  const input = $('myPointsImport');
  if (!input) return;
  input.value = '';
  input.click();
}

function handleMyPointsImport(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const replace = confirm('Mesclar com os pontos atuais?\n\nOK = mesclar (recomendado)\nCancelar = substituir tudo pelo arquivo');
    const result = importMyPointsFromJson(String(reader.result || ''), { replace: !replace });
    if (!result.ok) {
      toast(result.message);
      return;
    }
    reloadAllPoints();
    renderMyPointsList();
    toast(`${result.count} pontos após importar.`);
  };
  reader.readAsText(file);
}

function copyAdminPointsSnippet() {
  if (!isAdmin()) {
    const ok = confirm('Ativar modo admin neste aparelho? Seus pontos poderão ir para o repo permanente.');
    if (!ok) return;
    enableAdmin();
  }
  const snippet = exportAdminPointsSnippet();
  navigator.clipboard
    .writeText(snippet)
    .then(() => toast('Código copiado — cole em js/data/admin-points.js e faça push.'))
    .catch(() => {
      const blob = new Blob([snippet], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'admin-points.js';
      a.click();
      URL.revokeObjectURL(url);
      toast('Arquivo admin-points.js baixado.');
    });
}

function openMyPointsPanel() {
  sheetOrigin = 'menu';
  renderMyPointsList();
  hideSheet('optionsMenu');
  showSheet('myPointsPanel');
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

function syncLocHud() {
  if (!isRadarOn()) return;
  const label = $('hudLabel');
  const banner = $('locBanner');
  const weakGps = state.userPos?.gps && !state.userPos?.approx && state.userPos.accuracy != null && state.userPos.accuracy > 40;
  document.body.classList.toggle('loc-approx', !!state.userPos?.approx || weakGps);

  if (state.userPos?.approx) {
    if (label) label.textContent = 'Local impreciso';
    if (banner) {
      banner.classList.remove('is-hidden');
      banner.textContent = 'Posição veio da internet (pode errar km). Toque ⌖ para GPS preciso.';
    }
  } else if (weakGps) {
    if (label) label.textContent = `GPS calibrando ±${Math.round(state.userPos.accuracy)} m`;
    if (banner) {
      banner.classList.remove('is-hidden');
      banner.textContent = 'Aguardando GPS fino… fique ao ar livre ou toque ⌖ para forçar.';
    }
  } else if (state.userPos?.gps && state.userPos.accuracy != null) {
    if (label) label.textContent = `GPS ±${Math.round(state.userPos.accuracy)} m`;
    banner?.classList.add('is-hidden');
  } else if (state.userPos) {
    if (label) label.textContent = state.followUser ? 'Seguindo você' : 'Radar ativo';
    banner?.classList.add('is-hidden');
  }

  const showLocBtn = !!state.userPos?.approx || weakGps;
  $('openLocSettingsHud')?.classList.toggle('is-hidden', !showLocBtn);
}

function syncChrome() {
  if (!isRadarOn()) return;
  const count = rows.length;
  $('hudCount').textContent = count ? `${count} pontos próximos` : 'Buscando…';
  $('openPointsLabel').textContent = count ? `${count} pontos próximos` : 'Ver pontos próximos';
  $('weatherNote')?.classList.toggle('is-hidden', !state.weatherEstimated);
  syncLocHud();
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

export function bindUi({ onCapture, onRelocate, onApprox, onRefreshGps, onFilterChange: onFilter }) {
  onRefresh = () => renderList(pointsRef, { soft: true });
  onFilterChange = onFilter;
  onRelocateRef = onRelocate;
  syncLocSettingsButtons();

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
  $('followBtn').onclick = () => {
    const next = !state.followUser;
    setFollowUser(next);
    toast(next ? 'Mapa vai te acompanhar' : 'Arraste o mapa livremente');
    if (next && state.userPos) recenterUser();
  };
  $('relocate').onclick = () => {
    setFollowUser(true);
    if (isRadarOn() && onRefreshGps) {
      onRefreshGps();
      return;
    }
    onRelocate();
  };
  $('retryGps').onclick = onRelocate;
  const approxBtn = $('useApprox');
  if (approxBtn && onApprox) approxBtn.onclick = onApprox;
  ['openLocSettingsRecover', 'openLocSettingsPerm', 'openLocSettingsHud'].forEach((id) => {
    $(id)?.addEventListener('click', handleOpenLocationSettings);
  });
  $('locSettingsOpen')?.addEventListener('click', () => {
    if (getLocationPlatform().isAndroid) openAndroidLocationSettings();
    else toast('Abra Ajustes manualmente — veja os passos acima.');
  });
  $('locSettingsClose')?.addEventListener('click', () => hideSheet('locSettingsPanel'));
  $('locSettingsDone')?.addEventListener('click', () => {
    hideSheet('locSettingsPanel');
    onRelocateRef?.();
  });
  $('markFab').onclick = openMarkPointSheet;
  $('openMyPoints').onclick = openMyPointsPanel;
  $('markHereFromMenu').onclick = openMarkPointSheet;
  $('markPointClose').onclick = closeMarkPointSheet;
  $('markPointSave').onclick = saveMarkedPoint;
  $('markPointRefresh').onclick = () => {
    syncMarkPanel(null);
    capturePrecisePosition()
      .then((reading) => {
        setMarkDraftPos(reading);
        syncMarkPanel(getMarkDraftPos());
        toast(`GPS atualizado: ±${Math.round(reading.accuracy ?? 0)} m`);
      })
      .catch(() => toast('Não consegui GPS fino — arraste o pin no mapa.'));
  };
  $('myPointsClose').onclick = () => {
    hideSheet('myPointsPanel');
    if (sheetOrigin === 'menu') showSheet('optionsMenu');
    sheetOrigin = null;
  };
  $('myPointsExport')?.addEventListener('click', downloadMyPointsBackup);
  $('myPointsImportBtn')?.addEventListener('click', importMyPointsBackup);
  $('myPointsImport')?.addEventListener('change', (e) => handleMyPointsImport(e.target.files?.[0]));
  $('myPointsAdminExport')?.addEventListener('click', copyAdminPointsSnippet);
  $('logoutBtn')?.addEventListener('click', () => {
    if (!confirm('Sair da conta neste aparelho?')) return;
    logout();
    location.reload();
  });
  $('markFromList').onclick = openMarkPointSheet;
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
  syncLocSettingsButtons();
  const hint = $('recoverDeniedHint');
  if (hint) {
    hint.textContent = getLocationPlatform().isIOS
      ? 'No iPhone, toque no botão abaixo para ver o passo a passo nos Ajustes.'
      : 'Toque no botão abaixo para abrir as configurações do navegador.';
  }
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
  syncLocSettingsButtons();

  const hints = {
    timeout: 'GPS demorou — tente de novo ou use localização pela rede (pode errar km).',
    unavailable: 'Sem sinal GPS — saia de prédios, tente de novo ou use localização pela rede.',
    denied: 'GPS bloqueado — libere nas configurações do celular ou escolha sua região.',
    insecure: 'Abra pelo link https:// do GitHub Pages.',
    unsupported: 'Navegador sem GPS — use localização pela rede ou escolha região.',
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
  setFollowUser(true);
  setMarkFabVisible(true);
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

  const all = rankAll(pointsRef);
  const row = all.find((r) => r.p.id === point.id);
  if (!row) return;

  openSpots();

  const loadWx = getPointWeather(point.id)
    ? Promise.resolve()
    : loadMissingWeather([point], setRadarProgress).then(() => {
        paint(row, rows.findIndex((r) => r.p.id === point.id));
      });

  loadWx.then(() => {
    const idx = rows.findIndex((r) => r.p.id === point.id);
    if (idx >= 0) showAt(idx, { fly: true });
    else showPointDirect(row);
  });
}

function showPointDirect(row) {
  closeChecklist();
  paint(row, -1);
  $('cardRank').textContent = 'Ponto no mapa';
  $('pointCounter').textContent = '—';
  $('pointPrev').disabled = true;
  $('pointNext').disabled = true;
  setBestPointId(row.p.id);
  renderMapMarkers();
  if (isOpen()) flyToPoint(row.p);
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
  $('cardMeta').textContent = `${distance == null ? '—' : fmtKm(distance)} · ${p.species.slice(0, 2).join(', ')}${p.personal ? ' · seu ponto' : ''}${p.coast ? ` · ${coastLabel(p)}` : ''}`;
  const accessEl = $('cardAccess');
  if (accessEl) {
    accessEl.textContent = p.access ? `📍 ${p.access}` : '';
    accessEl.classList.toggle('is-hidden', !p.access);
  }
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
  $('cardAccess')?.classList.add('is-hidden');
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
    renderMapMarkers();
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
  renderMapMarkers();
  if (fly && isOpen()) flyToPoint(row.p);
}

function step(delta) {
  if (!rows.length) return;
  showAt(index + delta, { fly: true });
}

export function renderList(points, opts = {}) {
  const { nearby = isRadarOn(), soft = false } = opts;
  applyRows(points, { nearby });
  syncChrome();

  if (soft) {
    if (!rows.length) {
      paintEmpty();
      renderMapMarkers();
      return;
    }
    const idx = lastId ? rows.findIndex((r) => r.p.id === lastId) : -1;
    const at = idx >= 0 ? idx : 0;
    index = at;
    paint(rows[at], at);
    $('pointCounter').textContent = `${at + 1} / ${rows.length}`;
    $('pointPrev').disabled = at <= 0;
    $('pointNext').disabled = at >= rows.length - 1;
    setBestPointId(rows[0]?.p?.id ?? null);
    renderMapMarkers();
    return;
  }

  const preserve = lastId && rows.some((r) => r.p.id === lastId) ? lastId : rows[0]?.p?.id;
  const idx = preserve ? rows.findIndex((r) => r.p.id === preserve) : 0;
  showAt(idx >= 0 ? idx : 0, { fly: isOpen() });
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
  endMarkMode();
  hideSheet('optionsMenu');
  hideSheet('profilePanel');
  hideSheet('gearPanel');
  hideSheet('markPointPanel');
  hideSheet('myPointsPanel');
  hideSheet('locSettingsPanel');
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
  const session = getSession();
  $('menuProfileMeta').textContent = profileSummary(profile);
  $('menuGearMeta').textContent = isGearReady(gear) ? gearSummary(gear) : 'Cadastre vara, linha e iscas';
  $('menuMyPointsMeta').textContent = myPointsSummary();
  $('menuSessionMeta').textContent = session ? sessionLabel(session) : '—';
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
    renderMapMarkers();
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
  renderMapMarkers();
  setEntryVisible(true);
}

let moveTimer = null;

export function onUserMoved() {
  clearTimeout(moveTimer);
  moveTimer = setTimeout(() => {
    syncLocHud();
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
