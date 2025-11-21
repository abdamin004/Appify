import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { listGymSessions, registerForEvent } from "../services/eventService";

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
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState({}); // { [id]: { ok:boolean, msg:string } }

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

  const currentUserId = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return null;
      const u = JSON.parse(raw);
      return u && (u._id || u.id) ? String(u._id || u.id) : null;
    } catch (_) { return null; }
  })();

  function isStarted(s) {
    try { return new Date(s.startDate) <= new Date(); } catch { return false; }
  }

  function isFull(s) {
    try {
      const reg = Array.isArray(s.registeredUsers) ? s.registeredUsers.length : (s.registeredCount || 0);
      return Number(s.capacity || 0) > 0 && reg >= Number(s.capacity || 0);
    } catch { return false; }
  }

  function alreadyRegistered(s) {
    try {
      if (!currentUserId) return false;
      const arr = Array.isArray(s.registeredUsers) ? s.registeredUsers : [];
      return arr.map(String).includes(String(currentUserId));
    } catch { return false; }
  }

  async function handleRegister(id) {
    setBusyId(id);
    setStatus(prev => ({ ...prev, [id]: { ok: false, msg: '' } }));
    try {
      const res = await registerForEvent(id);
      setStatus(prev => ({ ...prev, [id]: { ok: true, msg: res.message || 'Registered successfully' } }));
      try { const rows = await listGymSessions(); setSessions(Array.isArray(rows) ? rows : []); } catch(_) {}
    } catch (err) {
      const msg = (err && err.message) || 'Failed to register';
      setStatus(prev => ({ ...prev, [id]: { ok: false, msg } }));
    } finally {
      setBusyId(null);
    }
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
            <h1 style={{ margin: 0, color: "#003366" }}>Gym Sessions</h1>
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
                            .map((s) => {
                              const id = s._id || s.id;
                              const started = isStarted(s);
                              const full = isFull(s);
                              const mine = alreadyRegistered(s);
                              const disabled = started || full || mine || busyId === id;
                              const label = mine ? 'Registered' : full ? 'Full' : started ? 'Started' : (busyId === id ? 'Registering...' : 'Register');
                              return (
                                <li key={id} style={{ padding: "8px 0", borderTop: "1px solid #f3f4f6" }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                                    <div>
                                      <div>{fmtDateTime(s.startDate)}</div>
                                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                                        Instructor: {s.instructor || "TBA"} {s.capacity ? `• Capacity: ${s.capacity}` : ""}
                                      </div>
                                    </div>
                                    <div>
                                      <button
                                        disabled={disabled}
                                        onClick={() => !disabled && handleRegister(id)}
                                        style={{
                                          padding: '8px 12px',
                                          background: disabled ? '#e5e7eb' : 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                                          color: disabled ? '#6b7280' : '#003366',
                                          border: 'none',
                                          borderRadius: 8,
                                          fontWeight: 700,
                                          cursor: disabled ? 'not-allowed' : 'pointer',
                                        }}
                                      >{label}</button>
                                    </div>
                                  </div>
                                  {status[id] && status[id].msg && (
                                    <div style={{ marginTop:6, fontSize:12, color: status[id].ok ? '#065f46' : '#b91c1c' }}>
                                      {status[id].msg}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
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

