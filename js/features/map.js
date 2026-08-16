import { state, setUserPos } from '../lib/state.js';
import { rankPoints } from '../lib/scoring.js';

/** Mapa Leaflet — marcadores, rota, destaque do melhor ponto. */
let map = null;
let userMarker = null;
let routeLine = null;
let bestPointId = null;
const markers = new Map();

function markerIcon(point, isBest) {
  const best = isBest ? ' best' : '';
  return L.divIcon({
    className: '',
    html: `<div class="marker ${point.mode}${best}"></div>`,
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
  });

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

export function renderMarkers(points) {
  if (!map) return;
  const ranked = rankPoints(points, state.userPos, state.filter, state.weather);
  const visible = new Set(ranked.map((x) => x.p.id));
  const showAll = state.pointsRevealed || state.navigating;

  points.forEach((p) => {
    const marker = markers.get(p.id);
    if (!marker) return;

    const isBest = p.id === bestPointId;
    marker.setIcon(markerIcon(p, isBest));

    const shouldShow =
      showAll && visible.has(p.id)
        ? true
        : state.navigating && state.selected?.id === p.id;

    if (shouldShow) {
      if (!map.hasLayer(marker)) marker.addTo(map);
    } else if (map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  });
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
