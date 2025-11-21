import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function AttendeesReport() {
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

      const query = new URLSearchParams();
      if (status) query.append("status", status);
      if (type) query.append("type", type);
      if (title) query.append("eventName", title); // backend expects eventName
      if (startDate) query.append("startDate", startDate);
      if (endDate) query.append("endDate", endDate);

      const res = await fetch(
        `http://localhost:5001/api/admin/reports/attendees?${query.toString()}`,
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
        <h1 style={{ color: "#fff", marginBottom: 20 }}>Attendees Report</h1>

        {/* Filters */}
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
              placeholder="Event Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
            <input
              type="text"
              placeholder="Event Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
            <input
              type="text"
              placeholder="Event Name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button
            onClick={fetchReports}
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

        {/* Loading/Error */}
        {loading ? (
          <p style={{ color: "white" }}>Loading...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : (
          <>
            {/* Summary */}
            {summary && (
              <div style={cardStyle}>
                <h2 style={{ margin: 0, color: "#003366" }}>Summary</h2>
                <p><b>Total Events:</b> {summary.totalEvents}</p>
                <p><b>Total Attendees:</b> {summary.totalAttendees}</p>
                <p><b>Average Attendees per Event:</b> {summary.averageAttendeesPerEvent}</p>
              </div>
            )}

            {/* Breakdown by Type */}
            {breakdownByType.length > 0 && breakdownByType.map((typeGroup, i) => (
              <div key={i} style={cardStyle}>
                <h2 style={{ margin: 0, color: "#003366" }}>{typeGroup.type}</h2>
                <p><b>Total Events:</b> {typeGroup.totalEvents}</p>
                <p><b>Total Attendees:</b> {typeGroup.totalAttendees}</p>

                {typeGroup.events.map((event, j) => (
                  <div key={j} style={{ marginTop: 10, padding: 10, borderTop: "1px solid #ccc" }}>
                    <p><b>Title:</b> {event.title}</p>
                    <p><b>Status:</b> {event.status}</p>
                    <p><b>Attendees:</b> {event.attendeeCount}</p>
                    <p><b>Capacity:</b> {event.capacity}</p>
                    <p><b>Utilization Rate:</b> {event.utilizationRate}</p>
                  </div>
                ))}
              </div>
            ))}

            {/* All Events */}
            {allEvents.length > 0 && (
              <div style={cardStyle}>
                <h2 style={{ margin: 0, color: "#003366" }}>All Events</h2>
                {allEvents.map((event, i) => (
                  <div key={i} style={{ marginTop: 10, padding: 10, borderTop: "1px solid #ccc" }}>
                    <p><b>Title:</b> {event.title}</p>
                    <p><b>Type:</b> {event.type}</p>
                    <p><b>Status:</b> {event.status}</p>
                    <p><b>Attendees:</b> {event.attendeeCount}</p>
                    <p><b>Capacity:</b> {event.capacity}</p>
                    <p><b>Utilization Rate:</b> {event.utilizationRate}</p>
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
