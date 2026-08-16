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

/** GPS — permissão primeiro, radar depois. */
let watchId = null;

const GEO_FAST = { enableHighAccuracy: false, timeout: 18000, maximumAge: 120000 };
const GEO_PRECISE = { enableHighAccuracy: true, timeout: 22000, maximumAge: 30000 };

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
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 },
  );
}

function errorKind(err) {
  if (!err) return 'unknown';
  if (err.code === 1) return 'denied';
  if (err.code === 2) return 'unavailable';
  if (err.code === 3) return 'timeout';
  return 'unknown';
}

function applyPosition(pos, onSuccess) {
  hideAwaitingPermission();
  showSearching();
  const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  setUser(location, true);
  startWatching();
  onSuccess(location);
}

function readPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function queryGeoPermission() {
  if (!navigator.permissions?.query) return null;
  try {
    return await navigator.permissions.query({ name: 'geolocation' });
  } catch {
    return null;
  }
}

async function requestPosition(onSuccess, onFallback, { precise = false } = {}) {
  try {
    const pos = await readPosition(precise ? GEO_PRECISE : GEO_FAST);
    applyPosition(pos, onSuccess);
    return true;
  } catch (err) {
    const kind = errorKind(err);
    if (!precise && kind === 'timeout') {
      showSearching();
      return requestPosition(onSuccess, onFallback, { precise: true });
    }
    hideAwaitingPermission();
    if (kind === 'denied') showPermissionDenied();
    else showRecover(kind);
    onFallback(kind);
    return false;
  }
}

export async function captureLocation(onSuccess, onFallback) {
  if (!window.isSecureContext) {
    toast('Abra pelo link https:// para usar localização.');
    showRecover('insecure');
    onFallback('insecure');
    return;
  }

  if (!navigator.geolocation) {
    toast('Seu navegador não suporta localização.');
    showRecover('unsupported');
    onFallback('unsupported');
    return;
  }

  const perm = await queryGeoPermission();
  if (perm?.state === 'denied') {
    showPermissionDenied();
    onFallback('denied');
    return;
  }

  hideRecover();
  showAwaitingPermission();
  await requestPosition(onSuccess, onFallback);
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
  setUser(place, true);
  onReady();
}
