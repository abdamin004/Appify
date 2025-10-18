import React, { useState, useEffect } from "react";
import EventsList from "../EventList";
import Navbar from "../Navbar";
import MyEventsList from "../Functions/MyEventsList";
import CourtsList from "../Functions/CourtsList";
import { API_BASE } from "../../services/eventService";

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("browse");
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [courts, setCourts] = useState([]);
  const [presetType, setPresetType] = useState("");

  const storedUser = localStorage.getItem("user");
  const user = storedUser
    ? JSON.parse(storedUser)
    : { firstName: "Guest", role: "student" };

  useEffect(() => {
    fetchRegisteredEvents();
    fetchCourts();
  }, []);

  // Fetch data when switching tabs
  useEffect(() => {
    if (activeTab === "registered" && registeredEvents.length === 0) {
      fetchRegisteredEvents();
    } else if (activeTab === "courts" && courts.length === 0) {
      fetchCourts();
    }
  }, [activeTab]);

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
      setRegisteredEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setRegisteredEvents([]);
    }
  };

  const fetchCourts = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/courts");
      const data = await res.json();
      if (Array.isArray(data)) setCourts(data);
      else if (Array.isArray(data.courts)) setCourts(data.courts);
      else setCourts([]);
    } catch (err) {
      console.error(err);
      setCourts([]);
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
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header + Stats */}
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
                Welcome back, {user.firstName}! 👋
              </h1>
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                Discover and register for amazing events
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
                  {registeredEvents.length}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                  }}
                >
                  Registered Events
                </div>
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
                  {courts.filter(c => c.available).length}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                  }}
                >
                  Available Courts
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

            {/* Register Events button inside the same bar */}
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
              onClick={() => setActiveTab("courts")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "courts"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "courts" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              🏀 Courts
            </button>

          </div>

          {/* Content */}
          {activeTab === "browse" && <EventsList presetType={presetType} />}
          {activeTab === "registered" && <MyEventsList events={registeredEvents} />}
          {activeTab === "courts" && <CourtsList courts={courts} />}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
