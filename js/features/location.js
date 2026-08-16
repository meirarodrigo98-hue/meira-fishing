import { toast } from '../lib/utils.js';
import { setUser } from './map.js';

import { onUserMoved, showBoot, showFallback } from './ui.js';

/** GPS — entrada automática e fallback por bairro. */
export function startLocation(onSuccess, onFallback) {
  if (!navigator.geolocation) {
    onFallback();
    return;
  }

  showBoot();

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUser(location, true);
      onSuccess(location, 'Perto da sua posição');
    },
    () => {
      showFallback();
      onFallback();
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 20000 },
  );

  navigator.geolocation.watchPosition(
    (pos) => {
      if (!pos.coords) return;
      setUser({ lat: pos.coords.latitude, lng: pos.coords.longitude }, false);
      onUserMoved();
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 20000, timeout: 20000 },
  );
}

export function retryLocation(onSuccess, onFallback) {
  if (!navigator.geolocation) {
    toast('Geolocalização indisponível neste aparelho.');
    onFallback();
    return;
  }
  startLocation(onSuccess, onFallback);
}

export function useManualPlace(place, onReady) {
  setUser(place, true);
  onReady(place, `Perto de ${place.name}`);
}
