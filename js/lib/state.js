/** Estado global simples — um lugar para ler/escrever o que o app compartilha. */
export const state = {
  userPos: null,
  filter: 'todos',
  selected: null,
  weather: null,
  navigating: false,
};

export function setUserPos(pos) {
  state.userPos = pos ? { lat: pos.lat, lng: pos.lng } : null;
}

export function setWeather(data) {
  state.weather = data;
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
