import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 


export default function Login({ onLogin }) {
const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) return setError("Please enter your email.");
    if (!password) return setError("Please enter your password.");

    try {
      const res = await fetch("http://localhost:5001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log("Login success:", data);
        if (onLogin) onLogin(data);
        console.log("User role:", data.user.role);
        if (data.user.role === "Vendor"||data.user.role === "Vendor") {
           navigate("/VendorDashboard");
         } 
        else if (data.user.role === "Student"||data.user.role === "student") {
             navigate("/StudentDashboard");
        }
        else{
            navigate("/StaffDashboard");
        }
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Please try again later.");
    }
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #E3F2FD 0%, #E8EAF6 50%, #E1F5FE 100%)",
        padding: "20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            padding: "48px 40px",
          }}
        >
          {/* Icon and Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #BBDEFB 0%, #C5CAE9 100%)",
                marginBottom: "24px",
              }}
            >
              <svg
                style={{ width: "50px", height: "50px", color: "#1565C0" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "700",
                color: "#1A237E",
                marginBottom: "8px",
                letterSpacing: "-0.5px",
              }}
            >
              Welcome Back
            </h1>
            <p style={{ fontSize: "15px", color: "#64748B", fontWeight: "400" }}>Sign in to continue to your account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginBottom: "24px",
                padding: "14px 16px",
                borderRadius: "8px",
                background: "#FEE2E2",
                border: "1px solid #FCA5A5",
              }}
            >
              <p style={{ fontSize: "14px", color: "#991B1B", margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#334155",
                  marginBottom: "8px",
                }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "15px",
                  color: "#1E293B",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3B82F6"
                  e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E2E8F0"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>

            <div style={{ marginBottom: "28px" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#334155",
                  marginBottom: "8px",
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "15px",
                  color: "#1E293B",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3B82F6"
                  e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E2E8F0"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "14px 24px",
                fontSize: "16px",
                fontWeight: "600",
                color: "white",
                background: "linear-gradient(135deg, #1976D2 0%, #1565C0 100%)",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(25, 118, 210, 0.4)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(25, 118, 210, 0.3)"
              }}
            >
              Sign In
            </button>
          </form>

         
        </div>
      </div>
    </div>
  )
}
