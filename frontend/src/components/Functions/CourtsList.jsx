import React from "react";


function CourtsList({ courts }) {
  if (!courts || !Array.isArray(courts)) {
    return (
      <div style={{ background: "rgba(255,255,255,0.95)", padding: "60px 40px", borderRadius: "20px", textAlign: "center", boxShadow: "0 8px 25px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "20px" }}>⏳</div>
        <h3 style={{ fontSize: "1.5rem", color: "#003366", marginBottom: "10px" }}>Loading...</h3>
        <p style={{ color: "#6b7280" }}>Please wait while we fetch court information.</p>
      </div>
    );
  }

  if (courts.length === 0) {
    return (
      <div style={{ background: "rgba(255,255,255,0.95)", padding: "60px 40px", borderRadius: "20px", textAlign: "center", boxShadow: "0 8px 25px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🏀</div>
        <h3 style={{ fontSize: "1.5rem", color: "#003366", marginBottom: "10px" }}>No courts available</h3>
        <p style={{ color: "#6b7280" }}>There are no courts listed at the moment.</p>
      </div>
    );
  }

  const getCourtIcon = (type) => {
    const icons = {
      basketball: "🏀",
      tennis: "🎾",
      football: "⚽",
    };
    return icons[type?.toLowerCase()] || "🏟️";
  };

  const getCourtColor = (type) => {
    const colors = {
      basketball: "#ff6b35",
      tennis: "#00b4d8",
      football: "#06d6a0",
    };
    return colors[type?.toLowerCase()] || "#6b7280";
  };

  const getCourtColorDark = (type) => {
    const colors = {
      basketball: "#e63946",
      tennis: "#0077b6",
      football: "#048067",
    };
    return colors[type?.toLowerCase()] || "#4b5563";
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "30px" }}>
      {courts.map((court) => (
        <div key={court._id || court.id} style={{ background: "rgba(255,255,255,0.95)", borderRadius: "20px", overflow: "hidden", boxShadow: "0 8px 25px rgba(0,0,0,0.3)", transition: "all 0.3s", cursor: "pointer" }}>
          <div style={{ height: "200px", background: `linear-gradient(135deg, ${getCourtColor(court.type)} 0%, ${getCourtColorDark(court.type)} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5rem" }}>
            {getCourtIcon(court.type)}
          </div>
          <div style={{ padding: "25px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ padding: "6px 12px", background: "rgba(212, 175, 55, 0.15)", color: "#d4af37", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase" }}>
                {court.type || "Court"}
              </span>
              <span style={{ padding: "6px 12px", background: court.available ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)", color: court.available ? "#22c55e" : "#ef4444", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "700" }}>
                {court.available ? "Available" : "Occupied"}
              </span>
            </div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#003366", marginBottom: "12px" }}>
              {court.name || `${court.type} Court`}
            </h3>
            {court.description && (
              <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "15px", lineHeight: "1.5" }}>
                {court.description.substring(0, 100)}...
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem", color: "#6b7280" }}>
              {court.location && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📍</span>
                  <span>{court.location}</span>
                </div>
              )}
              {court.availabilityDates && court.availabilityDates.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#003366", marginBottom: "8px" }}>Available Dates & Times:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {court.availabilityDates.slice(0, 3).map((slot, idx) => (
                      <div key={idx} style={{ padding: "8px 12px", background: "rgba(0, 51, 102, 0.05)", borderRadius: "8px", fontSize: "0.8rem" }}>
                        <div style={{ fontWeight: "600", color: "#003366" }}>
                          📅 {new Date(slot.date).toLocaleDateString()}
                        </div>
                        <div style={{ color: "#6b7280", marginTop: "4px" }}>
                          🕐 {slot.startTime} - {slot.endTime}
                        </div>
                      </div>
                    ))}
                    {court.availabilityDates.length > 3 && (
                      <div style={{ fontSize: "0.75rem", color: "#d4af37", fontWeight: "600", marginTop: "4px" }}>
                        +{court.availabilityDates.length - 3} more slots
                      </div>
                    )}
                  </div>
                </div>
              )}
              {(!court.availabilityDates || court.availabilityDates.length === 0) && (
                <div style={{ padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", fontSize: "0.8rem", color: "#ef4444", textAlign: "center" }}>
                  No availability slots at the moment
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
export default CourtsList;