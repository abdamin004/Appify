import React, { useEffect, useState } from "react";
import EventList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";
import Navbar from "../Navbar";
import { API_BASE, listGymSessions, registerForEvent } from "../../services/eventService";
import { getWalletBalance as apiGetWalletBalance, confirmStripeReceipt, sendManualReceipt } from "../../services/paymentService";
import TopUpDialog from "../Payments/TopUpDialog";
import { getFavouriteIds } from "../../services/favoritesService";
import { showToast } from "../../utils/toast";
import { 
  getStudentNotifications, 
  createStudentNotification, 
  markStudentNotificationRead, 
  markAllStudentNotificationsRead, 
  deleteStudentNotification, 
  getSeenEventIds,
  markEventsAsSeen,
  getSentReminders,
  markReminderSent,
  createReminderNotification
} from "../../services/notificationService";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from "../../utils/designSystem";





function StaffDashboard() {
  const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem("user") : null;
  const user = storedUser ? JSON.parse(storedUser) : { firstName: "Guest", role: "staff" };

  const [activeTab, setActiveTab] = useState("browse");
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favouriteEvents, setFavouriteEvents] = useState([]);
  const [walletBalance, setWalletBalance] = useState(undefined);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [bannerMsg, setBannerMsg] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [gymSessions, setGymSessions] = useState([]);
  const [gymSessionsLoading, setGymSessionsLoading] = useState(false);
  const [gymSessionsError, setGymSessionsError] = useState("");
  const [gymBusyId, setGymBusyId] = useState(null);
  const [gymStatus, setGymStatus] = useState({});

  useEffect(() => { 
    fetchRegisteredEvents(); 
    fetchWallet(); 
    fetchNotifications();
    fetchReminders();
    initializeSeenEvents();
    const pollInterval = setInterval(() => {
      checkForNewEvents();
    }, 30000);
    const reminderInterval = setInterval(() => {
      checkForReminders();
    }, 60000);
    return () => {
      clearInterval(pollInterval);
      clearInterval(reminderInterval);
    };
  }, []);

  // Fetch data when switching tabs
  useEffect(() => {
    if (activeTab === 'gym-sessions') {
      setGymSessionsLoading(true);
      fetchGymSessions();
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    } else if (activeTab === 'reminders') {
      fetchReminders();
    }
  }, [activeTab]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(err => {
        console.log('Notification permission request failed:', err);
      });
    }
  }, []);

  // Listen for new event creation events
  useEffect(() => {
    const handleNewEvent = () => {
      fetchNotifications();
    };
    window.addEventListener('newEventCreated', handleNewEvent);
    return () => window.removeEventListener('newEventCreated', handleNewEvent);
  }, []);

  useEffect(() => {
    const onWallet = () => { fetchWallet(); };
    const onPaymentSuccess = (e) => {
      try {
        const amt = e?.detail?.amount;
        const method = e?.detail?.method;
        const m1 = method ? `${method} payment successful` : 'Payment successful';
        const amtTxt = typeof amt === 'number' ? ` (${amt} EGP)` : '';
        setBannerMsg(`${m1}${amtTxt}. Receipt emailed to you.`);
        setTimeout(() => setBannerMsg(''), 6000);
      } catch (_) {}
    };
    window.addEventListener('wallet:updated', onWallet);
    window.addEventListener('payment:success', onPaymentSuccess);
    return () => {
      window.removeEventListener('wallet:updated', onWallet);
      window.removeEventListener('payment:success', onPaymentSuccess);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search || '');
        const sessionId = params.get('session_id');
        const status = params.get('status');
        const eventId = params.get('eventId');
        if (sessionId) {
          try { await confirmStripeReceipt(sessionId); } catch (_) {}
          try { await fetchRegisteredEvents(); } catch (_) {}
          setBannerMsg('Payment successful. Receipt emailed to you.');
          setTimeout(() => setBannerMsg(''), 6000);
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          window.history.replaceState({}, document.title, url.toString());
        } else if (status === 'success') {
          try { if (eventId) { await sendManualReceipt(eventId); } } catch (_) {}
          try { await fetchRegisteredEvents(); } catch (_) {}
          setBannerMsg('Payment successful.');
          setTimeout(() => setBannerMsg(''), 6000);
          const url = new URL(window.location.href);
          url.searchParams.delete('status');
          url.searchParams.delete('eventId');
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 'favourites') fetchFavourites();
    else if (activeTab === 'notifications') fetchNotifications();
    else if (activeTab === 'reminders') fetchReminders();
  }, [activeTab]);

  const fetchNotifications = () => {
    try {
      const notifs = getStudentNotifications();
      setNotifications(notifs);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
    }
  };

  const initializeSeenEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      const events = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
      const publishedEvents = events.filter(e => e.status === 'published');
      const eventIds = publishedEvents.map(e => String(e._id || e.id));
      markEventsAsSeen(eventIds);
    } catch (err) {
      console.error('Error initializing seen events:', err);
    }
  };

  const checkForNewEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      const events = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
      const publishedEvents = events.filter(e => e.status === 'published');
      
      const seenIds = getSeenEventIds();
      const newEvents = publishedEvents.filter(e => {
        const eventId = String(e._id || e.id);
        return !seenIds.has(eventId);
      });

      if (newEvents.length > 0) {
        const newEventIds = newEvents.map(e => String(e._id || e.id));
        markEventsAsSeen(newEventIds);

        newEvents.forEach(event => {
          const eventId = String(event._id || event.id);
          const eventType = event.type || 'Event';
          createStudentNotification({
            type: 'NewEvent',
            message: `New ${eventType}: ${event.title}`,
            eventId: eventId,
            eventTitle: event.title,
            eventType: eventType,
          });

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`New ${eventType} Available`, {
                body: event.title,
                icon: '/favicon.ico',
                tag: `event-${eventId}`,
              });
            } catch (notifErr) {
              console.log('Browser notification failed:', notifErr);
            }
          }
        });

        fetchNotifications();
      }
    } catch (err) {
      console.error('Error checking for new events:', err);
    }
  };

  const fetchReminders = () => {
    try {
      const notifs = getStudentNotifications();
      const reminderNotifs = notifs.filter(n => n.type === 'EventReminder');
      setReminders(reminderNotifs);
    } catch (err) {
      console.error('Error fetching reminders:', err);
      setReminders([]);
    }
  };

  const checkForReminders = async () => {
    try {
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
      const res = await fetch(`${API_BASE}/events/registered`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!res.ok) return;
      
      const registeredEvents = await res.json();
      const events = Array.isArray(registeredEvents) ? registeredEvents : [];
      
      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userId = user && (user._id || user.id);
      if (!userId) return;
      
      const sentReminders = getSentReminders(userId);
      const now = new Date();
      
      events.forEach(event => {
        if (!event.startDate) return;
        
        const startDate = new Date(event.startDate);
        const eventId = String(event._id || event.id);
        const eventTitle = event.title || 'Event';
        const eventType = event.type || 'Event';
        
        const hoursUntilEvent = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const oneDayReminderId = `${eventId}_1day`;
        const isOneDayTime = hoursUntilEvent >= 23 && hoursUntilEvent <= 25 && startDate > now;
        
        if (isOneDayTime && !sentReminders.has(oneDayReminderId)) {
          markReminderSent(userId, oneDayReminderId);
          createReminderNotification({
            type: 'EventReminder',
            message: `Reminder: "${eventTitle}" starts in 1 day!`,
            eventId: eventId,
            eventTitle: eventTitle,
            eventType: eventType,
            reminderType: '1day',
            eventStartDate: startDate.toISOString(),
          });
          
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`Event Reminder: ${eventTitle}`, {
                body: `Starts in 1 day at ${startDate.toLocaleString()}`,
                icon: '/favicon.ico',
                tag: `reminder-${oneDayReminderId}`,
              });
            } catch (notifErr) {
              console.log('Browser notification failed:', notifErr);
            }
          }
        }
        
        const minutesUntilEvent = (startDate.getTime() - now.getTime()) / (1000 * 60);
        const oneHourReminderId = `${eventId}_1hour`;
        const isOneHourTime = minutesUntilEvent >= 50 && minutesUntilEvent <= 70 && startDate > now;
        
        if (isOneHourTime && !sentReminders.has(oneHourReminderId)) {
          markReminderSent(userId, oneHourReminderId);
          createReminderNotification({
            type: 'EventReminder',
            message: `Reminder: "${eventTitle}" starts in 1 hour!`,
            eventId: eventId,
            eventTitle: eventTitle,
            eventType: eventType,
            reminderType: '1hour',
            eventStartDate: startDate.toISOString(),
          });
          
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`Event Reminder: ${eventTitle}`, {
                body: `Starts in 1 hour at ${startDate.toLocaleString()}`,
                icon: '/favicon.ico',
                tag: `reminder-${oneHourReminderId}`,
              });
            } catch (notifErr) {
              console.log('Browser notification failed:', notifErr);
            }
          }
        }
      });
      
      fetchReminders();
      fetchNotifications();
    } catch (err) {
      console.error('Error checking for reminders:', err);
    }
  };

  const fetchGymSessions = async () => {
    try {
      setGymSessionsLoading(true);
      setGymSessionsError("");
      const rows = await listGymSessions();
      setGymSessions(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("Error fetching gym sessions:", err);
      setGymSessions([]);
      setGymSessionsError(err.message || "Failed to load gym sessions");
    } finally {
      setGymSessionsLoading(false);
    }
  };

  const handleGymRegister = async (sessionId) => {
    setGymBusyId(sessionId);
    setGymStatus(prev => ({ ...prev, [sessionId]: { ok: false, msg: '' } }));
    try {
      const res = await registerForEvent(sessionId);
      showToast.success(res.message || 'Registered successfully');
      setGymStatus(prev => ({ ...prev, [sessionId]: { ok: true, msg: res.message || 'Registered successfully' } }));
      await fetchGymSessions();
    } catch (err) {
      const msg = (err && err.message) || 'Failed to register';
      showToast.error(msg);
      setGymStatus(prev => ({ ...prev, [sessionId]: { ok: false, msg } }));
    } finally {
      setGymBusyId(null);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await apiGetWalletBalance();
      const balance = (res && typeof res.balance === 'number') ? res.balance : undefined;
      setWalletBalance(balance);
    } catch (_) {
      setWalletBalance(undefined);
    }
  };

  const fetchRegisteredEvents = async () => {
    try {
      setLoading(true);
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
      const res = await fetch(`${API_BASE}/events/registered`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        try { const err = await res.json(); console.warn('registered fetch failed:', err); } catch(_) {}
        setRegisteredEvents([]);
      } else {
        const data = await res.json();
        setRegisteredEvents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading registered events:', err);
      setRegisteredEvents([]);
    } finally { setLoading(false); }
  };

  const fetchFavourites = async () => {
    try {
      const ids = getFavouriteIds().map(String);
      if (!ids.length) { setFavouriteEvents([]); return; }
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
      const filtered = list.filter(ev => ids.includes(String(ev._id || ev.id)));
      setFavouriteEvents(filtered);
    } catch (_) {
      setFavouriteEvents([]);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #003366 0%, #000d1a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Navbar />

      <div
        style={{
          paddingTop: "120px",
          padding: "120px 40px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {Boolean(bannerMsg) && (
          <div style={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: colors.success,
            color: colors.white,
            borderRadius: borderRadius.lg,
            padding: `${spacing.md} ${spacing.lg}`,
            boxShadow: shadows.xl,
            zIndex: 9999,
            fontWeight: typography.fontWeight.extrabold,
            letterSpacing: 0.3,
            fontSize: typography.fontSize.sm,
          }}>
            {bannerMsg}
          </div>
        )}
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header + Stats */}
          <div
            style={{
              background: colors.bgCard,
              padding: `${spacing['3xl']} ${spacing['2xl']}`,
              borderRadius: borderRadius['2xl'],
              boxShadow: shadows.lg,
              marginBottom: spacing['2xl'],
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: spacing.xl,
              border: `1px solid ${colors.gray200}`,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.primary,
                  marginBottom: spacing.sm,
                }}
              >
                Welcome back, {user.firstName}! 👋
              </h1>
              <p
                style={{
                  fontSize: typography.fontSize.lg,
                  color: colors.gray500,
                  margin: 0,
                }}
              >
                Discover and register for amazing events
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: spacing.lg,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: `${spacing.md} ${spacing.xl}`,
                  background: `linear-gradient(135deg, rgba(51, 102, 153, 0.75) 0%, rgba(26, 51, 77, 0.85) 100%)`,
                  borderRadius: borderRadius.xl,
                  textAlign: "center",
                  border: `1px solid ${colors.primary}`,
                  boxShadow: shadows.md,
                }}
              >
                <div
                  style={{
                    fontSize: typography.fontSize['2xl'],
                    fontWeight: typography.fontWeight.bold,
                    color: colors.white,
                  }}
                >
                  {registeredEvents.length}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.accent,
                    marginTop: spacing.xs,
                    fontWeight: typography.fontWeight.bold,
                  }}
                >
                  Registered Events
                </div>
              </div>

              <div
                style={{
                  padding: `${spacing.md} ${spacing.xl}`,
                  background: `linear-gradient(135deg, rgba(51, 102, 153, 0.75) 0%, rgba(26, 51, 77, 0.85) 100%)`,
                  borderRadius: borderRadius.xl,
                  textAlign: "center",
                  border: `1px solid ${colors.primary}`,
                  boxShadow: shadows.md,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: typography.fontSize['2xl'],
                    fontWeight: typography.fontWeight.bold,
                    color: colors.white,
                  }}
                >
                  {notifications.filter(n => !n.isRead && n.type !== 'EventReminder').length}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.accent,
                    marginTop: spacing.xs,
                    fontWeight: typography.fontWeight.bold,
                  }}
                >
                  Notifications
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              background: colors.bgCard,
              padding: spacing.md,
              borderRadius: borderRadius['2xl'],
              boxShadow: shadows.lg,
              marginBottom: spacing['2xl'],
              display: "flex",
              gap: spacing.md,
              border: `1px solid ${colors.gray200}`,
            }}
          >
            <button
              onClick={() => setActiveTab("browse")}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "browse"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "browse" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              🎯 Browse Events
            </button>

            <button
              onClick={() => {
                setActiveTab("gym-sessions");
                setGymSessionsLoading(true);
                fetchGymSessions();
              }}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "gym-sessions"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "gym-sessions" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              🏋️ Gym Sessions
            </button>

            <button
              onClick={() => setActiveTab("registered")}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "registered"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "registered" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              ✓ My Registered Events
            </button>

            <button
              onClick={() => setActiveTab("favourites")}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "favourites"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "favourites" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              ❤️ Favourites
            </button>

            <button
              onClick={() => {
                setActiveTab("notifications");
                fetchNotifications();
              }}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "notifications"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "notifications" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
                position: "relative",
              }}
            >
              🔔 Notifications
              {notifications.filter(n => !n.isRead && n.type !== 'EventReminder').length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: spacing.sm,
                    right: spacing.sm,
                    background: colors.error,
                    color: colors.white,
                    borderRadius: borderRadius.full,
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                  }}
                >
                  {notifications.filter(n => !n.isRead && n.type !== 'EventReminder').length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("reminders");
                fetchReminders();
              }}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "reminders"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "reminders" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
                position: "relative",
              }}
            >
              ⏰ Reminders
              {reminders.filter(n => !n.isRead).length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: spacing.sm,
                    right: spacing.sm,
                    background: colors.error,
                    color: colors.white,
                    borderRadius: borderRadius.full,
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                  }}
                >
                  {reminders.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          {activeTab === "browse" && <EventList enableFavorites={true} filterByTypes={["Workshop", "Trip", "Conference", "GymSession"]} />}
          {activeTab === "favourites" && <MyEventsList events={favouriteEvents} />}
          {activeTab === "registered" && (
            loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: `${spacing['6xl']} ${spacing.xl}`,
                  background: colors.bgCard,
                  borderRadius: borderRadius.xl,
                  boxShadow: shadows.md,
                }}
              >
                <div style={{ 
                  fontSize: typography.fontSize.lg, 
                  color: colors.gray500, 
                  fontWeight: typography.fontWeight.medium 
                }}>
                  Loading your registered events...
                </div>
              </div>
            ) : (
              <MyEventsList events={registeredEvents} showRefundButton />
            )
          )}
          
          {activeTab === "reminders" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
                <h2 style={{ 
                  color: colors.primary, 
                  margin: 0,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold
                }}>
                  Event Reminders
                </h2>
                {reminders.filter(n => !n.isRead).length > 0 && (
                  <button
                    onClick={() => {
                      reminders.filter(n => !n.isRead).forEach(reminder => {
                        markStudentNotificationRead(reminder.id);
                      });
                      fetchReminders();
                    }}
                    style={{
                      ...buttonStyles.primary,
                      padding: `${spacing.md} ${spacing.lg}`,
                      fontSize: typography.fontSize.sm
                    }}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
              {reminders.length === 0 ? (
                <p style={{ color: colors.gray500, fontSize: typography.fontSize.base }}>No reminders at this time.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      style={{
                        padding: spacing.xl,
                        background: reminder.isRead ? colors.gray50 : colors.white,
                        borderRadius: borderRadius.xl,
                        border: reminder.isRead ? `1px solid ${colors.gray200}` : `2px solid ${colors.warning}`,
                        position: "relative",
                        boxShadow: reminder.isRead ? shadows.sm : shadows.md,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.lg }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm }}>
                            <span style={{ fontSize: typography.fontSize['2xl'] }}>⏰</span>
                            <h3 style={{ 
                              color: colors.primary, 
                              margin: 0, 
                              fontSize: typography.fontSize.lg,
                              fontWeight: reminder.isRead ? typography.fontWeight.medium : typography.fontWeight.bold,
                            }}>
                              Event Reminder
                            </h3>
                            {!reminder.isRead && (
                              <span style={{
                                background: colors.error,
                                color: colors.white,
                                borderRadius: borderRadius.full,
                                width: "10px",
                                height: "10px",
                                display: "inline-block",
                              }} />
                            )}
                          </div>
                          <p style={{ 
                            color: colors.gray500, 
                            margin: `${spacing.sm} 0`,
                            fontWeight: reminder.isRead ? typography.fontWeight.normal : typography.fontWeight.medium,
                            fontSize: typography.fontSize.base
                          }}>
                            {reminder.message}
                          </p>
                          {reminder.eventStartDate && (
                            <p style={{ 
                              color: colors.gray400, 
                              fontSize: typography.fontSize.sm,
                              margin: `${spacing.xs} 0`,
                            }}>
                              Event starts: {new Date(reminder.eventStartDate).toLocaleString()}
                            </p>
                          )}
                          {reminder.eventId && (
                            <button
                              onClick={() => {
                                window.location.href = `/events/${reminder.eventId}`;
                              }}
                              style={{
                                marginTop: spacing.md,
                                ...buttonStyles.primary,
                                padding: `${spacing.sm} ${spacing.lg}`,
                                fontSize: typography.fontSize.sm
                              }}
                            >
                              View Event
                            </button>
                          )}
                          <p style={{ 
                            color: colors.gray400, 
                            fontSize: typography.fontSize.sm,
                            margin: `${spacing.sm} 0 0 0`,
                          }}>
                            {reminder.createdAt ? new Date(reminder.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: spacing.sm, flexDirection: "column" }}>
                          {!reminder.isRead && (
                            <button
                              onClick={() => {
                                markStudentNotificationRead(reminder.id);
                                fetchReminders();
                              }}
                              style={{
                                padding: `${spacing.sm} ${spacing.lg}`,
                                background: colors.success,
                                color: colors.white,
                                border: "none",
                                borderRadius: borderRadius.md,
                                fontSize: typography.fontSize.sm,
                                fontWeight: typography.fontWeight.semibold,
                                cursor: "pointer",
                              }}
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => {
                              deleteStudentNotification(reminder.id);
                              fetchReminders();
                            }}
                            style={{
                              padding: `${spacing.sm} ${spacing.lg}`,
                              background: colors.error,
                              color: colors.white,
                              border: "none",
                              borderRadius: borderRadius.md,
                              fontSize: typography.fontSize.sm,
                              fontWeight: typography.fontWeight.semibold,
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === "notifications" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
                <h2 style={{ 
                  color: colors.primary, 
                  margin: 0,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold
                }}>
                  Notifications
                </h2>
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <button
                    onClick={() => {
                      markAllStudentNotificationsRead();
                      fetchNotifications();
                    }}
                    style={{
                      ...buttonStyles.primary,
                      padding: `${spacing.md} ${spacing.lg}`,
                      fontSize: typography.fontSize.sm
                    }}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p style={{ color: colors.gray500, fontSize: typography.fontSize.base }}>No notifications at this time.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: spacing.xl,
                        background: notif.isRead ? colors.gray50 : colors.white,
                        borderRadius: borderRadius.xl,
                        border: notif.isRead ? `1px solid ${colors.gray200}` : `2px solid ${colors.accent}`,
                        position: "relative",
                        boxShadow: notif.isRead ? shadows.sm : shadows.md,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.lg }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm }}>
                            {notif.type === 'NewEvent' && (
                              <span style={{ fontSize: typography.fontSize['2xl'] }}>🎉</span>
                            )}
                            <h3 style={{ 
                              color: colors.primary, 
                              margin: 0, 
                              fontSize: typography.fontSize.lg,
                              fontWeight: notif.isRead ? typography.fontWeight.medium : typography.fontWeight.bold,
                            }}>
                              {notif.type === 'NewEvent' ? 'New Event Available' : 'Notification'}
                            </h3>
                            {!notif.isRead && (
                              <span style={{
                                background: colors.error,
                                color: colors.white,
                                borderRadius: borderRadius.full,
                                width: "10px",
                                height: "10px",
                                display: "inline-block",
                              }} />
                            )}
                          </div>
                          <p style={{ 
                            color: colors.gray500, 
                            margin: `${spacing.sm} 0`,
                            fontWeight: notif.isRead ? typography.fontWeight.normal : typography.fontWeight.medium,
                            fontSize: typography.fontSize.base
                          }}>
                            {notif.message}
                          </p>
                          {notif.eventId && (
                            <button
                              onClick={() => {
                                window.location.href = `/events/${notif.eventId}`;
                              }}
                              style={{
                                marginTop: spacing.md,
                                ...buttonStyles.primary,
                                padding: `${spacing.sm} ${spacing.lg}`,
                                fontSize: typography.fontSize.sm
                              }}
                            >
                              View Event
                            </button>
                          )}
                          <p style={{ 
                            color: colors.gray400, 
                            fontSize: typography.fontSize.sm,
                            margin: `${spacing.sm} 0 0 0`,
                          }}>
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: spacing.sm, flexDirection: "column" }}>
                          {!notif.isRead && (
                            <button
                              onClick={() => {
                                markStudentNotificationRead(notif.id);
                                fetchNotifications();
                              }}
                              style={{
                                padding: `${spacing.sm} ${spacing.lg}`,
                                background: colors.success,
                                color: colors.white,
                                border: "none",
                                borderRadius: borderRadius.md,
                                fontSize: typography.fontSize.sm,
                                fontWeight: typography.fontWeight.semibold,
                                cursor: "pointer",
                              }}
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => {
                              deleteStudentNotification(notif.id);
                              fetchNotifications();
                            }}
                            style={{
                              padding: `${spacing.xs} ${spacing.md}`,
                              background: colors.error,
                              color: colors.white,
                              border: 'none',
                              borderRadius: borderRadius.lg,
                              fontSize: typography.fontSize.sm,
                              fontWeight: typography.fontWeight.semibold,
                              cursor: 'pointer',
                              transition: transitions.fast,
                              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.3)';
                              e.target.style.background = '#b91c1c';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
                              e.target.style.background = colors.error;
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "gym-sessions" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
                border: `1px solid ${colors.gray200}`,
              }}
            >
              <h2 style={{
                color: colors.primary,
                margin: `0 0 ${spacing.xl} 0`,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
              }}>
                Gym Sessions Schedule
              </h2>
              {gymSessionsLoading ? (
                <div style={{ textAlign: 'center', padding: spacing['4xl'] }}>
                  <div style={{ fontSize: typography.fontSize.lg, color: colors.gray500 }}>
                    Loading gym sessions...
                  </div>
                </div>
              ) : gymSessionsError ? (
                <div style={{
                  background: colors.errorLight,
                  color: colors.error,
                  padding: spacing.lg,
                  borderRadius: borderRadius.xl,
                  border: `1px solid ${colors.error}`,
                }}>
                  {gymSessionsError}
                </div>
              ) : gymSessions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: spacing['4xl'],
                  color: colors.gray500,
                }}>
                  <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.xl }}>🏋️</div>
                  <p style={{ 
                    color: colors.gray500,
                    fontSize: typography.fontSize.base,
                  }}>No gym sessions scheduled</p>
                </div>
              ) : (() => {
                const byMonth = gymSessions.reduce((acc, s) => {
                  if (!s.startDate) return acc;
                  const d = new Date(s.startDate);
                  const monthKey = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                  (acc[monthKey] ||= []).push(s);
                  return acc;
                }, {});
                const months = Object.keys(byMonth).sort((a, b) => new Date(a) - new Date(b));
                const typeMap = { yoga: 'Yoga', pilates: 'Pilates', aerobics: 'Aerobics', zumba: 'Zumba', crosscircuit: 'Cross Circuit', kickboxing: 'Kick-boxing' };
                const isStarted = (s) => {
                  if (!s.startDate) return false;
                  try { return new Date(s.startDate) < new Date(); } catch { return false; }
                };
                const isFull = (s) => {
                  if (!s.capacity || !s.registeredCount) return false;
                  return Number(s.registeredCount) >= Number(s.capacity);
                };
                const alreadyRegistered = (s) => {
                  const id = String(s._id || s.id);
                  return gymSessions.some(gs => String(gs._id || gs.id) === id && gs.registered);
                };
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['2xl'] }}>
                    {months.map((month) => {
                      const items = byMonth[month] || [];
                      const byType = items.reduce((acc, s) => {
                        const label = typeMap[s.sessionType] || s.sessionType || 'Session';
                        (acc[label] ||= []).push(s);
                        return acc;
                      }, {});
                      const typeKeys = Object.keys(byType).sort();
                      return (
                        <div key={month}>
                          <div style={{
                            background: colors.bgCard,
                            padding: `${spacing.lg} ${spacing.xl}`,
                            borderRadius: borderRadius.xl,
                            boxShadow: shadows.md,
                            border: `1px solid ${colors.gray200}`,
                          }}>
                            <h3 style={{
                              margin: 0,
                              color: colors.primary,
                              fontSize: typography.fontSize.xl,
                              fontWeight: typography.fontWeight.bold,
                            }}>{month}</h3>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                              gap: spacing.lg,
                              marginTop: spacing.lg
                            }}>
                              {typeKeys.map((tk) => (
                                <div key={tk} style={{
                                  background: colors.white,
                                  border: `1px solid ${colors.gray200}`,
                                  borderRadius: borderRadius.xl,
                                  padding: spacing.lg
                                }}>
                                  <div style={{
                                    fontWeight: typography.fontWeight.extrabold,
                                    color: colors.primary,
                                    marginBottom: spacing.sm,
                                    fontSize: typography.fontSize.base,
                                  }}>{tk}</div>
                                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: colors.gray700 }}>
                                    {byType[tk]
                                      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                                      .map((s) => {
                                        const id = s._id || s.id;
                                        const started = isStarted(s);
                                        const full = isFull(s);
                                        const mine = alreadyRegistered(s);
                                        const disabled = started || full || mine || gymBusyId === id;
                                        const label = mine ? 'Registered' : full ? 'Full' : started ? 'Started' : (gymBusyId === id ? 'Registering...' : 'Register');
                                        const fmtDateTime = (date) => {
                                          if (!date) return 'TBA';
                                          const d = new Date(date);
                                          return `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                        };
                                        return (
                                          <li key={id} style={{
                                            padding: `${spacing.sm} 0`,
                                            borderTop: `1px solid ${colors.gray100}`
                                          }}>
                                            <div style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              gap: spacing.lg
                                            }}>
                                              <div>
                                                <div style={{
                                                  fontSize: typography.fontSize.sm,
                                                  fontWeight: typography.fontWeight.medium,
                                                  color: colors.gray700,
                                                }}>{fmtDateTime(s.startDate)}</div>
                                                <div style={{
                                                  fontSize: typography.fontSize.xs,
                                                  color: colors.gray500,
                                                  marginTop: spacing.xs,
                                                }}>
                                                  Instructor: {s.instructor || "TBA"} {s.capacity ? `• Capacity: ${s.capacity}` : ""}
                                                </div>
                                              </div>
                                              <div>
                                                <button
                                                  disabled={disabled}
                                                  onClick={() => !disabled && handleGymRegister(id)}
                                                  style={{
                                                    ...(disabled ? {} : buttonStyles.primary),
                                                    padding: `${spacing.sm} ${spacing.lg}`,
                                                    background: disabled ? colors.gray200 : undefined,
                                                    color: disabled ? colors.gray500 : colors.primary,
                                                    border: 'none',
                                                    borderRadius: borderRadius.lg,
                                                    fontWeight: typography.fontWeight.bold,
                                                    fontSize: typography.fontSize.sm,
                                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                                    opacity: disabled ? 0.7 : 1,
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    if (!disabled) {
                                                      e.target.style.boxShadow = shadows.accentHover;
                                                    }
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    if (!disabled) {
                                                      e.target.style.boxShadow = shadows.accent;
                                                    }
                                                  }}
                                                >{label}</button>
                                              </div>
                                            </div>
                                            {gymStatus[id] && gymStatus[id].msg && (
                                              <div style={{
                                                marginTop: spacing.sm,
                                                fontSize: typography.fontSize.xs,
                                                color: gymStatus[id].ok ? colors.success : colors.error
                                              }}>
                                                {gymStatus[id].msg}
                                              </div>
                                            )}
                                          </li>
                                        );
                                      })}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      {topUpOpen && (
        <TopUpDialog open={topUpOpen} onClose={() => setTopUpOpen(false)} onSuccess={(res) => {
          const next = (res && typeof res.balance === 'number') ? res.balance : undefined;
          if (typeof next === 'number') setWalletBalance(next);
        }} />
      )}
    </div>
  );
}

export default StaffDashboard;
