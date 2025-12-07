import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layout/DashboardLayout";
import EventList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";
import { API_BASE, listGymSessions, registerForEvent, getApprovedWorkshops } from "../../services/eventService";
import { canUserAccessEvent } from "../../services/eventRestrictionService";
import { getWalletBalance as apiGetWalletBalance, confirmStripeReceipt, sendManualReceipt } from "../../services/paymentService";
import TopUpDialog from "../Payments/TopUpDialog";
import { getFavouriteIds, invalidateCache } from "../../services/favoritesService";
import { getMyFavoriteEvents } from "../../services/eventService";
import { showToast, confirmDialog } from "../../utils/toast";
import {
  getStaffNotifications,
  createStaffNotification,
  markStaffNotificationRead,
  markAllStaffNotificationsRead,
  deleteStaffNotification,
  deleteAllStaffNotifications,
  getSeenEventIds,
  markEventsAsSeen,
  getSentReminders,
  markReminderSent,
  createReminderNotification,
  getCurrentUserReminders,
  markReminderRead,
  deleteReminder
} from "../../services/notificationService";
import LoyaltyPartnersList from "../Loyalty/LoyaltyPartnersList";
import StudentPollVoting from "../Polls/StudentPollVoting";
import CourtsReserve from "../Functions/CourtsReserve";
import WalletBadge from "../Wallet/WalletBadge";
import { checkGymSessionOverlap, doTimesOverlap, formatEventDateTime } from "../../utils/overlapDetection";
import { showOverlapWarning } from "../UI/OverlapWarningDialog";

