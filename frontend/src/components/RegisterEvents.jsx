import React, { useState } from "react";
import Navbar from "./Navbar";

export default function RegisterEvents() {
  const [form, setForm] = useState({ type: "Trip", name: "", email: "", id: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const inputStyle = {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#fff",
    outline: "none",
    color: "#003366",
    fontSize: "1rem",
    flex: 1,
    minWidth: "220px",
  };

  function validate() {
    if (!form.name.trim() || !form.email.trim() || !form.id.trim()) {
      setError("Please fill in all fields.");
      return false;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    return true;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      // No backend endpoint provided. Simulate submission and show success.
      await new Promise((r) => setTimeout(r, 600));
      setSuccess("Registration submitted. You will be contacted soon.");
      // Optionally clear form
      setForm({ type: form.type, name: "", email: "", id: "" });
    } catch (err) {
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
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
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "35px 40px",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              marginBottom: "30px",
            }}
          >
            <h1 style={{ color: "#003366", margin: 0 }}>Register for Workshop/Trip</h1>
            <p style={{ color: "#6b7280", marginTop: "8px" }}>
              Submit your interest for upcoming Workshops or Trips.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "30px",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ color: "#003366", fontWeight: 600, alignSelf: "center" }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={inputStyle}
              >
                <option value="Trip">Trip</option>
                <option value="Workshop">Workshop</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ color: "#003366", fontWeight: 600, alignSelf: "center", minWidth: 100 }}>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ color: "#003366", fontWeight: 600, alignSelf: "center", minWidth: 100 }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ color: "#003366", fontWeight: 600, alignSelf: "center", minWidth: 100 }}>Student/Staff ID</label>
              <input
                type="text"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="e.g., 202000123 or ST12345"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</div>
            )}
            {success && (
              <div style={{ color: "#065f46", fontWeight: 600 }}>{success}</div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "14px 24px",
                  background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                  color: "#003366",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(212, 175, 55, 0.4)",
                }}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

