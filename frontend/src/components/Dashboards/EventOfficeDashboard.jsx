import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EventsList from "../AdminEventList";
import MyEventsList from "../Functions/MyEventsList";
import adminService from "../../services/adminService";
import { listGymSessions, cancelGymSession, listPendingWorkshops, approveWorkshop, rejectWorkshop, updateEvent, API_BASE } from "../../services/eventService";
import { createProfessorNotification, getEventOfficeNotifications, markEventOfficeNotificationRead, markAllEventOfficeNotificationsRead, deleteEventOfficeNotification, getEventOfficeUnreadCount, createEventOfficeNotification, getSeenEventIds, markEventsAsSeen, getSentReminders, markReminderSent, createReminderNotification } from "../../services/notificationService";

function EventOfficeDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("browse");
  const [vendorRequests, setVendorRequests] = useState([]);
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
    if (activeTab === "vendor-requests") {
      fetchVendorRequests();
    } else if (activeTab === "gym-sessions") {
      fetchGymSessions();
    } else if (activeTab === "workshop-approvals") {
      fetchPendingWorkshops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchVendorRequests = async () => {
    try {
      const res = await adminService.listPendingVendorApplications();
      setVendorRequests(res.applications || []);
    } catch (err) {
      console.error("Error fetching vendor requests:", err);
      setVendorRequests([]);
    }
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
    if (!window.confirm("Are you sure you want to approve and publish this workshop?")) return;
    
    // Find the workshop to get its details
    const workshop = pendingWorkshops.find(w => w._id === workshopId);
    if (!workshop) {
      alert("Workshop not found");
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
    alert("Workshop approved and published successfully!");
  };

  const handleRejectWorkshop = async (workshopId) => {
    if (!window.confirm("Are you sure you want to reject this workshop?")) return;
    try {
      // Find the workshop to get its details
      const workshop = pendingWorkshops.find(w => w._id === workshopId);
      if (!workshop) {
        alert("Workshop not found");
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
      
      alert("Workshop rejected successfully!");
    } catch (err) {
      console.error("Error rejecting workshop:", err);
      alert(err?.message || "Error rejecting workshop");
      // Re-fetch to restore the list if rejection failed
      fetchPendingWorkshops();
    }
  };

  const handleRequestEdits = (workshopId) => {
    setEditRequestModal({ open: true, workshopId, editRequest: "" });
  };

  const handleSubmitEditRequest = async () => {
    if (!editRequestModal.editRequest.trim()) {
      alert("Please enter edit requests");
      return;
    }
    try {
      const workshop = pendingWorkshops.find(w => w._id === editRequestModal.workshopId);
      if (!workshop) {
        alert("Workshop not found");
        return;
      }
      
      // Append edit request to description
      const currentDescription = workshop.description || "";
      const editRequestNote = `\n\n--- EDIT REQUEST FROM EVENTS OFFICE (${new Date().toLocaleString()}) ---\n${editRequestModal.editRequest}\n--- END EDIT REQUEST ---`;
      const updatedDescription = currentDescription + editRequestNote;
      
      await updateEvent(editRequestModal.workshopId, { description: updatedDescription });
      alert("Edit request sent successfully! The professor will see your request in the workshop details.");
      setEditRequestModal({ open: false, workshopId: null, editRequest: "" });
      fetchPendingWorkshops();
    } catch (err) {
      console.error("Error sending edit request:", err);
      alert(err?.message || "Error sending edit request");
    }
  };

  const fetchNotifications = async () => {
    try {
      // Fetch backend notifications
      let backendNotifications = [];
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5001/api/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        backendNotifications = Array.isArray(data) ? data : [];
      } catch (err) {
        console.error("Error fetching backend notifications:", err);
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
      const notes = window.prompt('Optional notes (press Enter to skip)') || undefined;
      await adminService.reviewVendorApplication(requestId, action, notes);
      alert(`Vendor request ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      fetchVendorRequests();
    } catch (err) {
      console.error("Error updating vendor request:", err);
      alert(err?.message || "Error updating vendor request");
    }
  };

  const handleDeleteGymSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to cancel this gym session?")) return;
    try {
      await cancelGymSession(sessionId);
      alert("Gym session cancelled successfully!");
      fetchGymSessions();
    } catch (err) {
      console.error("Error cancelling gym session:", err);
      alert(err?.message || "Error cancelling gym session");
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
                Welcome, Event Office {user.firstName}! 👋
              </h1>
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                Manage university events and coordinate activities
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
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#003366",
                  }}
                >
                  {vendorRequests.length}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                  }}
                >
                  Pending Requests
                </div>
                {unreadNotifications > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-5px",
                      right: "-5px",
                      background: "#ef4444",
                      color: "white",
                      borderRadius: "50%",
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                    }}
                  >
                    {unreadNotifications}
                  </div>
                )}
              </div>
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
                  {gymSessions.length}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                  }}
                >
                  Gym Sessions
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <button
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
                  onClick={() => {
                    const dropdown = document.getElementById("create-dropdown");
                    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
                  }}
                >
                  + Create/edit Event ▼
                </button>
                <div
                  id="create-dropdown"
                  style={{
                    display: "none",
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    background: "white",
                    borderRadius: "12px",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
                    minWidth: "200px",
                    zIndex: 1000,
                  }}
                >
                  <button
                    onClick={() => handleCreateEvent("bazaar")}
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "1rem",
                      color: "#003366",
                      borderRadius: "12px 12px 0 0",
                    }}
                  >
                    🏪 Create/edit Bazaar
                  </button>
                  <button
                    onClick={() => handleCreateEvent("booth")}
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "1rem",
                      color: "#003366",
                    }}
                  >
                    🏬 Create/edit Booth
                  </button>
                  <button
                    onClick={() => handleCreateEvent("trip")}
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "1rem",
                      color: "#003366",
                    }}
                  >
                    🚌 Create/edit Trip
                  </button>
                  <button
                    onClick={() => handleCreateEvent("conference")}
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "1rem",
                      color: "#003366",
                    }}
                  >
                    🎤 Create/edit Conference
                  </button>
                  <button
                    onClick={() => handleCreateEvent("gym")}
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "1rem",
                      color: "#003366",
                      borderRadius: "0 0 12px 12px",
                    }}
                  >
                    💪 Create/edit Gym Session
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
                minWidth: "150px",
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
            <button
              onClick={() => setActiveTab("vendor-requests")}
              style={{
                flex: 1,
                minWidth: "150px",
                padding: "15px 30px",
                background:
                  activeTab === "vendor-requests"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "vendor-requests" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                position: "relative",
              }}
            >
              📝 Vendor Requests
              {vendorRequests.length > 0 && (
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
                  {vendorRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("gym-sessions")}
              style={{
                flex: 1,
                minWidth: "150px",
                padding: "15px 30px",
                background:
                  activeTab === "gym-sessions"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "gym-sessions" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              💪 Gym Sessions
            </button>
            <button
              onClick={() => setActiveTab("workshop-approvals")}
              style={{
                flex: 1,
                minWidth: "150px",
                padding: "15px 30px",
                background:
                  activeTab === "workshop-approvals"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "workshop-approvals" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                position: "relative",
              }}
            >
              🎓 Workshop Approvals
              {pendingWorkshops.length > 0 && (
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
                  {pendingWorkshops.length}
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
                minWidth: "150px",
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
          </div>

          {/* Content */}
          {activeTab === "browse" && <EventsList />}

          {activeTab === "vendor-requests" && (
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                padding: "30px",
                borderRadius: "20px",
                boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              }}
            >
              <h2 style={{ color: "#003366", marginBottom: "20px" }}>
                Pending Vendor Requests
              </h2>
              {vendorRequests.length === 0 ? (
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
                          Event: {request.eventTitle || "N/A"}
                        </p>
                        <p style={{ color: "#6b7280", margin: "4px 0" }}>
                          Status: {request.status}
                        </p>
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
          )}

          {activeTab === "workshop-approvals" && (
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                padding: "30px",
                borderRadius: "20px",
                boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              }}
            >
              <h2 style={{ color: "#003366", marginBottom: "20px" }}>
                Pending Workshop Approvals
              </h2>
              {pendingWorkshops.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No pending workshops for approval</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {pendingWorkshops.map((workshop) => (
                    <div
                      key={workshop._id}
                      style={{
                        padding: "25px",
                        background: "rgba(212, 175, 55, 0.1)",
                        borderRadius: "12px",
                        border: "1px solid rgba(212, 175, 55, 0.3)",
                      }}
                    >
                      <div style={{ marginBottom: "15px" }}>
                        <h3 style={{ color: "#003366", marginBottom: "10px", fontSize: "1.3rem" }}>
                          {workshop.title}
                        </h3>
                        {workshop.shortDescription && (
                          <p style={{ color: "#6b7280", marginBottom: "8px" }}>
                            {workshop.shortDescription}
                          </p>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "12px" }}>
                          <div>
                            <strong style={{ color: "#003366" }}>Location:</strong>{" "}
                            <span style={{ color: "#6b7280" }}>{workshop.location}</span>
                          </div>
                          <div>
                            <strong style={{ color: "#003366" }}>Faculty:</strong>{" "}
                            <span style={{ color: "#6b7280" }}>{workshop.facultyName || "N/A"}</span>
                          </div>
                          <div>
                            <strong style={{ color: "#003366" }}>Start Date:</strong>{" "}
                            <span style={{ color: "#6b7280" }}>
                              {workshop.startDate
                                ? new Date(workshop.startDate).toLocaleString()
                                : "N/A"}
                            </span>
                          </div>
                          <div>
                            <strong style={{ color: "#003366" }}>End Date:</strong>{" "}
                            <span style={{ color: "#6b7280" }}>
                              {workshop.endDate
                                ? new Date(workshop.endDate).toLocaleString()
                                : "N/A"}
                            </span>
                          </div>
                          {workshop.requiredBudget && (
                            <div>
                              <strong style={{ color: "#003366" }}>Budget:</strong>{" "}
                              <span style={{ color: "#6b7280" }}>
                                {workshop.requiredBudget} ({workshop.fundingSource || "N/A"})
                              </span>
                            </div>
                          )}
                          {workshop.capacity && (
                            <div>
                              <strong style={{ color: "#003366" }}>Capacity:</strong>{" "}
                              <span style={{ color: "#6b7280" }}>{workshop.capacity}</span>
                            </div>
                          )}
                        </div>
                        {workshop.professors && workshop.professors.length > 0 && (
                          <div style={{ marginTop: "12px" }}>
                            <strong style={{ color: "#003366" }}>Professors:</strong>
                            <ul style={{ color: "#6b7280", margin: "4px 0 0 20px" }}>
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
                          <div style={{ marginTop: "12px" }}>
                            <strong style={{ color: "#003366" }}>Agenda:</strong>
                            <p style={{ color: "#6b7280", margin: "4px 0 0 0" }}>
                              {workshop.description}
                            </p>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "10px", marginTop: "15px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => handleApproveWorkshop(workshop._id)}
                          style={{
                            padding: "10px 20px",
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "0.95rem",
                          }}
                        >
                          ✓ Approve & Publish
                        </button>
                        <button
                          onClick={() => handleRequestEdits(workshop._id)}
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
                          ✏️ Request Edits
                        </button>
                        <button
                          onClick={() => handleRejectWorkshop(workshop._id)}
                          style={{
                            padding: "10px 20px",
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "0.95rem",
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
                        markEventOfficeNotificationRead(reminder.id);
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
                                  markEventOfficeNotificationRead(reminder.id);
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
                                deleteEventOfficeNotification(reminder.id);
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
                    );
                  })}
                </div>
              )}
            </div>
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
                {notifications.filter(n => !n.read && !n.isRead && n.type !== 'EventReminder').length > 0 && (
                  <button
                    onClick={() => {
                      // Mark all frontend notifications as read
                      markAllEventOfficeNotificationsRead();
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
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    Mark All as Read
                    <span style={{ color: "#10b981", fontSize: "1.1rem" }}>✓</span>
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No notifications at this time.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {notifications.map((notif) => {
                    const isRead = notif.read || notif.isRead;
                    const isFrontend = notif.id && !notif._id; // Frontend notifications have id but not _id
                    return (
                      <div
                        key={notif.id || notif._id}
                        style={{
                          padding: "20px",
                          background: isRead ? "rgba(212, 175, 55, 0.05)" : "rgba(212, 175, 55, 0.15)",
                          borderRadius: "12px",
                          border: isRead ? "1px solid rgba(212, 175, 55, 0.2)" : "2px solid rgba(212, 175, 55, 0.4)",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "15px" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                              {notif.type === 'WorkshopSubmitted' && (
                                <span style={{ fontSize: "1.5rem" }}>📝</span>
                              )}
                              {notif.type === 'NewEvent' && (
                                <span style={{ fontSize: "1.5rem" }}>🎉</span>
                              )}
                              <h3 style={{ 
                                color: "#003366", 
                                margin: 0, 
                                fontSize: "1.1rem",
                                fontWeight: isRead ? "500" : "700",
                              }}>
                                {notif.type === 'WorkshopSubmitted' ? 'New Workshop Submitted' : 
                                 notif.type === 'NewEvent' ? 'New Event Available' : 
                                 notif.type || 'Notification'}
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
                              {isRead && (
                                <span style={{ color: "#10b981", fontSize: "1.2rem", fontWeight: "bold" }}>✓</span>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              <p style={{ 
                                color: "#6b7280", 
                                margin: "8px 0",
                                fontWeight: isRead ? "400" : "500",
                                flex: 1,
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
                                    alignSelf: "flex-start",
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
                            </div>
                            <p style={{ 
                              color: "#9ca3af", 
                              fontSize: "0.85rem",
                              margin: "8px 0 0 0",
                            }}>
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 
                               notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                            {!isRead && isFrontend && (
                              <button
                                onClick={() => {
                                  markEventOfficeNotificationRead(notif.id);
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
                            {isFrontend && (
                              <button
                                onClick={() => {
                                  deleteEventOfficeNotification(notif.id);
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
                background: "rgba(255,255,255,0.95)",
                padding: "30px",
                borderRadius: "20px",
                boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              }}
            >
              <h2 style={{ color: "#003366", marginBottom: "20px" }}>
                Gym Sessions
              </h2>
              {(!gymSessions || gymSessions.length === 0) ? (
                <p style={{ color: "#6b7280" }}>No gym sessions scheduled</p>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                            <div style={{ background: 'rgba(255,255,255,0.95)', padding: '18px 20px', borderRadius: 16, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>
                              <h3 style={{ margin: 0, color: '#003366' }}>{month}</h3>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 12 }}>
                                {typeKeys.map((tk) => (
                                  <div key={tk} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                                    <div style={{ fontWeight: 800, color: '#003366', marginBottom: 6 }}>{tk}</div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#374151' }}>
                                      {byType[tk]
                                        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                                        .map((s) => (
                                          <li key={s._id || s.id} style={{ padding: '8px 0', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                            <div>
                                              <div>{s.startDate ? new Date(s.startDate).toLocaleDateString() + ' • ' + new Date(s.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}</div>
                                              <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                Instructor: {s.instructor || 'TBA'} {s.capacity ? ` • Capacity: ${s.capacity}` : ''}
                                              </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                              <button onClick={() => navigate(`/events-office/gym-sessions?edit=${s._id}` , { state: { edit: s._id } })} style={{ padding: '6px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Edit</button>
                                              <button onClick={() => handleDeleteGymSession(s._id)} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                                            </div>
                                          </li>
                                        ))}
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
              background: "white",
              borderRadius: "20px",
              padding: "30px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: "#003366", marginBottom: "20px" }}>
              Request Edits for Workshop
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "15px" }}>
              Please specify what changes you'd like the professor to make:
            </p>
            <textarea
              value={editRequestModal.editRequest}
              onChange={(e) =>
                setEditRequestModal({ ...editRequestModal, editRequest: e.target.value })
              }
              placeholder="Example: Please update the budget amount, add more details to the agenda, change the location to..."
              style={{
                width: "100%",
                minHeight: "150px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "1rem",
                fontFamily: "inherit",
                resize: "vertical",
                marginBottom: "20px",
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditRequestModal({ open: false, workshopId: null, editRequest: "" })}
                style={{
                  padding: "10px 20px",
                  background: "#e5e7eb",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "0.95rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEditRequest}
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
                Send Edit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventOfficeDashboard;
