/**
 * Utility functions for detecting time overlaps between events, gym sessions, and court reservations
 */

/**
 * Check if two time ranges overlap
 * @param {Date|string} start1 - Start time of first event
 * @param {Date|string} end1 - End time of first event (optional, defaults to start1 + 1 hour)
 * @param {Date|string} start2 - Start time of second event
 * @param {Date|string} end2 - End time of second event (optional, defaults to start2 + 1 hour)
 * @returns {boolean} - True if the time ranges overlap
 */
export function doTimesOverlap(start1, end1, start2, end2) {
  try {
    const s1 = new Date(start1);
    const e1 = end1 ? new Date(end1) : new Date(s1.getTime() + 60 * 60 * 1000); // Default 1 hour
    const s2 = new Date(start2);
    const e2 = end2 ? new Date(end2) : new Date(s2.getTime() + 60 * 60 * 1000); // Default 1 hour

    // Check if ranges overlap: start1 < end2 && start2 < end1
    return s1 < e2 && s2 < e1;
  } catch (error) {
    console.error('Error checking time overlap:', error);
    return false;
  }
}

/**
 * Get the end time of an event
 * @param {Object} event - Event object
 * @returns {Date|null} - End time or null if not available
 */
function getEventEndTime(event) {
  if (event.endDate) {
    return new Date(event.endDate);
  }
  if (event.startDate && event.duration) {
    // duration in minutes
    const start = new Date(event.startDate);
    return new Date(start.getTime() + event.duration * 60 * 1000);
  }
  if (event.startDate) {
    // Default to 2 hours if no end time specified
    const start = new Date(event.startDate);
    return new Date(start.getTime() + 2 * 60 * 60 * 1000);
  }
  return null;
}

/**
 * Get the end time of a gym session
 * @param {Object} session - Gym session object
 * @returns {Date|null} - End time or null if not available
 */
function getGymSessionEndTime(session) {
  if (session.endDate) {
    return new Date(session.endDate);
  }
  if (session.startDate && session.duration) {
    const start = new Date(session.startDate);
    return new Date(start.getTime() + session.duration * 60 * 1000);
  }
  if (session.startDate) {
    // Default to 1 hour for gym sessions
    const start = new Date(session.startDate);
    return new Date(start.getTime() + 60 * 60 * 1000);
  }
  return null;
}

/**
 * Get the end time of a court reservation slot
 * @param {Object} slot - Court slot object
 * @returns {Date|null} - End time or null if not available
 */
function getCourtSlotEndTime(slot) {
  if (slot.endTime && slot.date) {
    const date = new Date(slot.date);
    const [hours, minutes] = slot.endTime.split(':').map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  }
  if (slot.startTime && slot.date) {
    // Default to 1 hour if no end time
    const date = new Date(slot.date);
    const [hours, minutes] = slot.startTime.split(':').map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return new Date(date.getTime() + 60 * 60 * 1000);
  }
  return null;
}

/**
 * Check if a new event overlaps with existing registered events
 * @param {Object} newEvent - The event to check (must have startDate)
 * @param {Array} registeredEvents - Array of already registered events
 * @returns {Array} - Array of conflicting events (empty if no conflicts)
 */
export function checkEventOverlap(newEvent, registeredEvents) {
  if (!newEvent || !newEvent.startDate) {
    return [];
  }

  const newStart = new Date(newEvent.startDate);
  const newEnd = getEventEndTime(newEvent);
  if (!newEnd) {
    return [];
  }

  const conflicts = [];

  registeredEvents.forEach(existingEvent => {
    if (!existingEvent.startDate) return;

    const existingStart = new Date(existingEvent.startDate);
    const existingEnd = getEventEndTime(existingEvent);
    if (!existingEnd) return;

    if (doTimesOverlap(newStart, newEnd, existingStart, existingEnd)) {
      conflicts.push({
        ...existingEvent,
        conflictType: 'event',
        conflictStart: existingStart,
        conflictEnd: existingEnd
      });
    }
  });

  return conflicts;
}

/**
 * Check if a new gym session overlaps with existing registered events/gym sessions
 * @param {Object} newSession - The gym session to check (must have startDate)
 * @param {Array} registeredEvents - Array of already registered events
 * @returns {Array} - Array of conflicting events (empty if no conflicts)
 */
export function checkGymSessionOverlap(newSession, registeredEvents) {
  if (!newSession || !newSession.startDate) {
    return [];
  }

  const newStart = new Date(newSession.startDate);
  const newEnd = getGymSessionEndTime(newSession);
  if (!newEnd) {
    return [];
  }

  const conflicts = [];

  registeredEvents.forEach(existingEvent => {
    if (!existingEvent.startDate) return;

    const existingStart = new Date(existingEvent.startDate);
    let existingEnd;

    // Handle gym sessions differently
    if (existingEvent.type === 'GymSession') {
      existingEnd = getGymSessionEndTime(existingEvent);
    } else {
      existingEnd = getEventEndTime(existingEvent);
    }

    if (!existingEnd) return;

    if (doTimesOverlap(newStart, newEnd, existingStart, existingEnd)) {
      conflicts.push({
        ...existingEvent,
        conflictType: existingEvent.type === 'GymSession' ? 'gym-session' : 'event',
        conflictStart: existingStart,
        conflictEnd: existingEnd
      });
    }
  });

  return conflicts;
}

/**
 * Check if a court reservation slot overlaps with existing registered events/gym sessions
 * @param {Object} slot - The court slot to check (must have date and startTime)
 * @param {Array} registeredEvents - Array of already registered events
 * @returns {Array} - Array of conflicting events (empty if no conflicts)
 */
export function checkCourtSlotOverlap(slot, registeredEvents) {
  if (!slot || !slot.date || !slot.startTime) {
    return [];
  }

  const slotDate = new Date(slot.date);
  const [hours, minutes] = slot.startTime.split(':').map(Number);
  slotDate.setHours(hours || 0, minutes || 0, 0, 0);

  const slotEnd = getCourtSlotEndTime(slot);
  if (!slotEnd) {
    return [];
  }

  const conflicts = [];

  registeredEvents.forEach(existingEvent => {
    if (!existingEvent.startDate) return;

    const existingStart = new Date(existingEvent.startDate);
    let existingEnd;

    if (existingEvent.type === 'GymSession') {
      existingEnd = getGymSessionEndTime(existingEvent);
    } else {
      existingEnd = getEventEndTime(existingEvent);
    }

    if (!existingEnd) return;

    if (doTimesOverlap(slotDate, slotEnd, existingStart, existingEnd)) {
      conflicts.push({
        ...existingEvent,
        conflictType: existingEvent.type === 'GymSession' ? 'gym-session' : 'event',
        conflictStart: existingStart,
        conflictEnd: existingEnd
      });
    }
  });

  return conflicts;
}

/**
 * Format a date and time for display
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatEventDateTime(date) {
  try {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Unknown date';
  }
}

