import { toast } from './lib/utils.js';
import { POINTS } from './data/points.js';
import { PLACES } from './data/places.js';
import { loadWeather } from './lib/weather.js';
import { createMap } from './features/map.js';
import { bindUi, openPoint, ready, renderList, renderPlaces, setPoints, showSearching } from './features/ui.js';
import { state } from './lib/state.js';
import { captureLocation, retryLocation, useManualPlace } from './features/location.js';

async function boot() {
  setPoints(POINTS);
  createMap(POINTS, openPoint);

  bindUi({
    onCapture: () => captureLocation(handleReady, () => {}),
    onRelocate: () => retryLocation(handleReady, () => {}),
  });

  renderPlaces(PLACES, (place) => {
    showSearching();
    useManualPlace(place, () => handleReady());
  });
}

async function handleReady() {
  const [{ estimated }] = await Promise.all([
    loadWeather(state.userPos),
    new Promise((r) => setTimeout(r, 1400)),
  ]);
  if (estimated) toast('Sem dados de clima ao vivo — usando estimativa.');
  renderList(POINTS, { nearby: true });
  ready();
}

boot();
