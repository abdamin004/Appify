import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function VendorDocumentsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [eventId, setEventId] = useState("");
  const [organization, setOrganization] = useState("");
  const [vendorId, setVendorId] = useState("");

  useEffect(() => {
    fetchVendorDocuments();
    // eslint-disable-next-line
  }, []);

  const fetchVendorDocuments = async () => {
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
      if (eventId) query.append("eventId", eventId);
      if (organization) query.append("organization", organization);
      if (vendorId) query.append("vendorId", vendorId);

      const res = await fetch(`http://localhost:5001/api/admin/vendor-documents?${query.toString()}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text}`);
      }

      const data = await res.json();
      console.log("Fetched data:", data); // debug

      // Extract the array correctly
      setVendors(data.vendorDocuments || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch vendor documents");
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
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #003366 0%, #000d1a 100%)", padding: "40px" }}>
      <div style={{ maxWidth: 1000, margin: "auto" }}>

        <h1 style={{ color: "#fff", marginBottom: 20 }}>Vendor Documents</h1>

        {/* Filters */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Filters</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <input type="text" placeholder="Organization name" value={organization} onChange={(e) => setOrganization(e.target.value)} />
          </div>

          <button
            onClick={fetchVendorDocuments}
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

        {/* Vendor List */}
        {loading ? (
          <p style={{ color: "white" }}>Loading...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : vendors.length === 0 ? (
          <p style={{ color: "white" }}>No vendor documents found.</p>
        ) : (
          vendors.map((v, i) => (
            <div key={i} style={cardStyle}>
              <h2 style={{ margin: 0, color: "#003366" }}>
                {v.vendor?.companyName || "Unnamed Vendor"}
              </h2>
              <p><b>Organization:</b> {v.organization || "N/A"}</p>
              <p><b>Event:</b> {v.event?.title || "N/A"}</p>

              <p>
                <b>Tax Card:</b>{" "}
                {v.vendor?.taxCardUrl ? (
                  <a href={v.vendor.taxCardUrl} target="_blank" rel="noreferrer">View</a>
                ) : (
                  "Not uploaded"
                )}
              </p>

              <p>
                <b>Logo:</b>{" "}
                {v.vendor?.logoUrl ? (
                  <a href={v.vendor.logoUrl} target="_blank" rel="noreferrer">View</a>
                ) : (
                  "Not uploaded"
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
