import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EventsList from "../EventList";
import Navbar from "../Navbar";
import MyEventsList from "../Functions/MyEventsList";
import WorkshopParticipantsView from "./WorkshopParticipantsView";
import { API_BASE } from "../../services/eventService";
import { canUserAccessEvent } from "../../services/eventRestrictionService";
import { getWalletBalance as apiGetWalletBalance, confirmStripeReceipt, sendManualReceipt } from "../../services/paymentService";
import TopUpDialog from "../Payments/TopUpDialog";
import { getFavouriteIds } from "../../services/favoritesService";
import { getProfessorNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, getUnreadCount, createProfessorNotification, getSeenEventIds, markEventsAsSeen, getSentReminders, markReminderSent, createReminderNotification } from "../../services/notificationService";
import LoyaltyPartnersList from "../Loyalty/LoyaltyPartnersList";
import StudentPollVoting from "../Polls/StudentPollVoting";

function ProfessorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("browse");
  const [myWorkshops, setMyWorkshops] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [favouriteEvents, setFavouriteEvents] = useState([]);
  const [user, setUser] = useState({ firstName: "Professor", lastName: "" });
  const [walletBalance, setWalletBalance] = useState(undefined);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [bannerMsg, setBannerMsg] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
    fetchMyWorkshops();
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

  const fetchNotifications = () => {
    try {
      const rawUser = localStorage.getItem('user');
      if (!rawUser) return;
      const u = JSON.parse(rawUser);
      const professorId = u && (u._id || u.id);
      if (!professorId) return;
      const notifs = getProfessorNotifications(professorId);
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

        const rawUser = localStorage.getItem('user');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          const professorId = u && (u._id || u.id);
          
          newEvents.forEach(event => {
            const eventId = String(event._id || event.id);
            const eventType = event.type || 'Event';
            
            if (professorId) {
              createProfessorNotification(professorId, {
                type: 'NewEvent',
                message: `New ${eventType}: ${event.title}`,
                eventId: eventId,
                eventTitle: event.title,
                eventType: eventType,
              });
            }

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
      }
    } catch (err) {
      console.error('Error checking for new events:', err);
    }
  };

  const fetchReminders = () => {
    try {
      const rawUser = localStorage.getItem('user');
      if (!rawUser) return;
      const u = JSON.parse(rawUser);
      const professorId = u && (u._id || u.id);
      if (!professorId) return;
      const notifs = getProfessorNotifications(professorId);
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
      
      const rawUser = localStorage.getItem('user');
      if (!rawUser) return;
      const u = JSON.parse(rawUser);
      const userId = u && (u._id || u.id);
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

  // Wallet updates and payment success banner
  useEffect(() => {
    const onWallet = () => { fetchWallet(); };
    const onPaymentSuccess = (e) => {
      try {
        const amt = e?.detail?.amount;
        const method = e?.detail?.method;
        const u = user || {};
        const email = u?.email ? ` Receipt emailed to ${u.email}.` : '';
        const m1 = method ? `${method} payment successful` : 'Payment successful';
        const amtTxt = typeof amt === 'number' ? ` (${amt} EGP)` : '';
        setBannerMsg(`${m1}${amtTxt}.${email}`);
        setTimeout(() => setBannerMsg(''), 6000);
      } catch (_) {}
    };
    window.addEventListener('wallet:updated', onWallet);
    window.addEventListener('payment:success', onPaymentSuccess);
    return () => {
      window.removeEventListener('wallet:updated', onWallet);
      window.removeEventListener('payment:success', onPaymentSuccess);
    };
  }, [user]);

  // Stripe redirect confirm (session_id or status=success)
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
          const email = user?.email ? ` Receipt emailed to ${user.email}.` : '';
          setBannerMsg(`Payment successful.${email}`);
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
  }, [user]);

  useEffect(() => {
    if (activeTab === "my-workshops" && myWorkshops.length === 0) {
      fetchMyWorkshops();
    } else if (activeTab === "registered" && registeredEvents.length === 0) {
      fetchRegisteredEvents();
    } else if (activeTab === 'favourites') {
      fetchFavourites();
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    } else if (activeTab === 'reminders') {
      fetchReminders();
    }
  }, [activeTab]);

  // Parse edit requests from workshop description
  const parseEditRequests = (description) => {
    if (!description) return [];
    const requests = [];
    const regex = /--- EDIT REQUEST FROM EVENTS OFFICE \(([^)]+)\) ---\s*([\s\S]*?)\s*--- END EDIT REQUEST ---/g;
    let match;
    while ((match = regex.exec(description)) !== null) {
      requests.push({
        timestamp: match[1],
        request: match[2].trim(),
      });
    }
    return requests;
  };

  const fetchMyWorkshops = async () => {
    try {
      const rawUser = (typeof localStorage !== 'undefined') ? localStorage.getItem('user') : null;
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
      const u = rawUser ? JSON.parse(rawUser) : {};
      const professorId = u && (u._id || u.id);
      if (!professorId) { setMyWorkshops([]); return; }

      const url = `${API_BASE}/events/workshops/mine?professorId=${encodeURIComponent(professorId)}`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) {
        try { const err = await res.json(); console.error('fetchMyWorkshops failed:', err); } catch (_) {}
        setMyWorkshops([]);
        return;
      }
      const data = await res.json();
      setMyWorkshops(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching my workshops:", err);
      setMyWorkshops([]);
    }
  };

  // Get workshops with edit requests
  const getWorkshopsWithEditRequests = () => {
    return myWorkshops
      .map(workshop => ({
        ...workshop,
        editRequests: parseEditRequests(workshop.description),
      }))
      .filter(workshop => workshop.editRequests.length > 0);
  };

  const fetchRegisteredEvents = async () => {
    try {
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
      const res = await fetch(`${API_BASE}/events/registered`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
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

  const fetchWallet = async () => {
    try {
      const res = await apiGetWalletBalance();
      const bal = (res && typeof res.balance === 'number') ? res.balance : undefined;
      setWalletBalance(bal);
    } catch (_) {
      setWalletBalance(undefined);
    }
  };

  const handleCreateWorkshop = () => {
    try {
      navigate("/professor/workshops");
    } catch (_) {
      // Fallback in case navigate fails for any reason
      window.location.href = "/professor/workshops";
    }
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "2.2rem",
                  fontWeight: "bold",
                  color: "#003366",
                  marginBottom: "8px",
                }}
              >
                Welcome, Prof. {user.lastName || user.firstName}! 👋
              </h1>
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                Manage your workshops and view university events
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "15px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: "12px 20px",
                  background: "rgba(212, 175, 55, 0.15)",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#003366",
                  }}
                >
                  {myWorkshops.length}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                  }}
                >
                  My Workshops
                </div>
              </div>

              <a
                href="/professor/workshops"
                onClick={(e) => {
                  // prefer client routing when available
                  if (e && e.preventDefault) {
                    try { e.preventDefault(); navigate('/professor/workshops'); return; } catch (_) {}
                  }
                  // otherwise allow default anchor navigation
                }}
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
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                + Create Workshop
              </a>

              <div
                style={{
                  padding: "12px 20px",
                  background: "rgba(212, 175, 55, 0.15)",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#003366" }}>
                  {typeof walletBalance === 'number' ? `${walletBalance} EGP` : '—'}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Wallet Balance</div>
                <div style={{ marginTop: 8 }}>
                  <button type="button" onClick={() => setTopUpOpen(true)} style={{ padding: '6px 10px', background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)', color: '#003366', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
                    Add Funds
                  </button>
                </div>
              </div>
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
              flexWrap: "wrap",
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
              🎯 Browse Events
            </button>

            {/* Register Events direct button */}
            <button
              onClick={() => (window.location.href = "/register-events")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                color: "#003366",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 6px 20px rgba(212, 175, 55, 0.4)",
              }}
            >
              Register Events
            </button>

            {/* Gym Sessions direct button */}
            <button
              onClick={() => (window.location.href = "/gym-sessions")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                color: "#003366",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 6px 20px rgba(212, 175, 55, 0.4)",
              }}
            >
              🏋️ Gym Sessions
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
              ✓ My Registered Events
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
              onClick={() => setActiveTab("my-workshops")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "my-workshops"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "my-workshops" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                position: "relative",
              }}
            >
              📚 My Workshops
            </button>
            <button
              onClick={() => setActiveTab("edit-requests")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "edit-requests"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "edit-requests" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                position: "relative",
              }}
            >
              ✏️ Edit Requests
              {getWorkshopsWithEditRequests().length > 0 && (
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
                  {getWorkshopsWithEditRequests().length}
                </span>
              )}
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
                minWidth: "180px",
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
                minWidth: "180px",
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
          {activeTab === "browse" && <EventsList enableFavorites={true} />}
          {activeTab === "registered" && (
            <MyEventsList 
              events={registeredEvents.filter(event => {
                const eventId = event._id || event.id;
                if (!eventId) return true;
                return canUserAccessEvent(eventId);
              })} 
              showRefundButton 
            />
          )}
          {activeTab === "my-workshops" && <WorkshopParticipantsView workshops={myWorkshops} />}
          {activeTab === 'favourites' && <MyEventsList events={favouriteEvents} />}
          
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
                      const rawUser = localStorage.getItem('user');
                      if (rawUser) {
                        const u = JSON.parse(rawUser);
                        const professorId = u && (u._id || u.id);
                        if (professorId) {
                          reminders.filter(n => !n.isRead).forEach(reminder => {
                            if (reminder.id) {
                              markNotificationRead(professorId, reminder.id);
                            }
                          });
                          fetchReminders();
                        }
                      }
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
                  {reminders.map((reminder) => {
                    const isRead = reminder.read || reminder.isRead;
                    return (
                      <div
                        key={reminder.id}
                        style={{
                          padding: "20px",
                          background: isRead ? "rgba(212, 175, 55, 0.05)" : "rgba(245, 158, 11, 0.15)",
                          borderRadius: "12px",
                          border: isRead ? "1px solid rgba(212, 175, 55, 0.2)" : "2px solid rgba(245, 158, 11, 0.4)",
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
                                fontWeight: isRead ? "500" : "700",
                              }}>
                                Event Reminder
                              </h3>
                              {!isRead && (
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
                              fontWeight: isRead ? "400" : "500",
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
                            {!isRead && (
                              <button
                                onClick={() => {
                                  const rawUser = localStorage.getItem('user');
                                  if (rawUser) {
                                    const u = JSON.parse(rawUser);
                                    const professorId = u && (u._id || u.id);
                                    if (professorId && reminder.id) {
                                      markNotificationRead(professorId, reminder.id);
                                      fetchReminders();
                                    }
                                  }
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
                                const rawUser = localStorage.getItem('user');
                                if (rawUser) {
                                  const u = JSON.parse(rawUser);
                                  const professorId = u && (u._id || u.id);
                                  if (professorId && reminder.id) {
                                    deleteNotification(professorId, reminder.id);
                                    fetchReminders();
                                  }
                                }
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
                    );
                  })}
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
                      try {
                        const rawUser = localStorage.getItem('user');
                        if (rawUser) {
                          const u = JSON.parse(rawUser);
                          const professorId = u && (u._id || u.id);
                          if (professorId) {
                            markAllNotificationsRead(professorId);
                            fetchNotifications();
                          }
                        }
                      } catch (err) {
                        console.error('Error marking all as read:', err);
                      }
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
                            {notif.type === 'WorkshopApproved' && (
                              <span style={{ fontSize: "1.5rem" }}>✅</span>
                            )}
                            {notif.type === 'WorkshopRejected' && (
                              <span style={{ fontSize: "1.5rem" }}>❌</span>
                            )}
                            <h3 style={{ 
                              color: "#003366", 
                              margin: 0, 
                              fontSize: "1.1rem",
                              fontWeight: notif.isRead ? "500" : "700",
                            }}>
                              {notif.type === 'WorkshopApproved' ? 'Workshop Approved' : notif.type === 'WorkshopRejected' ? 'Workshop Rejected' : 'Notification'}
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
                                try {
                                  const rawUser = localStorage.getItem('user');
                                  if (rawUser) {
                                    const u = JSON.parse(rawUser);
                                    const professorId = u && (u._id || u.id);
                                    if (professorId) {
                                      markNotificationRead(professorId, notif.id);
                                      fetchNotifications();
                                    }
                                  }
                                } catch (err) {
                                  console.error('Error marking as read:', err);
                                }
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
                              try {
                                const rawUser = localStorage.getItem('user');
                                if (rawUser) {
                                  const u = JSON.parse(rawUser);
                                  const professorId = u && (u._id || u.id);
                                  if (professorId) {
                                    deleteNotification(professorId, notif.id);
                                    fetchNotifications();
                                  }
                                }
                              } catch (err) {
                                console.error('Error deleting notification:', err);
                              }
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

          {activeTab === "edit-requests" && (
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                padding: "30px",
                borderRadius: "20px",
                boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              }}
            >
              <h2 style={{ color: "#003366", marginBottom: "20px" }}>
                Edit Requests for My Workshops
              </h2>
              {getWorkshopsWithEditRequests().length === 0 ? (
                <p style={{ color: "#6b7280" }}>No edit requests at this time.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {getWorkshopsWithEditRequests().map((workshop) => (
                    <div
                      key={workshop._id}
                      style={{
                        padding: "25px",
                        background: "rgba(245, 158, 11, 0.1)",
                        borderRadius: "12px",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                      }}
                    >
                      <div style={{ marginBottom: "15px" }}>
                        <h3 style={{ color: "#003366", marginBottom: "10px", fontSize: "1.3rem" }}>
                          {workshop.title}
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "12px" }}>
                          <div>
                            <strong style={{ color: "#003366" }}>Status:</strong>{" "}
                            <span style={{ 
                              color: workshop.status === 'draft' ? '#f59e0b' : workshop.status === 'published' ? '#10b981' : '#6b7280',
                              fontWeight: '600'
                            }}>
                              {workshop.status === 'draft' ? 'Pending Approval' : workshop.status === 'published' ? 'Published' : workshop.status}
                            </span>
                          </div>
                          <div>
                            <strong style={{ color: "#003366" }}>Location:</strong>{" "}
                            <span style={{ color: "#6b7280" }}>{workshop.location}</span>
                          </div>
                          <div>
                            <strong style={{ color: "#003366" }}>Start Date:</strong>{" "}
                            <span style={{ color: "#6b7280" }}>
                              {workshop.startDate
                                ? new Date(workshop.startDate).toLocaleString()
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: "20px" }}>
                        <h4 style={{ color: "#003366", marginBottom: "15px", fontSize: "1.1rem" }}>
                          Edit Requests ({workshop.editRequests.length})
                        </h4>
                        {workshop.editRequests.map((editRequest, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: "15px",
                              background: "white",
                              borderRadius: "8px",
                              marginBottom: "12px",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                              <strong style={{ color: "#f59e0b", fontSize: "0.9rem" }}>
                                Request from Events Office
                              </strong>
                              <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                                {editRequest.timestamp}
                              </span>
                            </div>
                            <p style={{ color: "#374151", margin: 0, lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                              {editRequest.request}
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => navigate(`/professor/workshops?edit=${workshop._id}`)}
                          style={{
                            padding: "10px 20px",
                            background: "#f59e0b",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "0.95rem",
                          }}
                        >
                          ✏️ Edit Workshop
                        </button>
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

export default ProfessorDashboard;
