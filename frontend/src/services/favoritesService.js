// Frontend-only favourites storage per user using localStorage

function keyForUser() {
  try {
    if (typeof localStorage === 'undefined') return 'favourites:guest';
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    const id = (user && (user._id || user.id)) || 'guest';
    return `favourites:${id}`;
  } catch (_) {
    return 'favourites:guest';
  }
}

function loadIds() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(keyForUser());
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
  } catch (_) {
    return [];
  }
}

function saveIds(ids) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(keyForUser(), JSON.stringify(Array.from(new Set(ids.map(String)))));
    }
  } catch (_) {
    // ignore
  }
}

export function getFavouriteIds() {
  return loadIds();
}

export function isFavourite(eventId) {
  const ids = loadIds();
  return ids.includes(String(eventId));
}

export function addFavourite(eventId) {
  const ids = loadIds();
  if (!ids.includes(String(eventId))) {
    ids.push(String(eventId));
    saveIds(ids);
  }
  return ids;
}

export function removeFavourite(eventId) {
  let ids = loadIds();
  ids = ids.filter((id) => String(id) !== String(eventId));
  saveIds(ids);
  return ids;
}

export function toggleFavourite(eventId) {
  const id = String(eventId);
  const ids = loadIds();
  if (ids.includes(id)) {
    return removeFavourite(id);
  }
  return addFavourite(id);
}

export default {
  getFavouriteIds,
  isFavourite,
  addFavourite,
  removeFavourite,
  toggleFavourite,
};

