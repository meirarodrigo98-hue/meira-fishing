import { toast } from '../lib/utils.js';
import { fetchApproxLocation } from '../lib/geo-fallback.js';
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

/** GPS no clique → fallback IP automático se bloquear ou falhar. */
let watchId = null;
let locating = false;

const GEO_ATTEMPTS = [
  { enableHighAccuracy: true, timeout: 14000, maximumAge: 0 },
  { enableHighAccuracy: false, timeout: 18000, maximumAge: 120000 },
  { enableHighAccuracy: false, timeout: 22000, maximumAge: 600000 },
];

const WATCH_OPTS = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 20000,
};

function clearWatch() {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function releaseLocating() {
  locating = false;
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

function validCoords(pos) {
  const lat = pos?.coords?.latitude;
  const lng = pos?.coords?.longitude;
  return Number.isFinite(lat) && Number.isFinite(lng);
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

function succeedGps(pos, onSuccess) {
  hideAwaitingPermission();
  showSearching();
  const location = { lat: pos.coords.latitude, lng: pos.coords.longitude, gps: true };
  setUser(location, { center: true });
  releaseLocating();
  onSuccess(location);
}

async function tryApprox(onSuccess, onFallback, reason) {
  showSearching();
  hideAwaitingPermission();

  const approx = await fetchApproxLocation();
  if (approx) {
    hideRecover();
    const location = { lat: approx.lat, lng: approx.lng, gps: false, approx: true };
    setUser(location, { center: true });
    releaseLocating();
    const city = approx.city ? ` (${approx.city})` : '';
    toast(`Localização aproximada${city}. Permita GPS para precisão no mapa.`);
    onSuccess(location);
    return;
  }

  releaseLocating();
  if (reason === 'denied') showPermissionDenied();
  else showRecover(reason);
  onFallback(reason);
}

function attemptGeo(onSuccess, onFallback, index = 0, lastErr = 'timeout') {
  if (index >= GEO_ATTEMPTS.length) {
    tryApprox(onSuccess, onFallback, lastErr);
    return;
  }

  const opt = GEO_ATTEMPTS[index];
  readPosition(opt, opt.timeout + 2500)
    .then((pos) => {
      if (!validCoords(pos)) {
        attemptGeo(onSuccess, onFallback, index + 1, 'unavailable');
        return;
      }
      succeedGps(pos, onSuccess);
    })
    .catch((err) => {
      const kind = errorKind(err);
      if (kind === 'denied') {
        tryApprox(onSuccess, onFallback, 'denied');
        return;
      }
      attemptGeo(onSuccess, onFallback, index + 1, kind);
    });
}

export function captureLocation(onSuccess, onFallback) {
  releaseLocating();
  locating = true;

  if (!window.isSecureContext) {
    toast('Abra pelo link https:// para usar localização.');
    tryApprox(onSuccess, onFallback, 'insecure');
    return;
  }

  if (!navigator.geolocation) {
    tryApprox(onSuccess, onFallback, 'unsupported');
    return;
  }

  hideRecover();
  showAwaitingPermission();
  attemptGeo(onSuccess, onFallback);
}

export function retryLocation(onSuccess, onFallback) {
  captureLocation(onSuccess, onFallback);
}

export function useApproxLocation(onSuccess, onFallback) {
  releaseLocating();
  locating = true;
  hideRecover();
  tryApprox(onSuccess, onFallback, 'unavailable');
}

export function useManualPlace(place, onReady) {
  clearWatch();
  hideRecover();
  hideAwaitingPermission();
  releaseLocating();
  setUser(place, { center: true });
  onReady();
}

export function isInAppBrowser() {
  const ua = navigator.userAgent || '';
  return /Instagram|FBAN|FBAV|Line\//i.test(ua);
}
