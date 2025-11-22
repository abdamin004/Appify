import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from "../../utils/designSystem";

export default function AttendeesReport({ hideBackButton = false, backPath = '/Admin' }) {
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [breakdownByType, setBreakdownByType] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line
  }, []);

  const fetchReports = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token found. Please login.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const query = new URLSearchParams();
      if (status) query.append("status", status);
      if (type) query.append("type", type);
      if (title) query.append("eventName", title); // backend expects eventName
      if (startDate) query.append("startDate", startDate);
      if (endDate) query.append("endDate", endDate);

      const res = await fetch(
        `${API_BASE}/admin/reports/attendees?${query.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text}`);
      }

      const data = await res.json();
      console.log("Fetched attendees report:", data);

      // Extract the relevant parts
      setAllEvents(data.report?.allEvents || []);
      setSummary(data.report?.summary || null);
      setBreakdownByType(data.report?.breakdownByType || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ background: colors.bgCard, borderRadius: borderRadius['2xl'], boxShadow: shadows.lg, padding: spacing['3xl'], marginBottom: spacing.xl, border: `1px solid ${colors.gray200}` }}>
        <div style={{ 
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.xl
        }}>
          {!hideBackButton && (
            <button
              onClick={() => navigate(backPath)}
              style={{
                ...buttonStyles.back,
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                background: colors.bgCard,
                color: colors.primary,
                borderColor: colors.primary
              }}
              onMouseEnter={(e) => {
                e.target.style.background = colors.accent;
                e.target.style.color = colors.primary;
                e.target.style.borderColor = colors.accent;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = colors.bgCard;
                e.target.style.color = colors.primary;
                e.target.style.borderColor = colors.primary;
              }}
            >
              ← Back
            </button>
          )}
          <h2 style={{ 
                color: colors.primary, 
                margin: 0,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                textAlign: 'center',
                textDecoration: 'underline',
                textDecorationColor: colors.primary,
                textUnderlineOffset: '4px'
              }}>Attendees Report</h2>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: spacing.xl }}>
              <h3 style={{ 
                color: colors.primary, 
                marginTop: 0, 
                marginBottom: spacing.lg,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold
              }}>Filters</h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: spacing.lg,
                marginBottom: spacing.lg
              }}>
                <input
                  type="text"
                  placeholder="Event Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ ...inputStyles.base }}
                />
                <input
                  type="text"
                  placeholder="Event Type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={{ ...inputStyles.base }}
                />
                <input
                  type="text"
                  placeholder="Event Name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ ...inputStyles.base }}
                />
                <input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ ...inputStyles.base }}
                />
                <input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ ...inputStyles.base }}
                />
              </div>
              <button
                onClick={fetchReports}
                style={{
                  ...buttonStyles.primary,
                  padding: `${spacing.md} ${spacing.xl}`
                }}
              >
                Apply Filters
              </button>
            </div>

            {/* Loading/Error */}
            {loading ? (
              <div style={{ 
                color: colors.gray500, 
                fontSize: typography.fontSize.base,
                textAlign: 'center',
                padding: spacing['3xl']
              }}>Loading...</div>
            ) : error ? (
              <div style={{ 
                color: colors.error, 
                background: colors.errorLight,
                padding: spacing.md,
                borderRadius: borderRadius.md,
                marginBottom: spacing.lg,
                fontSize: typography.fontSize.sm
              }}>{error}</div>
            ) : (
            <>
              {/* Summary */}
              {summary && (
                <div style={{ 
                  background: colors.white, 
                  borderRadius: borderRadius.xl, 
                  boxShadow: shadows.md, 
                  border: `1px solid ${colors.gray200}`, 
                  padding: spacing['2xl'], 
                  marginBottom: spacing.xl 
                }}>
                  <h2 style={{ margin: 0, color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>Summary</h2>
                  <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}><b>Total Events:</b> {summary.totalEvents}</p>
                  <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}><b>Total Attendees:</b> {summary.totalAttendees}</p>
                  <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}><b>Average Attendees per Event:</b> {summary.averageAttendeesPerEvent}</p>
                </div>
              )}

              {/* Breakdown by Type */}
              {breakdownByType.length > 0 && breakdownByType.map((typeGroup, i) => (
                <div key={i} style={{ 
                  background: colors.white, 
                  borderRadius: borderRadius.xl, 
                  boxShadow: shadows.md, 
                  border: `1px solid ${colors.gray200}`, 
                  padding: spacing['2xl'], 
                  marginBottom: spacing.xl 
                }}>
                  <h2 style={{ margin: 0, color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>{typeGroup.type}</h2>
                  <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}><b>Total Events:</b> {typeGroup.totalEvents}</p>
                  <p style={{ color: colors.gray700, marginBottom: spacing.lg, fontSize: typography.fontSize.base }}><b>Total Attendees:</b> {typeGroup.totalAttendees}</p>

                  {typeGroup.events.map((event, j) => (
                    <div key={j} style={{ marginTop: spacing.lg, padding: spacing.lg, borderTop: `1px solid ${colors.gray200}` }}>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Title:</b> {event.title}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Status:</b> {event.status}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Attendees:</b> {event.attendeeCount}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Capacity:</b> {event.capacity}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Utilization Rate:</b> {event.utilizationRate}</p>
                    </div>
                  ))}
                </div>
              ))}

              {/* All Events */}
              {allEvents.length > 0 && (
                <div style={{ 
                  background: colors.white, 
                  borderRadius: borderRadius.xl, 
                  boxShadow: shadows.md, 
                  border: `1px solid ${colors.gray200}`, 
                  padding: spacing['2xl'], 
                  marginBottom: spacing.xl 
                }}>
                  <h2 style={{ margin: 0, color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>All Events</h2>
                  {allEvents.map((event, i) => (
                    <div key={i} style={{ marginTop: spacing.lg, padding: spacing.lg, borderTop: `1px solid ${colors.gray200}` }}>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Title:</b> {event.title}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Type:</b> {event.type}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Status:</b> {event.status}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Attendees:</b> {event.attendeeCount}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Capacity:</b> {event.capacity}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Utilization Rate:</b> {event.utilizationRate}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
  );

  if (hideBackButton) {
    return content;
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, position: 'relative', zIndex: 1 }}>
        {content}
      </div>
    </div>
  );
}
