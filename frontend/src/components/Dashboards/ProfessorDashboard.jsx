import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EventsList from "../EventList";
import Navbar from "../Navbar";
import MyEventsList from "../Functions/MyEventsList";
import WorkshopParticipantsView from "./WorkshopParticipantsView";
import { API_BASE, listGymSessions, registerForEvent, getApprovedWorkshops } from "../../services/eventService";
import { canUserAccessEvent } from "../../services/eventRestrictionService";
import { getWalletBalance as apiGetWalletBalance, confirmStripeReceipt, sendManualReceipt } from "../../services/paymentService";
import TopUpDialog from "../Payments/TopUpDialog";
import { getFavouriteIds } from "../../services/favoritesService";
import { showToast, confirmDialog } from "../../utils/toast";
import { getProfessorNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, deleteAllNotifications, getUnreadCount, createProfessorNotification, getSeenEventIds, markEventsAsSeen, getSentReminders, markReminderSent, createReminderNotification, getCurrentUserReminders, markReminderRead, deleteReminder } from "../../services/notificationService";
import LoyaltyPartnersList from "../Loyalty/LoyaltyPartnersList";
import StudentPollVoting from "../Polls/StudentPollVoting";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from "../../utils/designSystem";
import { headerContainerStyle, statCardBase, statValueStyle, statLabelStyle, getTabButtonStyle, tabRowStyle } from "./dashboardStyles";
import WalletBadge from "../Wallet/WalletBadge";

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
  const [gymSessions, setGymSessions] = useState([]);
  const [gymSessionsLoading, setGymSessionsLoading] = useState(false);
  const [gymSessionsError, setGymSessionsError] = useState("");
  const [gymBusyId, setGymBusyId] = useState(null);
  const [gymStatus, setGymStatus] = useState({});

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const res = await fetch(`${API_BASE}/events`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return; // Silently fail - not critical
      }
      const data = await res.json();
      const events = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
      const publishedEvents = events.filter(e => e.status === 'published');
      const eventIds = publishedEvents.map(e => String(e._id || e.id));
      markEventsAsSeen(eventIds);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Error initializing seen events:', err);
      }
      // Silently fail - not critical functionality
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
      // Get user-specific reminders (not role-based)
      const userReminders = getCurrentUserReminders();
      setReminders(userReminders);
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
      } catch (_) { }
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
          try { await confirmStripeReceipt(sessionId); } catch (_) { }
          try { await fetchRegisteredEvents(); } catch (_) { }
          const email = user?.email ? ` Receipt emailed to ${user.email}.` : '';
          setBannerMsg(`Payment successful.${email}`);
          setTimeout(() => setBannerMsg(''), 6000);
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          window.history.replaceState({}, document.title, url.toString());
        } else if (status === 'success') {
          try { if (eventId) { await sendManualReceipt(eventId); } } catch (_) { }
          try { await fetchRegisteredEvents(); } catch (_) { }
          setBannerMsg('Payment successful.');
          setTimeout(() => setBannerMsg(''), 6000);
          const url = new URL(window.location.href);
          url.searchParams.delete('status');
          url.searchParams.delete('eventId');
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (_) { }
    })();
  }, [user]);

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

  useEffect(() => {
    if (activeTab === "my-workshops") {
      fetchMyWorkshops(); // Always refetch to ensure we get latest status
    } else if (activeTab === "registered" && registeredEvents.length === 0) {
      fetchRegisteredEvents();
    } else if (activeTab === 'favourites') {
      fetchFavourites();
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    } else if (activeTab === 'reminders') {
      fetchReminders();
    } else if (activeTab === 'gym-sessions') {
      setGymSessionsLoading(true);
      fetchGymSessions();
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
        try { const err = await res.json(); console.error('fetchMyWorkshops failed:', err); } catch (_) { }
        setMyWorkshops([]);
        return;
      }
      const data = await res.json();
      console.log('Fetched workshops:', data); // Debug log
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const res = await fetch(`${API_BASE}/events/registered`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        try { const err = await res.json(); console.warn('registered fetch failed:', err); } catch (_) { }
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

      let list = [];

      // Fetch published events
      try {
        const res = await fetch(`${API_BASE}/events`);
        const data = await res.json();
        list = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
      } catch (e) {
        console.error("Error fetching events for favorites:", e);
      }

      // Add frontend-approved workshops
      try {
        const approvedSet = getApprovedWorkshops();
        if (approvedSet.size > 0) {
          const sortRes = await fetch(`${API_BASE}/events/sort`);
          const sortData = await sortRes.json();
          if (Array.isArray(sortData)) {
            const approvedWorkshops = sortData.filter(
              w => w.type === 'Workshop' && approvedSet.has(w._id) && w.status === 'pending'
            );
            // Mark as published for display
            approvedWorkshops.forEach(w => { w.status = 'published'; });

            // Merge avoiding duplicates
            const existingIds = new Set(list.map(e => e._id));
            const newWorkshops = approvedWorkshops.filter(w => !existingIds.has(w._id));
            list = [...list, ...newWorkshops];
          }
        }
      } catch (e) {
        console.log('Error adding approved workshops to favorites:', e);
      }

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
          {/* Header */}
          <div
            style={{
              background: colors.bgCard,
              padding: `${spacing['3xl']} ${spacing['2xl']}`,
              borderRadius: borderRadius['2xl'],
              boxShadow: shadows.lg,
              marginBottom: spacing['2xl'],
              display: "flex",
              flexDirection: "column",
              gap: spacing.lg,
              border: `1px solid ${colors.gray200}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: spacing.lg,
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
                  Welcome, Prof. {user.lastName || user.firstName}! 👋
                </h1>
                <p
                  style={{
                    fontSize: typography.fontSize.lg,
                    color: colors.gray500,
                    margin: 0,
                  }}
                >
                  Manage your workshops and view university events
                </p>
                <div style={{ height: spacing.md }} />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: spacing.md,
                  alignItems: "center",
                  flexShrink: 0,
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: spacing.md,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <a
                    href="/professor/workshops"
                    onClick={(e) => {
                      if (e && e.preventDefault) {
                        try { e.preventDefault(); navigate('/professor/workshops'); return; } catch (_) { }
                      }
                    }}
                    style={{
                      ...buttonStyles.primary,
                      padding: `${spacing.md} ${spacing['2xl']}`,
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.boxShadow = shadows.accentHover;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = shadows.accent;
                    }}
                  >
                    + Create Workshop
                  </a>
                  <div
                    style={{
                      ...statCardBase,
                    }}
                  >
                    <div style={statValueStyle}>
                      {myWorkshops.length}
                    </div>
                    <div style={statLabelStyle}>
                      My Workshops
                    </div>
                  </div>

                  <div
                    style={{
                      ...statCardBase,
                      position: "relative",
                    }}
                  >
                    <div style={statValueStyle}>
                      {notifications.filter(n => !n.isRead && n.type !== 'EventReminder').length}
                    </div>
                    <div style={statLabelStyle}>
                      Notifications
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    marginTop: spacing.md,
                  }}
                >
                  <div
                    style={{
                      transform: "translateX(30px)",
                    }}
                  >
                    <WalletBadge
                      balance={walletBalance}
                      currency="EGP"
                      onTopUp={() => setTopUpOpen(true)}
                      label="Wallet Balance"
                      style={{ width: "auto" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          {(() => {
            const tabButtons = [
              { key: "browse", label: "🎯 Browse Events", onClick: () => setActiveTab("browse") },
              {
                key: "gym-sessions",
                label: "🏋️ Gym Sessions",
                onClick: () => {
                  setActiveTab("gym-sessions");
                  setGymSessionsLoading(true);
                  fetchGymSessions();
                },
              },
              { key: "registered", label: "✓ My Registered Events", onClick: () => setActiveTab("registered") },
              { key: "favourites", label: "❤️ Favourites", onClick: () => setActiveTab("favourites") },
              { key: "my-workshops", label: "📚 My Workshops", onClick: () => setActiveTab("my-workshops") },
              {
                key: "edit-requests",
                label: "✏️ Edit Requests",
                onClick: () => setActiveTab("edit-requests"),
                badgeCount: getWorkshopsWithEditRequests().length,
              },
              {
                key: "notifications",
                label: "🔔 Notifications",
                onClick: () => {
                  setActiveTab("notifications");
                  fetchNotifications();
                },
                badgeCount: notifications.filter(n => !n.isRead && n.type !== 'EventReminder').length,
              },
              {
                key: "reminders",
                label: "⏰ Reminders",
                onClick: () => {
                  setActiveTab("reminders");
                  fetchReminders();
                },
                badgeCount: reminders.filter(n => !n.isRead).length,
              },
              { key: "loyalty", label: "⭐ Loyalty Partners", onClick: () => setActiveTab("loyalty"), variant: "gold" },
              { key: "polls", label: "📊 Vote for Vendors", onClick: () => setActiveTab("polls"), variant: "gold" },
            ];

            const firstRowCount = Math.ceil(tabButtons.length / 2);
            const tabRows = [tabButtons.slice(0, firstRowCount), tabButtons.slice(firstRowCount)];

            const renderTabButton = (tab) => {
              const isActive = activeTab === tab.key;
              const style = getTabButtonStyle(isActive, tab.variant);
              return (
                <button key={tab.key} onClick={tab.onClick} style={style}>
                  {tab.label}
                  {tab.badgeCount > 0 && (
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
                      {tab.badgeCount}
                    </span>
                  )}
                </button>
              );
            };

            return (
              <div
                style={{
                  background: colors.bgCard,
                  padding: spacing.md,
                  borderRadius: borderRadius['2xl'],
                  boxShadow: shadows.lg,
                  marginBottom: spacing['2xl'],
                  border: `1px solid ${colors.gray200}`,
                }}
              >
                {tabRows.map((row, idx) => (
                  <div key={idx} style={tabRowStyle}>
                    {row.map(renderTabButton)}
                  </div>
                ))}
              </div>
            );
          })()}

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
                  fontWeight: typography.fontWeight.bold
                }}>
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
                  {reminders.map((reminder) => {
                    const isRead = reminder.read || reminder.isRead;
                    return (
                      <div
                        key={reminder.id}
                        style={{
                          padding: spacing.xl,
                          background: isRead ? colors.gray50 : colors.white,
                          borderRadius: borderRadius.xl,
                          border: isRead ? `1px solid ${colors.gray200}` : `2px solid ${colors.warning}`,
                          position: "relative",
                          boxShadow: isRead ? shadows.sm : shadows.md,
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
                                fontWeight: isRead ? typography.fontWeight.medium : typography.fontWeight.bold,
                              }}>
                                Event Reminder
                              </h3>
                              {!isRead && (
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
                              fontWeight: isRead ? typography.fontWeight.normal : typography.fontWeight.medium,
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
                    );
                  })}
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
                  fontWeight: typography.fontWeight.bold
                }}>
                  Notifications
                </h2>
                <div style={{ display: "flex", gap: spacing.md }}>
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
                        ...buttonStyles.primary,
                        padding: `${spacing.md} ${spacing.lg}`,
                        fontSize: typography.fontSize.sm
                      }}
                    >
                      Mark All as Read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={async () => {
                        const confirmed = await confirmDialog('Are you sure you want to delete all notifications?', 'Delete All Notifications');
                        if (confirmed) {
                          try {
                            const rawUser = localStorage.getItem('user');
                            if (rawUser) {
                              const u = JSON.parse(rawUser);
                              const professorId = u && (u._id || u.id);
                              if (professorId) {
                                deleteAllNotifications(professorId);
                                fetchNotifications();
                              }
                            }
                          } catch (err) {
                            console.error('Error deleting all notifications:', err);
                          }
                        }
                      }}
                      style={{
                        padding: `${spacing.md} ${spacing.lg}`,
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
                      Delete All
                    </button>
                  )}
                </div>
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
                            {notif.type === 'WorkshopApproved' && (
                              <span style={{ fontSize: typography.fontSize['2xl'] }}>✅</span>
                            )}
                            {notif.type === 'WorkshopRejected' && (
                              <span style={{ fontSize: typography.fontSize['2xl'] }}>❌</span>
                            )}
                            <h3 style={{
                              color: colors.primary,
                              margin: 0,
                              fontSize: typography.fontSize.lg,
                              fontWeight: notif.isRead ? typography.fontWeight.medium : typography.fontWeight.bold,
                            }}>
                              {notif.type === 'WorkshopApproved' ? 'Workshop Approved' : notif.type === 'WorkshopRejected' ? 'Workshop Rejected' : 'Notification'}
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

          {activeTab === "edit-requests" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
              }}
            >
              <h2 style={{
                color: colors.primary,
                marginBottom: spacing.xl,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold
              }}>
                Edit Requests for My Workshops
              </h2>
              {getWorkshopsWithEditRequests().length === 0 ? (
                <p style={{ color: colors.gray500, fontSize: typography.fontSize.base }}>No edit requests at this time.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: spacing.xl }}>
                  {getWorkshopsWithEditRequests().map((workshop) => (
                    <div
                      key={workshop._id}
                      style={{
                        padding: spacing['3xl'],
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: borderRadius.xl,
                        border: `1px solid rgba(245, 158, 11, 0.3)`,
                      }}
                    >
                      <div style={{ marginBottom: spacing.lg }}>
                        <h3 style={{
                          color: colors.primary,
                          marginBottom: spacing.md,
                          fontSize: typography.fontSize.xl,
                          fontWeight: typography.fontWeight.bold
                        }}>
                          {workshop.title}
                        </h3>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: spacing.md,
                          marginTop: spacing.lg
                        }}>
                          <div>
                            <strong style={{ color: colors.primary }}>Status:</strong>{" "}
                            <span style={{
                              color: workshop.status === 'pending' ? colors.warning : workshop.status === 'published' ? colors.success : colors.gray500,
                              fontWeight: typography.fontWeight.semibold
                            }}>
                              {workshop.status === 'pending' ? 'Pending Approval' : workshop.status === 'published' ? 'Published' : workshop.status}
                            </span>
                          </div>
                          <div>
                            <strong style={{ color: colors.primary }}>Location:</strong>{" "}
                            <span style={{ color: colors.gray500 }}>{workshop.location}</span>
                          </div>
                          <div>
                            <strong style={{ color: colors.primary }}>Start Date:</strong>{" "}
                            <span style={{ color: colors.gray500 }}>
                              {workshop.startDate
                                ? new Date(workshop.startDate).toLocaleString()
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: spacing.xl }}>
                        <h4 style={{
                          color: colors.primary,
                          marginBottom: spacing.lg,
                          fontSize: typography.fontSize.lg,
                          fontWeight: typography.fontWeight.bold
                        }}>
                          Edit Requests ({workshop.editRequests.length})
                        </h4>
                        {workshop.editRequests.map((editRequest, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: spacing.lg,
                              background: colors.white,
                              borderRadius: borderRadius.lg,
                              marginBottom: spacing.lg,
                              border: `1px solid ${colors.gray200}`,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                              <strong style={{
                                color: colors.warning,
                                fontSize: typography.fontSize.sm,
                                fontWeight: typography.fontWeight.semibold
                              }}>
                                Request from Events Office
                              </strong>
                              <span style={{ color: colors.gray500, fontSize: typography.fontSize.xs }}>
                                {editRequest.timestamp}
                              </span>
                            </div>
                            <p style={{
                              color: colors.gray700,
                              margin: 0,
                              lineHeight: typography.lineHeight.relaxed,
                              whiteSpace: "pre-wrap",
                              fontSize: typography.fontSize.base
                            }}>
                              {editRequest.request}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: spacing.lg, display: "flex", gap: spacing.md }}>
                        <button
                          onClick={() => navigate(`/professor/workshops?edit=${workshop._id}`)}
                          style={{
                            ...buttonStyles.primary,
                            padding: `${spacing.md} ${spacing.xl}`,
                            background: colors.warning,
                            color: colors.white,
                            fontSize: typography.fontSize.sm
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.opacity = 0.9;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.opacity = 1;
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
