import { POINTS } from './data/points.js';
import { PLACES } from './data/places.js';
import { loadWeather } from './lib/weather.js';
import { createMap } from './features/map.js';
import { bindUi, openPoint, ready, renderList, renderPlaces, setPoints, onSheetSnap } from './features/ui.js';
import { initSheet } from './features/sheet.js';
import { retryLocation, startLocation, useManualPlace } from './features/location.js';

/** Entrada do app — liga mapa, faixa, UI, GPS e clima. */
async function boot() {
  setPoints(POINTS);
  createMap(POINTS, openPoint);

  const sheet = initSheet(onSheetSnap);
  void sheet;

  bindUi({
    onRelocate: () => retryLocation(handleReady, () => {}),
  });

  renderPlaces(PLACES, (place) => {
    useManualPlace(place, (pos, label) => handleReady(pos, label));
  });

  startLocation(handleReady, () => {});
}

async function handleReady(pos, label) {
  ready(label);
  const { estimated } = await loadWeather(pos);
  if (estimated) toast('Sem dados de clima ao vivo — usando estimativa.');
  renderList(POINTS);
}

boot();
