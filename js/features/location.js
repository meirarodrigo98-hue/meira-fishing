import { toast } from '../lib/utils.js';
import { setUser } from './map.js';

import { onUserMoved, showFallback, showSearching } from './ui.js';

/** GPS — entrada automática e fallback por bairro. */
let watchId = null;

function clearWatch() {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function startWatching() {
  clearWatch();
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (!pos.coords) return;
      setUser({ lat: pos.coords.latitude, lng: pos.coords.longitude }, false);
      onUserMoved();
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 20000, timeout: 20000 },
  );
}

export function captureLocation(onSuccess, onFallback) {
  if (!navigator.geolocation) {
    showFallback();
    onFallback();
    return;
  }

  showSearching();

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUser(location, true);
      startWatching();
      onSuccess(location, 'Perto da sua posição');
    },
    () => {
      clearWatch();
      showFallback();
      onFallback();
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 20000 },
  );
}

export function retryLocation(onSuccess, onFallback) {
  if (!navigator.geolocation) {
    toast('Geolocalização indisponível neste aparelho.');
    onFallback();
    return;
  }
  captureLocation(onSuccess, onFallback);
}

export function useManualPlace(place, onReady) {
  clearWatch();
  setUser(place, true);
  onReady();
}
