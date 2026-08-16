/** Estado global simples — um lugar para ler/escrever o que o app compartilha. */
export const state = {
  userPos: null,
  filter: 'todos',
  selected: null,
  weatherByPoint: new Map(),
  weatherEstimated: false,
  navigating: false,
  followUser: true,
};

export function setUserPos(pos) {
  state.userPos = pos
    ? {
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy ?? null,
        gps: pos.gps !== false && !pos.approx,
        approx: !!pos.approx,
      }
    : null;
}

export function clearPointWeather() {
  state.weatherByPoint.clear();
  state.weatherEstimated = false;
}

export function setPointWeather(id, data, estimated = false) {
  state.weatherByPoint.set(id, { data, estimated });
  if (estimated) state.weatherEstimated = true;
}

export function getPointWeather(id) {
  return state.weatherByPoint.get(id)?.data ?? null;
}

export function isPointWeatherEstimated(id) {
  return state.weatherByPoint.get(id)?.estimated ?? false;
}

export function setSelected(point) {
  state.selected = point;
}

export function setFilter(filter) {
  state.filter = filter;
}

export function setNavigating(active) {
  state.navigating = active;
}

export function setFollowUser(on) {
  state.followUser = !!on;
  document.body.classList.toggle('follow-on', state.followUser);
  const btn = document.getElementById('followBtn');
  if (btn) btn.classList.toggle('on', state.followUser);
  const label = document.getElementById('hudLabel');
  if (label && document.body.classList.contains('app-ready') && !state.userPos?.approx) {
    label.textContent = state.followUser ? 'Seguindo você' : 'Radar ativo';
  }
}
