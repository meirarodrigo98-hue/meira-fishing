import { toast } from './lib/utils.js';
import { POINTS } from './data/points.js';
import { PLACES } from './data/places.js';
import { loadWeather } from './lib/weather.js';
import { createMap } from './features/map.js';
import { bindUi, hideRecover, openPoint, ready, renderList, renderPlaces, setPoints, showRecover, showSearching } from './features/ui.js';
import { state } from './lib/state.js';
import { beginTracking, captureLocation, retryLocation, useManualPlace } from './features/location.js';

const MIN_RADAR_MS = 1200;
const MAX_RADAR_MS = 16000;

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
      await loadWeather(state.userPos);
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

  const started = Date.now();
  let estimated = false;

  try {
    const result = await Promise.race([
      loadWeather(pos),
      new Promise((_, reject) => setTimeout(() => reject(new Error('weather timeout')), MAX_RADAR_MS)),
    ]);
    estimated = result.estimated;
  } catch {
    const fallback = await loadWeather(pos);
    estimated = fallback.estimated;
  }

  const elapsed = Date.now() - started;
  if (elapsed < MIN_RADAR_MS) {
    await new Promise((r) => setTimeout(r, MIN_RADAR_MS - elapsed));
  }

  if (estimated) toast('Sem dados de clima ao vivo — usando estimativa.');

  renderList(POINTS, { nearby: true });
  ready();
  beginTracking();
}

boot();
