import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import EventList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";
import BoothPollManager from "../Polls/BoothPollManager";
import adminService from "../../services/adminService";
import { listGymSessions, cancelGymSession, listPendingWorkshops, approveWorkshop, rejectWorkshop, updateEvent, API_BASE, generateVendorAttendeePasses } from "../../services/eventService";
import { createProfessorNotification, getEventOfficeNotifications, markEventOfficeNotificationRead, markAllEventOfficeNotificationsRead, deleteEventOfficeNotification, getEventOfficeUnreadCount, createEventOfficeNotification, getSeenEventIds, markEventsAsSeen, getSentReminders, markReminderSent, createReminderNotification } from "../../services/notificationService";
import LoyaltyPartnersList from "../Loyalty/LoyaltyPartnersList";
import AttendeesReport from "../Admin/AttendeesReport";
import SalesReport from "../Admin/SalesReport";
import VendorDocumentsPage from "../Admin/VendorDocuments";
import { showToast, confirmDialog } from "../../utils/toast";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from "../../utils/designSystem";

function EventOfficeDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("browse");
  const [vendorRequests, setVendorRequests] = useState([]);
  const [vendorRequestsLoading, setVendorRequestsLoading] = useState(false);
  const [vendorRequestsError, setVendorRequestsError] = useState("");
  const [approvedVendorRequests, setApprovedVendorRequests] = useState([]);
  const [approvedVendorsLoading, setApprovedVendorsLoading] = useState(false);
  const [approvedVendorsError, setApprovedVendorsError] = useState("");
  const [generatePassesLoadingId, setGeneratePassesLoadingId] = useState(null);
  const [gymSessions, setGymSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [pendingWorkshops, setPendingWorkshops] = useState([]);
  const [editRequestModal, setEditRequestModal] = useState({ open: false, workshopId: null, editRequest: "" });
  const [approvedWorkshops, setApprovedWorkshops] = useState(() => {
    // Load approved workshops from localStorage
    try {
      const stored = localStorage.getItem('approvedWorkshops');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  
  const storedUser = localStorage.getItem("user");
  const user = storedUser
    ? JSON.parse(storedUser)
    : { firstName: "Guest", role: "eventoffice" };

  useEffect(() => {
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
    if (activeTab === 'notifications') {
      fetchNotifications();
    } else if (activeTab === 'reminders') {
      fetchReminders();
    } else if (activeTab === 'vendor-requests') {
      // Refresh vendor requests immediately when tab opens
      fetchVendorRequests();
    }
  }, [activeTab]);

  // Refresh notifications when switching to workshop approvals or notifications tab
  useEffect(() => {
    if (activeTab === "workshop-approvals" || activeTab === "notifications") {
      fetchNotifications();
    }
  }, [activeTab]);

  const fetchPendingWorkshops = async () => {
    try {
      const workshops = await listPendingWorkshops();
      // Filter out already approved workshops (frontend-only approval)
      const approvedSet = approvedWorkshops;
      const pending = Array.isArray(workshops) 
        ? workshops.filter(w => !approvedSet.has(w._id) && w.status === 'draft')
        : [];
      setPendingWorkshops(pending);
    } catch (err) {
      console.error("Error fetching pending workshops:", err);
      setPendingWorkshops([]);
    }
  };

  useEffect(() => {
    if (activeTab === "gym-sessions") {
      fetchGymSessions();
    } else if (activeTab === "workshop-approvals") {
      fetchPendingWorkshops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    fetchVendorRequests();
    const refresh = setInterval(fetchVendorRequests, 60000);
    return () => clearInterval(refresh);
  }, []);

  const normalizePendingApplication = (app = {}) => {
    const eventData = app.event || {};
    const organizationName =
      (app.organization && (app.organization.name || app.organization.companyName)) ||
      app.organizationName ||
      (typeof app.organization === "string" ? app.organization : "") ||
      app.vendorUser?.companyName ||
      "Vendor";

    return {
      ...app,
      organizationName,
      vendorEmail: app.vendorUser?.email || app.vendorUser?.username || "",
      eventTitle: eventData.title || app.eventTitle || "Untitled Event",
      eventType: eventData.type || app.eventType || "Event",
      eventStart: eventData.startDate,
      eventLocation: eventData.location,
      status: app.status || "pending",
      boothSize: app.boothSize,
    };
  };

  const normalizeApprovedApplication = (doc = {}) => {
    const eventData = doc.event || {};
    const vendorData = doc.vendor || {};

    return {
      _id: doc.applicationId || doc._id,
      status: "approved",
      organizationName: doc.organization || vendorData.companyName || "Vendor",
      vendorEmail: vendorData.email || "",
      boothSize: doc.boothSize,
      attendees: doc.attendees || [],
      eventTitle: eventData.title || "Untitled Event",
      eventType: eventData.type || "Event",
      eventStart: eventData.startDate,
      eventLocation: eventData.location,
      event: {
        _id: eventData.id || eventData._id,
        title: eventData.title,
        type: eventData.type,
      },
      vendorUser: {
        _id: vendorData.id || vendorData._id,
        email: vendorData.email,
        companyName: vendorData.companyName,
      },
    };
  };

  const fetchVendorRequests = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      const authMessage = "Please log in with an Event Office or Admin account to review vendor requests.";
      setVendorRequests([]);
      setVendorRequestsError(authMessage);
      setApprovedVendorRequests([]);
      setApprovedVendorsError(authMessage);
      setVendorRequestsLoading(false);
      setApprovedVendorsLoading(false);
      return;
    }

    setVendorRequestsLoading(true);
    setVendorRequestsError("");
    setApprovedVendorsLoading(true);
    setApprovedVendorsError("");

    try {
      const [pendingRes, approvedRes] = await Promise.all([
        adminService.listPendingVendorApplications(),
        adminService.listApprovedVendorApplications(),
      ]);

      const pendingList = Array.isArray(pendingRes?.applications)
        ? pendingRes.applications
        : Array.isArray(pendingRes)
          ? pendingRes
          : [];

      const approvedList = Array.isArray(approvedRes?.vendorDocuments)
        ? approvedRes.vendorDocuments
        : Array.isArray(approvedRes)
          ? approvedRes
          : [];

      setVendorRequests(pendingList.map(normalizePendingApplication));
      setApprovedVendorRequests(approvedList.map(normalizeApprovedApplication));
    } catch (err) {
      console.error("Error fetching vendor requests:", err);
      setVendorRequests([]);
      setApprovedVendorRequests([]);
      const errMsg = err?.message || err?.error || err?.response?.data?.message;
      setVendorRequestsError(
        typeof errMsg === "string" && errMsg.trim().length > 0
          ? errMsg
          : "Failed to load vendor requests. Please check your connection or backend status."
      );
      setApprovedVendorsError(
        typeof errMsg === "string" && errMsg.trim().length > 0
          ? errMsg
          : "Failed to load approved vendor requests. Please check your connection or backend status."
      );
    }
    setVendorRequestsLoading(false);
    setApprovedVendorsLoading(false);
  };

  const fetchGymSessions = async () => {
    try {
      const rows = await listGymSessions();
      setGymSessions(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("Error fetching gym sessions:", err);
      setGymSessions([]);
    }
  };

  const handleApproveWorkshop = async (workshopId) => {
    // Frontend-only approval - no backend calls
    const confirmed = await confirmDialog("Are you sure you want to approve and publish this workshop?", "Approve Workshop");
    if (!confirmed) return;
    
    // Find the workshop to get its details
    const workshop = pendingWorkshops.find(w => w._id === workshopId);
    if (!workshop) {
      showToast.error("Workshop not found");
      return;
    }
    
    // Add to approved set and save to localStorage
    const newApproved = new Set(approvedWorkshops);
    newApproved.add(workshopId);
    setApprovedWorkshops(newApproved);
    
    // Save to localStorage
    try {
      localStorage.setItem('approvedWorkshops', JSON.stringify(Array.from(newApproved)));
    } catch (err) {
      console.error('Failed to save approved workshops to localStorage', err);
    }
    
    // Immediately remove from pending list
    setPendingWorkshops(prev => prev.filter(w => w._id !== workshopId));
    
    // Create notification for the professor who created the workshop
    if (workshop.createdBy) {
      createProfessorNotification(workshop.createdBy, {
        type: 'WorkshopApproved',
        message: `Your workshop "${workshop.title}" has been approved and published successfully!`,
        workshopId: workshopId,
        workshopTitle: workshop.title,
      });
    }
    
    // Create notifications for all users about the newly published workshop
    const publishedWorkshop = { ...workshop, status: 'published' };
    const { notifyAllUsersAboutNewEvent } = await import('../../services/eventService');
    notifyAllUsersAboutNewEvent(publishedWorkshop);
    
    // Show success message
    showToast.success("Workshop approved and published successfully!");
  };

  const handleRejectWorkshop = async (workshopId) => {
    const confirmed = await confirmDialog("Are you sure you want to reject this workshop?", "Reject Workshop");
    if (!confirmed) return;
    try {
      // Find the workshop to get its details
      const workshop = pendingWorkshops.find(w => w._id === workshopId);
      if (!workshop) {
        showToast.error("Workshop not found");
        return;
      }
      
      // Immediately remove from pending list (optimistic update)
      setPendingWorkshops(prev => prev.filter(w => w._id !== workshopId));
      
      await rejectWorkshop(workshopId);
      
      // Create notification for the professor who created the workshop
      if (workshop.createdBy) {
        createProfessorNotification(workshop.createdBy, {
          type: 'WorkshopRejected',
          message: `Your workshop "${workshop.title}" has been rejected.`,
          workshopId: workshopId,
          workshopTitle: workshop.title,
        });
      }
      
      showToast.success("Workshop rejected successfully!");
    } catch (err) {
      console.error("Error rejecting workshop:", err);
      showToast.error(err?.message || "Error rejecting workshop");
      // Re-fetch to restore the list if rejection failed
      fetchPendingWorkshops();
    }
  };

  const handleRequestEdits = (workshopId) => {
    setEditRequestModal({ open: true, workshopId, editRequest: "" });
  };

  const handleSubmitEditRequest = async () => {
    if (!editRequestModal.editRequest.trim()) {
      showToast.warning("Please enter edit requests");
      return;
    }
    try {
      const workshop = pendingWorkshops.find(w => w._id === editRequestModal.workshopId);
      if (!workshop) {
        showToast.error("Workshop not found");
        return;
      }
      
      // Append edit request to description
      const currentDescription = workshop.description || "";
      const editRequestNote = `\n\n--- EDIT REQUEST FROM EVENTS OFFICE (${new Date().toLocaleString()}) ---\n${editRequestModal.editRequest}\n--- END EDIT REQUEST ---`;
      const updatedDescription = currentDescription + editRequestNote;
      
      await updateEvent(editRequestModal.workshopId, { description: updatedDescription });
      showToast.success("Edit request sent successfully! The professor will see your request in the workshop details.");
      setEditRequestModal({ open: false, workshopId: null, editRequest: "" });
      fetchPendingWorkshops();
    } catch (err) {
      console.error("Error sending edit request:", err);
      showToast.error(err?.message || "Error sending edit request");
    }
  };

  const fetchNotifications = async () => {
    try {
      // Fetch backend notifications for Event Office
      let backendNotifications = [];
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const token = localStorage.getItem("token");
        if (token) {
          // Try the user notifications endpoint first (Event Office is a user role)
          const res = await fetch(`${API_BASE}/users/me/notifications`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            backendNotifications = Array.isArray(data) ? data : (Array.isArray(data?.notifications) ? data.notifications : []);
          } else if (res.status === 404) {
            // Backend route not implemented yet - gracefully handle
            backendNotifications = [];
          }
        }
      } catch (err) {
        // Network error or other issue - gracefully handle silently
        // Don't log to avoid console spam since this endpoint may not exist
        backendNotifications = [];
      }
      
      // Fetch frontend Events Office notifications
      const frontendNotifications = getEventOfficeNotifications();
      
      // Merge notifications (frontend first, then backend)
      // Convert frontend notifications to match backend format
      const formattedFrontend = frontendNotifications.map(n => ({
        ...n,
        read: n.isRead,
        _id: n.id,
      }));
      
      setNotifications([...formattedFrontend, ...backendNotifications]);
    } catch (err) {
      console.error("Error fetching notifications:", err);
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
          
          createEventOfficeNotification({
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
      const notifs = getEventOfficeNotifications();
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

  const handleVendorRequestAction = async (requestId, action) => {
    try {
      const isApprove = action === "approve";
      const confirmed = await confirmDialog(
        isApprove
          ? "Are you sure you want to approve this vendor application?"
          : "Are you sure you want to reject this vendor application?",
        isApprove ? "Approve Vendor Request" : "Reject Vendor Request"
      );
      if (!confirmed) return;

      let notes = undefined;
      if (!isApprove) {
        notes = window.prompt("Optional notes or rejection reason (press Enter to skip)") || undefined;
      }

      await adminService.reviewVendorApplication(requestId, action, notes);
      showToast.success(`Vendor request ${isApprove ? "approved" : "rejected"} successfully!`);
      fetchVendorRequests();
    } catch (err) {
      console.error("Error updating vendor request:", err);
      showToast.error(err?.message || "Error updating vendor request");
    }
  };

  const handleGenerateVisitorPasses = async (request) => {
    if (!request?._id) {
      showToast.error("Invalid vendor application selected.");
      return;
    }

    if (!Array.isArray(request.attendees) || request.attendees.length === 0) {
      showToast.warning("This vendor application has no listed visitors yet.");
      return;
    }

    const confirmed = await confirmDialog(
      `Generate QR codes for ${request.attendees.length} visitor(s) of ${request.organizationName || "this vendor"}? They will be emailed directly to the vendor contact.`,
      "Generate Visitor QR Codes"
    );
    if (!confirmed) return;

    try {
      setGeneratePassesLoadingId(request._id);
      const res = await generateVendorAttendeePasses(request._id);
      const createdCount = typeof res?.createdCount === "number"
        ? res.createdCount
        : Array.isArray(res?.passes)
          ? res.passes.length
          : 0;
      if (createdCount > 0) {
        showToast.success(`Generated and emailed ${createdCount} visitor QR code${createdCount === 1 ? "" : "s"}.`);
      } else {
        showToast.success("Visitor QR codes are up to date.");
      }
      fetchVendorRequests();
    } catch (err) {
      console.error("Error generating visitor passes:", err);
      const message = err?.message || err?.error || "Failed to generate visitor QR codes.";
      showToast.error(message);
    } finally {
      setGeneratePassesLoadingId(null);
    }
  };

  const handleDeleteGymSession = async (sessionId) => {
    const confirmed = await confirmDialog("Are you sure you want to cancel this gym session?", "Cancel Gym Session");
    if (!confirmed) return;
    try {
      await cancelGymSession(sessionId);
      showToast.success("Gym session cancelled successfully!");
      fetchGymSessions();
    } catch (err) {
      console.error("Error cancelling gym session:", err);
      showToast.error(err?.message || "Error cancelling gym session");
    }
  };

  const handleCreateEvent = (type) => {
    const routes = {
      bazaar: "/events-office/bazaars",
      booth: "/events-office/booths",
      trip: "/events-office/trips",
      conference: "/events-office/conferences",
      gym: "/events-office/gym-sessions",
    };
    const dropdown = document.getElementById("create-dropdown");
    if (dropdown) dropdown.style.display = "none";
    navigate(routes[type] || "/events");
  };

  const unreadNotifications = notifications.filter(n => !n.read || !n.isRead).length;

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
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header + Stats + Create Button */}
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
                Welcome, Event Office {user.firstName}! 👋
              </h1>
              <p
                style={{
                  fontSize: typography.fontSize.lg,
                  color: colors.gray500,
                  margin: 0,
                }}
              >
                Manage university events and coordinate activities
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
              <div style={{ position: "relative" }}>
                <button
                  style={{
                    ...buttonStyles.primary,
                    padding: `${spacing.md} ${spacing['2xl']}`,
                  }}
                  onClick={() => {
                    const dropdown = document.getElementById("create-dropdown");
                    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = shadows.accentHover;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = shadows.accent;
                  }}
                >
                  + Create Event ▼
                </button>
                <div
                  id="create-dropdown"
                  style={{
                    display: "none",
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: spacing.sm,
                    background: colors.white,
                    borderRadius: borderRadius.xl,
                    boxShadow: shadows.lg,
                    minWidth: "200px",
                    zIndex: 1000,
                    border: `1px solid ${colors.gray200}`,
                  }}
                >
                  <button
                    onClick={() => handleCreateEvent("bazaar")}
                    style={{
                      width: "100%",
                      padding: `${spacing.md} ${spacing.xl}`,
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: typography.fontSize.base,
                      color: colors.primary,
                      borderRadius: `${borderRadius.xl} ${borderRadius.xl} 0 0`,
                      transition: transitions.fast,
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = colors.gray100;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                    }}
                  >
                    🏪 Create Bazaar
                  </button>
                  <button
                    onClick={() => handleCreateEvent("booth")}
                    style={{
                      width: "100%",
                      padding: `${spacing.md} ${spacing.xl}`,
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: typography.fontSize.base,
                      color: colors.primary,
                      transition: transitions.fast,
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = colors.gray100;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                    }}
                  >
                    🏬 Create Booth
                  </button>
                  <button
                    onClick={() => handleCreateEvent("trip")}
                    style={{
                      width: "100%",
                      padding: `${spacing.md} ${spacing.xl}`,
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: typography.fontSize.base,
                      color: colors.primary,
                      transition: transitions.fast,
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = colors.gray100;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                    }}
                  >
                    🚌 Create Trip
                  </button>
                  <button
                    onClick={() => handleCreateEvent("conference")}
                    style={{
                      width: "100%",
                      padding: `${spacing.md} ${spacing.xl}`,
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: typography.fontSize.base,
                      color: colors.primary,
                      transition: transitions.fast,
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = colors.gray100;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                    }}
                  >
                    🎤 Create Conference
                  </button>
                  <button
                    onClick={() => handleCreateEvent("gym")}
                    style={{
                      width: "100%",
                      padding: `${spacing.md} ${spacing.xl}`,
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: typography.fontSize.base,
                      color: colors.primary,
                      borderRadius: `0 0 ${borderRadius.xl} ${borderRadius.xl}`,
                      transition: transitions.fast,
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = colors.gray100;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                    }}
                  >
                    💪 Create Gym Session
                  </button>
                </div>
              </div>
              <div
                style={{
                  padding: `${spacing.md} ${spacing.xl}`,
                  background: `linear-gradient(135deg, rgba(51, 102, 153, 0.75) 0%, rgba(26, 51, 77, 0.85) 100%)`,
                  borderRadius: borderRadius.xl,
                  textAlign: "center",
                  border: `1px solid ${colors.primary}`,
                  position: "relative",
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
            {/* First Row of Tabs - 6 tabs */}
            <div style={{ display: "flex", gap: spacing.md, flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveTab("browse")}
              style={{
                flex: "1 1 calc(16.666% - 10px)",
                minWidth: "150px",
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
              onClick={() => setActiveTab("vendor-requests")}
              style={{
                flex: "1 1 calc(16.666% - 10px)",
                minWidth: "150px",
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "vendor-requests"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "vendor-requests" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
                position: "relative",
              }}
            >
              📝 Vendor Requests
              {vendorRequests.length > 0 && (
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
                  {vendorRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("vendor-documents")}
              style={{
                flex: 1,
                minWidth: "150px",
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "vendor-documents"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "vendor-documents" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              📄 Vendor Documents
            </button>
            <button
              onClick={() => setActiveTab("attendees-report")}
              style={{
                flex: 1,
                minWidth: "150px",
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "attendees-report"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "attendees-report" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              📊 Attendees Report
            </button>
            <button
              onClick={() => setActiveTab("sales-report")}
              style={{
                flex: 1,
                minWidth: "150px",
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "sales-report"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "sales-report" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              💰 Sales Report
            </button>



            <button
              onClick={() => setActiveTab("gym-sessions")}
              style={{
                flex: "1 1 calc(16.666% - 10px)",
                minWidth: "150px",
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
              💪 Gym Sessions
            </button>
            </div>

            {/* Second Row of Tabs - 6 tabs */}
            <div style={{ display: "flex", gap: spacing.md, flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveTab("workshop-approvals")}
              style={{
                flex: "1 1 calc(16.666% - 10px)",
                minWidth: "150px",
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "workshop-approvals"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "workshop-approvals" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
                position: "relative",
              }}
            >
              🎓 Workshop Approvals
              {pendingWorkshops.length > 0 && (
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
                  {pendingWorkshops.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("polls")}
              style={{
                flex: 1,
                minWidth: "150px",
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "polls"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
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
              📊 Booth Polls
            </button>

            <button
              onClick={() => setActiveTab("loyalty")}
              style={{
                flex: 1,
                minWidth: "150px",
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "loyalty"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
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
              onClick={() => setActiveTab("archived")}
              style={{
                flex: "1 1 calc(16.666% - 10px)",
                minWidth: "150px",
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "archived"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "archived" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              📦 Archived Events
            </button>
            <button
              onClick={() => {
                setActiveTab("notifications");
                fetchNotifications();
              }}
              style={{
                flex: "1 1 calc(16.666% - 10px)",
                minWidth: "150px",
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
                flex: "1 1 calc(16.666% - 10px)",
                minWidth: "150px",
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
          </div>

          {/* Content */}
          {activeTab === "browse" && (
            <EventList 
              enableFavorites={false} 
              hideArchived={true}
            />
          )}
          {activeTab === "archived" && (
            <EventList 
              enableFavorites={false} 
              showArchivedOnly={true} 
            />
          )}

          {activeTab === "vendor-requests" && (
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
                Pending Vendor Requests
              </h2>
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#003366", marginBottom: "10px" }}>Pending Vendor Requests</h3>
                {vendorRequestsError && (
                  <div
                    style={{
                      background: "#fee2e2",
                      color: "#991b1b",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      border: "1px solid #fecaca",
                      marginBottom: "16px",
                      fontWeight: 600,
                    }}
                  >
                    {vendorRequestsError}
                  </div>
                )}
                {vendorRequestsLoading ? (
                  <p style={{ color: "#6b7280" }}>Loading vendor requests…</p>
                ) : vendorRequests.length === 0 ? (
                  <p style={{ color: "#6b7280" }}>No pending vendor requests</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {vendorRequests.map((request) => (
                      <div
                        key={request._id}
                        style={{
                          padding: "20px",
                          background: "rgba(212, 175, 55, 0.1)",
                          borderRadius: "12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <h3 style={{ color: "#003366", marginBottom: "8px" }}>
                            {request.organizationName || "Vendor"}
                          </h3>
                          <p style={{ color: "#6b7280", margin: "4px 0" }}>
                            Event: {request.eventTitle || "N/A"} ({request.eventType || "Event"})
                          </p>
                          {request.eventStart && (
                            <p style={{ color: "#6b7280", margin: "4px 0" }}>
                              Date: {new Date(request.eventStart).toLocaleString()}
                            </p>
                          )}
                          {request.eventLocation && (
                            <p style={{ color: "#6b7280", margin: "4px 0" }}>
                              Location: {request.eventLocation}
                            </p>
                          )}
                          <p style={{ color: "#6b7280", margin: "4px 0" }}>
                            Booth Size: {request.boothSize || "—"}
                          </p>
                          <p style={{ color: "#6b7280", margin: "4px 0" }}>
                            Status: {request.status}
                          </p>
                          {request.vendorEmail && (
                            <p style={{ color: "#6b7280", margin: "4px 0" }}>
                              Vendor Email: {request.vendorEmail}
                            </p>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            onClick={() => handleVendorRequestAction(request._id, "approve")}
                            style={{
                              padding: "10px 20px",
                              background: "#10b981",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVendorRequestAction(request._id, "reject")}
                            style={{
                              padding: "10px 20px",
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ color: "#003366", marginBottom: "10px" }}>
                  Approved Vendors (Ready for Polls)
                </h3>
                {approvedVendorsError && (
                  <div
                    style={{
                      background: "#fef9c3",
                      color: "#854d0e",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      border: "1px solid #fde68a",
                      marginBottom: "16px",
                      fontWeight: 600,
                    }}
                  >
                    {approvedVendorsError}
                  </div>
                )}
                {approvedVendorsLoading ? (
                  <p style={{ color: "#6b7280" }}>Loading approved vendors…</p>
                ) : approvedVendorRequests.length === 0 ? (
                  <p style={{ color: "#6b7280" }}>
                    No approved vendors yet. Approve requests to enable poll creation.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {approvedVendorRequests.map((request) => {
                      const isGenerating = generatePassesLoadingId === request._id;
                      const visitorCount = Array.isArray(request.attendees) ? request.attendees.length : 0;
                      const eventType = (request.eventType || '').toLowerCase();
                      const canGenerateVisitorQR = eventType === 'bazaar';
                      return (
                        <div
                          key={request._id}
                          style={{
                            padding: "20px",
                            background: "rgba(16, 185, 129, 0.1)",
                            borderRadius: "12px",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: spacing.lg,
                            alignItems: "stretch",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 260 }}>
                            <h3 style={{ color: "#065f46", marginBottom: "8px" }}>
                              {request.organizationName || "Vendor"}
                            </h3>
                            <p style={{ color: "#047857", margin: "4px 0", fontWeight: 600 }}>
                              ✅ Approved & ready for polls
                            </p>
                            <p style={{ color: "#065f46", margin: "4px 0" }}>
                              Event: {request.eventTitle || "N/A"} ({request.eventType || "Event"})
                            </p>
                            {request.eventStart && (
                              <p style={{ color: "#065f46", margin: "4px 0" }}>
                                Date: {new Date(request.eventStart).toLocaleString()}
                              </p>
                            )}
                            {request.eventLocation && (
                              <p style={{ color: "#065f46", margin: "4px 0" }}>
                                Location: {request.eventLocation}
                              </p>
                            )}
                            <p style={{ color: "#065f46", margin: "4px 0" }}>
                              Booth Size: {request.boothSize || "—"}
                            </p>
                            <p style={{ color: "#065f46", margin: "4px 0" }}>
                              Listed Visitors: {visitorCount || "No visitors added yet"}
                            </p>
                            {request.vendorEmail && (
                              <p style={{ color: "#065f46", margin: "4px 0" }}>
                                Vendor Email: {request.vendorEmail}
                              </p>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              gap: spacing.md,
                              minWidth: 220,
                              textAlign: "right",
                            }}
                          >
                            {canGenerateVisitorQR && (
                              <button
                                onClick={() => handleGenerateVisitorPasses(request)}
                                disabled={isGenerating}
                                style={{
                                  padding: "10px 20px",
                                  background: isGenerating ? "#9ca3af" : "#2563eb",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "8px",
                                  cursor: isGenerating ? "not-allowed" : "pointer",
                                  fontWeight: "600",
                                  boxShadow: isGenerating ? "none" : "0 8px 20px rgba(37, 99, 235, 0.25)",
                                  transition: "background 0.2s ease",
                                }}
                              >
                                {isGenerating ? "Generating…" : "Generate Visitor QR Codes"}
                              </button>
                            )}
                            <div>
                              <p style={{ color: "#047857", fontWeight: 600, marginBottom: "8px" }}>
                                Use in Booth Polls tab ➜
                              </p>
                              <button
                                onClick={() => {
                                  setActiveTab("polls");
                                  setTimeout(() => {
                                    const el = document.getElementById("booth-polls-section");
                                    if (el) {
                                      el.scrollIntoView({ behavior: "smooth" });
                                    }
                                  }, 200);
                                }}
                                style={{
                                  padding: "10px 20px",
                                  background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  fontWeight: "600",
                                }}
                              >
                                Go to Polls
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                </div>
              </div>
          )}

          {activeTab === "workshop-approvals" && (
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
                Pending Workshop Approvals
              </h2>
              {pendingWorkshops.length === 0 ? (
                <p style={{ color: colors.gray500, fontSize: typography.fontSize.base }}>No pending workshops for approval</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: spacing.xl }}>
                  {pendingWorkshops.map((workshop) => (
                    <div
                      key={workshop._id}
                      style={{
                        padding: spacing['2xl'],
                        background: colors.white,
                        borderRadius: borderRadius.xl,
                        border: `1px solid ${colors.gray200}`,
                        boxShadow: shadows.sm,
                      }}
                    >
                      <div style={{ marginBottom: spacing.lg }}>
                        <h3 style={{ 
                          color: colors.primary, 
                          marginBottom: spacing.md, 
                          fontSize: typography.fontSize.xl,
                          fontWeight: typography.fontWeight.bold,
                        }}>
                          {workshop.title}
                        </h3>
                        {workshop.shortDescription && (
                          <p style={{ 
                            color: colors.gray500, 
                            marginBottom: spacing.sm,
                            fontSize: typography.fontSize.base,
                          }}>
                            {workshop.shortDescription}
                          </p>
                        )}
                        <div style={{ 
                          display: "grid", 
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                          gap: spacing.md, 
                          marginTop: spacing.md 
                        }}>
                          <div>
                            <strong style={{ color: colors.primary }}>Location:</strong>{" "}
                            <span style={{ color: colors.gray500 }}>{workshop.location}</span>
                          </div>
                          <div>
                            <strong style={{ color: colors.primary }}>Faculty:</strong>{" "}
                            <span style={{ color: colors.gray500 }}>{workshop.facultyName || "N/A"}</span>
                          </div>
                          <div>
                            <strong style={{ color: colors.primary }}>Start Date:</strong>{" "}
                            <span style={{ color: colors.gray500 }}>
                              {workshop.startDate
                                ? new Date(workshop.startDate).toLocaleString()
                                : "N/A"}
                            </span>
                          </div>
                          <div>
                            <strong style={{ color: colors.primary }}>End Date:</strong>{" "}
                            <span style={{ color: colors.gray500 }}>
                              {workshop.endDate
                                ? new Date(workshop.endDate).toLocaleString()
                                : "N/A"}
                            </span>
                          </div>
                          {workshop.requiredBudget && (
                            <div>
                              <strong style={{ color: colors.primary }}>Budget:</strong>{" "}
                              <span style={{ color: colors.gray500 }}>
                                {workshop.requiredBudget} ({workshop.fundingSource || "N/A"})
                              </span>
                            </div>
                          )}
                          {workshop.capacity && (
                            <div>
                              <strong style={{ color: colors.primary }}>Capacity:</strong>{" "}
                              <span style={{ color: colors.gray500 }}>{workshop.capacity}</span>
                            </div>
                          )}
                        </div>
                        {workshop.professors && workshop.professors.length > 0 && (
                          <div style={{ marginTop: spacing.md }}>
                            <strong style={{ color: colors.primary }}>Professors:</strong>
                            <ul style={{ color: colors.gray500, margin: `${spacing.xs} 0 0 ${spacing.xl}` }}>
                              {workshop.professors.map((prof, idx) => (
                                <li key={idx}>
                                  {prof.name}
                                  {prof.department && ` - ${prof.department}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {workshop.description && (
                          <div style={{ marginTop: spacing.md }}>
                            <strong style={{ color: colors.primary }}>Agenda:</strong>
                            <p style={{ color: colors.gray500, margin: `${spacing.xs} 0 0 0` }}>
                              {workshop.description}
                            </p>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: spacing.md, marginTop: spacing.lg, flexWrap: "wrap" }}>
                        <button
                          onClick={() => handleApproveWorkshop(workshop._id)}
                          style={{
                            padding: `${spacing.sm} ${spacing.lg}`,
                            background: colors.success,
                            color: colors.white,
                            border: "none",
                            borderRadius: borderRadius.md,
                            cursor: "pointer",
                            fontWeight: typography.fontWeight.semibold,
                            fontSize: typography.fontSize.sm,
                          }}
                        >
                          ✓ Approve & Publish
                        </button>
                        <button
                          onClick={() => handleRequestEdits(workshop._id)}
                          style={{
                            padding: `${spacing.sm} ${spacing.lg}`,
                            background: colors.warning,
                            color: colors.white,
                            border: "none",
                            borderRadius: borderRadius.md,
                            cursor: "pointer",
                            fontWeight: typography.fontWeight.semibold,
                            fontSize: typography.fontSize.sm,
                          }}
                        >
                          ✏️ Request Edits
                        </button>
                        <button
                          onClick={() => handleRejectWorkshop(workshop._id)}
                          style={{
                            padding: `${spacing.sm} ${spacing.lg}`,
                            background: colors.error,
                            color: colors.white,
                            border: "none",
                            borderRadius: borderRadius.md,
                            cursor: "pointer",
                            fontWeight: typography.fontWeight.semibold,
                            fontSize: typography.fontSize.sm,
                          }}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl, flexShrink: 0 }}>
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
                        markEventOfficeNotificationRead(reminder.id);
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
                <p style={{ color: colors.gray500, fontSize: typography.fontSize.base }}>No reminders at this time.</p>
              ) : (
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: spacing.lg,
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                }}>
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
                                  padding: `${spacing.sm} ${spacing.lg}`,
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
                            {!isRead && (
                              <button
                                onClick={() => {
                                  markEventOfficeNotificationRead(reminder.id);
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
                                deleteEventOfficeNotification(reminder.id);
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
                    );
                  })}
                </div>
              )}
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
              <BoothPollManager />
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

          {activeTab === "vendor-documents" && (
            <VendorDocumentsPage hideBackButton={true} />
          )}

          {activeTab === "attendees-report" && (
            <AttendeesReport hideBackButton={true} />
          )}

          {activeTab === "sales-report" && (
            <SalesReport hideBackButton={true} />
          )}

          {activeTab === "notifications" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
                border: `1px solid ${colors.gray200}`,
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl, flexShrink: 0 }}>
                <h2 style={{ 
                  color: colors.primary, 
                  margin: 0,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                }}>
                  Notifications
                </h2>
                {notifications.filter(n => !n.read && !n.isRead && n.type !== 'EventReminder').length > 0 && (
                  <button
                    onClick={() => {
                      // Mark all frontend notifications as read
                      markAllEventOfficeNotificationsRead();
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
                <p style={{ color: colors.gray500, fontSize: typography.fontSize.base }}>No notifications at this time.</p>
              ) : (
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: spacing.lg,
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                }}>
                  {notifications.map((notif) => {
                    const isRead = notif.read || notif.isRead;
                    const isFrontend = notif.id && !notif._id; // Frontend notifications have id but not _id
                    return (
                      <div
                        key={notif.id || notif._id}
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
                              {notif.type === 'WorkshopSubmitted' && (
                                <span style={{ fontSize: typography.fontSize['2xl'] }}>📝</span>
                              )}
                              {notif.type === 'NewEvent' && (
                                <span style={{ fontSize: typography.fontSize['2xl'] }}>🎉</span>
                              )}
                              <h3 style={{ 
                                color: colors.primary, 
                                margin: 0, 
                                fontSize: typography.fontSize.lg,
                                fontWeight: isRead ? typography.fontWeight.medium : typography.fontWeight.bold,
                              }}>
                                {notif.type === 'WorkshopSubmitted' ? 'New Workshop Submitted' : 
                                 notif.type === 'NewEvent' ? 'New Event Available' : 
                                 notif.type || 'Notification'}
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
                              fontSize: typography.fontSize.base,
                            }}>
                              {notif.type === 'WorkshopSubmitted' 
                                ? `A new workshop "${notif.workshopTitle || 'Untitled'}" has been submitted by a professor and is pending approval.`
                                : notif.message || 'No message'}
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
                            {!isRead && isFrontend && (
                              <button
                                onClick={() => {
                                  markEventOfficeNotificationRead(notif.id);
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
                            {isFrontend && (
                              <button
                                onClick={() => {
                                  deleteEventOfficeNotification(notif.id);
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
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                marginBottom: spacing.xl,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
              }}>
                Gym Sessions
              </h2>
              {(!gymSessions || gymSessions.length === 0) ? (
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
              ) : (
                (() => {
                  const typeMap = {
                    yoga: 'Yoga', pilates: 'Pilates', cardio: 'Aerobics', zumba: 'Zumba', crossfit: 'Cross Circuit', other: 'Kick-boxing', strength: 'Strength', spinning: 'Spinning'
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
                                          const fmtDateTime = (date) => {
                                            if (!date) return 'TBA';
                                            const d = new Date(date);
                                            return `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                          };
                                          return (
                                            <li key={s._id || s.id} style={{ 
                                              padding: `${spacing.sm} 0`, 
                                              borderTop: `1px solid ${colors.gray100}`, 
                                              display: 'flex', 
                                              justifyContent: 'space-between', 
                                              alignItems: 'center', 
                                              gap: spacing.md 
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
                                                  Instructor: {s.instructor || 'TBA'} {s.capacity ? ` • Capacity: ${s.capacity}` : ''}
                                                </div>
                                              </div>
                                              <div style={{ display: 'flex', gap: spacing.sm }}>
                                                <button 
                                                  onClick={() => navigate(`/events-office/gym-sessions/edit/${s._id}`)} 
                                                  style={{ 
                                                    padding: `${spacing.xs} ${spacing.md}`, 
                                                    background: colors.info, 
                                                    color: colors.white, 
                                                    border: 'none', 
                                                    borderRadius: borderRadius.md, 
                                                    cursor: 'pointer',
                                                    fontSize: typography.fontSize.sm,
                                                    fontWeight: typography.fontWeight.semibold,
                                                  }}
                                                >
                                                  Edit
                                                </button>
                                                <button 
                                                  onClick={() => handleDeleteGymSession(s._id)} 
                                                  style={{ 
                                                    padding: `${spacing.xs} ${spacing.md}`, 
                                                    background: colors.error, 
                                                    color: colors.white, 
                                                    border: 'none', 
                                                    borderRadius: borderRadius.md, 
                                                    cursor: 'pointer',
                                                    fontSize: typography.fontSize.sm,
                                                    fontWeight: typography.fontWeight.semibold,
                                                  }}
                                                >
                                                  Cancel
                                                </button>
                                              </div>
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
                })()
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Request Modal */}
      {editRequestModal.open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => setEditRequestModal({ open: false, workshopId: null, editRequest: "" })}
        >
          <div
            style={{
              background: colors.white,
              borderRadius: borderRadius['2xl'],
              padding: spacing['3xl'],
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: shadows.lg,
              border: `1px solid ${colors.gray200}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ 
              color: colors.primary, 
              marginBottom: spacing.xl,
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
            }}>
              Request Edits for Workshop
            </h2>
            <p style={{ 
              color: colors.gray500, 
              marginBottom: spacing.lg,
              fontSize: typography.fontSize.base,
            }}>
              Please specify what changes you'd like the professor to make:
            </p>
            <textarea
              value={editRequestModal.editRequest}
              onChange={(e) =>
                setEditRequestModal({ ...editRequestModal, editRequest: e.target.value })
              }
              placeholder="Example: Please update the budget amount, add more details to the agenda, change the location to..."
              style={{
                ...inputStyles.base,
                width: "100%",
                minHeight: "150px",
                resize: "vertical",
                marginBottom: spacing.xl,
              }}
            />
            <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditRequestModal({ open: false, workshopId: null, editRequest: "" })}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  background: colors.gray200,
                  color: colors.gray700,
                  border: "none",
                  borderRadius: borderRadius.md,
                  cursor: "pointer",
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.sm,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEditRequest}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  background: colors.warning,
                  color: colors.white,
                  border: "none",
                  borderRadius: borderRadius.md,
                  cursor: "pointer",
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.sm,
                }}
              >
                Send Edit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Generator Modal */}
    </div>
  );
}

export default EventOfficeDashboard;
