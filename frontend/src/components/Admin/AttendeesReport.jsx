import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
  buttonStyles,
  inputStyles,
} from "../../utils/designSystem";

// Full-report component that mirrors the Postman JSON 1:1 and keeps the filters/search working
export default function AttendeesReport({ hideBackButton = false, backPath = "/Admin" }) {
  const navigate = useNavigate();

  // Report pieces (match backend shape)
  const [filtersState, setFiltersState] = useState({});
  const [summary, setSummary] = useState(null);
  const [breakdownByType, setBreakdownByType] = useState([]);
  const [topEvents, setTopEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [generatedAt, setGeneratedAt] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters (controlled inputs)
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Debounce for event name search
  const [titleDebounce, setTitleDebounce] = useState("");

  // Helper: build query string used by backend
  const buildQuery = useCallback(() => {
    const q = new URLSearchParams();
    if (status) q.append("status", status);
    if (type) q.append("type", type);
    // backend expects eventName as shown in your code
    if (title) q.append("eventName", title);
    if (startDate) q.append("startDate", startDate);
    if (endDate) q.append("endDate", endDate);
    return q.toString();
  }, [status, type, title, startDate, endDate]);

  // Fetch reports from backend
  const fetchReports = useCallback(async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    setError(null);

    if (!token) {
      setError("No token found. Please login.");
      setLoading(false);
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
      const queryString = buildQuery();
      const url = `${API_BASE}/admin/reports/attendees${queryString ? `?${queryString}` : ""}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        // try to provide useful error message
        throw new Error(`Error ${res.status}: ${text || res.statusText}`);
      }

      const data = await res.json();
      // Expecting data.success and data.report to exist
      const report = data.report || {};

      setFiltersState(report.filters || {});
      setSummary(report.summary || null);
      setBreakdownByType(report.breakdownByType || []);
      setTopEvents(report.topEvents || []);
      setAllEvents(report.allEvents || []);
      setGeneratedAt(report.generatedAt || "");

      // keep console trace for debugging
      // eslint-disable-next-line no-console
      console.log("Fetched attendees report:", data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError(err.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  // Track if component has mounted to prevent duplicate fetches
  const isMountedRef = useRef(false);

  // initial fetch on mount
  useEffect(() => {
    fetchReports();
    isMountedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-filter event name with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setTitle(titleDebounce);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [titleDebounce]);

  // Fetch when title changes (after debounce)
  useEffect(() => {
    if (!isMountedRef.current || title !== titleDebounce) return; // Only fetch when debounced value matches and after mount
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Auto-fetch when status or type changes (but not on initial mount)
  useEffect(() => {
    if (!isMountedRef.current) return;
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type]);

  // Auto-fetch when dates change (but not on initial mount)
  useEffect(() => {
    if (!isMountedRef.current) return;
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handleApply = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    await fetchReports();
  };

  const handleReset = () => {
    setStatus("");
    setType("");
    setTitle("");
    setTitleDebounce("");
    setStartDate("");
    setEndDate("");
    // fetch without filters
    setTimeout(() => fetchReports(), 0);
  };

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
  };

  const handleTypeChange = (e) => {
    setType(e.target.value);
  };

  const handleTitleChange = (e) => {
    setTitleDebounce(e.target.value);
  };

  const content = (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          background: colors.bgCard,
          borderRadius: borderRadius["2xl"],
          boxShadow: shadows.lg,
          padding: spacing["3xl"],
          marginBottom: spacing.xl,
          border: `1px solid ${colors.gray200}`,
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: spacing.xl,
          }}
        >
          {!hideBackButton && (
            <button
              onClick={() => navigate(backPath)}
              style={{
                ...buttonStyles.back,
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                background: colors.bgCard,
                color: colors.primary,
                borderColor: colors.primary,
              }}
            >
              ← Back
            </button>
          )}

          <h2
            style={{
              color: colors.primary,
              margin: 0,
              fontSize: typography.fontSize["2xl"],
              fontWeight: typography.fontWeight.bold,
              textAlign: "center",
              textDecoration: "underline",
              textDecorationColor: colors.primary,
              textUnderlineOffset: "4px",
            }}
          >
            Attendees Report
          </h2>
        </div>

        {/* Filters */}
        <form onSubmit={handleApply} style={{ marginBottom: spacing.xl }}>
          <h3
            style={{
              color: colors.primary,
              marginTop: 0,
              marginBottom: spacing.lg,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
            }}
          >
            Filters
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: spacing.lg,
              marginBottom: spacing.lg,
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, color: colors.gray700, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                Event Status
              </label>
              <select
                value={status}
                onChange={handleStatusChange}
                style={{ ...inputStyles.base, width: "100%" }}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, color: colors.gray700, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                Event Type
              </label>
              <select
                value={type}
                onChange={handleTypeChange}
                style={{ ...inputStyles.base, width: "100%" }}
              >
                <option value="">All Types</option>
                <option value="Workshop">Workshop</option>
                <option value="Trip">Trip</option>
                <option value="Bazaar">Bazaar</option>
                <option value="Booth">Booth</option>
                <option value="Conference">Conference</option>
                <option value="GymSession">Gym Session</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, color: colors.gray700, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                Event Name
              </label>
              <input
                type="text"
                placeholder="Search by event name..."
                value={titleDebounce}
                onChange={handleTitleChange}
                style={{ ...inputStyles.base, width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, color: colors.gray700, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ ...inputStyles.base, width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, color: colors.gray700, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ ...inputStyles.base, width: "100%" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: spacing.md }}>
            <button type="submit" style={{ ...buttonStyles.primary, padding: `${spacing.md} ${spacing.xl}` }}>
              Apply Filters
            </button>

            <button type="button" onClick={handleReset} style={{ ...buttonStyles.secondary, padding: `${spacing.md} ${spacing.xl}` }}>
              Reset Filters
            </button>

            <div style={{ marginLeft: "auto", alignSelf: "center", color: colors.gray600, fontSize: typography.fontSize.sm }}>
              {generatedAt ? `Generated at: ${new Date(generatedAt).toLocaleString()}` : null}
            </div>
          </div>
        </form>

        {/* Loading/Error */}
        {loading ? (
          <div
            style={{
              color: colors.gray500,
              fontSize: typography.fontSize.base,
              textAlign: "center",
              padding: spacing["3xl"],
            }}
          >
            Loading...
          </div>
        ) : error ? (
          <div
            style={{
              color: colors.error,
              background: colors.errorLight,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              marginBottom: spacing.lg,
              fontSize: typography.fontSize.sm,
            }}
          >
            {error}
          </div>
        ) : (
          <>
            {/* Summary */}
            {summary && (
              <div
                style={{
                  background: colors.white,
                  borderRadius: borderRadius.xl,
                  boxShadow: shadows.md,
                  border: `1px solid ${colors.gray200}`,
                  padding: spacing["2xl"],
                  marginBottom: spacing.xl,
                }}
              >
                <h2
                  style={{ margin: 0, color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}
                >
                  Summary
                </h2>
                <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}>
                  <b>Total Events:</b> {summary.totalEvents}
                </p>
                <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}>
                  <b>Total Attendees:</b> {summary.totalAttendees}
                </p>
                <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}>
                  <b>Average Attendees per Event:</b> {summary.averageAttendeesPerEvent}
                </p>
              </div>
            )}

            {/* Breakdown by Type */}
            {breakdownByType.length > 0 &&
              breakdownByType.map((typeGroup, i) => (
                <div
                  key={i}
                  style={{
                    background: colors.white,
                    borderRadius: borderRadius.xl,
                    boxShadow: shadows.md,
                    border: `1px solid ${colors.gray200}`,
                    padding: spacing["2xl"],
                    marginBottom: spacing.xl,
                  }}
                >
                  <h2
                    style={{ margin: 0, color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}
                  >
                    {typeGroup.type}
                  </h2>

                  <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}>
                    <b>Total Events:</b> {typeGroup.totalEvents}
                  </p>
                  <p style={{ color: colors.gray700, marginBottom: spacing.lg, fontSize: typography.fontSize.base }}>
                    <b>Total Attendees:</b> {typeGroup.totalAttendees}
                  </p>

                  {typeGroup.events.map((event, j) => (
                    <div key={j} style={{ marginTop: spacing.lg, padding: spacing.lg, borderTop: `1px solid ${colors.gray200}` }}>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                        <b>Title:</b> {event.title}
                      </p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                        <b>Status:</b> {event.status}
                      </p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                        <b>Attendees:</b> {event.attendeeCount}
                      </p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                        <b>Capacity:</b> {event.capacity}
                      </p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                        <b>Utilization Rate:</b> {event.utilizationRate}
                      </p>
                    </div>
                  ))}
                </div>
              ))}

            {/* Top Events */}
            {topEvents.length > 0 && (
              <div
                style={{
                  background: colors.white,
                  borderRadius: borderRadius.xl,
                  boxShadow: shadows.md,
                  border: `1px solid ${colors.gray200}`,
                  padding: spacing["2xl"],
                  marginBottom: spacing.xl,
                }}
              >
                <h2 style={{ margin: 0, color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
                  Top Events
                </h2>
                {topEvents.map((event, i) => (
                  <div key={i} style={{ marginTop: spacing.lg, padding: spacing.lg, borderTop: `1px solid ${colors.gray200}` }}>
                    <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                      <b>Title:</b> {event.title}
                    </p>
                    <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                      <b>Type:</b> {event.type}
                    </p>
                    <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                      <b>Start:</b> {new Date(event.startDate).toLocaleString()}
                    </p>
                    <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                      <b>Attendees:</b> {event.attendeeCount}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* All Events */}
            {allEvents.length > 0 && (
              <div
                style={{
                  background: colors.white,
                  borderRadius: borderRadius.xl,
                  boxShadow: shadows.md,
                  border: `1px solid ${colors.gray200}`,
                  padding: spacing["2xl"],
                  marginBottom: spacing.xl,
                }}
              >
                <h2 style={{ margin: 0, color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
                  All Events
                </h2>
                {allEvents.map((event, i) => (
                  <div key={i} style={{ marginTop: spacing.lg, padding: spacing.lg, borderTop: `1px solid ${colors.gray200}` }}>
                    <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                      <b>Title:</b> {event.title}
                    </p>
                    <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                      <b>Type:</b> {event.type}
                    </p>
                    <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                      <b>Status:</b> {event.status}
                    </p>
                    <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                      <b>Attendees:</b> {event.attendeeCount}
                    </p>
                    <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                      <b>Capacity:</b> {event.capacity}
                    </p>
                    <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}>
                      <b>Utilization Rate:</b> {event.utilizationRate}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (hideBackButton) return content;

  return (
    <div style={{ minHeight: "100vh", background: colors.bgPrimary, position: "relative", overflow: "hidden" }}>
      <div style={{ paddingTop: spacing["8xl"], padding: `${spacing["8xl"]} ${spacing["2xl"]} ${spacing["6xl"]}`, position: "relative", zIndex: 1 }}>
        {content}
      </div>
    </div>
  );
}
