import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // -----------------------
  // Styles - must be before return
  // -----------------------
  const labelStyle = {
    display: 'block',
    marginBottom: '20px'
  };

  const spanStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#003366'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.2s',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
    color: '#003366',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.05rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
    marginTop: '10px'
  };

  // -----------------------
  // Form submit handler
  // -----------------------
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
        if (onLogin) onLogin(data.user.role || '');
        
        if (data.user.role === "vendor") navigate("/Dashboard");
        else if (data.user.role === "student") navigate("/Dashboard");
        else if (data.user.role === "staff") navigate("/Dashboard");
        else navigate("/Dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Please try again later.");
    }
  };

  // -----------------------
  // JSX
  // -----------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #003366 0%, #000d1a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        padding: '30px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#003366', marginBottom: '10px' }}>
            Welcome Back
          </h2>
          <p style={{ fontSize: '1rem', color: '#6b7280' }}>
            Sign in to continue to your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <p style={{
            marginBottom: "20px",
            color: "#dc2626",
            textAlign: "center",
            fontWeight: '500',
            fontSize: '0.95rem'
          }}>
            {error}
          </p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={labelStyle}>
            <span style={spanStyle}>Email Address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = "#d4af37";
                e.target.style.boxShadow = "0 0 0 3px rgba(212, 175, 55, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={labelStyle}>
            <span style={spanStyle}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = "#d4af37";
                e.target.style.boxShadow = "0 0 0 3px rgba(212, 175, 55, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <button 
            type="submit"
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.3)';
            }}
          >
            Sign In
          </button>
        </form>

        {/* Footer */}
        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '0.95rem',
          color: '#6b7280'
        }}>
          Don't have an account?{" "}
          <button 
            onClick={() => navigate('/ChooseRole')}
            style={{
              color: '#d4af37',
              fontWeight: '600',
              textDecoration: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
