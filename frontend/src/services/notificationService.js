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

// ========== Student Notifications ==========

const STUDENT_NOTIFICATION_KEY = 'studentNotifications';
const STUDENT_SEEN_EVENTS_KEY = 'studentSeenEventIds';

// Get notifications for students
export function getStudentNotifications() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STUDENT_NOTIFICATION_KEY);
    if (!stored) return [];
    const notifications = JSON.parse(stored);
    return Array.isArray(notifications) ? notifications : [];
  } catch (err) {
    console.error('Error loading student notifications:', err);
    return [];
  }
}

// Create a notification for students
export function createStudentNotification(notification) {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = getStudentNotifications();
    const newNotification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...notification,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    const updated = [newNotification, ...existing];
    localStorage.setItem(STUDENT_NOTIFICATION_KEY, JSON.stringify(updated));
    return newNotification;
  } catch (err) {
    console.error('Error creating student notification:', err);
  }
}

// Mark a notification as read
export function markStudentNotificationRead(notificationId) {
  if (typeof localStorage === 'undefined') return;
  try {
    const notifications = getStudentNotifications();
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
    );
    localStorage.setItem(STUDENT_NOTIFICATION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error marking student notification as read:', err);
  }
}

// Mark all notifications as read
export function markAllStudentNotificationsRead() {
  if (typeof localStorage === 'undefined') return;
  try {
    const notifications = getStudentNotifications();
    const updated = notifications.map(n => ({
      ...n,
      isRead: true,
      readAt: n.isRead ? n.readAt : new Date().toISOString(),
    }));
    localStorage.setItem(STUDENT_NOTIFICATION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error marking all student notifications as read:', err);
  }
}

// Delete a notification
export function deleteStudentNotification(notificationId) {
  if (typeof localStorage === 'undefined') return;
  try {
    const notifications = getStudentNotifications();
    const updated = notifications.filter(n => n.id !== notificationId);
    localStorage.setItem(STUDENT_NOTIFICATION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting student notification:', err);
  }
}

// Get unread count for students
export function getStudentUnreadCount() {
  const notifications = getStudentNotifications();
  return notifications.filter(n => !n.isRead).length;
}

// Get seen event IDs (to track which events have been seen)
export function getSeenEventIds() {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STUDENT_SEEN_EVENTS_KEY);
    if (!stored) return new Set();
    const ids = JSON.parse(stored);
    return new Set(Array.isArray(ids) ? ids : []);
  } catch (err) {
    console.error('Error loading seen event IDs:', err);
    return new Set();
  }
}

// Mark events as seen
export function markEventsAsSeen(eventIds) {
  if (typeof localStorage === 'undefined') return;
  try {
    const seen = getSeenEventIds();
    eventIds.forEach(id => seen.add(String(id)));
    localStorage.setItem(STUDENT_SEEN_EVENTS_KEY, JSON.stringify(Array.from(seen)));
  } catch (err) {
    console.error('Error marking events as seen:', err);
  }
}

// ========== Event Reminders ==========

const REMINDER_KEY_PREFIX = 'eventReminders_';

// Get sent reminders for a user (to avoid duplicates)
export function getSentReminders(userId) {
  if (!userId || typeof localStorage === 'undefined') return new Set();
  try {
    const key = `${REMINDER_KEY_PREFIX}${userId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return new Set();
    const reminders = JSON.parse(stored);
    return new Set(Array.isArray(reminders) ? reminders : []);
  } catch (err) {
    console.error('Error loading sent reminders:', err);
    return new Set();
  }
}

// Mark a reminder as sent
export function markReminderSent(userId, reminderId) {
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    const key = `${REMINDER_KEY_PREFIX}${userId}`;
    const sent = getSentReminders(userId);
    sent.add(reminderId);
    localStorage.setItem(key, JSON.stringify(Array.from(sent)));
  } catch (err) {
    console.error('Error marking reminder as sent:', err);
  }
}

// Create reminder notification (shared across all user types)
export function createReminderNotification(notification) {
  if (typeof localStorage === 'undefined') return;
  try {
    // Add to student notifications (shared by students, staff, TA)
    createStudentNotification(notification);
    
    // Add to event office notifications
    createEventOfficeNotification(notification);
    
    // Add to professor notifications (for all professors)
    try {
      const allKeys = Object.keys(localStorage);
      const professorKeys = allKeys.filter(key => key.startsWith('professorNotifications_'));
      professorKeys.forEach(key => {
        const professorId = key.replace('professorNotifications_', '');
        if (professorId) {
          createProfessorNotification(professorId, notification);
        }
      });
    } catch (profErr) {
      console.log('Could not create professor reminder notifications:', profErr);
    }
    
    return notification;
  } catch (err) {
    console.error('Error creating reminder notification:', err);
  }
}

