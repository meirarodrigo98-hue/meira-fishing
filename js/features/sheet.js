import { $ } from '../lib/utils.js';
import { invalidateMapSize } from './map.js';

/** Faixa arrastável — escondida / mini / meio / cheio. */
const SNAPS = { hidden: 0, mini: 0.38, mid: 0.55, full: 0.88 };
const SNAP_ORDER = ['hidden', 'mini', 'mid', 'full'];

let currentSnap = 'hidden';
let dragging = false;
let startY = 0;
let startH = 0;
let onSnapChange = null;

function applyHeight(ratio) {
  document.documentElement.style.setProperty('--sheet-h', `${ratio * 100}vh`);
  const map = $('map');
  const open = ratio > 0.05;
  if (map) {
    map.style.bottom = open ? `${ratio * 100}vh` : '0';
    map.classList.toggle('has-sheet', open);
  }
  document.body.classList.toggle('map-full', !open);
  invalidateMapSize();
}

function nearestSnap(ratio) {
  if (ratio < 0.12) return 'hidden';
  let best = 'mini';
  let bestDist = Infinity;
  for (const name of ['mini', 'mid', 'full']) {
    const dist = Math.abs(SNAPS[name] - ratio);
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  return best;
}

function setCollapsed(collapsed) {
  $('sheet')?.classList.toggle('collapsed', collapsed);
}

export function initSheet(callback) {
  onSnapChange = callback;
  const sheet = $('sheet');
  const dragZone = sheet.querySelector('.sheet-drag');

  const onStart = (clientY) => {
    if (currentSnap === 'hidden') return;
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
    const next = Math.max(0, Math.min(0.92, startH + delta));
    applyHeight(next);
    setCollapsed(next < 0.05);
  };

  const onEnd = (clientY) => {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('dragging');
    $('map')?.classList.remove('no-transition');

    const vh = window.innerHeight / 100;
    const delta = (startY - clientY) / vh / 100;
    const finalRatio = Math.max(0, Math.min(0.92, startH + delta));
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

  collapseSheet();
  return { snapTo, getSnap: () => currentSnap };
}

export function snapTo(name) {
  if (!SNAPS[name] && name !== 'hidden') return;
  currentSnap = name;
  const ratio = SNAPS[name];
  applyHeight(ratio);
  $('sheet').dataset.snap = name;
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
