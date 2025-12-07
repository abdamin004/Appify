// Favorites service - now uses backend API instead of localStorage

import { addEventToFavorites, removeEventFromFavorites, getMyFavoriteEvents } from './eventService';
import { API_BASE } from './eventService';

const API_BASE_URL = API_BASE || 'http://localhost:5001/api';

// Helper function to get auth token
function getAuthToken() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('token') || null;
  } catch {
    return null;
  }
}

// Helper function to make authenticated requests
async function http(method, url, body) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.message || data.error || msg;
    } catch (_) { }
    throw new Error(msg);
  }
  return res.json();
}

// Cache for favorite IDs to avoid repeated API calls
let cachedFavoriteIds = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30000; // 30 seconds

// Get favorite event IDs from backend
export async function getFavouriteIds() {
  try {
    // Check cache first
    if (cachedFavoriteIds && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      return Array.isArray(cachedFavoriteIds) ? cachedFavoriteIds : [];
    }

    const res = await getMyFavoriteEvents();
    
    // Ensure we have an array
    let eventsArray = [];
    if (Array.isArray(res)) {
      eventsArray = res;
    } else if (res && Array.isArray(res.events)) {
      eventsArray = res.events;
    } else if (res && res.events && typeof res.events === 'object') {
      // Handle case where events might be an object
      eventsArray = [];
    }
    
    // Extract IDs and ensure they're strings
    const ids = eventsArray
      .map(event => {
        if (!event) return null;
        const id = event._id || event.id;
        return id ? String(id) : null;
      })
      .filter(Boolean);
    
    cachedFavoriteIds = ids;
    cacheTimestamp = Date.now();
    return ids;
  } catch (err) {
    console.error('Error fetching favorite IDs:', err);
    // Return cached data if available, otherwise empty array
    return Array.isArray(cachedFavoriteIds) ? cachedFavoriteIds : [];
  }
}

// Check if an event is in favorites
export async function isFavourite(eventId) {
  const ids = await getFavouriteIds();
  return ids.includes(String(eventId));
}

// Add event to favorites (backend API)
export async function addFavourite(eventId) {
  try {
    await addEventToFavorites(eventId);
    // Invalidate cache
    cachedFavoriteIds = null;
    cacheTimestamp = null;
    // Return updated list
    return await getFavouriteIds();
  } catch (err) {
    console.error('Error adding favorite:', err);
    throw err;
  }
}

// Remove event from favorites (backend API)
export async function removeFavourite(eventId) {
  try {
    await removeEventFromFavorites(eventId);
    // Invalidate cache
    cachedFavoriteIds = null;
    cacheTimestamp = null;
    // Return updated list
    return await getFavouriteIds();
  } catch (err) {
    console.error('Error removing favorite:', err);
    throw err;
  }
}

// Toggle favorite status
export async function toggleFavourite(eventId) {
  const id = String(eventId);
  const isFav = await isFavourite(id);
  if (isFav) {
    return await removeFavourite(id);
  } else {
    return await addFavourite(id);
  }
}

// Invalidate cache (call this after any favorite operation)
export function invalidateCache() {
  cachedFavoriteIds = null;
  cacheTimestamp = null;
}

export default {
  getFavouriteIds,
  isFavourite,
  addFavourite,
  removeFavourite,
  toggleFavourite,
  invalidateCache,
};

