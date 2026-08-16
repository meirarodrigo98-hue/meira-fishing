import { toast } from './lib/utils.js';
import { POINTS } from './data/points.js';
import { PLACES } from './data/places.js';
import { loadWeatherBatch } from './lib/weather.js';
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
} from './features/ui.js';
import { state } from './lib/state.js';
import { beginTracking, captureLocation, retryLocation, useManualPlace } from './features/location.js';

const MIN_RADAR_MS = 1600;
const MAX_RADAR_MS = 22000;

function nearbyPoints() {
  const ranked = rankPoints(POINTS, state.userPos, state.filter, null);
  return filterNearby(ranked).map((r) => r.p);
}

async function boot() {
  setPoints(POINTS);
  createMap(POINTS, openPoint);

  bindUi({
    onCapture: () => captureLocation(finishRadar, () => {}),
    onRelocate: () => retryLocation(finishRadar, () => {}),
  });

  renderPlaces(PLACES, (place) => {
    hideRecover();
    showSearching();
    useManualPlace(place, () => finishRadar());
  });
}

async function finishRadar() {
  try {
    await handleReady();
  } catch {
    if (state.userPos) {
      await loadWeatherBatch(nearbyPoints(), setRadarProgress);
      renderList(POINTS, { nearby: true });
      ready();
      beginTracking();
    } else {
      showRecover('unavailable');
    }
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

  renderList(POINTS, { nearby: true });
  ready();
  beginTracking();
}

boot();
