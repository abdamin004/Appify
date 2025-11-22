import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from "../../utils/designSystem";

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
  const [sortBy] = useState("revenue");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line
  }, []);

  const fetchSales = async () => {
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
      if (type) query.append("type", type);
      if (title) query.append("title", title);
      if (status) query.append("status", status);
      if (startDate) query.append("startDate", startDate);
      if (endDate) query.append("endDate", endDate);
      query.append("sortBy", sortBy);
      query.append("sortOrder", sortOrder);

      const res = await fetch(
        `${API_BASE}/admin/reports/sales?${query.toString()}`,
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
      console.log("Fetched sales report:", data);

      const report = data.report;

      setSummary(report?.summary || null);

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
              }}>Sales Report</h2>
            </div>

            {/* FILTERS */}
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
                  placeholder="Event Type (Trip, Bazaar, Booth)"
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ ...inputStyles.base }}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ ...inputStyles.base }}
                />
                <select 
                  value={sortOrder} 
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{ ...inputStyles.base }}
                >
                  <option value="asc">Revenue (Least to greatest)</option>
                  <option value="desc">Revenue (greatest to least)</option>
                </select>
              </div>
              <button
                onClick={fetchSales}
                style={{
                  ...buttonStyles.primary,
                  padding: `${spacing.md} ${spacing.xl}`
                }}
              >
                Apply Filters
              </button>
            </div>

            {/* LOADING / ERROR */}
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
                {/* SUMMARY */}
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
                  <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}><b>Total Revenue:</b> {summary.totalRevenue} EGP</p>
                  <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}><b>Trip Revenue:</b> {summary.tripRevenue} EGP</p>
                  <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}><b>Vendor Revenue:</b> {summary.vendorRevenue} EGP</p>
                  <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}><b>Total Trip Events:</b> {summary.totalTripEvents}</p>
                  <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}><b>Total Vendor Applications:</b> {summary.totalVendorApplications}</p>
                </div>
                )}

                {/* REVENUE BY TYPE */}
                {sales.revenueByType.length > 0 && (
                <div style={{ 
                  background: colors.white, 
                  borderRadius: borderRadius.xl, 
                  boxShadow: shadows.md, 
                  border: `1px solid ${colors.gray200}`, 
                  padding: spacing['2xl'], 
                  marginBottom: spacing.xl 
                }}>
                  <h2 style={{ color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>Revenue by Type</h2>
                  {sales.revenueByType.map((item, idx) => (
                    <div key={idx} style={{ padding: spacing.lg, borderTop: `1px solid ${colors.gray200}` }}>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Type:</b> {item.type}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Revenue:</b> {item.revenue} EGP</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Count:</b> {item.count}</p>
                    </div>
                  ))}
                </div>
                )}

                {/* TRIP REVENUE EVENTS */}
                {sales.tripEvents.length > 0 && (
                <div style={{ 
                  background: colors.white, 
                  borderRadius: borderRadius.xl, 
                  boxShadow: shadows.md, 
                  border: `1px solid ${colors.gray200}`, 
                  padding: spacing['2xl'], 
                  marginBottom: spacing.xl 
                }}>
                  <h2 style={{ color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>Trip Events Revenue</h2>
                  {sales.tripEvents.map((event, idx) => (
                    <div key={idx} style={{ padding: spacing.lg, borderTop: `1px solid ${colors.gray200}` }}>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Title:</b> {event.title}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Status:</b> {event.status}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Start Date:</b> {event.startDate}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Price:</b> {event.price}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Attendees:</b> {event.attendeeCount}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Revenue:</b> {event.revenue}</p>
                    </div>
                  ))}
                </div>
                )}

                {/* VENDOR EVENTS */}
                {sales.vendorEvents.length > 0 && (
                <div style={{ 
                  background: colors.white, 
                  borderRadius: borderRadius.xl, 
                  boxShadow: shadows.md, 
                  border: `1px solid ${colors.gray200}`, 
                  padding: spacing['2xl'], 
                  marginBottom: spacing.xl 
                }}>
                  <h2 style={{ color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>Vendor Event Revenue</h2>
                  {sales.vendorEvents.map((v, idx) => (
                    <div key={idx} style={{ padding: spacing.lg, borderTop: `1px solid ${colors.gray200}` }}>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Event:</b> {v.title}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Revenue:</b> {v.revenue}</p>
                    </div>
                  ))}
                </div>
                )}

                {/* VENDOR APPLICATIONS */}
                {sales.vendorApplications.length > 0 && (
                <div style={{ 
                  background: colors.white, 
                  borderRadius: borderRadius.xl, 
                  boxShadow: shadows.md, 
                  border: `1px solid ${colors.gray200}`, 
                  padding: spacing['2xl'], 
                  marginBottom: spacing.xl 
                }}>
                  <h2 style={{ color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>Vendor Applications</h2>
                  {sales.vendorApplications.map((a, idx) => (
                    <div key={idx} style={{ padding: spacing.lg, borderTop: `1px solid ${colors.gray200}` }}>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Vendor:</b> {a.vendorName}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Revenue:</b> {a.revenue}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* TOP REVENUE EVENTS */}
              {sales.topRevenueEvents.length > 0 && (
                <div style={{ 
                  background: colors.white, 
                  borderRadius: borderRadius.xl, 
                  boxShadow: shadows.md, 
                  border: `1px solid ${colors.gray200}`, 
                  padding: spacing['2xl'], 
                  marginBottom: spacing.xl 
                }}>
                  <h2 style={{ color: colors.primary, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>Top Revenue Events</h2>
                  {sales.topRevenueEvents.map((ev, idx) => (
                    <div key={idx} style={{ padding: spacing.lg, borderTop: `1px solid ${colors.gray200}` }}>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Title:</b> {ev.title}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Type:</b> {ev.type}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Revenue:</b> {ev.revenue}</p>
                      <p style={{ color: colors.gray700, marginBottom: spacing.xs, fontSize: typography.fontSize.base }}><b>Source:</b> {ev.source}</p>
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
