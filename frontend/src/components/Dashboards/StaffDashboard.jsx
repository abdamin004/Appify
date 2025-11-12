import React, { useEffect, useState } from "react";
import EventList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";
import { API_BASE } from "../../services/eventService";
import { getFavouriteIds } from "../../services/favoritesService";





function StaffDashboard() {
  const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem("user") : null;
  const user = storedUser ? JSON.parse(storedUser) : { firstName: "Guest", role: "staff" };

  const [activeTab, setActiveTab] = useState("browse");
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favouriteEvents, setFavouriteEvents] = useState([]);

  useEffect(() => { fetchRegisteredEvents(); }, []);

  useEffect(() => {
    if (activeTab === 'favourites') fetchFavourites();
  }, [activeTab]);

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
        setRegisteredEvents(Array.isArray(data) ? data : []);
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
      const filtered = list.filter(ev => ids.includes(String(ev._id || ev.id)));
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
              <MyEventsList events={registeredEvents} />
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default StaffDashboard;
