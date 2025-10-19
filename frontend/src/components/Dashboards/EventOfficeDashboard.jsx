import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EventsList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";

function EventOfficeDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("browse");
  const [myEvents, setMyEvents] = useState([]);
  const [vendorRequests, setVendorRequests] = useState([]);
  const [gymSessions, setGymSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const storedUser = localStorage.getItem("user");
  const user = storedUser
    ? JSON.parse(storedUser)
    : { firstName: "Guest", role: "eventoffice" };

  useEffect(() => {
    fetchMyCreatedEvents();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (activeTab === "my-events" && myEvents.length === 0) {
      fetchMyCreatedEvents();
    } else if (activeTab === "vendor-requests") {
      fetchVendorRequests();
    } else if (activeTab === "gym-sessions") {
      fetchGymSessions();
    }
  }, [activeTab]);

  const fetchMyCreatedEvents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/api/events/created/mine", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setMyEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMyEvents([]);
    }
  };

  const fetchVendorRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/api/vendor-applications/pending", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setVendorRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching vendor requests:", err);
      setVendorRequests([]);
    }
  };

  const fetchGymSessions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/api/gym/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setGymSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching gym sessions:", err);
      setGymSessions([]);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/api/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleVendorRequestAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5001/api/vendor-applications/${requestId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: action }),
      });
      
      if (res.ok) {
        alert(`Vendor request ${action}ed successfully!`);
        fetchVendorRequests();
      } else {
        alert("Failed to update vendor request");
      }
    } catch (err) {
      console.error("Error updating vendor request:", err);
      alert("Error updating vendor request");
    }
  };

  const handleDeleteGymSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to cancel this gym session?")) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5001/api/gym/delete/${sessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        alert("Gym session cancelled successfully!");
        fetchGymSessions();
      } else {
        alert("Failed to cancel gym session");
      }
    } catch (err) {
      console.error("Error deleting gym session:", err);
      alert("Error deleting gym session");
    }
  };

  const handleCreateEvent = (type) => {
    const routes = {
      bazaar: "/events-office/bazaars",
      trip: "/events-office/trips",
      conference: "/events-office/conferences",
      gym: "/events-office/gym-sessions",
    };
    const dropdown = document.getElementById("create-dropdown");
    if (dropdown) dropdown.style.display = "none";
    navigate(routes[type] || "/events");
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

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
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#003366",
                  }}
                >
                  {myEvents.length}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                  }}
                >
                  Managed Events
                </div>
              </div>

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
                  + Create Event ▼
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
                    🏪 Create Bazaar
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
                    🚌 Create Trip
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
                    🎤 Create Conference
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
                    💪 Create Gym Session
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
              onClick={() => setActiveTab("my-events")}
              style={{
                flex: 1,
                minWidth: "150px",
                padding: "15px 30px",
                background:
                  activeTab === "my-events"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "my-events" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              📋 My Events
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
          </div>

          {/* Content */}
          {activeTab === "browse" && <EventsList />}
          {activeTab === "my-events" && <MyEventsList events={myEvents} />}
          
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
                          onClick={() => handleVendorRequestAction(request._id, "approved")}
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
                          onClick={() => handleVendorRequestAction(request._id, "rejected")}
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
              {gymSessions.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No gym sessions scheduled</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {gymSessions.map((session) => (
                    <div
                      key={session._id}
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
                          {session.type || "Gym Session"}
                        </h3>
                        <p style={{ color: "#6b7280", margin: "4px 0" }}>
                          Date: {new Date(session.date).toLocaleDateString()}
                        </p>
                        <p style={{ color: "#6b7280", margin: "4px 0" }}>
                          Time: {session.time} | Duration: {session.duration} mins
                        </p>
                        <p style={{ color: "#6b7280", margin: "4px 0" }}>
                          Capacity: {session.capacity} participants
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => window.location.href = `/edit-gym-session/${session._id}`}
                          style={{
                            padding: "10px 20px",
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "600",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteGymSession(session._id)}
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
                          Cancel
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
    </div>
  );
}

export default EventOfficeDashboard;
