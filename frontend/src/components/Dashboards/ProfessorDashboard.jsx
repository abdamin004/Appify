import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../Layout/DashboardLayout";
import EventsList from "../EventList";
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
import WalletBadge from "../Wallet/WalletBadge";
import { checkGymSessionOverlap, doTimesOverlap, formatEventDateTime } from "../../utils/overlapDetection";
import { showOverlapWarning } from "../UI/OverlapWarningDialog";
import FeedbackAnalytics from "./FeedbackAnalytics";

function ProfessorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("home");
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
  const [overlapWarnings, setOverlapWarnings] = useState([]);

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
      if (!rawUser) {
        console.log('fetchNotifications: No user found in localStorage');
        setNotifications([]);
        return;
      }
      const u = JSON.parse(rawUser);
      const professorId = u && (u._id || u.id);
      if (!professorId) {
        console.log('fetchNotifications: No professor ID found');
        setNotifications([]);
        return;
      }
      const notifs = getProfessorNotifications(String(professorId));
      console.log('fetchNotifications: Found', notifs.length, 'notifications for professor', professorId);
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

      // Validate user role - only allow Student, Staff, TA, Professor, EventOffice
      const allowedRoles = ['Student', 'Staff', 'TA', 'Professor', 'EventOffice'];
      if (!u || !allowedRoles.includes(u.role)) {
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

  // Wallet updates and payment success banner
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

  useEffect(() => {
    if (activeTab === "my-workshops") {
      fetchMyWorkshops(); // Always refetch to ensure we get latest status
    } else if (activeTab === "edit-requests") {
      fetchMyWorkshops(); // Always refetch to ensure we get latest edit requests
      fetchNotifications(); // Also refresh notifications
    } else if (activeTab === "registered" && registeredEvents.length === 0) {
      fetchRegisteredEvents();
    } else if (activeTab === 'favourites') {
      fetchFavourites();
    } else if (activeTab === 'notifications') {
      fetchNotifications(); // Always refetch notifications
      fetchMyWorkshops(); // Also refresh workshops to check for edit requests
    } else if (activeTab === 'reminders') {
      fetchReminders();
    } else if (activeTab === 'gym-sessions') {
      setGymSessionsLoading(true);
      fetchGymSessions();
    } else if (activeTab === 'warnings') {
      // Refresh registered events to update warnings
      fetchRegisteredEvents();
    }
  }, [activeTab]);

  // Parse edit requests from workshop description
  const parseEditRequests = (description) => {
    if (!description) return [];
    const requests = [];
    // Updated regex to handle the exact format: --- EDIT REQUEST FROM EVENTS OFFICE (timestamp) ---\nrequest\n--- END EDIT REQUEST ---
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
      if (!professorId) {
        console.warn('fetchMyWorkshops: No professor ID found');
        setMyWorkshops([]);
        return;
      }

      // The backend endpoint uses req.user._id, so we don't need to pass professorId as query param
      // But the route might expect it, so let's try both approaches
      const url = `${API_BASE}/events/workshops/mine`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error('fetchMyWorkshops failed:', res.status, errorData);
        setMyWorkshops([]);
        return;
      }

      const data = await res.json();
      const workshops = Array.isArray(data) ? data : [];
      console.log('fetchMyWorkshops: Fetched', workshops.length, 'workshops');
      setMyWorkshops(workshops);
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
        setOverlapWarnings([]);
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
      
      // Check for overlaps in registered events
      checkForOverlaps(filteredEvents);
    } catch (err) {
      console.error(err);
      setRegisteredEvents([]);
      setOverlapWarnings([]);
    }
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
    
    console.log('Professor Dashboard - Overlap warnings detected:', warnings.length, warnings);
    setOverlapWarnings(warnings);
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

  const menuItems = [
    { label: "Home", icon: "🏠", onClick: () => setActiveTab("home") },
    { label: "Browse Events", icon: "🎯", onClick: () => setActiveTab("browse") },
    {
      label: "Gym Sessions",
      icon: "🏋️",
      onClick: () => {
        setActiveTab("gym-sessions");
        setGymSessionsLoading(true);
        fetchGymSessions();
      }
    },
    { label: "My Registered Events", icon: "✓", onClick: () => setActiveTab("registered") },
    { label: "Favourites", icon: "❤️", onClick: () => setActiveTab("favourites") },
    { label: "My Workshops", icon: "📚", onClick: () => setActiveTab("my-workshops") },
    {
      label: "Edit Requests",
      icon: "✏️",
      onClick: () => setActiveTab("edit-requests"),
      badgeCount: getWorkshopsWithEditRequests().length
    },
    { label: "Feedback Analytics", icon: "📊", onClick: () => setActiveTab("feedback-analytics") },
    {
      label: "Notifications",
      icon: "🔔",
      onClick: () => {
        setActiveTab("notifications");
        fetchNotifications();
      },
      badgeCount: notifications.filter(n => !n.isRead && n.type !== 'EventReminder').length
    },
    {
      label: "Reminders",
      icon: "⏰",
      onClick: () => {
        setActiveTab("reminders");
        fetchReminders();
      },
      badgeCount: reminders.filter(n => !n.isRead).length
    },
    ...(overlapWarnings.length > 0 ? [{
      label: "⚠️ Time Conflicts",
      icon: "⚠️",
      onClick: () => setActiveTab("warnings"),
      badgeCount: overlapWarnings.length,
      className: "text-amber-600 font-bold"
    }] : []),
    { label: "Loyalty Partners", icon: "⭐", onClick: () => setActiveTab("loyalty") },
  ];



  // Get workshops with edit requests












  return (
    <DashboardLayout menuItems={menuItems}>
      <>
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
                    Welcome, Prof. {user.lastName || user.firstName}! 👋
                  </h1>
                  <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">
                    Manage your workshops and view university events.
                  </p>
                </div>

                {/* Right Side: Stats & Wallet */}
                <div className="flex flex-col gap-4 items-end flex-shrink-0 w-full md:w-auto">
                  {/* Wallet Badge - Top Right */}
                  <div className="w-full md:w-auto flex justify-end gap-3">
                    <button
                      onClick={() => navigate('/professor/workshops')}
                      className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                    >
                      <span>➕</span> Create Workshop
                    </button>
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
                      <div className="text-2xl font-bold text-slate-900 mb-1">{myWorkshops.length}</div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">My Workshops</div>
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
                    onClick={() => navigate('/professor/workshops')}
                    className="p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all text-left group"
                  >
                    <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">➕</div>
                    <div className="font-bold text-slate-700 group-hover:text-emerald-700">Create Workshop</div>
                    <div className="text-xs text-slate-500">Host a new event</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('my-workshops')}
                    className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all text-left group"
                  >
                    <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📚</div>
                    <div className="font-bold text-slate-700 group-hover:text-blue-700">My Workshops</div>
                    <div className="text-xs text-slate-500">Manage your events</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="p-4 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl transition-all text-left group"
                  >
                    <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🎯</div>
                    <div className="font-bold text-slate-700 group-hover:text-amber-700">Browse Events</div>
                    <div className="text-xs text-slate-500">Find activities</div>
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
              <EventsList enableFavorites={true} />
            </div>
          )}
          {activeTab === "registered" && (
            <div className="space-y-6">
              <div className="mb-2">
                <h2 className="text-2xl font-bold text-slate-900">My Registered Events</h2>
                <p className="text-slate-500">Manage your upcoming activities</p>
              </div>
              <MyEventsList
                events={registeredEvents.filter(event => {
                  const eventId = event._id || event.id;
                  if (!eventId) return true;
                  return canUserAccessEvent(eventId);
                })}
                showRefundButton
              />
            </div>
          )}
          {activeTab === "my-workshops" && (
            <div className="space-y-6">
              <div className="mb-2">
                <h2 className="text-2xl font-bold text-slate-900">My Workshops</h2>
                <p className="text-slate-500">Manage your created workshops and participants</p>
              </div>
              <WorkshopParticipantsView workshops={myWorkshops} />
            </div>
          )}
          {activeTab === 'favourites' && (
            <div className="space-y-6">
              <div className="mb-2">
                <h2 className="text-2xl font-bold text-slate-900">My Favourites</h2>
                <p className="text-slate-500">Events you've saved for later</p>
              </div>
              <MyEventsList events={favouriteEvents} />
            </div>
          )}

          {
            activeTab === "gym-sessions" && (
              <div className="space-y-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-slate-900">Gym Sessions</h2>
                  <p className="text-slate-500">View schedule and register for sessions</p>
                </div>
                <div className="bg-slate-100 p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
                  {gymSessionsLoading ? (
                    <div className="text-center py-20">
                      <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
                      <p className="text-slate-500 text-base">Loading sessions...</p>
                    </div>
                  ) : gymSessionsError ? (
                    <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 flex items-center gap-3">
                      <span className="text-2xl">⚠️</span>
                      <span className="font-medium">{gymSessionsError}</span>
                    </div>
                  ) : (!gymSessions || gymSessions.length === 0) ? (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                      <div className="text-6xl mb-6 opacity-50">🏋️</div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">No Sessions Found</h3>
                      <p className="text-slate-500">There are no gym sessions scheduled at the moment.</p>
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
                      <div className="flex flex-col gap-8">
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
                              <div className="flex items-center gap-4 mb-6">
                                <h3 className="text-xl font-bold text-slate-800 whitespace-nowrap">{month}</h3>
                                <div className="h-px bg-slate-200 flex-1"></div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {typeKeys.map((tk) => (
                                  <div key={tk} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                                      <div className="font-bold text-slate-900 text-lg">{tk}</div>
                                      <div className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">
                                        {byType[tk].length} Session{byType[tk].length !== 1 ? 's' : ''}
                                      </div>
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
                                          const fmtDateTime = (date) => {
                                            if (!date) return 'TBA';
                                            const d = new Date(date);
                                            return {
                                              date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
                                              time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            };
                                          };
                                          const dt = fmtDateTime(s.startDate);
                                          const st = gymStatus[id];

                                          return (
                                            <li key={id} className="p-4 hover:bg-slate-50 transition-colors">
                                              <div className="flex justify-between items-center gap-4">
                                                <div>
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-slate-700 text-sm bg-slate-100 px-2 py-0.5 rounded">{dt.date}</span>
                                                    <span className="text-sm font-medium text-slate-600">{dt.time}</span>
                                                  </div>
                                                  <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <span>👤 {s.instructor || "TBA"}</span>
                                                    {s.capacity && <span>• 👥 {s.capacity} cap</span>}
                                                  </div>
                                                </div>
                                                <div>
                                                  <button
                                                    onClick={() => handleGymRegister(id)}
                                                    disabled={disabled}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${disabled
                                                      ? mine
                                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                                      : 'bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-md hover:-translate-y-0.5'
                                                      }`}
                                                  >
                                                    {label}
                                                  </button>
                                                </div>
                                              </div>
                                              {st && (
                                                <div className={`mt-2 text-xs font-medium px-2 py-1 rounded ${st.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                  {st.msg}
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
              </div>
            )
          }

          {activeTab === "edit-requests" && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">
                Workshops with Edit Requests
              </h2>
              {getWorkshopsWithEditRequests().length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-4xl mb-4 opacity-50">✅</div>
                  <p>No pending edit requests from the Events Office.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {getWorkshopsWithEditRequests().map(workshop => (
                    <div key={workshop._id || workshop.id} className="border border-amber-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-amber-50 p-4 border-b border-amber-200 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800 m-0">{workshop.title}</h3>
                        <button
                          onClick={() => navigate(`/professor/workshops?edit=${workshop._id || workshop.id}`)}
                          className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm"
                        >
                          Edit Workshop
                        </button>
                      </div>
                      <div className="p-6 bg-white">
                        <h4 className="text-amber-700 font-bold mb-4 flex items-center gap-2">
                          <span>✏️</span> Requests from Events Office:
                        </h4>
                        <div className="flex flex-col gap-4">
                          {workshop.editRequests.map((req, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
                              <div className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">
                                {req.timestamp}
                              </div>
                              <p className="text-slate-700 m-0 whitespace-pre-wrap leading-relaxed">
                                {req.request}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 m-0">Notifications</h2>
                <div className="flex gap-3">
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <button
                      onClick={() => {
                        markAllNotificationsRead();
                        fetchNotifications();
                      }}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-200 transition-colors"
                    >
                      Mark All Read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete all notifications?')) {
                          deleteAllNotifications();
                          fetchNotifications();
                        }
                      }}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-4xl mb-4 opacity-50">📭</div>
                  <p>No notifications yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-xl border transition-all ${notif.isRead
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-emerald-200 shadow-sm'
                        }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">
                              {notif.type === 'NewEvent' ? '🎉' :
                                notif.type === 'EventReminder' ? '⏰' :
                                  notif.type === 'WorkshopApproved' ? '✅' :
                                    notif.type === 'WorkshopRejected' ? '❌' :
                                      notif.type === 'EditRequest' ? '✏️' : '📢'}
                            </span>
                            <h4 className={`text-base m-0 ${notif.isRead ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>
                              {notif.message}
                            </h4>
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 ml-8">
                            {new Date(notif.date).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!notif.isRead && (
                            <button
                              onClick={() => {
                                markNotificationRead(notif.id);
                                fetchNotifications();
                              }}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              ✓
                            </button>
                          )}
                          <button
                            onClick={() => {
                              deleteNotification(notif.id);
                              fetchNotifications();
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "reminders" && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 m-0">Event Reminders</h2>
                {reminders.filter(n => !n.isRead).length > 0 && (
                  <button
                    onClick={() => {
                      reminders.filter(n => !n.isRead).forEach(reminder => {
                        markReminderRead(reminder.id);
                      });
                      fetchReminders();
                    }}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
              {reminders.length === 0 ? (
                <p className="text-slate-500 text-base">No reminders at this time.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`p-6 rounded-xl border relative shadow-sm ${reminder.isRead
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-amber-500 border-2 shadow-md'
                        }`}
                    >
                      <div className="flex justify-between items-start gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">⏰</span>
                            <h3 className={`text-lg m-0 ${reminder.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                              Event Reminder
                            </h3>
                            {!reminder.isRead && (
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                            )}
                          </div>
                          <p className={`my-2 text-base ${reminder.isRead ? 'font-normal text-slate-500' : 'font-medium text-slate-600'}`}>
                            {reminder.message}
                          </p>
                          {reminder.eventStartDate && (
                            <p className="text-slate-400 text-sm my-1">
                              Event starts: {new Date(reminder.eventStartDate).toLocaleString()}
                            </p>
                          )}
                          {reminder.eventId && (
                            <button
                              onClick={() => window.location.href = `/events/${reminder.eventId}`}
                              className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              View Event
                            </button>
                          )}
                          <p className="text-slate-400 text-sm mt-2 m-0">
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
                              className="bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-emerald-600 transition-colors cursor-pointer border-none"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => {
                              deleteReminder(reminder.id);
                              fetchReminders();
                            }}
                            className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-red-600 transition-colors cursor-pointer border-none"
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

          {activeTab === "loyalty" && <LoyaltyPartnersList />}
          {activeTab === "polls" && <StudentPollVoting />}

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

          {activeTab === "feedback-analytics" && (
            <FeedbackAnalytics />
          )}
        </div>

        <TopUpDialog
          open={topUpOpen}
          onClose={() => setTopUpOpen(false)}
          onSuccess={(amount) => {
            setWalletBalance((prev) => (prev || 0) + amount);
            setTopUpOpen(false);
            showToast.success(`Successfully added ${amount} EGP to wallet`);
          }}
        />
      </>
    </DashboardLayout>
  );
}

export default ProfessorDashboard;
