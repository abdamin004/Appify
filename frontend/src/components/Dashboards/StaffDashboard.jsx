import React, { useEffect, useState } from "react";
import EventList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";
import { API_BASE } from "../../services/eventService";
import { canUserAccessEvent } from "../../services/eventRestrictionService";
import { getWalletBalance as apiGetWalletBalance, confirmStripeReceipt, sendManualReceipt } from "../../services/paymentService";
import TopUpDialog from "../Payments/TopUpDialog";
import { getFavouriteIds } from "../../services/favoritesService";
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
import LoyaltyPartnersList from "../Loyalty/LoyaltyPartnersList";
import StudentPollVoting from "../Polls/StudentPollVoting";





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
        const events = Array.isArray(data) ? data : [];
        // Filter out restricted events that user can't access
        const filteredEvents = events.filter(event => {
          const eventId = event._id || event.id;
          if (!eventId) return true; // Include events without ID
          return canUserAccessEvent(eventId);
        });
        setRegisteredEvents(filteredEvents);
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
      const filtered = list.filter(ev => {
        const eventId = ev._id || ev.id;
        // Check if event is in favorites AND user has access
        return ids.includes(String(eventId)) && canUserAccessEvent(eventId);
      });
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
      
        
      <div
        style={{
          paddingTop: "120px",
          padding: "120px 40px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {Boolean(bannerMsg) && (
          <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: '#fff', borderRadius: 12, padding: '12px 18px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', zIndex: 9999, fontWeight: 800, letterSpacing: 0.3 }}>
            {bannerMsg}
          </div>
        )}
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "35px 40px",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              marginBottom: "40px",
            }}
          >
            <h1
              style={{
                fontSize: "2.2rem",
                fontWeight: "bold",
                color: "#003366",
                marginBottom: "8px",
              }}
            >
              Welcome, {user.firstName}! 👋
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#6b7280",
                margin: 0,
              }}
            >
              Browse all university events
            </p>

            <div style={{ marginTop: "16px", display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => (window.location.href = "/register-events")}
                style={{
                  padding: "14px 28px",
                  background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                  color: "#003366",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  boxShadow: "0 6px 20px rgba(212, 175, 55, 0.4)",
                }}
              >
                Register Events
              </button>
              <div style={{ padding: '10px 16px', background: 'rgba(212, 175, 55, 0.15)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#003366' }}>{typeof walletBalance === 'number' ? `${walletBalance} EGP` : '—'}</div>
                <div style={{ fontSize: '.85rem', color: '#6b7280' }}>Wallet Balance</div>
                <div style={{ marginTop: 6 }}>
                  <button type='button' onClick={() => setTopUpOpen(true)} style={{ padding: '6px 10px', background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)', color: '#003366', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Add Funds</button>
                </div>
              </div>
              <button
                onClick={() => (window.location.href = "/gym-sessions")}
                style={{
                  padding: "14px 28px",
                  background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                  color: "#003366",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  boxShadow: "0 6px 20px rgba(212, 175, 55, 0.4)",
                }}
              >
                🏋️ Gym Sessions
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "10px",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              marginBottom: "30px",
              display: "flex",
              gap: "10px",
            }}
          >
          <button
            onClick={() => setActiveTab("browse")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "browse"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "browse" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              Browse Events
          </button>

            <button
              onClick={() => setActiveTab("favourites")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "favourites"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "favourites" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              {'\u2764\uFE0F'} Favourites
            </button>

            <button
              onClick={() => setActiveTab("registered")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "registered"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "registered" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              My Registered Events
            </button>

            <button
              onClick={() => {
                setActiveTab("notifications");
                fetchNotifications();
              }}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "notifications"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "notifications" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                position: "relative",
              }}
            >
              🔔 Notifications
              {notifications.filter(n => !n.isRead && n.type !== 'EventReminder').length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    background: "#ef4444",
                    color: "white",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
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
                padding: "15px 30px",
                background:
                  activeTab === "reminders"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "reminders" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                position: "relative",
              }}
            >
              ⏰ Reminders
              {reminders.filter(n => !n.isRead).length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    background: "#ef4444",
                    color: "white",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
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
                padding: "15px 30px",
                background:
                  activeTab === "loyalty"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "loyalty" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              ⭐ Loyalty Partners
            </button>
            <button
              onClick={() => setActiveTab("polls")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "polls"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "polls" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              📊 Vote for Vendors
            </button>
          </div>

          {/* Content */}
          {activeTab === "browse" && <EventList enableFavorites={true} />}
          {activeTab === "favourites" && <MyEventsList events={favouriteEvents} />}
          {activeTab === "registered" && (
            loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 20px",
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: "16px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ fontSize: "1.2rem", color: "#6b7280", fontWeight: 500 }}>
                  Loading your registered events...
                </div>
              </div>
            ) : (
              <MyEventsList 
                events={registeredEvents.filter(event => {
                  const eventId = event._id || event.id;
                  if (!eventId) return true;
                  return canUserAccessEvent(eventId);
                })} 
                showRefundButton 
              />
            )
          )}
          
          {activeTab === "reminders" && (
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                padding: "30px",
                borderRadius: "20px",
                boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ color: "#003366", margin: 0 }}>
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
                      padding: "8px 16px",
                      background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                      color: "#003366",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
              {reminders.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No reminders at this time.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      style={{
                        padding: "20px",
                        background: reminder.isRead ? "rgba(212, 175, 55, 0.05)" : "rgba(245, 158, 11, 0.15)",
                        borderRadius: "12px",
                        border: reminder.isRead ? "1px solid rgba(212, 175, 55, 0.2)" : "2px solid rgba(245, 158, 11, 0.4)",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "15px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                            <span style={{ fontSize: "1.5rem" }}>⏰</span>
                            <h3 style={{ 
                              color: "#003366", 
                              margin: 0, 
                              fontSize: "1.1rem",
                              fontWeight: reminder.isRead ? "500" : "700",
                            }}>
                              Event Reminder
                            </h3>
                            {!reminder.isRead && (
                              <span style={{
                                background: "#ef4444",
                                color: "white",
                                borderRadius: "50%",
                                width: "10px",
                                height: "10px",
                                display: "inline-block",
                              }} />
                            )}
                          </div>
                          <p style={{ 
                            color: "#6b7280", 
                            margin: "8px 0",
                            fontWeight: reminder.isRead ? "400" : "500",
                          }}>
                            {reminder.message}
                          </p>
                          {reminder.eventStartDate && (
                            <p style={{ 
                              color: "#9ca3af", 
                              fontSize: "0.85rem",
                              margin: "4px 0",
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
                                marginTop: "10px",
                                padding: "8px 16px",
                                background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                                color: "#003366",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              View Event
                            </button>
                          )}
                          <p style={{ 
                            color: "#9ca3af", 
                            fontSize: "0.85rem",
                            margin: "8px 0 0 0",
                          }}>
                            {reminder.createdAt ? new Date(reminder.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                          {!reminder.isRead && (
                            <button
                              onClick={() => {
                                markStudentNotificationRead(reminder.id);
                                fetchReminders();
                              }}
                              style={{
                                padding: "6px 12px",
                                background: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "0.85rem",
                                fontWeight: "600",
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
                              padding: "6px 12px",
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "0.85rem",
                              fontWeight: "600",
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
          
          {activeTab === "loyalty" && (
            <LoyaltyPartnersList />
          )}
          {activeTab === "polls" && (
            <StudentPollVoting />
          )}

          {activeTab === "notifications" && (
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                padding: "30px",
                borderRadius: "20px",
                boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ color: "#003366", margin: 0 }}>
                  Notifications
                </h2>
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <button
                    onClick={() => {
                      markAllStudentNotificationsRead();
                      fetchNotifications();
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                      color: "#003366",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No notifications at this time.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: "20px",
                        background: notif.isRead ? "rgba(212, 175, 55, 0.05)" : "rgba(212, 175, 55, 0.15)",
                        borderRadius: "12px",
                        border: notif.isRead ? "1px solid rgba(212, 175, 55, 0.2)" : "2px solid rgba(212, 175, 55, 0.4)",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "15px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                            {notif.type === 'NewEvent' && (
                              <span style={{ fontSize: "1.5rem" }}>🎉</span>
                            )}
                            <h3 style={{ 
                              color: "#003366", 
                              margin: 0, 
                              fontSize: "1.1rem",
                              fontWeight: notif.isRead ? "500" : "700",
                            }}>
                              {notif.type === 'NewEvent' ? 'New Event Available' : 'Notification'}
                            </h3>
                            {!notif.isRead && (
                              <span style={{
                                background: "#ef4444",
                                color: "white",
                                borderRadius: "50%",
                                width: "10px",
                                height: "10px",
                                display: "inline-block",
                              }} />
                            )}
                          </div>
                          <p style={{ 
                            color: "#6b7280", 
                            margin: "8px 0",
                            fontWeight: notif.isRead ? "400" : "500",
                          }}>
                            {notif.message}
                          </p>
                          {notif.eventId && (
                            <button
                              onClick={() => {
                                window.location.href = `/events/${notif.eventId}`;
                              }}
                              style={{
                                marginTop: "10px",
                                padding: "8px 16px",
                                background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                                color: "#003366",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              View Event
                            </button>
                          )}
                          <p style={{ 
                            color: "#9ca3af", 
                            fontSize: "0.85rem",
                            margin: "8px 0 0 0",
                          }}>
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                          {!notif.isRead && (
                            <button
                              onClick={() => {
                                markStudentNotificationRead(notif.id);
                                fetchNotifications();
                              }}
                              style={{
                                padding: "6px 12px",
                                background: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "0.85rem",
                                fontWeight: "600",
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
                              padding: "6px 12px",
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "0.85rem",
                              fontWeight: "600",
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
  const fetchWallet = async () => {
    try {
      const res = await apiGetWalletBalance();
      const bal = (res && typeof res.balance === 'number') ? res.balance : undefined;
      setWalletBalance(bal);
    } catch (_) { setWalletBalance(undefined); }
  };
