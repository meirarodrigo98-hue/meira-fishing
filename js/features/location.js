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
  { enableHighAccuracy: true, timeout: 22000, maximumAge: 0 },
  { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
  { enableHighAccuracy: true, timeout: 40000, maximumAge: 0 },
];

const WATCH_OPTS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 60000,
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
  if (state.userPos.approx || !state.userPos.gps) return true;
  const acc = reading.accuracy ?? 9999;
  const cur = state.userPos.accuracy ?? 9999;
  if (acc <= cur) return true;
  if (cur > 50) return acc < cur;
  return false;
}

function pushReading(readings, reading) {
  readings.push(reading);
  if (shouldAcceptReading(reading)) {
    setUser(reading, { follow: false });
  }
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

function finishGpsSession(reading, onSuccess, { toastMsg } = {}) {
  hideAwaitingPermission();
  showSearching();
  setUser(reading, { center: true, zoom: 18 });
  clearWatch();
  beginTracking();
  releaseLocating();
  if (toastMsg) toast(toastMsg);
  onSuccess?.(reading);
}

function gpsToast(reading, prefix = 'Localização corrigida') {
  const m = reading.accuracy != null ? `±${Math.round(reading.accuracy)} m` : '';
  return `${prefix} ${m}`.trim();
}

/** Amostra GPS fino — escolhe a leitura mais precisa. Ignora timeouts transitórios do watch. */
export function capturePrecisePosition({ maxWaitMs = 22000, targetAccuracy = 12 } = {}) {
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

    const onPos = (pos) => {
      if (settled || !validCoords(pos)) return;
      const reading = posFromReading(pos);
      pushReading(readings, reading);
      const acc = reading.accuracy ?? 9999;
      if (acc <= targetAccuracy) finish(false);
    };

    const timer = setTimeout(() => finish(true), maxWaitMs);

    readPosition({ enableHighAccuracy: true, timeout: 18000, maximumAge: 0 }, 20000)
      .then(onPos)
      .catch(() => {});

    wId = navigator.geolocation.watchPosition(
      onPos,
      (err) => {
        if (errorKind(err) === 'denied' && !readings.length) {
          settled = true;
          clearTimeout(timer);
          if (wId != null) navigator.geolocation.clearWatch(wId);
          reject(err);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 },
    );
  });
}

function runGeoFallback(onSuccess, onFallback, onReading) {
  attemptGeo(
    (reading) => {
      if (onReading) onReading(reading);
      else onSuccess(reading);
    },
    onFallback,
  );
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

  const done = (reading) =>
    finishGpsSession(reading, onSuccess, { toastMsg: gpsToast(reading) });

  const fail = () => {
    releaseLocating();
    toast('GPS impreciso — saia de prédios, ative localização e tente de novo.');
    onFail?.('timeout');
  };

  capturePrecisePosition({ maxWaitMs: 28000, targetAccuracy: 25 })
    .then(done)
    .catch((err) => {
      if (errorKind(err) === 'denied') {
        releaseLocating();
        toast('GPS bloqueado — permita localização nas configurações.');
        onFail?.('denied');
        return;
      }
      runGeoFallback(
        (reading) => done(reading),
        () => fail(),
        (reading) => done(reading),
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
  readPosition(opt, opt.timeout + 4000)
    .then((pos) => {
      if (!validCoords(pos)) {
        attemptGeo(onSuccess, onFallback, index + 1, 'unavailable');
        return;
      }
      const reading = posFromReading(pos);
      succeedGps(pos, () => onSuccess(reading));
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

  capturePrecisePosition({ maxWaitMs: 35000, targetAccuracy: 30 })
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
      runGeoFallback(onSuccess, onFallback);
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

/** GPS considerado fino quando precisão ≤ este valor (metros). */
export const FINE_GPS_MAX_M = 40;

export function isFineGps(pos = state.userPos) {
  if (!pos || pos.approx || !pos.gps) return false;
  const acc = pos.accuracy;
  return acc == null || acc <= FINE_GPS_MAX_M;
}