function StaffDashboard() {
  const navigate = useNavigate();
  const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem("user") : null;
  const user = storedUser ? JSON.parse(storedUser) : { firstName: "Guest", role: "staff" };

  const [activeTab, setActiveTab] = useState("home");
  const [courts, setCourts] = useState([]);
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
  const [overlapWarnings, setOverlapWarnings] = useState([]);

  useEffect(() => {
    fetchRegisteredEvents();
    fetchCourts();
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
    } else if (activeTab === 'favourites') {
      fetchFavourites();
    } else if (activeTab === 'warnings') {
      // Refresh registered events to update warnings
      fetchRegisteredEvents();
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

  // Listen for loyalty partner added events
  useEffect(() => {
    const handleLoyaltyPartnerAdded = () => {
      fetchNotifications();
    };
    window.addEventListener('loyaltyPartnerAdded', handleLoyaltyPartnerAdded);
    return () => window.removeEventListener('loyaltyPartnerAdded', handleLoyaltyPartnerAdded);
  }, []);

  useEffect(() => {
    const onWallet = (e) => {
      // Use balance from event detail if available (faster), otherwise fetch
      if (e?.detail?.balance !== undefined && typeof e.detail.balance === 'number') {
        setWalletBalance(e.detail.balance);
      } else {
        fetchWallet();
      }
    };
    const onPaymentSuccess = (e) => {
      try {
        const amt = e?.detail?.amount;
        const method = e?.detail?.method;
        const m1 = method ? `${method} payment successful` : 'Payment successful';
        const amtTxt = typeof amt === 'number' ? ` (${amt} EGP)` : '';
        setBannerMsg(`${m1}${amtTxt}. Receipt emailed to you.`);
        setTimeout(() => setBannerMsg(''), 6000);
      } catch (_) { }
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
          try { await confirmStripeReceipt(sessionId); } catch (_) { }
          try { await fetchRegisteredEvents(); } catch (_) { }
          setBannerMsg('Payment successful. Receipt emailed to you.');
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
  }, []);

  const fetchNotifications = async () => {
    try {
      // Fetch only frontend notifications (localStorage)
      const localNotifs = getStaffNotifications();

      // Convert frontend notifications to match backend format for consistency
      const formattedFrontend = localNotifs.map(n => ({
        ...n,
        read: n.isRead,
        _id: n.id,
      }));

      // Sort by creation date (newest first)
      formattedFrontend.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0);
        const dateB = new Date(b.createdAt || b.date || 0);
        return dateB - dateA;
      });

      setNotifications(formattedFrontend);
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

        newEvents.forEach(event => {
          const eventId = String(event._id || event.id);
          const eventType = event.type || 'Event';
          createStaffNotification({
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

      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userId = user && (user._id || user.id);
      if (!userId) return;

      // Validate user role - only allow Student, Staff, TA, Professor, EventOffice
      const allowedRoles = ['Student', 'Staff', 'TA', 'Professor', 'EventOffice'];
      if (!user || !allowedRoles.includes(user.role)) {
        return; // Skip users with disallowed roles (e.g., Admin, Vendor)
      }

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
    // Find the session being registered
    const session = gymSessions.find(s => (s._id || s.id) === sessionId);
    if (!session) {
      showToast.error('Session not found');
      return;
    }

    // Check for time overlaps with existing registrations
    const conflicts = checkGymSessionOverlap(session, registeredEvents);
    if (conflicts.length > 0) {
      const sessionName = `${session.sessionType || 'Gym Session'} with ${session.instructor || 'TBA'}`;
      const proceed = await showOverlapWarning(conflicts, sessionName, session.startDate);
      if (!proceed) {
        return; // User cancelled
      }
    }

    setGymBusyId(sessionId);
    setGymStatus(prev => ({ ...prev, [sessionId]: { ok: false, msg: '' } }));
    try {
      const res = await registerForEvent(sessionId);
      showToast.success(res.message || 'Registered successfully');
      setGymStatus(prev => ({ ...prev, [sessionId]: { ok: true, msg: res.message || 'Registered successfully' } }));
      await fetchGymSessions();
      // Refresh registered events so the new registration appears in "My Registered Events" tab
      await fetchRegisteredEvents();
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
        setOverlapWarnings([]);
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

        // Check for overlaps in registered events
        checkForOverlaps(filteredEvents);
      }
    } catch (err) {
      console.error('Error loading registered events:', err);
      setRegisteredEvents([]);
      setOverlapWarnings([]);
    } finally { setLoading(false); }
  };

  // Function to check for overlaps between all registered events
  const checkForOverlaps = (events) => {
    const warnings = [];

    if (!events || events.length < 2) {
      setOverlapWarnings([]);
      return;
    }

    // Compare each event with every other event
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        if (!event1 || !event2 || !event1.startDate || !event2.startDate) continue;

        // Get end times
        const getEndTime = (event) => {
          if (event.endDate) return new Date(event.endDate);
          if (event.startDate && event.duration) {
            const start = new Date(event.startDate);
            return new Date(start.getTime() + event.duration * 60 * 1000);
          }
          if (event.startDate) {
            const start = new Date(event.startDate);
            // Default to 2 hours for events, 1 hour for gym sessions
            const duration = event.type === 'GymSession' ? 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
            return new Date(start.getTime() + duration);
          }
          return null;
        };

        const start1 = new Date(event1.startDate);
        const end1 = getEndTime(event1);
        const start2 = new Date(event2.startDate);
        const end2 = getEndTime(event2);

        if (!end1 || !end2) continue;

        // Check if they overlap
        const overlaps = doTimesOverlap(start1, end1, start2, end2);

        if (overlaps) {
          // Check if this warning already exists (avoid duplicates)
          const warningExists = warnings.some(w => {
            const id1 = w.event1._id || w.event1.id;
            const id2 = w.event2._id || w.event2.id;
            const e1Id = event1._id || event1.id;
            const e2Id = event2._id || event2.id;
            return (id1 === e1Id && id2 === e2Id) || (id1 === e2Id && id2 === e1Id);
          });

          if (!warningExists) {
            warnings.push({
              event1: {
                ...event1,
                start: start1,
                end: end1
              },
              event2: {
                ...event2,
                start: start2,
                end: end2
              }
            });
          }
        }
      }
    }

    console.log('Staff Dashboard - Overlap warnings detected:', warnings.length, warnings);
    setOverlapWarnings(warnings);
  };

  const fetchFavourites = async () => {
    try {
      // Fetch favorites directly from backend
      const events = await getMyFavoriteEvents();
      
      // Filter events that user has access to
      const filtered = Array.isArray(events) 
        ? events.filter(ev => {
            const eventId = ev._id || ev.id;
            return canUserAccessEvent(eventId);
          })
        : [];
      
      setFavouriteEvents(filtered);
    } catch (e) {
      console.error("Error fetching favorites:", e);
      setFavouriteEvents([]);
    }
  };

  // --- Courts Logic ---
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
          startTime: `${String(startHour).padStart(2, '0')}:00`,
          endTime: `${String(endHour).padStart(2, '0')}:00`
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

  const fetchCourts = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${API_BASE}/courts`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      const raw = Array.isArray(data) ? data : (Array.isArray(data.courts) ? data.courts : []);
      const now = new Date();
      const processed = raw.map(court => {
        const slots = Array.isArray(court.availability) ? court.availability : [];
        const availabilityDates = slots
          .filter(s => {
            try {
              if (s.isBooked) return false;
              const slotDate = new Date(s.date);
              if (!s.startTime) return false;
              const [h, m] = s.startTime.split(':').map(x => parseInt(x, 10));
              slotDate.setHours(h || 0, m || 0, 0, 0);
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
      setCourts(generateFakeCourts());
    }
  };

  function handleReserve(courtId, slotId) {
    setCourts(prev => (prev || []).map(c => {
      const cid = String(c._id || c.id);
      if (cid !== String(courtId)) return c;
      const remaining = (c.availabilityDates || []).filter(s => String(s.slotId) !== String(slotId));
      return { ...c, availabilityDates: remaining };
    }));
  }
  // --- End Courts Logic ---

  const unreadNotifications = notifications.filter(n => !n.isRead && n.type !== 'EventReminder');
  const unreadReminders = reminders.filter(n => !n.isRead);

  const menuItems = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "browse", label: "Browse Events", icon: "🎯" },
    { key: "gym-sessions", label: "Gym Sessions", icon: "🏋️" },
    { key: "courts", label: "Book a Court", icon: "🏸" },
    { key: "registered", label: "My Registered", icon: "✓" },
    { key: "favourites", label: "Favourites", icon: "❤️" },
    ...(overlapWarnings.length > 0 ? [{ key: "warnings", label: "⚠️ Time Conflicts", icon: "⚠️", badge: overlapWarnings.length }] : []),
    { key: "notifications", label: "Notifications", icon: "🔔", badge: unreadNotifications.length },
    { key: "reminders", label: "Reminders", icon: "⏰", badge: unreadReminders.length },
    { key: "loyalty", label: "Loyalty Partners", icon: "🤝" },
    { key: "polls", label: "Staff Polls", icon: "🗳️" },
  ];

  return (
    <DashboardLayout menuItems={menuItems} activeTab={activeTab} setActiveTab={setActiveTab}>
      {Boolean(bannerMsg) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-white rounded-lg px-6 py-3 shadow-xl z-[9999] font-bold text-sm tracking-wide">
          {bannerMsg}
        </div>
      )}

      {activeTab === "home" && (
        <div className="space-y-8">
          <div className="bg-slate-100 p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              {/* Left Side: Welcome Text */}
              <div className="flex-1 min-w-[300px]">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2 leading-tight">
                  Welcome, {user.firstName}! 👋
                </h1>
                <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">
                  Discover and register for amazing events happening on campus.
                </p>
              </div>

              {/* Right Side: Stats & Wallet */}
              <div className="flex flex-col gap-4 items-end flex-shrink-0 w-full md:w-auto">
                {/* Wallet Badge - Top Right */}
                <div className="w-full md:w-auto flex justify-end">
                  <WalletBadge
                    balance={walletBalance}
                    currency="EGP"
                    onTopUp={() => setTopUpOpen(true)}
                    className="w-full md:w-auto justify-between md:justify-start"
                  />
                </div>

                {/* Stats Cards */}
                <div className="flex gap-3 flex-wrap justify-end w-full md:w-auto">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 min-w-[140px] flex-1 md:flex-none text-center hover:shadow-md transition-shadow duration-300">
                    <div className="text-2xl font-bold text-slate-900 mb-1">{registeredEvents.length}</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Registered</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 min-w-[140px] flex-1 md:flex-none text-center hover:shadow-md transition-shadow duration-300">
                    <div className="text-2xl font-bold text-slate-900 mb-1">
                      {notifications.filter(n => !n.isRead && n.type !== 'EventReminder').length}
                    </div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Notifications</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Quick Access & Chatbot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Access */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span>⚡</span> Quick Access
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('browse')}
                  className="p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🎯</div>
                  <div className="font-bold text-slate-700 group-hover:text-emerald-700">Browse Events</div>
                  <div className="text-xs text-slate-500">Find new activities</div>
                </button>
                <button
                  onClick={() => { setActiveTab('gym-sessions'); fetchGymSessions(); }}
                  className="p-4 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🏋️</div>
                  <div className="font-bold text-slate-700 group-hover:text-amber-700">Gym Sessions</div>
                  <div className="text-xs text-slate-500">View schedule</div>
                </button>
                <button
                  onClick={() => setActiveTab('registered')}
                  className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">✓</div>
                  <div className="font-bold text-slate-700 group-hover:text-blue-700">My Registered</div>
                  <div className="text-xs text-slate-500">Check your events</div>
                </button>
                <button
                  onClick={() => setTopUpOpen(true)}
                  className="p-4 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">💳</div>
                  <div className="font-bold text-slate-700 group-hover:text-purple-700">Top Up Wallet</div>
                  <div className="text-xs text-slate-500">Add funds</div>
                </button>
              </div>
            </div>

            {/* Chatbot Placeholder */}
            <div className="bg-slate-50 p-8 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center min-h-[200px] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-3xl mb-4 mx-auto">
                  🤖
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">AI Assistant</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  Coming soon! A smart chatbot to help you navigate events and answer your questions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {activeTab === "browse" && (
          <div className="space-y-6">
            <EventList enableFavorites={true} filterByTypes={["Workshop", "Trip", "Conference", "GymSession", "Bazaar", "Booth"]} />
          </div>
        )}

        {activeTab === "favourites" && (
          <div className="space-y-6">
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">Favourites</h2>
                <p className="text-slate-500 mt-1">Events you've saved for later</p>
              </div>
            </div>
            <MyEventsList events={favouriteEvents} />
          </div>
        )}

        {activeTab === "registered" && (
          <div className="space-y-6">
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">My Registered Events</h2>
                <p className="text-slate-500 mt-1">Manage your upcoming activities</p>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="text-lg text-slate-500 font-medium">
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
                onRefresh={fetchRegisteredEvents}
              />
            )}
          </div>
        )}

        {activeTab === "reminders" && (
          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="text-center mb-8 relative">
              <h2 className="text-2xl font-bold text-slate-900">
                Reminders
              </h2>
              <p className="text-slate-500 mt-1">Don't miss your upcoming events</p>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block">
                {reminders.filter(n => !n.isRead).length > 0 && (
                  <button
                    onClick={() => {
                      reminders.filter(n => !n.isRead).forEach(reminder => {
                        markReminderRead(reminder.id);
                      });
                      fetchReminders();
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
              <div className="md:hidden mt-4 flex justify-center">
                {reminders.filter(n => !n.isRead).length > 0 && (
                  <button
                    onClick={() => {
                      reminders.filter(n => !n.isRead).forEach(reminder => {
                        markReminderRead(reminder.id);
                      });
                      fetchReminders();
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
            </div>
            {reminders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <div className="text-4xl mb-4 opacity-50">⏰</div>
                <p>No reminders at this time.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`p-6 rounded-xl border transition-all ${reminder.isRead
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-amber-200 shadow-md'
                      }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">⏰</span>
                          <h3 className={`text-lg ${reminder.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                            Event Reminder
                          </h3>
                          {!reminder.isRead && (
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                          )}
                        </div>
                        <p className={`text-base mb-2 ${reminder.isRead ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                          {reminder.message}
                        </p>
                        {reminder.eventStartDate && (
                          <p className="text-sm text-slate-400 mb-1">
                            Event starts: {new Date(reminder.eventStartDate).toLocaleString()}
                          </p>
                        )}
                        {reminder.eventId && (
                          <button
                            onClick={() => {
                              window.location.href = `/events/${reminder.eventId}`;
                            }}
                            className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm hover:shadow"
                          >
                            View Event
                          </button>
                        )}
                        <p className="text-xs text-slate-400 mt-3">
                          {reminder.createdAt ? new Date(reminder.createdAt).toLocaleString() : ''}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!reminder.isRead && (
                          <button
                            onClick={() => {
                              markReminderRead(reminder.id);
                              fetchReminders();
                            }}
                            className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => {
                            deleteReminder(reminder.id);
                            fetchReminders();
                          }}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
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
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-slate-900">Loyalty Partners</h2>
              <p className="text-slate-500">Exclusive discounts and offers for staff</p>
            </div>
            <LoyaltyPartnersList />
          </div>
        )}

        {activeTab === "polls" && (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-slate-900">Staff Polls</h2>
              <p className="text-slate-500">Vote on upcoming events and activities</p>
            </div>
            <StudentPollVoting />
          </div>
        )}

        {activeTab === "warnings" && (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-slate-900">⚠️ Time Conflict Warnings</h2>
              <p className="text-slate-500">You have overlapping event registrations that conflict in time</p>
            </div>
            {overlapWarnings.length === 0 ? (
              <div className="bg-white p-20 rounded-2xl text-center shadow-sm border border-slate-100">
                <div className="text-6xl mb-6">✅</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Conflicts</h3>
                <p className="text-slate-500">All your registered events are scheduled at different times.</p>
              </div>
            ) : (
              <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-amber-200">
                <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">⚠️</span>
                    <h3 className="text-lg font-bold text-amber-900">Warning: Time Conflicts Detected</h3>
                  </div>
                  <p className="text-amber-800 text-sm">
                    You have {overlapWarnings.length} conflict{overlapWarnings.length !== 1 ? 's' : ''} where events overlap in time.
                    You cannot attend multiple events at the same time. Please consider cancelling one of the conflicting events.
                  </p>
                </div>
                <div className="space-y-4">
                  {overlapWarnings.map((warning, index) => {
                    const event1Type = warning.event1.type === 'GymSession' ? 'Gym Session' : warning.event1.type || 'Event';
                    const event2Type = warning.event2.type === 'GymSession' ? 'Gym Session' : warning.event2.type || 'Event';

                    return (
                      <div key={index} className="p-6 bg-red-50 rounded-xl border-2 border-red-200">
                        <div className="flex items-start gap-4">
                          <div className="text-3xl">⚠️</div>
                          <div className="flex-1">
                            <h4 className="font-bold text-red-900 mb-4 text-lg">Conflict #{index + 1}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 bg-white rounded-lg border border-red-200">
                                <div className="font-semibold text-slate-900 mb-2">
                                  {event1Type}: {warning.event1.title || warning.event1.name || 'Untitled Event'}
                                </div>
                                <div className="text-sm text-slate-600 space-y-1">
                                  <div>📅 {formatEventDateTime(warning.event1.start)}</div>
                                  {warning.event1.end && (
                                    <div>⏰ Ends: {formatEventDateTime(warning.event1.end)}</div>
                                  )}
                                  {warning.event1.location && (
                                    <div>📍 {warning.event1.location}</div>
                                  )}
                                </div>
                              </div>
                              <div className="p-4 bg-white rounded-lg border border-red-200">
                                <div className="font-semibold text-slate-900 mb-2">
                                  {event2Type}: {warning.event2.title || warning.event2.name || 'Untitled Event'}
                                </div>
                                <div className="text-sm text-slate-600 space-y-1">
                                  <div>📅 {formatEventDateTime(warning.event2.start)}</div>
                                  {warning.event2.end && (
                                    <div>⏰ Ends: {formatEventDateTime(warning.event2.end)}</div>
                                  )}
                                  {warning.event2.location && (
                                    <div>📍 {warning.event2.location}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-300">
                              <p className="text-sm text-red-900 font-medium">
                                ⚠️ These events overlap in time. You cannot attend both simultaneously.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="text-center mb-8 relative">
              <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
              <p className="text-slate-500 mt-2">Updates about events and activities</p>
              <div className="flex gap-3 mt-4 md:mt-0 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 justify-center">
                {notifications.filter(n => !n.read && !n.isRead).length > 0 && (
                  <button
                    onClick={() => {
                      markAllStaffNotificationsRead();
                      fetchNotifications();
                      showToast.success('All notifications marked as read');
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    Mark All as Read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={async () => {
                      const confirmed = await confirmDialog('Are you sure you want to delete all notifications?', 'Delete All Notifications');
                      if (confirmed) {
                        deleteAllStaffNotifications();
                        fetchNotifications();
                        showToast.success('All notifications deleted');
                      }
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Delete All
                  </button>
                )}
              </div>
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <div className="text-4xl mb-4 opacity-50">🔔</div>
                <p>No notifications at this time.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {notifications.map((notif) => {
                  const isRead = notif.read || notif.isRead;
                  return (
                    <div
                      key={notif.id || notif._id}
                      className={`p-6 rounded-xl border transition-all ${isRead
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-emerald-200 shadow-md'
                        }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {notif.type === 'NewEvent' && <span className="text-2xl">🎉</span>}
                            {notif.type === 'LoyaltyPartnerAdded' && <span className="text-2xl">⭐</span>}
                            <h3 className={`text-lg ${isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                              {notif.type === 'NewEvent' ? 'New Event Available' :
                                notif.type === 'LoyaltyPartnerAdded' ? 'New Loyalty Partner' :
                                  'Notification'}
                            </h3>
                            {!isRead && (
                              <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                            )}
                          </div>
                          <p className={`text-base mb-2 ${isRead ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                            {notif.message}
                          </p>
                          {notif.eventId && (
                            <button
                              onClick={() => {
                                window.location.href = `/events/${notif.eventId}`;
                              }}
                              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm hover:shadow"
                            >
                              View Event
                            </button>
                          )}
                          <p className="text-xs text-slate-400 mt-3">
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {!isRead && (
                            <button
                              onClick={() => {
                                markStaffNotificationRead(notif.id);
                                fetchNotifications();
                              }}
                              className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => {
                              deleteStaffNotification(notif.id);
                              fetchNotifications();
                              showToast.success('Notification deleted');
                            }}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
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

        {activeTab === "courts" && (
          <div className="space-y-6">
            <CourtsReserve courts={courts} onReserved={handleReserve} />
          </div>
        )}

        {activeTab === "gym-sessions" && (
          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="text-center mb-8 relative">
              <h2 className="text-2xl font-bold text-slate-900">Gym Sessions</h2>
              <p className="text-slate-500 mt-2">View schedule and register for sessions</p>
            </div>
            {gymSessionsLoading ? (
              <div className="text-center py-20 text-slate-500">
                <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
                <p>Loading gym sessions...</p>
              </div>
            ) : gymSessionsError ? (
              <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                {gymSessionsError}
              </div>
            ) : gymSessions.length === 0 ? (
              <div className="text-center py-20 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <div className="text-6xl mb-6 opacity-50">🏋️</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Sessions Scheduled</h3>
                <p>There are no gym sessions scheduled at the moment.</p>
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
                // Check against registeredEvents state which is reliable
                return registeredEvents.some(re => String(re._id || re.id) === id);
              };
              return (
                <div className="flex flex-col gap-10">
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
                        <div className="flex items-center gap-4 mb-6">
                          <h3 className="text-2xl font-bold text-slate-800">{month}</h3>
                          <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {typeKeys.map((tk) => (
                            <div key={tk} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                              <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                                <div className="font-bold text-slate-800 text-lg">{tk}</div>
                              </div>
                              <ul className="divide-y divide-slate-100">
                                {byType[tk]
                                  .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                                  .map((s) => {
                                    const id = s._id || s.id;
                                    const started = isStarted(s);
                                    const full = isFull(s);
                                    const mine = alreadyRegistered(s);
                                    const disabled = started || full || mine || gymBusyId === id;
                                    const label = mine ? 'Registered' : full ? 'Full' : started ? 'Started' : (gymBusyId === id ? '...' : 'Register');
                                    const fmtDate = (date) => {
                                      if (!date) return 'TBA';
                                      return new Date(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
                                    };
                                    const fmtTime = (date) => {
                                      if (!date) return 'TBA';
                                      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    };
                                    return (
                                      <li key={id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-center gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="font-bold text-slate-700 text-sm bg-slate-100 px-2 py-0.5 rounded">
                                                {fmtDate(s.startDate)}
                                              </span>
                                              <span className="text-sm text-slate-600 font-medium">
                                                {fmtTime(s.startDate)}
                                              </span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-2 truncate">
                                              <span>👤 {s.instructor || "TBA"}</span>
                                              {s.capacity && (
                                                <span className={`${full ? 'text-red-500 font-bold' : ''}`}>
                                                  👥 {s.registeredCount || 0}/{s.capacity}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <button
                                            disabled={disabled}
                                            onClick={() => !disabled && handleGymRegister(id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${disabled
                                              ? mine
                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                              : 'bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-md hover:-translate-y-0.5'
                                              }`}
                                          >
                                            {mine && <span className="mr-1">✓</span>}
                                            {label}
                                          </button>
                                        </div>
                                        {gymStatus[id] && gymStatus[id].msg && (
                                          <div className={`text-xs mt-2 px-2 py-1 rounded ${gymStatus[id].ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
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
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {
        topUpOpen && (
          <TopUpDialog open={topUpOpen} onClose={() => setTopUpOpen(false)} onSuccess={(res) => {
            const next = (res && typeof res.balance === 'number') ? res.balance : undefined;
            if (typeof next === 'number') setWalletBalance(next);
          }} />
        )
      }
    </DashboardLayout >
  );
}

export default StaffDashboard;
