// Frontend-only attendance storage per user using localStorage

function keyForUser() {
  try {
    if (typeof localStorage === 'undefined') return 'attendance:guest';
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    const id = (user && (user._id || user.id)) || 'guest';
    return `attendance:${id}`;
  } catch (_) {
    return 'attendance:guest';
  }
}

export function getAttendedIds() {
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
  } catch (_) {}
}

export function isAttended(eventId) {
  const ids = getAttendedIds();
  return ids.includes(String(eventId));
}

export function markAttended(eventId) {
  const ids = getAttendedIds();
  if (!ids.includes(String(eventId))) {
    ids.push(String(eventId));
    saveIds(ids);
  }
  return ids;
}

export function unmarkAttended(eventId) {
  let ids = getAttendedIds();
  ids = ids.filter(id => String(id) !== String(eventId));
  saveIds(ids);
  return ids;
}

export function toggleAttended(eventId) {
  const id = String(eventId);
  const ids = getAttendedIds();
  if (ids.includes(id)) {
    return unmarkAttended(id);
  }
  return markAttended(id);
}

export default { getAttendedIds, isAttended, markAttended, unmarkAttended, toggleAttended };

