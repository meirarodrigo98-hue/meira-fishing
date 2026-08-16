import { toast } from './lib/utils.js';
import { POINTS } from './data/points.js';
import { PLACES } from './data/places.js';
import { loadWeather } from './lib/weather.js';
import { createMap } from './features/map.js';
import { bindUi, openPoint, ready, renderList, renderPlaces, setPoints, showSearching } from './features/ui.js';
import { captureLocation, retryLocation, useManualPlace } from './features/location.js';

async function boot() {
  setPoints(POINTS);
  createMap(POINTS, openPoint);

  bindUi({
    onCapture: () => captureLocation(handleReady, () => {}),
    onRelocate: () => retryLocation(handleReady, () => {}),
  });

  renderPlaces(PLACES, (place) => {
    useManualPlace(place, (pos, label) => handleReady(pos, label));
  });
}

async function handleReady(pos, label) {
  showSearching();
  const { estimated } = await loadWeather(pos);
  if (estimated) toast('Sem dados de clima ao vivo — usando estimativa.');
  ready(label);
  renderList(POINTS);
}

boot();
