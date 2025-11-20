import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function SalesReport() {
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

      const query = new URLSearchParams();
      if (type) query.append("type", type);
      if (title) query.append("title", title);
      if (status) query.append("status", status);
      if (startDate) query.append("startDate", startDate);
      if (endDate) query.append("endDate", endDate);
      query.append("sortBy", sortBy);
      query.append("sortOrder", sortOrder);

      const res = await fetch(
        `http://localhost:5001/api/admin/reports/sales?${query.toString()}`,
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

  const cardStyle = {
    background: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
    border: "1px solid #e5e7eb",
    padding: "28px 24px",
    marginBottom: 20,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #003366 0%, #000d1a 100%)",
        padding: "40px",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "auto" }}>

        <h1 style={{ color: "#fff", marginBottom: 20 }}>Sales Report</h1>

        {/* FILTERS */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Filters</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <input
              type="text"
              placeholder="Event Type (Trip, Bazaar, Booth)"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
            <input
              type="text"
              placeholder="Event Name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {/* <input
              type="text"
              placeholder="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            /> */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            {/* Sorting */}
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="asc">Revenue (Least to greatest)</option>
              <option value="desc">Revenue (greatest to least)</option>
            </select>
          </div>

          <button
            onClick={fetchSales}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: "#d4af37",
              border: "none",
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Apply Filters
          </button>
        </div>

        {/* LOADING / ERROR */}
        {loading ? (
          <p style={{ color: "white" }}>Loading...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : (
          <>

            {/* SUMMARY */}
            {summary && (
              <div style={cardStyle}>
                <h2 style={{ margin: 0, color: "#003366" }}>Summary</h2>
                <p><b>Total Revenue:</b> {summary.totalRevenue} EGP</p>
                <p><b>Trip Revenue:</b> {summary.tripRevenue} EGP</p>
                <p><b>Vendor Revenue:</b> {summary.vendorRevenue} EGP</p>
                <p><b>Total Trip Events:</b> {summary.totalTripEvents}</p>
                <p><b>Total Vendor Applications:</b> {summary.totalVendorApplications}</p>
              </div>
            )}

            {/* REVENUE BY TYPE */}
            {sales.revenueByType.length > 0 && (
              <div style={cardStyle}>
                <h2 style={{ color: "#003366" }}>Revenue by Type</h2>

                {sales.revenueByType.map((item, idx) => (
                  <div key={idx} style={{ padding: 10, borderTop: "1px solid #ccc" }}>
                    <p><b>Type:</b> {item.type}</p>
                    <p><b>Revenue:</b> {item.revenue} EGP</p>
                    <p><b>Count:</b> {item.count}</p>
                  </div>
                ))}
              </div>
            )}

            {/* TRIP REVENUE EVENTS */}
            {sales.tripEvents.length > 0 && (
              <div style={cardStyle}>
                <h2 style={{ color: "#003366" }}>Trip Events Revenue</h2>

                {sales.tripEvents.map((event, idx) => (
                  <div key={idx} style={{ padding: 10, borderTop: "1px solid #ccc" }}>
                    <p><b>Title:</b> {event.title}</p>
                    <p><b>Status:</b> {event.status}</p>
                    <p><b>Start Date:</b> {event.startDate}</p>
                    <p><b>Price:</b> {event.price}</p>
                    <p><b>Attendees:</b> {event.attendeeCount}</p>
                    <p><b>Revenue:</b> {event.revenue}</p>
                  </div>
                ))}
              </div>
            )}

            {/* VENDOR EVENTS */}
            {sales.vendorEvents.length > 0 && (
              <div style={cardStyle}>
                <h2 style={{ color: "#003366" }}>Vendor Event Revenue</h2>

                {sales.vendorEvents.map((v, idx) => (
                  <div key={idx} style={{ padding: 10, borderTop: "1px solid #ccc" }}>
                    <p><b>Event:</b> {v.title}</p>
                    <p><b>Revenue:</b> {v.revenue}</p>
                  </div>
                ))}
              </div>
            )}

            {/* VENDOR APPLICATIONS */}
            {sales.vendorApplications.length > 0 && (
              <div style={cardStyle}>
                <h2 style={{ color: "#003366" }}>Vendor Applications</h2>

                {sales.vendorApplications.map((a, idx) => (
                  <div key={idx} style={{ padding: 10, borderTop: "1px solid #ccc" }}>
                    <p><b>Vendor:</b> {a.vendorName}</p>
                    <p><b>Revenue:</b> {a.revenue}</p>
                  </div>
                ))}
              </div>
            )}

            {/* TOP REVENUE EVENTS */}
            {sales.topRevenueEvents.length > 0 && (
              <div style={cardStyle}>
                <h2 style={{ color: "#003366" }}>Top Revenue Events</h2>

                {sales.topRevenueEvents.map((ev, idx) => (
                  <div key={idx} style={{ padding: 10, borderTop: "1px solid #ccc" }}>
                    <p><b>Title:</b> {ev.title}</p>
                    <p><b>Type:</b> {ev.type}</p>
                    <p><b>Revenue:</b> {ev.revenue}</p>
                    <p><b>Source:</b> {ev.source}</p>
                  </div>
                ))}
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
