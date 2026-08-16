import { $ } from '../lib/utils.js';
import { invalidateMapSize } from './map.js';

/** Faixa arrastável — segue o dedo, snap com inércia. */
const SNAPS = { hidden: 0, mini: 0.28, mid: 0.52, full: 0.82 };
const SNAP_NAMES = ['mini', 'mid', 'full'];
const PULL_ZONE = 56;

let currentSnap = 'hidden';
let liveRatio = 0;
let dragging = false;
let startY = 0;
let startRatio = 0;
let lastY = 0;
let lastT = 0;
let velocity = 0;
let onSnapChange = null;
let resizeQueued = false;

function applyHeight(ratio) {
  liveRatio = ratio;
  const pct = `${ratio * 100}vh`;
  document.documentElement.style.setProperty('--sheet-h', pct);
  const map = $('map');
  const open = ratio > 0.02;
  if (map) {
    map.style.bottom = open ? pct : '0';
    map.classList.toggle('has-sheet', open);
  }
  document.body.classList.toggle('map-full', !open);

  if (!resizeQueued) {
    resizeQueued = true;
    requestAnimationFrame(() => {
      invalidateMapSize();
      resizeQueued = false;
    });
  }
}

function setCollapsed(collapsed) {
  const sheet = $('sheet');
  if (!sheet) return;
  sheet.classList.toggle('collapsed', collapsed);
}

function pickSnap(ratio, vel) {
  if (ratio < 0.1 || (vel < -0.35 && ratio < 0.22)) return 'hidden';

  let target = SNAP_NAMES[0];
  let best = Infinity;
  for (const name of SNAP_NAMES) {
    let dist = Math.abs(SNAPS[name] - ratio);
    if (vel > 0.25 && SNAPS[name] > ratio) dist -= 0.08;
    if (vel < -0.25 && SNAPS[name] < ratio) dist -= 0.08;
    if (dist < best) {
      best = dist;
      target = name;
    }
  }
  return target;
}

function beginDrag(clientY, fromRatio) {
  if ($('sheetDetail')?.classList.contains('show')) return false;

  dragging = true;
  startY = clientY;
  lastY = clientY;
  lastT = performance.now();
  velocity = 0;
  startRatio = fromRatio ?? (SNAPS[currentSnap] ?? 0);

  const sheet = $('sheet');
  sheet.classList.add('dragging');
  sheet.classList.remove('collapsed');
  $('map')?.classList.add('no-transition');
  return true;
}

function moveDrag(clientY) {
  if (!dragging) return;
  const now = performance.now();
  const dt = now - lastT;
  if (dt > 0) velocity = (lastY - clientY) / window.innerHeight / dt;
  lastY = clientY;
  lastT = now;

  const ratio = Math.max(0, Math.min(0.9, startRatio + (startY - clientY) / window.innerHeight));
  applyHeight(ratio);
}

function endDrag(clientY) {
  if (!dragging) return;
  dragging = false;

  const sheet = $('sheet');
  sheet.classList.remove('dragging');
  $('map')?.classList.remove('no-transition');

  const ratio = Math.max(0, Math.min(0.9, startRatio + (startY - clientY) / window.innerHeight));
  snapTo(pickSnap(ratio, velocity));
}

function canStartSheetDrag(target) {
  return !!target.closest('.sheet-drag, .sheet-head, .filters, .sheet-grip');
}

function bindDragSurface(el) {
  el.addEventListener(
    'touchstart',
    (e) => {
      if (currentSnap === 'hidden') return;
      if (!canStartSheetDrag(e.target)) return;
      if (beginDrag(e.touches[0].clientY, SNAPS[currentSnap] ?? liveRatio)) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  el.addEventListener(
    'touchmove',
    (e) => {
      if (!dragging) return;
      e.preventDefault();
      moveDrag(e.touches[0].clientY);
    },
    { passive: false },
  );

  el.addEventListener('touchend', (e) => endDrag(e.changedTouches[0].clientY));
  el.addEventListener('touchcancel', (e) => endDrag(e.changedTouches[0]?.clientY ?? lastY));

  el.addEventListener('mousedown', (e) => {
    if (currentSnap === 'hidden') return;
    if (!canStartSheetDrag(e.target)) return;
    if (!beginDrag(e.clientY, SNAPS[currentSnap] ?? liveRatio)) return;
    e.preventDefault();

    const move = (ev) => moveDrag(ev.clientY);
    const up = (ev) => {
      endDrag(ev.clientY);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
}

function bindBottomPull() {
  document.addEventListener(
    'touchstart',
    (e) => {
      if (currentSnap !== 'hidden') return;
      if ($('sheetDetail')?.classList.contains('show')) return;
      if ($('openPoints')?.classList.contains('hidden')) return;
      const y = e.touches[0].clientY;
      if (y < window.innerHeight - PULL_ZONE) return;
      beginDrag(y, 0);
    },
    { passive: true },
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!dragging || currentSnap !== 'hidden') return;
      if (liveRatio <= 0 && startRatio <= 0) {
        e.preventDefault();
        moveDrag(e.touches[0].clientY);
      }
    },
    { passive: false },
  );

  document.addEventListener('touchend', (e) => {
    if (!dragging) return;
    const touch = e.changedTouches[0];
    if (touch) endDrag(touch.clientY);
  });
}

export function initSheet(callback) {
  onSnapChange = callback;
  const sheet = $('sheet');
  bindDragSurface(sheet);
  bindBottomPull();
  collapseSheet();
  return { snapTo, getSnap: () => currentSnap };
}

export function snapTo(name) {
  if (!SNAPS[name] && name !== 'hidden') return;
  currentSnap = name;
  const ratio = SNAPS[name];
  applyHeight(ratio);
  const sheet = $('sheet');
  sheet.dataset.snap = name;
  setCollapsed(name === 'hidden');
  onSnapChange?.(name);
}

export function collapseSheet() {
  snapTo('hidden');
}

export function openSheet() {
  setCollapsed(false);
  snapTo('mini');
}

export function expandFull() {
  setCollapsed(false);
  snapTo('full');
}

export function getSnap() {
  return currentSnap;
}
