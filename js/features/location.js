import { toast } from '../lib/utils.js';
import { fetchApproxLocation } from '../lib/geo-fallback.js';
import { state } from '../lib/state.js';
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

/** GPS no clique → fallback IP só para radar; marcação exige GPS fino. */
let watchId = null;
let locating = false;
let bestAccuracy = Infinity;

const GEO_ATTEMPTS = [
  { enableHighAccuracy: true, timeout: 16000, maximumAge: 0 },
  { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
  { enableHighAccuracy: false, timeout: 18000, maximumAge: 30000 },
];

const WATCH_OPTS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 25000,
};

function posFromReading(pos) {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null,
    gps: true,
    approx: false,
  };
}

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
  bestAccuracy = Infinity;
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (!pos.coords) return;
      const reading = posFromReading(pos);
      if (!Number.isFinite(reading.lat) || !Number.isFinite(reading.lng)) return;
      const acc = reading.accuracy ?? 9999;
      const prev = bestAccuracy;
      const moved =
        !state.userPos ||
        Math.abs(state.userPos.lat - reading.lat) > 0.000008 ||
        Math.abs(state.userPos.lng - reading.lng) > 0.000008;
      if (acc <= prev || moved) {
        if (acc < bestAccuracy) bestAccuracy = acc;
        setUser(reading, { follow: true });
        onUserMoved();
      }
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
  const location = posFromReading(pos);
  bestAccuracy = location.accuracy ?? Infinity;
  setUser(location, { center: true, zoom: 17 });
  releaseLocating();
  onSuccess(location);
}

/** Amostra GPS fino para marcar ponto — escolhe a leitura mais precisa. */
export function capturePrecisePosition({ maxWaitMs = 14000, targetAccuracy = 10 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation || !window.isSecureContext) {
      reject(new Error('no-gps'));
      return;
    }

    const readings = [];
    let settled = false;
    let wId = null;

    const finish = (pickBest = true) => {
      if (settled) return;
      settled = true;
      if (wId != null) navigator.geolocation.clearWatch(wId);
      clearTimeout(timer);
      if (!readings.length) {
        reject(new Error('timeout'));
        return;
      }
      if (pickBest) readings.sort((a, b) => (a.accuracy ?? 9999) - (b.accuracy ?? 9999));
      resolve(readings[0]);
    };

    const timer = setTimeout(() => finish(true), maxWaitMs);

    wId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!validCoords(pos)) return;
        const reading = posFromReading(pos);
        readings.push(reading);
        setUser(reading, { follow: false });
        const acc = reading.accuracy ?? 9999;
        if (acc <= targetAccuracy) finish(false);
      },
      (err) => {
        if (!readings.length) {
          settled = true;
          clearTimeout(timer);
          if (wId != null) navigator.geolocation.clearWatch(wId);
          reject(err);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  });
}

async function tryApprox(onSuccess, onFallback, reason) {
  showSearching();
  hideAwaitingPermission();

  const approx = await fetchApproxLocation();
  if (approx) {
    hideRecover();
    const location = { lat: approx.lat, lng: approx.lng, gps: false, approx: true, accuracy: null };
    setUser(location, { center: true, zoom: 14 });
    releaseLocating();
    const city = approx.city ? ` (${approx.city})` : '';
    toast(`Localização aproximada${city}. Permita GPS para marcar com precisão.`);
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
  setUser({ ...place, gps: false, approx: false, accuracy: null }, { center: true, zoom: 15 });
  onReady();
}

export function isInAppBrowser() {
  const ua = navigator.userAgent || '';
  return /Instagram|FBAN|FBAV|Line\//i.test(ua);
}
