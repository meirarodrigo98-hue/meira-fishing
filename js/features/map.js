import { state, setUserPos } from '../lib/state.js';
import { rankPoints } from '../lib/scoring.js';
import { km, NEARBY_KM } from '../lib/utils.js';

/** Mapa Leaflet — marcadores, rota, destaque do melhor ponto. */
let map = null;
let userMarker = null;
let routeLine = null;
let bestPointId = null;
const markers = new Map();

function markerIcon(point, isBest, far = false) {
  const best = isBest ? ' best' : '';
  const dim = far ? ' far' : '';
  return L.divIcon({
    className: '',
    html: `<div class="marker ${point.mode}${best}${dim}"></div>`,
    iconSize: [22, 30],
    iconAnchor: [11, 30],
  });
}

export function createMap(points, onPointClick) {
  map = L.map('map', { zoomControl: false, attributionControl: true }).setView([-22.98, -43.2], 12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OSM',
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  points.forEach((p) => {
    const marker = L.marker([p.lat, p.lng], { icon: markerIcon(p, false) })
      .bindTooltip(p.name, { direction: 'top', offset: [0, -24] })
      .on('click', () => onPointClick(p));
    markers.set(p.id, marker);
    marker.addTo(map);
  });

  if (points.length) {
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.08));
  }

  return map;
}

export function setBestPointId(id) {
  bestPointId = id;
}

export function invalidateMapSize() {
  if (!map) return;
  setTimeout(() => map.invalidateSize(), 0);
  setTimeout(() => map.invalidateSize(), 220);
}

export function setUser(pos, center = false) {
  setUserPos(pos);
  if (!map) return;

  if (!userMarker) {
    userMarker = L.circleMarker([pos.lat, pos.lng], {
      radius: 8,
      color: '#fff',
      weight: 2,
      fillColor: '#38bdf8',
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip('Você');
  } else {
    userMarker.setLatLng([pos.lat, pos.lng]);
  }

  if (center) map.setView([pos.lat, pos.lng], 13);
}

export function flyToPoint(point) {
  if (!map) return;
  map.flyTo([point.lat, point.lng], 14, { duration: 0.5 });
}

export function fitNearby(points, maxKm = NEARBY_KM) {
  if (!map || !state.userPos) return;
  const near = points.filter((p) => km(state.userPos, p) <= maxKm);
  const bounds = L.latLngBounds([[state.userPos.lat, state.userPos.lng]]);
  near.forEach((p) => bounds.extend([p.lat, p.lng]));
  map.fitBounds(bounds.pad(0.18), { duration: 0.6 });
}

export function renderMarkers(points) {
  if (!map) return;
  const ranked = rankPoints(points, state.userPos, state.filter, state.weather);
  const radarOn = document.body.classList.contains('app-ready');

  points.forEach((p) => {
    const marker = markers.get(p.id);
    if (!marker) return;

    const row = ranked.find((r) => r.p.id === p.id);
    const distance = row?.distance ?? (state.userPos ? km(state.userPos, p) : null);
    const isNear = !radarOn || distance == null || distance <= NEARBY_KM;
    const isBest = p.id === bestPointId;

    marker.setIcon(markerIcon(p, isBest, radarOn && !isNear));

    if (!radarOn || isNear) {
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
  if (map && state.userPos) map.setView([state.userPos.lat, state.userPos.lng], 13);
}
