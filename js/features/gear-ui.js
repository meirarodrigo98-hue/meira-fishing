import { GEAR, emptyGear, isGearReady, loadGear, saveGear, gearSummary } from '../lib/gear.js';
import { $ } from '../lib/utils.js';

/** UI do material de pesca — cards premium, sem re-render bugado. */
let draft = emptyGear();
let onSaved = null;

const LABELS = {
  rod: 'Vara',
  reel: 'Molinete',
  line: 'Linha',
  baits: 'Iscas na mochila',
  sinkers: 'Chumbos',
  extras: 'Extras',
};

const HINTS = {
  rod: 'Escolha a vara que você leva com mais frequência',
  reel: 'Tamanho do molinete ou carretilha',
  line: 'Espessura principal da linha',
  baits: 'Toque para marcar o que você tem hoje',
  sinkers: 'Opcional — ajuda na estratégia com vento',
  extras: 'Opcional — leader, barco…',
};

const SINGLE = ['rod', 'reel', 'line'];
const MULTI = ['baits', 'sinkers', 'extras'];

export function initGearUi({ onSave } = {}) {
  onSaved = onSave;
  const root = $('gearForm');
  if (!root || root.dataset.ready) return;

  root.innerHTML = [...SINGLE, ...MULTI].map(renderSection).join('');
  root.addEventListener('click', onChipClick);
  root.dataset.ready = '1';
}

export function loadGearDraft() {
  draft = loadGear();
  paintGearUi();
  return draft;
}

export function paintGearUi() {
  const root = $('gearForm');
  if (!root) return;

  root.querySelectorAll('[data-gear-group]').forEach((chip) => {
    const group = chip.dataset.gearGroup;
    const id = chip.dataset.gearId;
    const multi = chip.dataset.gearMulti === '1';
    const on = multi ? draft[group]?.includes(id) : draft[group] === id;
    chip.classList.toggle('on', on);
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  updateProgress();
}

function onChipClick(e) {
  const chip = e.target.closest('[data-gear-group]');
  if (!chip) return;

  const group = chip.dataset.gearGroup;
  const id = chip.dataset.gearId;
  const multi = chip.dataset.gearMulti === '1';

  if (multi) {
    const set = new Set(draft[group] || []);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    draft[group] = [...set];
  } else if (draft[group] !== id) {
    draft[group] = id;
  }

  paintGearUi();
}

function renderSection(group) {
  const multi = MULTI.includes(group);
  const options = GEAR[group];
  const cards = options
    .map((opt) => {
      const cardClass = multi ? 'gear-pill' : 'gear-card';
      return `<button type="button" class="${cardClass}" data-gear-group="${group}" data-gear-id="${opt.id}" data-gear-multi="${multi ? 1 : 0}" aria-pressed="false">
        ${opt.icon ? `<span class="gear-card-icon" aria-hidden="true">${opt.icon}</span>` : ''}
        <span class="gear-card-label">${opt.label}</span>
        ${opt.detail ? `<span class="gear-card-detail">${opt.detail}</span>` : ''}
      </button>`;
    })
    .join('');

  return `<section class="gear-section">
    <div class="gear-section-head">
      <h4 class="gear-section-title">${LABELS[group]}</h4>
      <p class="gear-section-hint">${HINTS[group]}</p>
    </div>
    <div class="gear-section-body ${multi ? 'is-grid' : 'is-cards'}">${cards}</div>
  </section>`;
}

function updateProgress() {
  const essentials = [draft.rod, draft.line, draft.baits?.length].filter(Boolean).length;
  const pct = Math.round((essentials / 3) * 100);
  $('gearProgressFill')?.style.setProperty('width', `${pct}%`);
  $('gearProgressLabel')?.textContent = `${essentials}/3 essencial · ${draft.baits?.length || 0} iscas`;
  $('gearPanel')?.classList.toggle('is-complete', isGearReady(draft));
}

export function saveGearDraft() {
  if (!draft.rod || !draft.line || !draft.baits?.length) {
    return { ok: false, message: 'Marque vara, linha e ao menos uma isca.' };
  }
  saveGear(draft);
  onSaved?.(draft);
  return { ok: true, summary: gearSummary(draft) };
}

export function getGearDraft() {
  return draft;
}
