// Frontend-only notification service using localStorage

const NOTIFICATION_KEY_PREFIX = 'professorNotifications_';

// Get notifications for a specific professor
export function getProfessorNotifications(professorId) {
  if (!professorId || typeof localStorage === 'undefined') return [];
  try {
    const key = `${NOTIFICATION_KEY_PREFIX}${professorId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const notifications = JSON.parse(stored);
    return Array.isArray(notifications) ? notifications : [];
  } catch (err) {
    console.error('Error loading notifications:', err);
    return [];
  }
}

// Create a notification for a professor
export function createProfessorNotification(professorId, notification) {
  if (!professorId || typeof localStorage === 'undefined') return;
  try {
    const key = `${NOTIFICATION_KEY_PREFIX}${professorId}`;
    const existing = getProfessorNotifications(professorId);
    const newNotification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...notification,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    const updated = [newNotification, ...existing];
    localStorage.setItem(key, JSON.stringify(updated));
    return newNotification;
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

// Mark a notification as read
export function markNotificationRead(professorId, notificationId) {
  if (!professorId || typeof localStorage === 'undefined') return;
  try {
    const key = `${NOTIFICATION_KEY_PREFIX}${professorId}`;
    const notifications = getProfessorNotifications(professorId);
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
    );
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('Error marking notification as read:', err);
  }
}

// Mark all notifications as read
export function markAllNotificationsRead(professorId) {
  if (!professorId || typeof localStorage === 'undefined') return;
  try {
    const key = `${NOTIFICATION_KEY_PREFIX}${professorId}`;
    const notifications = getProfessorNotifications(professorId);
    const updated = notifications.map(n => ({
      ...n,
      isRead: true,
      readAt: n.isRead ? n.readAt : new Date().toISOString(),
    }));
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
  }
}

// Delete a notification
export function deleteNotification(professorId, notificationId) {
  if (!professorId || typeof localStorage === 'undefined') return;
  try {
    const key = `${NOTIFICATION_KEY_PREFIX}${professorId}`;
    const notifications = getProfessorNotifications(professorId);
    const updated = notifications.filter(n => n.id !== notificationId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting notification:', err);
  }
}

// Get unread count
export function getUnreadCount(professorId) {
  const notifications = getProfessorNotifications(professorId);
  return notifications.filter(n => !n.isRead).length;
}

// ========== Events Office Notifications ==========

const EVENT_OFFICE_NOTIFICATION_KEY = 'eventOfficeNotifications';

// Get notifications for Events Office
export function getEventOfficeNotifications() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem(EVENT_OFFICE_NOTIFICATION_KEY);
    if (!stored) return [];
    const notifications = JSON.parse(stored);
    return Array.isArray(notifications) ? notifications : [];
  } catch (err) {
    console.error('Error loading Events Office notifications:', err);
    return [];
  }
}

// Create a notification for Events Office
export function createEventOfficeNotification(notification) {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = getEventOfficeNotifications();
    const newNotification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...notification,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    const updated = [newNotification, ...existing];
    localStorage.setItem(EVENT_OFFICE_NOTIFICATION_KEY, JSON.stringify(updated));
    return newNotification;
  } catch (err) {
    console.error('Error creating Events Office notification:', err);
  }
}

// Mark a notification as read
export function markEventOfficeNotificationRead(notificationId) {
  if (typeof localStorage === 'undefined') return;
  try {
    const notifications = getEventOfficeNotifications();
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
    );
    localStorage.setItem(EVENT_OFFICE_NOTIFICATION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error marking Events Office notification as read:', err);
  }
}

// Mark all notifications as read
export function markAllEventOfficeNotificationsRead() {
  if (typeof localStorage === 'undefined') return;
  try {
    const notifications = getEventOfficeNotifications();
    const updated = notifications.map(n => ({
      ...n,
      isRead: true,
      readAt: n.isRead ? n.readAt : new Date().toISOString(),
    }));
    localStorage.setItem(EVENT_OFFICE_NOTIFICATION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error marking all Events Office notifications as read:', err);
  }
}

// Delete a notification
export function deleteEventOfficeNotification(notificationId) {
  if (typeof localStorage === 'undefined') return;
  try {
    const notifications = getEventOfficeNotifications();
    const updated = notifications.filter(n => n.id !== notificationId);
    localStorage.setItem(EVENT_OFFICE_NOTIFICATION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting Events Office notification:', err);
  }
}

// Get unread count for Events Office
export function getEventOfficeUnreadCount() {
  const notifications = getEventOfficeNotifications();
  return notifications.filter(n => !n.isRead).length;
}

