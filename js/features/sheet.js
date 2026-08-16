import { $ } from '../lib/utils.js';
import { invalidateMapSize } from './map.js';

/** Faixa arrastável — mini / meio / cheio. */
const SNAPS = { mini: 0.34, mid: 0.52, full: 0.88 };
const SNAP_ORDER = ['mini', 'mid', 'full'];

let currentSnap = 'mini';
let dragging = false;
let startY = 0;
let startH = 0;
let onSnapChange = null;

function applyHeight(ratio) {
  document.documentElement.style.setProperty('--sheet-h', `${ratio * 100}vh`);
  const map = $('map');
  if (map) map.style.bottom = `${ratio * 100}vh`;
  invalidateMapSize();
}

function nearestSnap(ratio) {
  let best = SNAP_ORDER[0];
  let bestDist = Infinity;
  for (const name of SNAP_ORDER) {
    const dist = Math.abs(SNAPS[name] - ratio);
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  return best;
}

export function initSheet(callback) {
  onSnapChange = callback;
  const sheet = $('sheet');
  const dragZone = sheet.querySelector('.sheet-drag');

  const onStart = (clientY) => {
    dragging = true;
    startY = clientY;
    startH = SNAPS[currentSnap];
    sheet.classList.add('dragging');
    $('map')?.classList.add('no-transition');
  };

  const onMove = (clientY) => {
    if (!dragging) return;
    const vh = window.innerHeight / 100;
    const delta = (startY - clientY) / vh / 100;
    const next = Math.max(0.28, Math.min(0.92, startH + delta));
    applyHeight(next);
  };

  const onEnd = (clientY) => {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('dragging');
    $('map')?.classList.remove('no-transition');

    const vh = window.innerHeight / 100;
    const delta = (startY - clientY) / vh / 100;
    const finalRatio = Math.max(0.28, Math.min(0.92, startH + delta));
    snapTo(nearestSnap(finalRatio));
  };

  dragZone.addEventListener('touchstart', (e) => onStart(e.touches[0].clientY), { passive: true });
  dragZone.addEventListener('touchmove', (e) => onMove(e.touches[0].clientY), { passive: true });
  dragZone.addEventListener('touchend', (e) => onEnd(e.changedTouches[0].clientY));

  dragZone.addEventListener('mousedown', (e) => {
    onStart(e.clientY);
    const move = (ev) => onMove(ev.clientY);
    const up = (ev) => {
      onEnd(ev.clientY);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });

  applyHeight(SNAPS.mini);
  return { snapTo, getSnap: () => currentSnap };
}

export function snapTo(name) {
  if (!SNAPS[name]) return;
  currentSnap = name;
  applyHeight(SNAPS[name]);
  $('sheet').dataset.snap = name;
  onSnapChange?.(name);
}

export function expandFull() {
  snapTo('full');
}
