// Service to manage event restrictions (frontend-only)
// Stores which users can see/access specific events

const RESTRICTIONS_KEY = 'eventRestrictions';

/**
 * Get all restrictions
 * @returns {Object} { [eventId]: [userId1, userId2, ...] }
 */
export function getAllRestrictions() {
  try {
    const stored = localStorage.getItem(RESTRICTIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error('Error loading restrictions:', err);
    return {};
  }
}

/**
 * Get restricted user IDs for a specific event
 * @param {string} eventId 
 * @returns {string[]} Array of user IDs
 */
export function getRestrictedUsers(eventId) {
  const restrictions = getAllRestrictions();
  if (!eventId) return [];
  // Try both string and original format
  const eventIdStr = String(eventId);
  return restrictions[eventIdStr] || restrictions[eventId] || [];
}

/**
 * Set restricted users for an event
 * @param {string} eventId 
 * @param {string[]} userIds Array of user IDs that can access this event
 */
export function setRestrictedUsers(eventId, userIds) {
  try {
    if (!eventId) return;
    const restrictions = getAllRestrictions();
    const eventIdStr = String(eventId);
    // Normalize userIds to strings
    const normalizedUserIds = userIds ? userIds.map(id => String(id)) : [];
    
    if (!normalizedUserIds || normalizedUserIds.length === 0) {
      // Remove restriction if empty array
      delete restrictions[eventIdStr];
      delete restrictions[eventId]; // Also remove if stored with original format
    } else {
      restrictions[eventIdStr] = normalizedUserIds;
    }
    localStorage.setItem(RESTRICTIONS_KEY, JSON.stringify(restrictions));
  } catch (err) {
    console.error('Error saving restrictions:', err);
  }
}

/**
 * Check if current user can access an event
 * @param {string} eventId 
 * @returns {boolean} true if user can access, false otherwise
 */
export function canUserAccessEvent(eventId) {
  try {
    if (!eventId) return true; // No ID means allow access
    
    const eventIdStr = String(eventId);
    const restrictedUsers = getRestrictedUsers(eventIdStr);
    
    // If no restrictions, event is accessible to all
    if (restrictedUsers.length === 0) {
      return true;
    }
    
    // Get current user
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return false;
    
    const user = JSON.parse(rawUser);
    const userId = user._id || user.id;
    if (!userId) return false;
    
    const userIdStr = String(userId);
    
    // Check if user is in restricted list (compare as strings)
    const hasAccess = restrictedUsers.some(restrictedId => 
      String(restrictedId) === userIdStr
    );
    
    // Debug logging
    if (!hasAccess) {
      console.log('Access denied for event:', eventIdStr, 'User:', userIdStr, 'Restricted to:', restrictedUsers);
    }
    
    return hasAccess;
  } catch (err) {
    console.error('Error checking access:', err);
    return true; // Default to accessible on error
  }
}

/**
 * Remove restriction for an event (make it accessible to all)
 * @param {string} eventId 
 */
export function removeRestriction(eventId) {
  setRestrictedUsers(eventId, []);
}

/**
 * Get all events that are restricted (have restrictions set)
 * @returns {string[]} Array of event IDs
 */
export function getRestrictedEventIds() {
  const restrictions = getAllRestrictions();
  return Object.keys(restrictions).filter(eventId => {
    const users = restrictions[eventId];
    return users && users.length > 0;
  });
}

