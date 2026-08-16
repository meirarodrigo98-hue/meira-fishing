/** Armazenamento redundante dos pontos pessoais — localStorage + IndexedDB + snapshots. */
const LS_KEY = 'mf_mypoints';
const DB_NAME = 'meira-fishing';
const DB_VER = 1;
const STORE = 'points';
const SNAP = 'snapshots';
const MAX_SNAPS = 40;

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLocal(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('no-idb'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(SNAP)) db.createObjectStore(SNAP);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db, store, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbKeys(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAllKeys();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function pointTime(p) {
  const t = p.updatedAt || p.createdAt || 0;
  return typeof t === 'string' ? Date.parse(t) || 0 : Number(t) || 0;
}

export function mergePointLists(...lists) {
  const byId = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      if (!p?.id) continue;
      const prev = byId.get(p.id);
      if (!prev || pointTime(p) >= pointTime(prev)) byId.set(p.id, p);
    }
  }
  return [...byId.values()].sort((a, b) => pointTime(b) - pointTime(a));
}

async function readIdbPoints() {
  try {
    const db = await openDb();
    const data = await idbGet(db, STORE, 'current');
    db.close();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeIdbPoints(list) {
  try {
    const db = await openDb();
    await idbPut(db, STORE, 'current', list);
    db.close();
  } catch {
    /* localStorage ainda guarda cópia */
  }
}

async function pushSnapshot(list) {
  if (!list.length) return;
  try {
    const db = await openDb();
    const key = new Date().toISOString();
    await idbPut(db, SNAP, key, { at: key, count: list.length, points: list });
    const keys = (await idbKeys(db, SNAP)).sort();
    while (keys.length > MAX_SNAPS) {
      await idbDelete(db, SNAP, keys.shift());
    }
    db.close();
  } catch {
    /* ok */
  }
}

/** Sincroniza fontes ao abrir o app — recupera se localStorage foi apagado. */
export async function initPointStore() {
  const local = readLocal();
  const idb = await readIdbPoints();
  const merged = mergePointLists(local, idb);
  writeLocal(merged);
  await writeIdbPoints(merged);
  return merged;
}

export function loadStoredPoints() {
  return readLocal();
}

export function saveStoredPoints(list) {
  writeLocal(list);
  writeIdbPoints(list);
  pushSnapshot(list);
}

export async function listSnapshots() {
  try {
    const db = await openDb();
    const keys = (await idbKeys(db, SNAP)).sort().reverse();
    const out = [];
    for (const key of keys.slice(0, 12)) {
      const snap = await idbGet(db, SNAP, key);
      if (snap) out.push({ at: snap.at || key, count: snap.count || snap.points?.length || 0 });
    }
    db.close();
    return out;
  } catch {
    return [];
  }
}

export async function restoreSnapshot(at) {
  try {
    const db = await openDb();
    const snap = await idbGet(db, SNAP, at);
    db.close();
    if (!snap?.points?.length) return null;
    const merged = mergePointLists(readLocal(), snap.points);
    saveStoredPoints(merged);
    return merged;
  } catch {
    return null;
  }
}
