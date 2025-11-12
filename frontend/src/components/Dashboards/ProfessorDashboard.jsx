import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EventsList from "../EventList";
import Navbar from "../Navbar";
import MyEventsList from "../Functions/MyEventsList";
import { API_BASE } from "../../services/eventService";
import { getFavouriteIds } from "../../services/favoritesService";

function ProfessorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("browse");
  const [myWorkshops, setMyWorkshops] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [favouriteEvents, setFavouriteEvents] = useState([]);
  const [user, setUser] = useState({ firstName: "Professor", lastName: "" });

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
  }, []);

  useEffect(() => {
    if (activeTab === "my-workshops" && myWorkshops.length === 0) {
      fetchMyWorkshops();
    } else if (activeTab === "registered" && registeredEvents.length === 0) {
      fetchRegisteredEvents();
    } else if (activeTab === 'favourites') {
      fetchFavourites();
    }
  }, [activeTab]);

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
      setRegisteredEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setRegisteredEvents([]);
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
              }}
            >
              📚 My Workshops
            </button>
          </div>

          {/* Content */}
          {activeTab === "browse" && <EventsList enableFavorites={true} />}
          {activeTab === "registered" && <MyEventsList events={registeredEvents} />}
          {activeTab === "my-workshops" && <MyEventsList events={myWorkshops} />}
          {activeTab === 'favourites' && <MyEventsList events={favouriteEvents} />}
        </div>
      </div>
    </div>
  );
}

export default ProfessorDashboard;
