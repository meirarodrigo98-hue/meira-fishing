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
let locating = false;

const GEO_FAST = { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 };
const GEO_PRECISE = { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 };

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
      setUser({ lat: pos.coords.latitude, lng: pos.coords.longitude }, false);
      onUserMoved();
    },
    () => {},
    { enableHighAccuracy: false, maximumAge: 30000, timeout: 20000 },
  );
}

function errorKind(err) {
  if (!err) return 'unknown';
  if (err.code === 1) return 'denied';
  if (err.code === 2) return 'unavailable';
  if (err.code === 3) return 'timeout';
  return 'unknown';
}

function readPosition(options, hardMs = 16000) {
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

async function queryGeoPermission() {
  if (!navigator.permissions?.query) return null;
  try {
    return await navigator.permissions.query({ name: 'geolocation' });
  } catch {
    return null;
  }
}

async function requestPosition(onSuccess, onFallback) {
  try {
    const pos = await readPosition(GEO_FAST, 14000);
    onSuccess(pos);
    return;
  } catch (err) {
    if (errorKind(err) === 'timeout') {
      try {
        const pos = await readPosition(GEO_PRECISE, 18000);
        onSuccess(pos);
        return;
      } catch (retryErr) {
        err = retryErr;
      }
    }

    hideAwaitingPermission();
    const kind = errorKind(err);
    if (kind === 'denied') showPermissionDenied();
    else showRecover(kind);
    onFallback(kind);
  }
}

export async function captureLocation(onSuccess, onFallback) {
  if (locating) return;
  locating = true;

  try {
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

    await requestPosition(
      (pos) => {
        hideAwaitingPermission();
        showSearching();
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUser(location, true);
        onSuccess(location);
      },
      (kind) => {
        hideAwaitingPermission();
        onFallback(kind);
      },
    );
  } finally {
    locating = false;
  }
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
