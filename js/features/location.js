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

/** GPS fino primeiro — IP só se GPS falhar de verdade (nunca se usuário negou). */
let watchId = null;
let locating = false;

const GEO_ATTEMPTS = [
  { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
  { enableHighAccuracy: true, timeout: 28000, maximumAge: 0 },
  { enableHighAccuracy: true, timeout: 35000, maximumAge: 0 },
];

const WATCH_OPTS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 30000,
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

function shouldAcceptReading(reading) {
  if (!state.userPos) return true;
  if (state.userPos.approx) return true;
  if (!state.userPos.gps) return true;
  const acc = reading.accuracy ?? 9999;
  const cur = state.userPos.accuracy ?? 9999;
  return acc < cur + 2;
}

export function beginTracking() {
  if (!navigator.geolocation) return;
  clearWatch();
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (!pos.coords) return;
      const reading = posFromReading(pos);
      if (!Number.isFinite(reading.lat) || !Number.isFinite(reading.lng)) return;
      if (!shouldAcceptReading(reading)) return;
      setUser(reading, { follow: true });
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
  const location = posFromReading(pos);
  setUser(location, { center: true, zoom: 18 });
  releaseLocating();
  onSuccess(location);
}

/** Amostra GPS fino — escolhe a leitura mais precisa. */
export function capturePrecisePosition({ maxWaitMs = 18000, targetAccuracy = 12 } = {}) {
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
        if (shouldAcceptReading(reading)) {
          setUser(reading, { follow: false });
        }
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
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 },
    );
  });
}

/** Botão ⌖ — força novo GPS fino (substitui posição imprecisa). */
export function refreshGpsPosition(onSuccess, onFail) {
  if (!navigator.geolocation || !window.isSecureContext) {
    toast('GPS indisponível — use Chrome/Safari com HTTPS.');
    onFail?.('unsupported');
    return;
  }

  releaseLocating();
  locating = true;
  showSearching();

  capturePrecisePosition({ maxWaitMs: 20000, targetAccuracy: 15 })
    .then((reading) => {
      setUser(reading, { center: true, zoom: 18 });
      clearWatch();
      beginTracking();
      releaseLocating();
      const m = reading.accuracy != null ? `±${Math.round(reading.accuracy)} m` : '';
      toast(`Localização corrigida ${m}`.trim());
      onSuccess?.(reading);
    })
    .catch(() => {
      releaseLocating();
      toast('GPS impreciso — saia de prédios, ative localização e tente de novo.');
      onFail?.('timeout');
    });
}

async function tryApprox(onSuccess, onFallback, reason) {
  showSearching();
  hideAwaitingPermission();

  const approx = await fetchApproxLocation();
  if (approx) {
    hideRecover();
    const location = { lat: approx.lat, lng: approx.lng, gps: false, approx: true, accuracy: null };
    setUser(location, { center: true, zoom: 13 });
    releaseLocating();
    const city = approx.city ? ` (${approx.city})` : '';
    toast(`Posição pela internet${city} — pode errar km. Toque ⌖ para GPS.`);
    onSuccess(location);
    return;
  }

  releaseLocating();
  if (reason === 'denied') showPermissionDenied();
  else showRecover(reason);
  onFallback(reason);
}

function failDenied(onFallback) {
  hideAwaitingPermission();
  showPermissionDenied();
  releaseLocating();
  onFallback('denied');
}

function attemptGeo(onSuccess, onFallback, index = 0, lastErr = 'timeout') {
  if (index >= GEO_ATTEMPTS.length) {
    hideAwaitingPermission();
    releaseLocating();
    showRecover(lastErr);
    onFallback(lastErr);
    return;
  }

  const opt = GEO_ATTEMPTS[index];
  readPosition(opt, opt.timeout + 3000)
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
        failDenied(onFallback);
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
    releaseLocating();
    showRecover('insecure');
    onFallback('insecure');
    return;
  }

  if (!navigator.geolocation) {
    releaseLocating();
    showRecover('unsupported');
    onFallback('unsupported');
    return;
  }

  hideRecover();
  showAwaitingPermission();

  capturePrecisePosition({ maxWaitMs: 30000, targetAccuracy: 25 })
    .then((reading) => {
      hideAwaitingPermission();
      showSearching();
      setUser(reading, { center: true, zoom: 18 });
      releaseLocating();
      onSuccess(reading);
    })
    .catch((err) => {
      const kind = errorKind(err);
      if (kind === 'denied') {
        failDenied(onFallback);
        return;
      }
      attemptGeo(onSuccess, onFallback);
    });
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
