import { toast } from '../lib/utils.js';
import { setUser } from './map.js';
import {
  hideAwaitingPermission,
  hideRecover,
  onUserMoved,
  showAwaitingPermission,
  showPermissionDenied,
  showRecover,
  showSearching,
} from './ui.js';

/** GPS — pede posição no clique; watchPosition acompanha enquanto você anda. */
let watchId = null;
let locating = false;

const GEO_ATTEMPTS = [
  { enableHighAccuracy: false, timeout: 18000, maximumAge: 600000 },
  { enableHighAccuracy: false, timeout: 22000, maximumAge: 60000 },
  { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 },
];

const WATCH_OPTS = {
  enableHighAccuracy: true,
  maximumAge: 4000,
  timeout: 20000,
};

function clearWatch() {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

export function beginTracking() {
  if (!navigator.geolocation) return;
  clearWatch();
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (!pos.coords) return;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setUser({ lat, lng }, { follow: true });
      onUserMoved();
    },
    () => {},
    WATCH_OPTS,
  );
}

function errorKind(err) {
  if (!err) return 'unknown';
  if (err.code === 1) return 'denied';
  if (err.code === 2) return 'unavailable';
  if (err.code === 3) return 'timeout';
  return 'unknown';
}

function readPosition(options, hardMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject({ code: 3, message: 'hard timeout' }), hardMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(pos);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
      options,
    );
  });
}

function validCoords(pos) {
  const lat = pos?.coords?.latitude;
  const lng = pos?.coords?.longitude;
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function attemptGeo(onSuccess, onFallback, index = 0) {
  if (index >= GEO_ATTEMPTS.length) {
    hideAwaitingPermission();
    showRecover('timeout');
    onFallback('timeout');
    locating = false;
    return;
  }

  const opt = GEO_ATTEMPTS[index];
  readPosition(opt, opt.timeout + 3000)
    .then((pos) => {
      if (!validCoords(pos)) {
        attemptGeo(onSuccess, onFallback, index + 1);
        return;
      }
      hideAwaitingPermission();
      showSearching();
      const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUser(location, { center: true });
      locating = false;
      onSuccess(location);
    })
    .catch((err) => {
      const kind = errorKind(err);
      if (kind === 'denied') {
        hideAwaitingPermission();
        showPermissionDenied();
        onFallback('denied');
        locating = false;
        return;
      }
      attemptGeo(onSuccess, onFallback, index + 1);
    });
}

export function captureLocation(onSuccess, onFallback) {
  if (locating) return;
  locating = true;

  if (!window.isSecureContext) {
    toast('Abra pelo link https:// para usar localização.');
    showRecover('insecure');
    onFallback('insecure');
    locating = false;
    return;
  }

  if (!navigator.geolocation) {
    toast('Seu navegador não suporta localização.');
    showRecover('unsupported');
    onFallback('unsupported');
    locating = false;
    return;
  }

  hideRecover();
  showAwaitingPermission();
  attemptGeo(onSuccess, onFallback);
}

export function retryLocation(onSuccess, onFallback) {
  if (!navigator.geolocation) {
    toast('Geolocalização indisponível neste aparelho.');
    onFallback('unsupported');
    return;
  }
  captureLocation(onSuccess, onFallback);
}

export function useManualPlace(place, onReady) {
  clearWatch();
  hideRecover();
  hideAwaitingPermission();
  setUser(place, { center: true });
  onReady();
}
