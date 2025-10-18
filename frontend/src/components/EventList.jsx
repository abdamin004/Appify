import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "./EventCard";
import Navbar from "./Navbar";
import { API_BASE } from "../services/eventService";

function EventsList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    search: "",
    professorName: "",
    location: "",
    sortBy: "date",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (filters.type) queryParams.append("type", filters.type);
      if (filters.search) queryParams.append("search", filters.search);
      if (filters.search || filters.professorName) {
        const combined = `${filters.search} ${filters.professorName}`.trim();
        if (combined) queryParams.append("q", combined);
      }

      if (filters.location) queryParams.append("location", filters.location);
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);

      let endpoint = `${API_BASE}/events`;
      if (filters.search || filters.professorName) {
        endpoint = `${API_BASE}/events/search`;
      } else if (filters.location || filters.startDate || filters.endDate) {
        endpoint = `${API_BASE}/events/filter`;
      }

      const response = await fetch(`${endpoint}?${queryParams}`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events
    .filter((event) => {
      if (filters.type && event.type !== filters.type) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const title = event.title?.toLowerCase().includes(s);
        const desc = event.description?.toLowerCase().includes(s);
        const prof =
          event.professorName?.toLowerCase().includes(s) ||
          event.createdBy?.firstName?.toLowerCase().includes(s) ||
          event.createdBy?.lastName?.toLowerCase().includes(s);
        return title || desc || prof;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === "date")
        return new Date(a.startDate) - new Date(b.startDate);
      if (filters.sortBy === "title") return a.title.localeCompare(b.title);
      return 0;
    });

  const handleEventClick = (id) => (window.location.href = `/events/${id}`);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #003366 0%, #000d1a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated Background Elements */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "-10%",
          width: "500px",
          height: "500px",
          background: "rgba(212, 175, 55, 0.08)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-10%",
          width: "600px",
          height: "600px",
          background: "rgba(212, 175, 55, 0.08)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}
      />

      

      <div style={{ paddingTop: "120px", padding: "120px 40px 80px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: "bold",
                color: "white",
                marginBottom: "15px",
                textShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              }}
            >
              Upcoming Events
            </h1>
            <p style={{ fontSize: "1.3rem", color: "rgba(212, 175, 55, 0.95)", lineHeight: "1.6" }}>
              Discover workshops, trips, conferences, bazaars, and more
            </p>
          </div>

          {/* Filters */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              padding: "35px 30px",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
              marginBottom: "40px",
            }}
          >
            {/* Search Row */}
            <div
              style={{
                display: "flex",
                gap: "15px",
                flexWrap: "wrap",
                marginBottom: "15px",
              }}
            >
              <input
                type="text"
                placeholder="🔍 Search by event name"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="👨‍🏫 Professor name"
                value={filters.professorName}
                onChange={(e) =>
                  setFilters({ ...filters, professorName: e.target.value })
                }
                style={inputStyle}
              />
            </div>

            {/* Filter Row */}
            <div
              style={{
                display: "flex",
                gap: "15px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                style={inputStyle}
              >
                <option value="">All Types</option>
                <option value="Workshop">🛠️ Workshop</option>
                <option value="Trip">🚌 Trip</option>
                <option value="Bazaar">🏪 Bazaar</option>
                <option value="Booth">🎪 Booth</option>
                <option value="Conference">🎤 Conference</option>
              </select>

              <input
                type="text"
                placeholder="📍 Location"
                value={filters.location}
                onChange={(e) =>
                  setFilters({ ...filters, location: e.target.value })
                }
                style={inputStyle}
              />

              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                style={inputStyle}
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                style={inputStyle}
              />

              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters({ ...filters, sortBy: e.target.value })
                }
                style={inputStyle}
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
              </select>

              {/* Quick navigation to event-specific manager pages */}
              <select
                defaultValue=""
                onChange={(e) => {
                  const route = e.target.value;
                  if (route) navigate(route);
                }}
                style={inputStyle}
                aria-label="Go to event page"
              >
                <option value="">Go to page…</option>
                <option value="/events">All Events</option>
                <option value="/events-office/bazaars">Bazaars</option>
                <option value="/events-office/trips">Trips</option>
                <option value="/events-office/conferences">Conferences</option>
                <option value="/events-office/gym-sessions">Gym Sessions</option>
                <option value="/professor/workshops">Workshops</option>
              </select>

              <button
                onClick={() =>
                  setFilters({
                    type: "",
                    search: "",
                    professorName: "",
                    location: "",
                    sortBy: "date",
                    startDate: "",
                    endDate: "",
                  })
                }
                style={clearButtonStyle}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(212, 175, 55, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                }}
              >
                Clear Filters
              </button>

              <div
                style={{
                  padding: "12px 20px",
                  background: "rgba(212, 175, 55, 0.15)",
                  borderRadius: "12px",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  color: "#003366",
                  marginLeft: "auto",
                }}
              >
                {filteredEvents.length} event
                {filteredEvents.length !== 1 ? "s" : ""} found
              </div>
            </div>
          </div>

          {/* Event Grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  border: "5px solid rgba(212, 175, 55, 0.3)",
                  borderTop: "5px solid #d4af37",
                  borderRadius: "50%",
                  margin: "0 auto 20px",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p style={{ fontSize: "1.2rem", color: "#d4af37", fontWeight: "500" }}>
                Loading events...
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 40px",
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: "20px",
                boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div style={{ fontSize: "5rem", marginBottom: "20px" }}>📭</div>
              <p
                style={{
                  fontSize: "1.5rem",
                  color: "#003366",
                  fontWeight: "bold",
                  marginBottom: "12px",
                }}
              >
                No events found
              </p>
              <p style={{ fontSize: "1.1rem", color: "#6b7280" }}>
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: "30px",
              }}
            >
              {filteredEvents.map((e) => (
                <EventCard
                  key={e._id}
                  event={e}
                  onClick={() => handleEventClick(e._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const inputStyle = {
  padding: "14px 18px",
  border: "2px solid #e5e7eb",
  borderRadius: "12px",
  fontSize: "0.95rem",
  outline: "none",
  minWidth: "160px",
  backgroundColor: "white",
  transition: "all 0.2s",
  fontWeight: "500",
  color: "#1f2937",
};

const clearButtonStyle = {
  padding: "14px 24px",
  background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
  color: "#003366",
  border: "none",
  borderRadius: "12px",
  fontSize: "0.95rem",
  fontWeight: "700",
  cursor: "pointer",
  transition: "all 0.3s",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
};

export default EventsList;
