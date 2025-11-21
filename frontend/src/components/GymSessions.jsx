import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { listGymSessions, registerForEvent } from "../services/eventService";
import { showToast } from "../utils/toast";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from "../utils/designSystem";

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
      showToast.success(res.message || 'Registered successfully');
      setStatus(prev => ({ ...prev, [id]: { ok: true, msg: res.message || 'Registered successfully' } }));
      try { const rows = await listGymSessions(); setSessions(Array.isArray(rows) ? rows : []); } catch(_) {}
    } catch (err) {
      const msg = (err && err.message) || 'Failed to register';
      showToast.error(msg);
      setStatus(prev => ({ ...prev, [id]: { ok: false, msg } }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bgPrimary,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Navbar />
      <div style={{ 
        paddingTop: spacing['8xl'], 
        padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, 
        position: "relative", 
        zIndex: 1 
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              background: colors.bgCard,
              padding: `${spacing['3xl']} ${spacing['3xl']}`,
              borderRadius: borderRadius['2xl'],
              boxShadow: shadows.lg,
              marginBottom: spacing['3xl'],
              border: `1px solid ${colors.gray200}`,
            }}
          >
            <h1 style={{ 
              margin: 0, 
              color: colors.primary,
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
            }}>Gym Sessions</h1>
            <p style={{ 
              marginTop: spacing.sm, 
              color: colors.gray500,
              fontSize: typography.fontSize.base,
            }}>
              View monthly schedules for Yoga, Pilates, Aerobics, Zumba, Cross Circuit, and Kick-boxing.
            </p>
          </div>

          {loading && (
            <div style={{ 
              color: colors.white,
              fontSize: typography.fontSize.lg,
              textAlign: 'center',
              padding: spacing['3xl'],
            }}>Loading sessions…</div>
          )}
          {error && (
            <div style={{ 
              color: colors.error, 
              background: colors.errorLight, 
              padding: spacing.lg, 
              borderRadius: borderRadius.xl,
              marginBottom: spacing.lg,
            }}>{error}</div>
          )}
          {!loading && !error && monthKeys.length === 0 && (
            <div style={{ 
              color: colors.white,
              fontSize: typography.fontSize.lg,
              textAlign: 'center',
              padding: spacing['3xl'],
            }}>No sessions found.</div>
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
              <div key={month} style={{ marginBottom: spacing['3xl'] }}>
                <div
                  style={{
                    background: colors.bgCard,
                    padding: `${spacing.lg} ${spacing.xl}`,
                    borderRadius: borderRadius.xl,
                    boxShadow: shadows.md,
                    border: `1px solid ${colors.gray200}`,
                  }}
                >
                  <h2 style={{ 
                    margin: 0, 
                    color: colors.primary,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                  }}>{month}</h2>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", 
                    gap: spacing.lg, 
                    marginTop: spacing.lg 
                  }}>
                    {typeKeys.map((tk) => (
                      <div key={tk} style={{ 
                        background: colors.white, 
                        border: `1px solid ${colors.gray200}`, 
                        borderRadius: borderRadius.xl, 
                        padding: spacing.lg 
                      }}>
                        <div style={{ 
                          fontWeight: typography.fontWeight.extrabold, 
                          color: colors.primary, 
                          marginBottom: spacing.sm,
                          fontSize: typography.fontSize.base,
                        }}>{tk}</div>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, color: colors.gray700 }}>
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
                                <li key={id} style={{ 
                                  padding: `${spacing.sm} 0`, 
                                  borderTop: `1px solid ${colors.gray100}` 
                                }}>
                                  <div style={{ 
                                    display:'flex', 
                                    justifyContent:'space-between', 
                                    alignItems:'center', 
                                    gap: spacing.lg 
                                  }}>
                                    <div>
                                      <div style={{ 
                                        fontSize: typography.fontSize.sm,
                                        fontWeight: typography.fontWeight.medium,
                                        color: colors.gray700,
                                      }}>{fmtDateTime(s.startDate)}</div>
                                      <div style={{ 
                                        fontSize: typography.fontSize.xs, 
                                        color: colors.gray500,
                                        marginTop: spacing.xs,
                                      }}>
                                        Instructor: {s.instructor || "TBA"} {s.capacity ? `• Capacity: ${s.capacity}` : ""}
                                      </div>
                                    </div>
                                    <div>
                                      <button
                                        disabled={disabled}
                                        onClick={() => !disabled && handleRegister(id)}
                                        style={{
                                          ...(disabled ? {} : buttonStyles.primary),
                                          padding: `${spacing.sm} ${spacing.lg}`,
                                          background: disabled ? colors.gray200 : undefined,
                                          color: disabled ? colors.gray500 : colors.primary,
                                          border: 'none',
                                          borderRadius: borderRadius.lg,
                                          fontWeight: typography.fontWeight.bold,
                                          fontSize: typography.fontSize.sm,
                                          cursor: disabled ? 'not-allowed' : 'pointer',
                                          opacity: disabled ? 0.7 : 1,
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!disabled) {
                                            e.target.style.boxShadow = shadows.accentHover;
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!disabled) {
                                            e.target.style.boxShadow = shadows.accent;
                                          }
                                        }}
                                      >{label}</button>
                                    </div>
                                  </div>
                                  {status[id] && status[id].msg && (
                                    <div style={{ 
                                      marginTop: spacing.sm, 
                                      fontSize: typography.fontSize.xs, 
                                      color: status[id].ok ? colors.success : colors.error 
                                    }}>
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

