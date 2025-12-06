import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layout/DashboardLayout";
import EventList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";
import QRCodeGenerator from "../QRCode/QRCodeGenerator";
import BoothPollManager from "../Polls/BoothPollManager";
import adminService from "../../services/adminService";
import { listGymSessions, cancelGymSession, listPendingWorkshops, approveWorkshop, rejectWorkshop, updateEvent, API_BASE, generateVendorAttendeePasses } from "../../services/eventService";
import { createProfessorNotification, getEventOfficeNotifications, markEventOfficeNotificationRead, markAllEventOfficeNotificationsRead, deleteEventOfficeNotification, deleteAllEventOfficeNotifications, getEventOfficeUnreadCount, createEventOfficeNotification, getSeenEventIds, markEventsAsSeen, getSentReminders, markReminderSent, createReminderNotification, getCurrentUserReminders, markReminderRead, deleteReminder } from "../../services/notificationService";
import LoyaltyPartnersList from "../Loyalty/LoyaltyPartnersList";
import AttendeesReport from "../Admin/AttendeesReport";
import SalesReport from "../Admin/SalesReport";
import VendorDocuments from "../Admin/VendorDocuments";
import { showToast, confirmDialog } from "../../utils/toast";
import FeedbackAnalytics from "./FeedbackAnalytics";

function EventOfficeDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
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
  const [qrCodeEvent, setQrCodeEvent] = useState(null);
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
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/Login');
      return;
    }

    fetchNotifications();
    fetchReminders();
    initializeSeenEvents();
    const pollInterval = setInterval(() => {
      checkForNewEvents();
    }, 30000);
    const reminderInterval = setInterval(() => {
      checkForReminders();
    }, 60000);

    // Listen for comment/rating events to refresh Feedback Analytics when feedback is added
    // Always dispatch refresh event - FeedbackAnalytics will listen when mounted
    const handleCommentAdded = (event) => {
      console.log('EventOfficeDashboard: Received comment:added event', event.detail);
      // Always dispatch refresh event - component will refresh when tab is active
      window.dispatchEvent(new CustomEvent('feedback:refresh', { 
        detail: { eventId: event.detail?.eventId },
        bubbles: true 
      }));
    };
    
    const handleRatingAdded = (event) => {
      console.log('EventOfficeDashboard: Received rating:added event', event.detail);
      // Always dispatch refresh event - component will refresh when tab is active
      window.dispatchEvent(new CustomEvent('feedback:refresh', { 
        detail: { eventId: event.detail?.eventId },
        bubbles: true 
      }));
    };
    
    window.addEventListener('comment:added', handleCommentAdded);
    window.addEventListener('rating:added', handleRatingAdded);

    return () => {
      clearInterval(pollInterval);
      clearInterval(reminderInterval);
      window.removeEventListener('comment:added', handleCommentAdded);
      window.removeEventListener('rating:added', handleRatingAdded);
    };
  }, [navigate, activeTab]);

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
    } else if (activeTab === 'feedback-analytics') {
      // Trigger refresh when switching to feedback analytics tab
      window.dispatchEvent(new CustomEvent('feedback:refresh'));
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
        ? workshops.filter(w => !approvedSet.has(w._id) && w.status === 'pending')
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
      console.log('Fetching vendor requests...');
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
    const confirmed = await confirmDialog("Are you sure you want to approve and publish this workshop?", "Approve Workshop");
    if (!confirmed) return;

    try {
      // Find the workshop to get its details
      const workshop = pendingWorkshops.find(w => w._id === workshopId);
      if (!workshop) {
        showToast.error("Workshop not found");
        return;
      }

      // Call backend to approve the workshop
      const result = await approveWorkshop(workshopId);

      if (!result || !result.success) {
        throw new Error(result?.message || result?.error || 'Failed to approve workshop');
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

      // Remove from pending list
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
      const publishedWorkshop = result.workshop || { ...workshop, status: 'published' };
      const { notifyAllUsersAboutNewEvent } = await import('../../services/eventService');
      notifyAllUsersAboutNewEvent(publishedWorkshop);

      // Refresh the pending workshops list
      await fetchPendingWorkshops();

      // Show success message
      showToast.success(result.message || "Workshop approved and published successfully!");
    } catch (err) {
      console.error("Error approving workshop:", err);
      showToast.error(err?.message || "Error approving workshop");
      // Re-fetch to restore the list if approval failed
      fetchPendingWorkshops();
    }
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

      // Call backend to reject the workshop
      const result = await rejectWorkshop(workshopId);

      if (!result || !result.success) {
        throw new Error(result?.message || 'Failed to reject workshop');
      }

      // Remove from pending list
      setPendingWorkshops(prev => prev.filter(w => w._id !== workshopId));

      // Create notification for the professor who created the workshop
      if (workshop.createdBy) {
        createProfessorNotification(workshop.createdBy, {
          type: 'WorkshopRejected',
          message: `Your workshop "${workshop.title}" has been rejected.`,
          workshopId: workshopId,
          workshopTitle: workshop.title,
        });
      }

      // Refresh the pending workshops list
      await fetchPendingWorkshops();

      showToast.success(result.message || "Workshop rejected successfully!");
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

      // Fetch the workshop again to get the createdBy field (it might not be populated in pendingWorkshops)
      let professorId = null;
      try {
        const { getEventById } = await import('../../services/eventService');
        const updatedWorkshop = await getEventById(editRequestModal.workshopId);
        if (updatedWorkshop) {
          // Handle both populated and non-populated createdBy field
          if (updatedWorkshop.createdBy) {
            if (typeof updatedWorkshop.createdBy === 'object') {
              professorId = updatedWorkshop.createdBy._id || updatedWorkshop.createdBy.id;
            } else {
              professorId = updatedWorkshop.createdBy; // It's already an ID string
            }
          }
        }
      } catch (fetchErr) {
        console.error('Error fetching workshop for professor ID:', fetchErr);
        // Fallback: try to get from the original workshop object
        if (workshop.createdBy) {
          if (typeof workshop.createdBy === 'object') {
            professorId = workshop.createdBy._id || workshop.createdBy.id;
          } else {
            professorId = workshop.createdBy;
          }
        }
      }

      if (professorId) {
        const { createProfessorNotification } = await import('../../services/notificationService');
        createProfessorNotification(String(professorId), {
          type: 'EditRequest',
          message: `The Event Office has requested edits to your workshop "${workshop.title || 'Untitled Workshop'}". Please review and update your workshop.`,
          workshopId: editRequestModal.workshopId,
          workshopTitle: workshop.title || 'Untitled Workshop',
          editRequest: editRequestModal.editRequest,
        });
        console.log('Created notification for professor:', professorId);
      } else {
        console.warn('Could not find professor ID for workshop:', editRequestModal.workshopId);
      }

      showToast.success("Edit request sent successfully! The professor will see your request in the workshop details and notifications.");
      setEditRequestModal({ open: false, workshopId: null, editRequest: "" });
      fetchPendingWorkshops();
    } catch (err) {
      console.error("Error sending edit request:", err);
      showToast.error(err?.message || "Error sending edit request");
    }
  };

  const fetchNotifications = async () => {
    try {
      // Fetch backend notifications for Event Office using admin endpoint
      let backendNotifications = [];
      try {
        const res = await adminService.listAdminNotifications();
        backendNotifications = Array.isArray(res?.notifications) ? res.notifications : (Array.isArray(res) ? res : []);
      } catch (err) {
        // Network error or other issue - gracefully handle
        console.error("Error fetching backend notifications:", err);
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

      // Deduplicate: If there's a frontend "NewEvent" notification and a backend "NewEventPublished" 
      // notification for the same event, only keep the frontend one (the one with the icon)
      const deduplicated = [];
      const seenEventIds = new Set();

      // First pass: Add all frontend notifications (they have icons)
      formattedFrontend.forEach(notif => {
        if (notif.eventId) {
          seenEventIds.add(String(notif.eventId));
        }
        deduplicated.push(notif);
      });

      // Second pass: Add backend notifications, but skip "NewEventPublished" if we already have a "NewEvent" for the same event
      backendNotifications.forEach(notif => {
        // Skip backend NewEventPublished if we already have a frontend NewEvent for the same event
        if (notif.type === 'NewEventPublished') {
          // Get event ID from backend notification (event can be populated object or just ID)
          const eventId = notif.event
            ? String(notif.event._id || notif.event.id || notif.event)
            : null;

          if (eventId && seenEventIds.has(eventId)) {
            return; // Skip this duplicate - we already have the frontend one with icon
          }
        }
        deduplicated.push(notif);
      });

      setNotifications(deduplicated);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    }
  };

  const initializeSeenEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await fetch(`${API_BASE}/events`);
      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/Login');
        return;
      }
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
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await fetch(`${API_BASE}/events`);
      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/Login');
        return;
      }
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
    navigate(routes[type] || "/events");
  };

  const unreadNotifications = notifications.filter(n => !n.read || !n.isRead).length;

  const menuItems = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "browse", label: "Browse Events", icon: "🎯" },
    {
      key: "create-event",
      label: "Create Event",
      icon: "➕",
      children: [
        { key: "create-bazaar", label: "Bazaar", icon: "🏪", onClick: () => handleCreateEvent('bazaar') },
        { key: "create-booth", label: "Booth", icon: "🎪", onClick: () => handleCreateEvent('booth') },
        { key: "create-conference", label: "Conference", icon: "🎤", onClick: () => handleCreateEvent('conference') },
        { key: "create-gym", label: "Gym Session", icon: "💪", onClick: () => handleCreateEvent('gym') },
        { key: "create-trip", label: "Trip", icon: "🚌", onClick: () => handleCreateEvent('trip') },
      ]
    },
    { key: "vendor-requests", label: "Vendor Requests", icon: "📝", badge: vendorRequests.length },
    { key: "vendor-documents", label: "Vendor Documents", icon: "📄" },
    { key: "attendees-report", label: "Attendees Report", icon: "📊" },
    { key: "sales-report", label: "Sales Report", icon: "💰" },
    { key: "gym-sessions", label: "Gym Sessions", icon: "💪" },
    { key: "workshop-approvals", label: "Workshop Approvals", icon: "🎓", badge: pendingWorkshops.length },
    { key: "polls", label: "Booth Polls", icon: "📊" },
    { key: "feedback-analytics", label: "Feedback Analytics", icon: "📊" },
    { key: "loyalty", label: "Loyalty Partners", icon: "⭐" },
    { key: "archived", label: "Archived Events", icon: "📦" },
    { key: "notifications", label: "Notifications", icon: "🔔", badge: notifications.filter(n => !n.isRead && n.type !== 'EventReminder').length },
    { key: "reminders", label: "Reminders", icon: "⏰", badge: reminders.filter(n => !n.isRead).length },
  ];

  return (
    <DashboardLayout menuItems={menuItems} activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* Edit Request Modal */}
      {editRequestModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Request Edits for Workshop</h3>
            <textarea
              value={editRequestModal.editRequest}
              onChange={(e) => setEditRequestModal({ ...editRequestModal, editRequest: e.target.value })}
              placeholder="Enter details about what needs to be changed..."
              className="w-full h-32 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none mb-6"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditRequestModal({ open: false, workshopId: null, editRequest: "" })}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEditRequest}
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "home" && (
        <div className="space-y-8">
          <div className="bg-slate-100 p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              {/* Left Side: Welcome Text */}
              <div className="flex-1 min-w-[300px]">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2 leading-tight">
                  Welcome, Event Office {user.firstName}! 👋
                </h1>
                <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">
                  Manage university events, coordinate activities, and oversee vendor applications.
                </p>
              </div>

              {/* Right Side: Stats */}
              <div className="flex flex-col gap-4 items-end flex-shrink-0 w-full md:w-auto">
                <div className="flex gap-3 flex-wrap justify-end w-full md:w-auto">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 min-w-[140px] flex-1 md:flex-none text-center hover:shadow-md transition-shadow duration-300">
                    <div className="text-2xl font-bold text-slate-900 mb-1">{vendorRequests.length}</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vendor Requests</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 min-w-[140px] flex-1 md:flex-none text-center hover:shadow-md transition-shadow duration-300">
                    <div className="text-2xl font-bold text-slate-900 mb-1">{pendingWorkshops.length}</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending Workshops</div>
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
                  onClick={() => setActiveTab('vendor-requests')}
                  className="p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📝</div>
                  <div className="font-bold text-slate-700 group-hover:text-emerald-700">Vendor Requests</div>
                  <div className="text-xs text-slate-500">Review applications</div>
                </button>
                <button
                  onClick={() => setActiveTab('workshop-approvals')}
                  className="p-4 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🎓</div>
                  <div className="font-bold text-slate-700 group-hover:text-purple-700">Approvals</div>
                  <div className="text-xs text-slate-500">Workshops pending</div>
                </button>
                <button
                  onClick={() => setActiveTab('attendees-report')}
                  className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📊</div>
                  <div className="font-bold text-slate-700 group-hover:text-blue-700">Attendees Report</div>
                  <div className="text-xs text-slate-500">View statistics</div>
                </button>
                <button
                  onClick={() => setActiveTab('sales-report')}
                  className="p-4 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">💰</div>
                  <div className="font-bold text-slate-700 group-hover:text-amber-700">Sales Report</div>
                  <div className="text-xs text-slate-500">View revenue</div>
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
            <EventList
              enableFavorites={false}
              hideArchived={true}
            />
          </div>
        )}
        {activeTab === "archived" && (
          <div className="space-y-6">
            <EventList
              enableFavorites={false}
              showArchivedOnly={true}
            />
          </div>
        )}

        {activeTab === "vendor-requests" && (
          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              Pending Vendor Requests
            </h2>
            <div className="mb-8">
              {vendorRequestsError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-4 font-medium">
                  {vendorRequestsError}
                </div>
              )}
              {vendorRequestsLoading ? (
                <div className="text-center py-20 text-slate-500">
                  <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
                  <p>Loading vendor requests...</p>
                </div>
              ) : vendorRequests.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <div className="text-4xl mb-4 opacity-50">📝</div>
                  <p className="text-slate-500">No pending vendor requests</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {vendorRequests.map((request) => (
                    <div
                      key={request._id}
                      className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow"
                    >
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                          {request.organizationName || "Vendor"}
                        </h3>
                        <div className="space-y-1 text-sm text-slate-600">
                          <p>Event: <span className="font-medium">{request.eventTitle || "N/A"}</span> ({request.eventType || "Event"})</p>
                          {request.eventStart && <p>Date: {new Date(request.eventStart).toLocaleString()}</p>}
                          {request.eventLocation && <p>Location: {request.eventLocation}</p>}
                          <p>Booth Size: {request.boothSize || "—"}</p>
                          <p>Status: <span className="capitalize">{request.status}</span></p>
                          {request.vendorEmail && <p>Email: {request.vendorEmail}</p>}
                        </div>
                      </div>
                      <div className="flex gap-3 w-full md:w-auto">
                        <button
                          onClick={() => handleVendorRequestAction(request._id, "approve")}
                          className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleVendorRequestAction(request._id, "reject")}
                          className="flex-1 md:flex-none px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-4 pt-4 border-t border-slate-100">
              Approved Vendors (Ready for Polls)
            </h3>
            {approvedVendorsError && (
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 mb-4 font-medium">
                {approvedVendorsError}
              </div>
            )}
            {approvedVendorsLoading ? (
              <div className="text-center py-12 text-slate-500">
                <span className="loading loading-spinner loading-md text-emerald-500 mb-2"></span>
                <p>Loading approved vendors...</p>
              </div>
            ) : approvedVendorRequests.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <p className="text-slate-500">No approved vendors yet. Approve requests to enable poll creation.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {approvedVendorRequests.map((request) => {
                  const isGenerating = generatePassesLoadingId === request._id;
                  const visitorCount = Array.isArray(request.attendees) ? request.attendees.length : 0;
                  const eventType = (request.eventType || '').toLowerCase();
                  const canGenerateVisitorQR = eventType === 'bazaar';
                  return (
                    <div
                      key={request._id}
                      className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1 min-w-[260px]">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                          {request.organizationName || "Vendor"}
                        </h3>
                        <p className="text-emerald-600 font-medium mb-2 text-sm">
                          ✅ Approved & ready for polls
                        </p>
                        <div className="space-y-1 text-sm text-slate-600">
                          <p>Event: {request.eventTitle || "N/A"} ({request.eventType || "Event"})</p>
                          {request.eventStart && <p>Date: {new Date(request.eventStart).toLocaleString()}</p>}
                          {request.eventLocation && <p>Location: {request.eventLocation}</p>}
                          <p>Booth Size: {request.boothSize || "—"}</p>
                          <p>Listed Visitors: {visitorCount || "No visitors added yet"}</p>
                          {request.vendorEmail && <p>Email: {request.vendorEmail}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col justify-between gap-4 min-w-[220px] text-right">
                        {canGenerateVisitorQR && (
                          <button
                            onClick={() => handleGenerateVisitorPasses(request)}
                            disabled={isGenerating}
                            className={`px-4 py-2.5 rounded-lg font-medium text-white shadow-sm transition-all ${isGenerating
                              ? 'bg-slate-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                              }`}
                          >
                            {isGenerating ? "Generating..." : "Generate Visitor QR Codes"}
                          </button>
                        )}
                        <div>
                          <p className="text-emerald-700 font-medium mb-2 text-sm">
                            Use in Booth Polls tab ➜
                          </p>
                          <button
                            onClick={() => {
                              setActiveTab("polls");
                              setTimeout(() => {
                                const el = document.getElementById("booth-polls-section");
                                if (el) el.scrollIntoView({ behavior: "smooth" });
                              }, 200);
                            }}
                            className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-emerald-600 transition-all"
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
        )}

        {activeTab === "workshop-approvals" && (
          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              Pending Workshop Approvals
            </h2>
            {pendingWorkshops.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <div className="text-4xl mb-4 opacity-50">🎓</div>
                <p className="text-slate-500">No pending workshops for approval</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {pendingWorkshops.map((workshop) => (
                  <div
                    key={workshop._id}
                    className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-800 mb-2">
                        {workshop.title}
                      </h3>
                      {workshop.shortDescription && (
                        <p className="text-slate-600 mb-4">
                          {workshop.shortDescription}
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <strong className="text-slate-700 block mb-1">Location:</strong>
                          <span className="text-slate-500">{workshop.location}</span>
                        </div>
                        <div>
                          <strong className="text-slate-700 block mb-1">Faculty:</strong>
                          <span className="text-slate-500">{workshop.facultyName || "N/A"}</span>
                        </div>
                        <div>
                          <strong className="text-slate-700 block mb-1">Start Date:</strong>
                          <span className="text-slate-500">
                            {workshop.startDate ? new Date(workshop.startDate).toLocaleString() : "N/A"}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-700 block mb-1">End Date:</strong>
                          <span className="text-slate-500">
                            {workshop.endDate ? new Date(workshop.endDate).toLocaleString() : "N/A"}
                          </span>
                        </div>
                        {workshop.requiredBudget && (
                          <div>
                            <strong className="text-slate-700 block mb-1">Budget:</strong>
                            <span className="text-slate-500">
                              {workshop.requiredBudget} ({workshop.fundingSource || "N/A"})
                            </span>
                          </div>
                        )}
                        {workshop.capacity && (
                          <div>
                            <strong className="text-slate-700 block mb-1">Capacity:</strong>
                            <span className="text-slate-500">{workshop.capacity}</span>
                          </div>
                        )}
                      </div>
                      {workshop.professors && workshop.professors.length > 0 && (
                        <div className="mt-4">
                          <strong className="text-slate-700 block mb-2">Professors:</strong>
                          <ul className="list-disc list-inside text-slate-500 text-sm pl-2">
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
                        <div className="mt-4">
                          <strong className="text-slate-700 block mb-2">Agenda:</strong>
                          <p className="text-slate-500 text-sm whitespace-pre-wrap">
                            {workshop.description}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleApproveWorkshop(workshop._id)}
                        className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        ✓ Approve & Publish
                      </button>
                      <button
                        onClick={() => handleRequestEdits(workshop._id)}
                        className="px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
                      >
                        ✏️ Request Edits
                      </button>
                      <button
                        onClick={() => handleRejectWorkshop(workshop._id)}
                        className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
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
          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-2xl font-bold text-slate-800">
                Event Reminders
              </h2>
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
            {reminders.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="text-4xl mb-4">⏰</div>
                <p>No reminders at this time.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-2">
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

        {activeTab === "notifications" && (
          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Notifications
              </h2>
              <div className="flex gap-3">
                {notifications.filter(n => !n.read && !n.isRead).length > 0 && (
                  <button
                    onClick={() => {
                      markAllEventOfficeNotificationsRead();
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
                        deleteAllEventOfficeNotifications();
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
              <div className="text-center py-12 text-slate-500">
                <div className="text-4xl mb-4">🔔</div>
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
                                markEventOfficeNotificationRead(notif.id);
                                fetchNotifications();
                              }}
                              className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => {
                              deleteEventOfficeNotification(notif.id);
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

        {activeTab === "vendor-documents" && (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-slate-900">Vendor Documents</h2>
              <p className="text-slate-500">Review and approve vendor documentation</p>
            </div>
            <VendorDocuments />
          </div>
        )}

        {activeTab === "attendees-report" && (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-slate-900">Attendees Report</h2>
              <p className="text-slate-500">View attendance statistics</p>
            </div>
            <AttendeesReport />
          </div>
        )}

        {activeTab === "sales-report" && (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-slate-900">Sales Report</h2>
              <p className="text-slate-500">Monitor event sales and revenue</p>
            </div>
            <SalesReport />
          </div>
        )}

        {activeTab === "gym-sessions" && (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-slate-900">Gym Sessions</h2>
              <p className="text-slate-500">Manage gym sessions and schedules</p>
            </div>
            <div className="bg-slate-100 p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
              {gymSessions.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <div className="text-6xl mb-6 opacity-50">🏋️</div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No Sessions Found</h3>
                  <p className="text-slate-500">There are no gym sessions scheduled at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gymSessions.map((session) => (
                    <div key={session._id || session.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg text-slate-900">{session.sessionType}</h3>
                        <button
                          onClick={() => handleDeleteGymSession(session._id || session.id)}
                          className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Cancel Session"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👤</span>
                          <span className="font-medium">{session.instructor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📅</span>
                          <span>{new Date(session.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">⏰</span>
                          <span>{new Date(session.startDate).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👥</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                            {session.registeredCount || 0} / {session.capacity}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "polls" && (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-slate-900">Booth Polls</h2>
              <p className="text-slate-500">Manage voting for vendor booths</p>
            </div>
            <div id="booth-polls-section">
              <BoothPollManager />
            </div>
          </div>
        )}

        {activeTab === "feedback-analytics" && (
          <FeedbackAnalytics />
        )}

        {activeTab === "loyalty" && (
          <div className="space-y-6">
            <LoyaltyPartnersList />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default EventOfficeDashboard;
