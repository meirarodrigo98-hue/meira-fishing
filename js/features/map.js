import { state, setUserPos, getPointWeather, setFollowUser } from '../lib/state.js';
import { rankPoints } from '../lib/scoring.js';
import { filterNearby, mapPointIds } from '../lib/utils.js';

/** Mapa Leaflet — marcadores, rota, destaque do melhor ponto. */
let map = null;
let userMarker = null;
let routeLine = null;
let bestPointId = null;
let onPointClickRef = null;
const markers = new Map();

function markerIcon(point, isBest) {
  const mode = point.personal ? 'personal' : point.mode === 'boat' ? 'boat' : 'land';
  const best = isBest ? ' best' : '';
  return L.divIcon({
    className: '',
    html: `<div class="marker ${mode}${best}"></div>`,
    iconSize: [22, 30],
    iconAnchor: [11, 30],
  });
}

function attachMarker(point) {
  if (!map || markers.has(point.id)) return;
  const marker = L.marker([point.lat, point.lng], { icon: markerIcon(point, false) })
    .bindTooltip(point.name, { direction: 'top', offset: [0, -28] })
    .on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      onPointClickRef?.(point);
    });
  markers.set(point.id, marker);
  marker.addTo(map);
}

export function createMap(points, onPointClick) {
  onPointClickRef = onPointClick;
  map = L.map('map', { zoomControl: false, attributionControl: true }).setView([-22.98, -43.2], 11);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OSM',
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  map.on('dragstart', () => setFollowUser(false));

  points.forEach((p) => attachMarker(p));

  if (points.length) {
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.1));
  }

  return map;
}

export function syncMapPoints(points, onPointClick) {
  if (onPointClick) onPointClickRef = onPointClick;
  if (!map) return;
  points.forEach((p) => attachMarker(p));
}

export function removeMapMarker(id) {
  const marker = markers.get(id);
  if (marker && map) map.removeLayer(marker);
  markers.delete(id);
}

export function setBestPointId(id) {
  bestPointId = id;
}

export function invalidateMapSize() {
  if (!map) return;
  setTimeout(() => map.invalidateSize(), 0);
  setTimeout(() => map.invalidateSize(), 220);
}

export function setUser(pos, opts = {}) {
  const options = opts === true ? { center: true } : opts;
  setUserPos(pos);
  if (!map) return;

  if (!userMarker) {
    userMarker = L.circleMarker([pos.lat, pos.lng], {
      radius: 9,
      color: '#fff',
      weight: 2.5,
      fillColor: '#38bdf8',
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip('Você', { direction: 'top', offset: [0, -8] });
  } else {
    userMarker.setLatLng([pos.lat, pos.lng]);
  }

  if (options.center) {
    map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 15), { animate: true });
    return;
  }

  if (options.follow !== false && state.followUser && !state.navigating) {
    map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.35 });
  }
}

export function flyToPoint(point) {
  if (!map) return;
  map.flyTo([point.lat, point.lng], 14, { duration: 0.45 });
}

export function fitNearby(points, subset = null) {
  if (!map || !state.userPos) return;
  const pool = subset?.length
    ? subset
    : filterNearby(rankPoints(points, state.userPos, state.filter, (p) => getPointWeather(p.id))).map(
        (r) => r.p,
      );
  const bounds = L.latLngBounds([[state.userPos.lat, state.userPos.lng]]);
  pool.forEach((p) => bounds.extend([p.lat, p.lng]));
  if (pool.length) {
    map.fitBounds(bounds.pad(0.2), { animate: true, duration: 0.5 });
  } else {
    map.setView([state.userPos.lat, state.userPos.lng], 13, { animate: true });
  }
}

export function renderMarkers(points, visibleIds = null) {
  if (!map) return;

  const showIds = new Set(
    visibleIds ?? mapPointIds(points, state.filter),
  );

  points.forEach((p) => {
    const marker = markers.get(p.id);
    if (!marker) return;

    const isBest = p.id === bestPointId;
    marker.setIcon(markerIcon(p, isBest));

    if (showIds.has(p.id)) {
      if (!map.hasLayer(marker)) marker.addTo(map);
    } else if (map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  });
}

export function onMapBackgroundClick(fn) {
  map?.on('click', fn);
}

export function drawRoute(from, to) {
  if (!map) return;
  clearRoute();
  routeLine = L.polyline(
    [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    { color: '#38bdf8', weight: 3, opacity: 0.85 },
  ).addTo(map);
  map.fitBounds(routeLine.getBounds().pad(0.25));
}

export function updateRoute(from, to) {
  if (!map || !routeLine) return;
  routeLine.setLatLngs([
    [from.lat, from.lng],
    [to.lat, to.lng],
  ]);
}

export function clearRoute() {
  if (map && routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
}

export function recenterUser() {
  if (map && state.userPos) {
    setFollowUser(true);
    map.setView([state.userPos.lat, state.userPos.lng], Math.max(map.getZoom(), 15), { animate: true });
  }
}
