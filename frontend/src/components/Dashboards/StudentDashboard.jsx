import React, { useState, useEffect } from "react";
import EventsList from "../EventList";
import Navbar from "../Navbar";
import MyEventsList from "../Functions/MyEventsList";
import CourtsReserve from "../Functions/CourtsReserve";
import { API_BASE, listGymSessions, registerForEvent } from "../../services/eventService";
import { canUserAccessEvent } from "../../services/eventRestrictionService";
import { getWalletBalance as apiGetWalletBalance } from "../../services/paymentService";
import { confirmStripeReceipt, sendManualReceipt } from "../../services/paymentService";
import TopUpDialog from "../Payments/TopUpDialog";
import { getFavouriteIds } from "../../services/favoritesService";
import LoyaltyPartnersList from "../Loyalty/LoyaltyPartnersList";
import StudentPollVoting from "../Polls/StudentPollVoting";
import { 
  getStudentNotifications, 
  createStudentNotification, 
  markStudentNotificationRead, 
  markAllStudentNotificationsRead, 
  deleteStudentNotification, 
  getStudentUnreadCount,
  getSeenEventIds,
  markEventsAsSeen,
  getSentReminders,
  markReminderSent,
  createReminderNotification
} from "../../services/notificationService";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from "../../utils/designSystem";
import { showToast } from "../../utils/toast";

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("browse");
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [courts, setCourts] = useState([]);
  const [presetType, setPresetType] = useState("");
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

  const storedUser = localStorage.getItem("user");
  const user = storedUser
    ? JSON.parse(storedUser)
    : { firstName: "Guest", role: "student" };

  useEffect(() => {
    fetchRegisteredEvents();
    fetchCourts();
    fetchWallet();
    fetchNotifications();
    fetchReminders();
    fetchGymSessions();
    // Initialize: mark all current events as seen
    initializeSeenEvents();
    // Check for reminders immediately
    checkForReminders();
    // Start polling for new events
    const pollInterval = setInterval(() => {
      checkForNewEvents();
    }, 30000); // Check every 30 seconds
    
    // Start checking for reminders
    const reminderInterval = setInterval(() => {
      checkForReminders();
    }, 60000); // Check every minute

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

  // Listen to wallet updates from child dialogs (wallet pay/refund/top-up)
  useEffect(() => {
    const handler = () => { fetchWallet(); };
    const onPaymentSuccess = (e) => {
      try {
        const amt = e?.detail?.amount;
        const method = e?.detail?.method;
        const raw = localStorage.getItem('user');
        const u = raw ? JSON.parse(raw) : {};
        const email = u?.email ? ` Receipt emailed to ${u.email}.` : '';
        const m1 = method ? `${method} payment successful` : 'Payment successful';
        const amtTxt = typeof amt === 'number' ? ` (${amt} EGP)` : '';
        setBannerMsg(`${m1}${amtTxt}.${email}`);
        setTimeout(() => setBannerMsg(''), 6000);
      } catch (_) {}
    };
    window.addEventListener('wallet:updated', handler);
    window.addEventListener('payment:success', onPaymentSuccess);
    return () => {
      window.removeEventListener('wallet:updated', handler);
      window.removeEventListener('payment:success', onPaymentSuccess);
    };
  }, []);

  // After Stripe redirect: if session_id or status=success present, confirm/send receipt and show banner
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search || '');
        const sessionId = params.get('session_id');
        const status = params.get('status');
        const eventId = params.get('eventId');
        if (sessionId) {
          try { await confirmStripeReceipt(sessionId); } catch (_) {}
          // Refresh registered events to reflect paid flag
          try { await fetchRegisteredEvents(); } catch (_) {}
          // Banner message
          try {
            const raw = localStorage.getItem('user');
            const u = raw ? JSON.parse(raw) : {};
            const email = u?.email ? ` Receipt emailed to ${u.email}.` : '';
            setBannerMsg(`Payment successful.${email}`);
            setTimeout(() => setBannerMsg(''), 6000);
          } catch (_) {}
          // Clean the URL to avoid repeat calls on navigation
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          window.history.replaceState({}, document.title, url.toString());
        } else if (status === 'success') {
          try {
            if (eventId) { await sendManualReceipt(eventId); }
          } catch (_) {}
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

  // Fetch data when switching tabs
  useEffect(() => {
    if (activeTab === "registered" && registeredEvents.length === 0) {
      fetchRegisteredEvents();
    } else if (activeTab === "courts" && courts.length === 0) {
      fetchCourts();
    } else if (activeTab === "favourites") {
      fetchFavourites();
    } else if (activeTab === "notifications") {
      fetchNotifications();
    } else if (activeTab === "reminders") {
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
      
      // Filter out restricted events that user can't access
      const accessibleEvents = publishedEvents.filter(e => {
        const eventId = e._id || e.id;
        return canUserAccessEvent(eventId);
      });
      
      const seenIds = getSeenEventIds();
      const newEvents = accessibleEvents.filter(e => {
        const eventId = String(e._id || e.id);
        return !seenIds.has(eventId);
      });

      if (newEvents.length > 0) {
        // Mark new events as seen
        const newEventIds = newEvents.map(e => String(e._id || e.id));
        markEventsAsSeen(newEventIds);

        // Create notifications for each new event
        newEvents.forEach(event => {
          const eventId = String(event._id || event.id);
          const eventType = event.type || 'Event';
          const notification = createStudentNotification({
            type: 'NewEvent',
            message: `New ${eventType}: ${event.title}`,
            eventId: eventId,
            eventTitle: event.title,
            eventType: eventType,
          });

          // Show browser notification if permission granted
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

        // Refresh notifications list
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
      // Get registered events
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
      const res = await fetch(`${API_BASE}/events/registered`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!res.ok) return;
      
      const registeredEvents = await res.json();
      const events = Array.isArray(registeredEvents) ? registeredEvents : [];
      
      console.log(`Checking reminders for ${events.length} registered events`);
      
      // Get user ID for tracking sent reminders
      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userId = user && (user._id || user.id);
      if (!userId) {
        console.log('No user ID found, skipping reminder check');
        return;
      }
      
      const sentReminders = getSentReminders(userId);
      const now = new Date();
      
      events.forEach(event => {
        if (!event.startDate) {
          console.log(`Event "${event.title || 'Unknown'}" has no startDate, skipping`);
          return;
        }
        
        const startDate = new Date(event.startDate);
        const eventId = String(event._id || event.id);
        const eventTitle = event.title || 'Event';
        const eventType = event.type || 'Event';
        
        // Check for 1 day reminder (24 hours before)
        // Show reminder if event is between 20-28 hours away (wider window)
        const hoursUntilEvent = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const oneDayReminderId = `${eventId}_1day`;
        const isOneDayTime = hoursUntilEvent >= 20 && hoursUntilEvent <= 28 && startDate > now;
        
        console.log(`Event "${eventTitle}": ${hoursUntilEvent.toFixed(2)} hours away, 1-day reminder: ${isOneDayTime}`);
        
        if (isOneDayTime && !sentReminders.has(oneDayReminderId)) {
          console.log(`Creating 1-day reminder for event: ${eventTitle}`);
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
        
        // Check for 1 hour reminder
        // Show reminder if event is between 45-75 minutes away (wider window)
        const minutesUntilEvent = (startDate.getTime() - now.getTime()) / (1000 * 60);
        const oneHourReminderId = `${eventId}_1hour`;
        const isOneHourTime = minutesUntilEvent >= 45 && minutesUntilEvent <= 75 && startDate > now;
        
        console.log(`Event "${eventTitle}": ${minutesUntilEvent.toFixed(2)} minutes away, 1-hour reminder: ${isOneHourTime}`);
        
        if (isOneHourTime && !sentReminders.has(oneHourReminderId)) {
          console.log(`Creating 1-hour reminder for event: ${eventTitle}`);
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
      
      // Refresh reminders list
      fetchReminders();
      fetchNotifications();
    } catch (err) {
      console.error('Error checking for reminders:', err);
    }
  };

  const fetchRegisteredEvents = async () => {
    try {
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
      const res = await fetch(`${API_BASE}/events/registered`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        // Likely unauthorized if no token; keep empty list gracefully
        try { const err = await res.json(); console.warn('registered fetch failed:', err); } catch (_) {}
        setRegisteredEvents([]);
        return;
      }
      const data = await res.json();
      const events = Array.isArray(data) ? data : [];
      // Filter out restricted events that user can't access
      const filteredEvents = events.filter(event => {
        const eventId = event._id || event.id;
        if (!eventId) return true; // Include events without ID
        return canUserAccessEvent(eventId);
      });
      setRegisteredEvents(filteredEvents);
    } catch (err) {
      console.error(err);
      setRegisteredEvents([]);
    }
  };

  const fetchCourts = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/courts");
      const data = await res.json();
      const raw = Array.isArray(data) ? data : (Array.isArray(data.courts) ? data.courts : []);
      // normalize each court to include availabilityDates and available boolean
      const now = new Date();
      const processed = raw.map(court => {
        const slots = Array.isArray(court.availability) ? court.availability : [];
        // filter future slots that are not booked
        const availabilityDates = slots
          .filter(s => {
            try {
              if (s.isBooked) return false;
              const slotDate = new Date(s.date);
              // combine with startTime
              if (!s.startTime) return false;
              const [h, m] = s.startTime.split(':').map(x=>parseInt(x,10));
              slotDate.setHours(h||0, m||0, 0, 0);
              return slotDate >= now;
            } catch (e) { return false; }
          })
          .map(s => ({ slotId: s._id, date: s.date, startTime: s.startTime, endTime: s.endTime }));

        const available = (court.status === 'available') && availabilityDates.length > 0;

        return { ...court, availabilityDates, available };
      });

      if (processed.length === 0) {
        setCourts(generateFakeCourts());
      } else {
        setCourts(processed);
      }
    } catch (err) {
      console.error(err);
      // Frontend-only fallback
      setCourts(generateFakeCourts());
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

  function generateFakeCourts() {
    const types = [
      { type: 'basketball', name: 'Basketball Court A' },
      { type: 'tennis', name: 'Tennis Court 1' },
      { type: 'football', name: 'Football Field' }
    ];
    const now = new Date();
    return types.map((t, idx) => {
      const slots = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const startHour = 10 + i;
        const endHour = startHour + 1;
        slots.push({
          slotId: `fake-slot-${idx}-${i}`,
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
          startTime: `${String(startHour).padStart(2,'0')}:00`,
          endTime: `${String(endHour).padStart(2,'0')}:00`
        });
      }
      return {
        _id: `fake-court-${idx}`,
        id: `fake-court-${idx}`,
        name: t.name,
        type: t.type,
        status: 'available',
        available: true,
        location: 'Sports Complex',
        availabilityDates: slots
      };
    });
  }

  function handleReserve(courtId, slotId) {
    setCourts(prev => (prev || []).map(c => {
      const cid = String(c._id || c.id);
      if (cid !== String(courtId)) return c;
      const remaining = (c.availabilityDates || []).filter(s => String(s.slotId) !== String(slotId));
      return { ...c, availabilityDates: remaining };
    }));
  }

  const fetchFavourites = async () => {
    try {
      const ids = getFavouriteIds().map(String);
      if (!ids.length) { setFavouriteEvents([]); return; }
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
      const filtered = list.filter(ev => {
        const eventId = ev._id || ev.id;
        // Check if event is in favorites AND user has access
        return ids.includes(String(eventId)) && canUserAccessEvent(eventId);
      });
      setFavouriteEvents(filtered);
    } catch (e) {
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
              flexDirection: "column",
              gap: spacing.md,
              border: `1px solid ${colors.gray200}`,
            }}
          >
            {/* First Row of Tabs */}
            <div style={{ display: "flex", gap: spacing.md, flexWrap: "wrap" }}>
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
              onClick={() => setActiveTab("courts")}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "courts"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "courts" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              🏀 Courts
            </button>
            </div>

            {/* Second Row of Tabs - Notifications, Reminders, Loyalty, Polls */}
            <div style={{ display: "flex", gap: spacing.md, flexWrap: "wrap" }}>
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

            <button
              onClick={() => setActiveTab("loyalty")}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "loyalty"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "loyalty" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              ⭐ Loyalty Partners
            </button>

            <button
              onClick={() => setActiveTab("polls")}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "polls"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "polls" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              📊 Vote for Vendors
            </button>
            </div>
          </div>

          {/* Content */}
          {activeTab === "browse" && <EventsList presetType={presetType} showQuickNav={true} enableFavorites={true} />}
          {activeTab === "registered" && (
            <MyEventsList 
              events={registeredEvents.filter(event => {
                const eventId = event._id || event.id;
                if (!eventId) return true;
                const hasAccess = canUserAccessEvent(eventId);
                if (!hasAccess) {
                  console.log('Removing restricted event from registered display:', eventId, event.title);
                }
                return hasAccess;
              })} 
              showRefundButton 
            />
          )}
          {activeTab === "favourites" && <MyEventsList events={favouriteEvents} />}
          {activeTab === "courts" && <CourtsReserve courts={courts} onReserved={handleReserve} />}
          
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
                marginBottom: spacing.xl,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
              }}>
                Gym Sessions
              </h2>
              {gymSessionsLoading ? (
                <div style={{ 
                  textAlign: "center",
                  padding: `${spacing['6xl']} ${spacing.xl}`,
                }}>
                  <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.xl }}>⏳</div>
                  <p style={{ 
                    color: colors.gray500,
                    fontSize: typography.fontSize.base,
                  }}>Loading sessions...</p>
                </div>
              ) : gymSessionsError ? (
                <div style={{ 
                  color: colors.error, 
                  background: colors.errorLight, 
                  padding: spacing.lg, 
                  borderRadius: borderRadius.xl,
                  marginBottom: spacing.lg,
                }}>{gymSessionsError}</div>
              ) : (!gymSessions || gymSessions.length === 0) ? (
                <div style={{ 
                  textAlign: "center",
                  padding: `${spacing['6xl']} ${spacing.xl}`,
                }}>
                  <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.xl }}>🏋️</div>
                  <p style={{ 
                    color: colors.gray500,
                    fontSize: typography.fontSize.base,
                  }}>No gym sessions scheduled</p>
                </div>
              ) : (() => {
                const typeMap = {
                  yoga: 'Yoga', pilates: 'Pilates', cardio: 'Aerobics', zumba: 'Zumba', 
                  crossfit: 'Cross Circuit', other: 'Kick-boxing', strength: 'Strength', spinning: 'Spinning'
                };
                const byMonth = (gymSessions || []).reduce((acc, s) => {
                  const d = s.startDate ? new Date(s.startDate) : null;
                  const key = d ? d.toLocaleString(undefined, { month: 'long', year: 'numeric' }) : 'Scheduled';
                  (acc[key] ||= []).push(s);
                  return acc;
                }, {});
                const monthKeys = Object.keys(byMonth).sort((a, b) => {
                  const da = new Date(a); const db = new Date(b);
                  return (!isNaN(da) && !isNaN(db)) ? (da - db) : a.localeCompare(b);
                });

                const currentUserId = (() => {
                  try {
                    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
                    if (!raw) return null;
                    const u = JSON.parse(raw);
                    return u && (u._id || u.id) ? String(u._id || u.id) : null;
                  } catch (_) { return null; }
                })();

                const isStarted = (s) => {
                  try { return new Date(s.startDate) <= new Date(); } catch { return false; }
                };

                const isFull = (s) => {
                  try {
                    const reg = Array.isArray(s.registeredUsers) ? s.registeredUsers.length : (s.registeredCount || 0);
                    return Number(s.capacity || 0) > 0 && reg >= Number(s.capacity || 0);
                  } catch { return false; }
                };

                const alreadyRegistered = (s) => {
                  try {
                    if (!currentUserId) return false;
                    const arr = Array.isArray(s.registeredUsers) ? s.registeredUsers : [];
                    return arr.map(String).includes(String(currentUserId));
                  } catch { return false; }
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['2xl'] }}>
                    {monthKeys.map((month) => {
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
                                              display:'flex', 
                                              justifyContent:'space-between', 
                                              alignItems:'center', 
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
          
          {activeTab === "reminders" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
                border: `1px solid ${colors.gray200}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
                <h2 style={{ 
                  color: colors.primary, 
                  margin: 0,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
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
                      padding: `${spacing.sm} ${spacing.md}`,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
              {reminders.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: `${spacing['6xl']} ${spacing.xl}`,
                }}>
                  <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.xl }}>⏰</div>
                  <p style={{ 
                    color: colors.gray500,
                    fontSize: typography.fontSize.base,
                  }}>No reminders at this time.</p>
                </div>
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
                            fontSize: typography.fontSize.base,
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
                                padding: `${spacing.sm} ${spacing.md}`,
                                fontSize: typography.fontSize.sm,
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
                                ...buttonStyles.success,
                                padding: `${spacing.xs} ${spacing.md}`,
                                fontSize: typography.fontSize.sm,
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
          
          {activeTab === "loyalty" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
                border: `1px solid ${colors.gray200}`,
              }}
            >
              <LoyaltyPartnersList />
            </div>
          )}
          {activeTab === "polls" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
                border: `1px solid ${colors.gray200}`,
              }}
            >
              <StudentPollVoting />
            </div>
          )}
          
          {activeTab === "notifications" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
                border: `1px solid ${colors.gray200}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
                <h2 style={{ 
                  color: colors.primary, 
                  margin: 0,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
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
                      padding: `${spacing.sm} ${spacing.md}`,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: `${spacing['6xl']} ${spacing.xl}`,
                }}>
                  <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.xl }}>🔔</div>
                  <p style={{ 
                    color: colors.gray500,
                    fontSize: typography.fontSize.base,
                  }}>No notifications at this time.</p>
                </div>
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
                            fontSize: typography.fontSize.base,
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
                                padding: `${spacing.sm} ${spacing.md}`,
                                fontSize: typography.fontSize.sm,
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
                                ...buttonStyles.success,
                                padding: `${spacing.xs} ${spacing.md}`,
                                fontSize: typography.fontSize.sm,
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
        </div>
      </div>
      {topUpOpen && (
        <TopUpDialog
          open={topUpOpen}
          onClose={() => setTopUpOpen(false)}
          onSuccess={(res) => {
            const next = (res && typeof res.balance === 'number') ? res.balance : undefined;
            if (typeof next === 'number') setWalletBalance(next);
          }}
        />
      )}
    </div>
  );
}

export default StudentDashboard;

