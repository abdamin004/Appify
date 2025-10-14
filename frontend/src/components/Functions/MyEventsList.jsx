import React from "react";



function MyEventsList({ events }) {
  // Check if events is undefined or not an array
  if (!events || !Array.isArray(events)) {
    return (
      <div style={{ background: "rgba(255,255,255,0.95)", padding: "60px 40px", borderRadius: "20px", textAlign: "center", boxShadow: "0 8px 25px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "20px" }}>⏳</div>
        <h3 style={{ fontSize: "1.5rem", color: "#003366", marginBottom: "10px" }}>Loading...</h3>
        <p style={{ color: "#6b7280" }}>Please wait while we fetch your events.</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={{ background: "rgba(255,255,255,0.95)", padding: "60px 40px", borderRadius: "20px", textAlign: "center", boxShadow: "0 8px 25px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "20px" }}>📭</div>
        <h3 style={{ fontSize: "1.5rem", color: "#003366", marginBottom: "10px" }}>No events found</h3>
        <p style={{ color: "#6b7280" }}>You don't have any events in this category yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "30px" }}>
      {events.map((event) => (
        <div key={event._id || event.id} style={{ background: "rgba(255,255,255,0.95)", borderRadius: "20px", overflow: "hidden", boxShadow: "0 8px 25px rgba(0,0,0,0.3)", transition: "all 0.3s", cursor: "pointer" }}>
          <div style={{ height: "200px", background: `linear-gradient(135deg, ${getEventColor(event.type)} 0%, ${getEventColorDark(event.type)} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>
            {getEventIcon(event.type)}
          </div>
          <div style={{ padding: "25px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ padding: "6px 12px", background: "rgba(212, 175, 55, 0.15)", color: "#d4af37", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "700" }}>
                {event.type || "Event"}
              </span>
              {event.status && (
                <span style={{ padding: "6px 12px", background: event.status === "approved" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)", color: event.status === "approved" ? "#22c55e" : "#ef4444", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "700" }}>
                  {event.status}
                </span>
              )}
            </div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#003366", marginBottom: "12px" }}>
              {event.name || event.title}
            </h3>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "15px", lineHeight: "1.5" }}>
              {event.description?.substring(0, 100) || "No description available"}...
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem", color: "#6b7280" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📅</span>
                <span>{new Date(event.date).toLocaleDateString()}</span>
              </div>
              {event.location && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📍</span>
                  <span>{event.location}</span>
                </div>
              )}
              {event.capacity && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>👥</span>
                  <span>{event.registeredCount || 0}/{event.capacity}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getEventIcon(type) {
  const icons = {
    Workshop: "📚",
    Trip: "🚌",
    Bazaar: "🏪",
    Booth: "🎪",
    Conference: "🎤",
  };
  return icons[type] || "📅";
}

function getEventColor(type) {
  const colors = {
    Workshop: "#3b82f6",
    Trip: "#10b981",
    Bazaar: "#f59e0b",
    Booth: "#ec4899",
    Conference: "#8b5cf6",
  };
  return colors[type] || "#6b7280";
}

function getEventColorDark(type) {
  const colors = {
    Workshop: "#1e40af",
    Trip: "#047857",
    Bazaar: "#d97706",
    Booth: "#be185d",
    Conference: "#6d28d9",
  };
  return colors[type] || "#4b5563";
}
export default MyEventsList;