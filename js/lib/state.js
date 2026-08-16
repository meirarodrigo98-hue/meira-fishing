/** Estado global simples — um lugar para ler/escrever o que o app compartilha. */
export const state = {
  userPos: null,
  filter: 'todos',
  selected: null,
  weather: null,
  weatherEstimated: false,
  pointsRevealed: false,
  navigating: false,
};

export function setUserPos(pos) {
  state.userPos = pos ? { lat: pos.lat, lng: pos.lng } : null;
}

export function setWeather(data, estimated = false) {
  state.weather = data;
  state.weatherEstimated = estimated;
}

export function setPointsRevealed(revealed) {
  state.pointsRevealed = revealed;
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
