import { $ } from '../lib/utils.js';

/** Painel on/off — sem arraste, sem snap, só CSS. */
let currentSnap = 'hidden';
let onSnapChange = null;

export function initSheet(callback) {
  onSnapChange = callback;
}

function setSnap(name) {
  currentSnap = name;
  $('sheet')?.setAttribute('data-snap', name);
  onSnapChange?.(name);
}

export function openSheet() {
  $('sheet')?.classList.add('open');
  setSnap('mini');
}

export function collapseSheet() {
  $('sheet')?.classList.remove('open');
  setSnap('hidden');
}

export function snapTo(name) {
  if (name === 'hidden') collapseSheet();
  else openSheet();
}

export function expandFull() {
  openSheet();
}

export function getSnap() {
  return currentSnap;
}
