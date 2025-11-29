import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { colors, spacing, borderRadius, shadows, typography, buttonStyles, inputStyles } from "../../utils/designSystem";

export default function SalesReport({ hideBackButton = false, backPath = '/Admin' }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState({
    revenueByType: [],
    tripEvents: [],
    vendorEvents: [],
    vendorApplications: [],
    topRevenueEvents: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  // Debounce for event name search
  const [titleDebounce, setTitleDebounce] = useState("");

  const buildQuery = useCallback(() => {
    const q = new URLSearchParams();
    if (type) q.append("type", type);
    if (title) q.append("title", title);
    if (status) q.append("status", status);
    if (startDate) q.append("startDate", startDate);
    if (endDate) q.append("endDate", endDate);
    q.append("sortBy", "revenue");
    q.append("sortOrder", sortOrder);
    return q.toString();
  }, [type, title, status, startDate, endDate, sortOrder]);

  const fetchSales = useCallback(async () => {
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
      const res = await fetch(`${API_BASE}/admin/reports/sales?${buildQuery()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text}`);
      }

      const data = await res.json();
      const report = data.report;

      setSummary(report?.summary || {});
      setSales({
        revenueByType: report?.revenueByType || [],
        tripEvents: report?.tripRevenue?.events || [],
        vendorEvents: report?.vendorRevenue?.events || [],
        vendorApplications: report?.vendorRevenue?.applications || [],
        topRevenueEvents: report?.topRevenueEvents || [],
      });

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch sales report");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  // Track if component has mounted to prevent duplicate fetches
  const isMountedRef = useRef(false);

  // initial fetch on mount
  useEffect(() => {
    fetchSales();
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
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Auto-fetch when status, type, or sortOrder changes (but not on initial mount)
  useEffect(() => {
    if (!isMountedRef.current) return;
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type, sortOrder]);

  // Auto-fetch when dates change (but not on initial mount)
  useEffect(() => {
    if (!isMountedRef.current) return;
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handleApply = async (e) => {
    e?.preventDefault();
    await fetchSales();
  };

  const handleReset = () => {
    setType("");
    setTitle("");
    setTitleDebounce("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setSortOrder("desc");
    setTimeout(() => fetchSales(), 0);
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

  const formatDate = (d) => d ? new Date(d).toLocaleString() : "N/A";

  const content = (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ background: colors.bgCard, borderRadius: borderRadius['2xl'], boxShadow: shadows.lg, padding: spacing['3xl'], marginBottom: spacing.xl, border: `1px solid ${colors.gray200}` }}>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl }}>
          {!hideBackButton && (
            <button onClick={() => navigate(backPath)} style={{ ...buttonStyles.back, position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>
              ← Back
            </button>
          )}
          <h2 style={{ color: colors.primary, margin: 0, fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold }}>Sales Report</h2>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: spacing.lg, marginBottom: spacing.lg }}>
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

            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, color: colors.gray700, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                Sort Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{ ...inputStyles.base, width: "100%" }}
              >
                <option value="desc">Revenue: High → Low</option>
                <option value="asc">Revenue: Low → High</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing.md }}>
            <button type="submit" style={{ ...buttonStyles.primary, padding: `${spacing.md} ${spacing.xl}` }}>Apply Filters</button>
            <button type="button" onClick={handleReset} style={{ ...buttonStyles.secondary, padding: `${spacing.md} ${spacing.xl}` }}>Reset Filters</button>
          </div>
        </form>

        {loading ? (
          <div style={{ textAlign: 'center', padding: spacing['3xl'], color: colors.gray500 }}>Loading...</div>
        ) : error ? (
          <div style={{ background: colors.errorLight, color: colors.error, padding: spacing.md, borderRadius: borderRadius.md }}>{error}</div>
        ) : (
          <>
            {/* Summary */}
            <div style={{ background: colors.white, borderRadius: borderRadius.xl, boxShadow: shadows.md, padding: spacing['2xl'], marginBottom: spacing.xl }}>
              <h3 style={{ color: colors.primary, marginBottom: spacing.lg }}>Summary</h3>
              <p><b>Total Revenue:</b> {summary.totalRevenue ?? 0} EGP</p>
              <p><b>Trip Revenue:</b> {summary.tripRevenue ?? 0} EGP</p>
              <p><b>Vendor Revenue:</b> {summary.vendorRevenue ?? 0} EGP</p>
              <p><b>Total Trip Events:</b> {summary.totalTripEvents ?? 0}</p>
              <p><b>Total Vendor Applications:</b> {summary.totalVendorApplications ?? 0}</p>
            </div>

            {/* Revenue by Type */}
            <div style={{ background: colors.white, borderRadius: borderRadius.xl, boxShadow: shadows.md, padding: spacing['2xl'], marginBottom: spacing.xl }}>
              <h3 style={{ color: colors.primary, marginBottom: spacing.lg }}>Revenue by Type</h3>
              {sales.revenueByType.length > 0 ? sales.revenueByType.map((r, i) => (
                <div key={i} style={{ padding: spacing.lg, borderTop: i > 0 ? `1px solid ${colors.gray200}` : 'none' }}>
                  <p><b>Type:</b> {r.type}</p>
                  <p><b>Revenue:</b> {r.revenue} EGP</p>
                  <p><b>Count:</b> {r.count}</p>
                </div>
              )) : <p style={{ color: colors.gray500 }}>No revenue data available.</p>}
            </div>

            {/* Trip Events */}
            <div style={{ background: colors.white, borderRadius: borderRadius.xl, boxShadow: shadows.md, padding: spacing['2xl'], marginBottom: spacing.xl }}>
              <h3 style={{ color: colors.primary, marginBottom: spacing.lg }}>Trip Events Revenue</h3>
              {sales.tripEvents.length > 0 ? sales.tripEvents.map((ev, i) => (
                <div key={i} style={{ padding: spacing.lg, borderTop: i > 0 ? `1px solid ${colors.gray200}` : 'none' }}>
                  <p><b>Title:</b> {ev.title}</p>
                  <p><b>Status:</b> {ev.status}</p>
                  <p><b>Start:</b> {formatDate(ev.startDate)}</p>
                  <p><b>End:</b> {formatDate(ev.endDate)}</p>
                  <p><b>Location:</b> {ev.location}</p>
                  <p><b>Price:</b> {ev.price}</p>
                  <p><b>Attendees:</b> {ev.attendeeCount}</p>
                  <p><b>Revenue:</b> {ev.revenue}</p>
                </div>
              )) : <p style={{ color: colors.gray500 }}>No trip events available.</p>}
            </div>

            {/* Vendor Events */}
            <div style={{ background: colors.white, borderRadius: borderRadius.xl, boxShadow: shadows.md, padding: spacing['2xl'], marginBottom: spacing.xl }}>
              <h3 style={{ color: colors.primary, marginBottom: spacing.lg }}>Vendor Event Revenue</h3>
              {sales.vendorEvents.length > 0 ? sales.vendorEvents.map((v, i) => (
                <div key={i} style={{ padding: spacing.lg, borderTop: i > 0 ? `1px solid ${colors.gray200}` : 'none' }}>
                  <p><b>Event:</b> {v.title}</p>
                  <p><b>Revenue:</b> {v.revenue}</p>
                </div>
              )) : <p style={{ color: colors.gray500 }}>No vendor events available.</p>}
            </div>

            {/* Vendor Applications */}
            <div style={{ background: colors.white, borderRadius: borderRadius.xl, boxShadow: shadows.md, padding: spacing['2xl'], marginBottom: spacing.xl }}>
              <h3 style={{ color: colors.primary, marginBottom: spacing.lg }}>Vendor Applications</h3>
              {sales.vendorApplications.length > 0 ? sales.vendorApplications.map((a, i) => (
                <div key={i} style={{ padding: spacing.lg, borderTop: i > 0 ? `1px solid ${colors.gray200}` : 'none' }}>
                  <p><b>Vendor:</b> {a.vendorName}</p>
                  <p><b>Revenue:</b> {a.revenue}</p>
                </div>
              )) : <p style={{ color: colors.gray500 }}>No vendor applications available.</p>}
            </div>

            {/* Top Revenue Events */}
            <div style={{ background: colors.white, borderRadius: borderRadius.xl, boxShadow: shadows.md, padding: spacing['2xl'], marginBottom: spacing.xl }}>
              <h3 style={{ color: colors.primary, marginBottom: spacing.lg }}>Top Revenue Events</h3>
              {sales.topRevenueEvents.length > 0 ? sales.topRevenueEvents.map((ev, i) => (
                <div key={i} style={{ padding: spacing.lg, borderTop: i > 0 ? `1px solid ${colors.gray200}` : 'none' }}>
                  <p><b>Title:</b> {ev.title}</p>
                  <p><b>Type:</b> {ev.type}</p>
                  <p><b>Revenue:</b> {ev.revenue}</p>
                  <p><b>Source:</b> {ev.source}</p>
                </div>
              )) : <p style={{ color: colors.gray500 }}>No top revenue events available.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (hideBackButton) return content;

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, position: 'relative', zIndex: 1 }}>
        {content}
      </div>
    </div>
  );
}
