import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { listGymSessions } from "../services/eventService";

const typeMap = {
  yoga: "Yoga",
  pilates: "Pilates",
  cardio: "Aerobics",
  zumba: "Zumba",
  crossfit: "Cross Circuit",
  other: "Kick-boxing",
  strength: "Strength",
  spinning: "Spinning",
};

export default function GymSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const rows = await listGymSessions();
        setSessions(Array.isArray(rows) ? rows : []);
      } catch (err) {
        setError(err.message || "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const byMonth = sessions.reduce((acc, s) => {
    const d = s.startDate ? new Date(s.startDate) : null;
    const key = d
      ? d.toLocaleString(undefined, { month: "long", year: "numeric" })
      : "Scheduled";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const monthKeys = Object.keys(byMonth).sort((a, b) => {
    // Try to sort by actual date; fallback to string compare
    const da = new Date(a);
    const db = new Date(b);
    if (!isNaN(da) && !isNaN(db)) return da - db;
    return a.localeCompare(b);
  });

  function fmtDateTime(s) {
    if (!s) return "TBA";
    const d = new Date(s);
    return `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

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
      <div style={{ paddingTop: "120px", padding: "120px 40px 80px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "28px 32px",
              borderRadius: 20,
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              marginBottom: 30,
            }}
          >
            <h1 style={{ margin: 0, color: "#003366" }}>🏋️ Gym Sessions</h1>
            <p style={{ marginTop: 8, color: "#6b7280" }}>
              View monthly schedules for Yoga, Pilates, Aerobics, Zumba, Cross Circuit, and Kick-boxing.
            </p>
          </div>

          {loading && (
            <div style={{ color: "white" }}>Loading sessions…</div>
          )}
          {error && (
            <div style={{ color: "#fecaca", background: "#7f1d1d", padding: 12, borderRadius: 12 }}>{error}</div>
          )}
          {!loading && !error && monthKeys.length === 0 && (
            <div style={{ color: "white" }}>No sessions found.</div>
          )}

          {monthKeys.map((month) => {
            const items = byMonth[month];
            // Group by session type label
            const byType = items.reduce((acc, s) => {
              const label = typeMap[s.sessionType] || s.sessionType || "Session";
              if (!acc[label]) acc[label] = [];
              acc[label].push(s);
              return acc;
            }, {});
            const typeKeys = Object.keys(byType).sort();

            return (
              <div key={month} style={{ marginBottom: 28 }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    padding: "18px 20px",
                    borderRadius: 16,
                    boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
                  }}
                >
                  <h2 style={{ margin: 0, color: "#003366" }}>{month}</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 12 }}>
                    {typeKeys.map((tk) => (
                      <div key={tk} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
                        <div style={{ fontWeight: 800, color: "#003366", marginBottom: 6 }}>{tk}</div>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "#374151" }}>
                          {byType[tk]
                            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                            .map((s) => (
                              <li key={s._id || s.id} style={{ padding: "8px 0", borderTop: "1px solid #f3f4f6" }}>
                                <div>{fmtDateTime(s.startDate)}</div>
                                <div style={{ fontSize: 12, color: "#6b7280" }}>
                                  Instructor: {s.instructor || "TBA"} {s.capacity ? `• Capacity: ${s.capacity}` : ""}
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
      </div>
    </div>
  );
}

