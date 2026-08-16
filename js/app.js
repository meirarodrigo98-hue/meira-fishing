import { toast } from './lib/utils.js';
import { POINTS } from './data/points.js';
import { mergePoints, initMyPoints } from './lib/mypoints.js';
import { PLACES } from './data/places.js';
import { loadWeatherBatch, loadMissingWeather } from './lib/weather.js';
import { filterNearby } from './lib/utils.js';
import { rankPoints } from './lib/scoring.js';
import { createMap } from './features/map.js';
import {
  bindUi,
  hideRecover,
  openPoint,
  ready,
  renderList,
  renderPlaces,
  setPoints,
  setRadarProgress,
  showRecover,
  showSearching,
  showLocationHelp,
} from './features/ui.js';
import { state, getPointWeather, hasCapturedLocation } from './lib/state.js';
import { beginTracking, captureLocation, retryLocation, refreshGpsPosition, useApproxLocation, useManualPlace, isInAppBrowser } from './features/location.js';
import { initLogin } from './features/login.js';
import { needsLocationPermission, promptLocationServicesOnEntry } from './lib/location-settings.js';

import { isSupabaseEnabled } from './lib/supabase-client.js';
import { fetchPublicPoints } from './lib/supabase-sync.js';

const MIN_RADAR_MS = 1600;
const MAX_RADAR_MS = 22000;

let radarBusy = false;
let catalogPoints = null;

async function getCatalogPoints() {
  if (catalogPoints) return catalogPoints;
  if (isSupabaseEnabled()) {
    try {
      const remote = await fetchPublicPoints();
      if (remote?.length) {
        catalogPoints = remote;
        return catalogPoints;
      }
    } catch {
      /* usa catálogo local */
    }
  }
  catalogPoints = POINTS;
  return catalogPoints;
}

function allPoints() {
  return mergePoints(catalogPoints || POINTS);
}

function startRadar(onReady) {
  if (radarBusy) return;
  radarBusy = true;
  onReady();
}

function endRadar() {
  radarBusy = false;
}

function nearbyPoints() {
  const ranked = rankPoints(allPoints(), state.userPos, state.filter, null);
  return filterNearby(ranked).map((r) => r.p);
}

async function startApp() {
  await boot();
}

async function boot() {
  await getCatalogPoints();
  await initMyPoints();
  const points = allPoints();
  setPoints(points);
  createMap(points, openPoint);

  bindUi({
    onCapture: () =>
      startRadar(() =>
        captureLocation(
          () => finishRadar(),
          () => endRadar(),
        ),
      ),
    onRelocate: () =>
      startRadar(() =>
        retryLocation(
          () => finishRadar(),
          () => endRadar(),
        ),
      ),
    onApprox: () =>
      startRadar(() =>
        useApproxLocation(
          () => finishRadar(),
          () => endRadar(),
        ),
      ),
    onRefreshGps: () =>
      startRadar(() =>
        refreshGpsPosition(
          () => {
            renderList(allPoints(), { nearby: true });
            endRadar();
          },
          () => endRadar(),
        ),
      ),
    onFilterChange: async (points) => {
      const missing = points.filter((p) => !getPointWeather(p.id));
      if (!missing.length) return;
      await loadMissingWeather(missing, setRadarProgress);
      renderList(allPoints(), { nearby: true });
    },
  });

  renderPlaces(PLACES, (place) => {
    startRadar(() => {
      hideRecover();
      showSearching();
      useManualPlace(place, () => finishRadar());
    });
  });

  if (isInAppBrowser()) {
    toast('Abra no Chrome ou Safari para GPS preciso.');
  }

  await requestLocationOnEntry();
}

async function requestLocationOnEntry() {
  if (!window.isSecureContext || !navigator.geolocation) return;
  if (hasCapturedLocation()) return;

  const needs = await needsLocationPermission();
  if (!needs) {
    startRadar(() =>
      captureLocation(
        () => finishRadar(),
        () => endRadar(),
      ),
    );
    return;
  }

  promptLocationServicesOnEntry(showLocationHelp);

  window.setTimeout(() => {
    startRadar(() =>
      captureLocation(
        () => finishRadar(),
        () => endRadar(),
      ),
    );
  }, 600);
}

async function finishRadar() {
  try {
    await handleReady();
  } catch {
    if (state.userPos) {
      await loadWeatherBatch(nearbyPoints(), setRadarProgress);
      renderList(allPoints(), { nearby: true });
      ready();
      beginTracking();
    } else {
      showRecover('unavailable');
    }
  } finally {
    endRadar();
  }
}

async function handleReady() {
  const pos = state.userPos;
  if (!pos) {
    showRecover('unavailable');
    return;
  }

  const points = nearbyPoints();
  const started = Date.now();
  let estimated = false;

  try {
    const result = await Promise.race([
      loadWeatherBatch(points, setRadarProgress),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), MAX_RADAR_MS)),
    ]);
    estimated = result.estimated;
  } catch {
    await loadWeatherBatch(points.slice(0, 4), setRadarProgress);
    estimated = true;
  }

  const elapsed = Date.now() - started;
  if (elapsed < MIN_RADAR_MS) {
    await new Promise((r) => setTimeout(r, MIN_RADAR_MS - elapsed));
  }

  if (estimated) toast('Alguns pontos usaram clima estimado.');

  renderList(allPoints(), { nearby: true });
  ready();
  beginTracking();
}

initLogin(startApp);
