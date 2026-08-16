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

/** GPS — pede no clique; auto se já permitido; fallback IP se bloquear. */
let watchId = null;
let locating = false;

const GEO_ATTEMPTS = [
  { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
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
  locating = false;
  onSuccess(location);
}

async function tryApprox(onSuccess, onFallback, reason) {
  const approx = await fetchApproxLocation();
  if (approx) {
    hideAwaitingPermission();
    hideRecover();
    showSearching();
    const location = { lat: approx.lat, lng: approx.lng, gps: false, approx: true };
    setUser(location, { center: true });
    locating = false;
    const city = approx.city ? ` (${approx.city})` : '';
    toast(`Localização aproximada${city}. Permita GPS para precisão no mapa.`);
    onSuccess(location);
    return true;
  }

  locating = false;
  hideAwaitingPermission();
  if (reason === 'denied') showPermissionDenied();
  else showRecover(reason === 'denied' ? 'denied' : reason);
  onFallback(reason);
  return false;
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

/** Dispara getCurrentPosition na mesma tick do clique — antes de qualquer await. */
function startGeoImmediate(onSuccess, onFallback) {
  if (!navigator.geolocation) return false;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (!validCoords(pos)) {
        attemptGeo(onSuccess, onFallback, 1, 'unavailable');
        return;
      }
      succeedGps(pos, onSuccess);
    },
    (err) => {
      const kind = errorKind(err);
      if (kind === 'denied') {
        tryApprox(onSuccess, onFallback, 'denied');
        return;
      }
      attemptGeo(onSuccess, onFallback, 0, kind);
    },
    GEO_ATTEMPTS[0],
  );
  return true;
}

export function captureLocation(onSuccess, onFallback) {
  if (locating) return;
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
  startGeoImmediate(onSuccess, onFallback);
}

export function retryLocation(onSuccess, onFallback) {
  captureLocation(onSuccess, onFallback);
}

/** Fallback manual — botão na tela de recuperação. */
export function useApproxLocation(onSuccess, onFallback) {
  if (locating) return;
  locating = true;
  hideRecover();
  showSearching();
  tryApprox(onSuccess, onFallback, 'unavailable');
}

export function useManualPlace(place, onReady) {
  clearWatch();
  hideRecover();
  hideAwaitingPermission();
  setUser(place, { center: true });
  onReady();
}

/** Se o cliente já permitiu antes, liga o radar sozinho ao abrir o app. */
export async function tryAutoLocateIfGranted(onSuccess, onFallback) {
  if (locating || !window.isSecureContext || !navigator.geolocation) return false;

  let state = 'prompt';
  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' });
    if (perm?.state) state = perm.state;
  } catch {
    return false;
  }

  if (state !== 'granted') return false;

  captureLocation(onSuccess, onFallback);
  return true;
}

export function isInAppBrowser() {
  const ua = navigator.userAgent || '';
  return /Instagram|FBAN|FBAV|Line\//i.test(ua);
}
