import React, { useState, useEffect } from "react";
import EventList from "../EventList"; // Import the EventList component

function TADashboard() {
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, upcoming, allevents

  // Mock user data - in production this would come from auth context/props
  const user = { 
    firstName: "Guest", 
    lastName: "", 
    email: "guest@guc.edu.eg",
    role: "ta",
    staffId: "TA12345"
  };

  useEffect(() => {
    fetchRegisteredEvents();
  }, []);

  const fetchRegisteredEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5001/api/events/registered");
      const data = await response.json();
      setRegisteredEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching registered events:", err);
      setRegisteredEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "TBA";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isUpcoming = (event) => {
    if (!event.startDate) return false;
    return new Date(event.startDate) > new Date();
  };

  const filteredEvents = registeredEvents.filter((event) => {
    if (filter === "upcoming") return isUpcoming(event);
    return true;
  });

  const upcomingCount = registeredEvents.filter(isUpcoming).length;

  const EventCard = ({ event }) => {
    const upcoming = isUpcoming(event);
    
    return (
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          transition: "all 0.3s",
          cursor: "pointer",
          border: upcoming ? "2px solid #d4af37" : "2px solid #e5e7eb",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#003366", marginBottom: "8px" }}>
              {event.title}
            </h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  background: upcoming ? "rgba(34, 197, 94, 0.15)" : "rgba(107, 114, 128, 0.15)",
                  color: upcoming ? "#16a34a" : "#6b7280",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                }}
              >
                {upcoming ? "UPCOMING" : "PAST"}
              </span>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  background: "rgba(212, 175, 55, 0.15)",
                  color: "#d4af37",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                }}
              >
                {event.type || "Event"}
              </span>
            </div>
          </div>
        </div>

        <p style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "20px", lineHeight: "1.6" }}>
          {event.shortDescription || event.description?.substring(0, 120) + "..."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#374151", fontSize: "0.9rem" }}>
            <span style={{ color: "#d4af37", fontWeight: "bold" }}>📅</span>
            <span style={{ fontWeight: "500" }}>{formatDate(event.startDate)}</span>
          </div>
          
          {event.startDate && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#374151", fontSize: "0.9rem" }}>
              <span style={{ color: "#d4af37", fontWeight: "bold" }}>🕐</span>
              <span style={{ fontWeight: "500" }}>{formatTime(event.startDate)}</span>
            </div>
          )}

          {event.location && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#374151", fontSize: "0.9rem" }}>
              <span style={{ color: "#d4af37", fontWeight: "bold" }}>📍</span>
              <span style={{ fontWeight: "500" }}>{event.location}</span>
            </div>
          )}

          {event.capacity && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#374151", fontSize: "0.9rem" }}>
              <span style={{ color: "#d4af37", fontWeight: "bold" }}>👥</span>
              <span style={{ fontWeight: "500" }}>Capacity: {event.capacity}</span>
            </div>
          )}
        </div>

        <button
          style={{
            width: "100%",
            padding: "12px",
            background: upcoming ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)" : "#f3f4f6",
            color: upcoming ? "#003366" : "#6b7280",
            border: "none",
            borderRadius: "10px",
            fontSize: "0.95rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          View Details →
        </button>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #003366 0%, #000d1a 100%)",
      }}
    >
      {/* Navbar placeholder */}
      <div
        style={{
          background: "rgba(0, 51, 102, 0.95)",
          padding: "20px 40px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          backdropFilter: "blur(10px)",
        }}
      >
        <h2 style={{ color: "white", margin: 0, fontSize: "1.5rem" }}>GUC Events Platform</h2>
      </div>

      <div style={{ padding: "80px 40px 80px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "40px",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              marginBottom: "40px",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#003366", marginBottom: "8px" }}>
                My Registered Events
              </h1>
              <p style={{ fontSize: "1.1rem", color: "#6b7280", margin: 0 }}>
                View all workshops and trips you've registered for
              </p>
            </div>

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              <div
                style={{
                  flex: "1",
                  minWidth: "250px",
                  padding: "20px",
                  background: "linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)",
                  borderRadius: "12px",
                  border: "2px solid rgba(212, 175, 55, 0.3)",
                }}
              >
                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#003366", marginBottom: "4px" }}>
                  {registeredEvents.length}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#6b7280", fontWeight: "500" }}>Total Registered</div>
              </div>

              <div
                style={{
                  flex: "1",
                  minWidth: "250px",
                  padding: "20px",
                  background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)",
                  borderRadius: "12px",
                  border: "2px solid rgba(34, 197, 94, 0.3)",
                }}
              >
                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#003366", marginBottom: "4px" }}>
                  {upcomingCount}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#6b7280", fontWeight: "500" }}>Upcoming Events</div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "30px",
              background: "rgba(255,255,255,0.95)",
              padding: "8px",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {[
              { key: "upcoming", label: "Upcoming", count: upcomingCount },
              { key: "allevents", label: "Browse All Events" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  background: filter === tab.key ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)" : "transparent",
                  color: filter === tab.key ? "#003366" : "#6b7280",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
              >
                {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
              </button>
            ))}

            <button
              onClick={() => (window.location.href = "/register-events")}
              style={{
                flex: 1,
                padding: "14px 24px",
                background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                color: "#003366",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
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
                padding: "14px 24px",
                background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                color: "#003366",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 6px 20px rgba(212, 175, 55, 0.4)",
              }}
            >
              🏋️ Gym Sessions
            </button>
          </div>

          {/* Events List */}
          {filter === "allevents" ? (
            <EventList />
          ) : loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 20px",
                background: "rgba(255,255,255,0.95)",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  fontSize: "1.2rem",
                  color: "#6b7280",
                  fontWeight: "500",
                }}
              >
                Loading your registered events...
              </div>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                gap: "24px",
              }}
            >
              {filteredEvents.map((event) => (
                <EventCard key={event._id || event.id} event={event} />
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "80px 20px",
                background: "rgba(255,255,255,0.95)",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontSize: "4rem", marginBottom: "20px" }}>📅</div>
              <h3 style={{ fontSize: "1.5rem", color: "#003366", marginBottom: "8px", fontWeight: "600" }}>
                {filter === "upcoming" && "No upcoming events"}
                {filter === "all" && "No registered events"}
              </h3>
              <p style={{ fontSize: "1.1rem", color: "#6b7280", margin: 0 }}>
                {filter === "all" ? "You haven't registered for any workshops or trips yet" : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TADashboard;
