import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { colors, spacing, borderRadius, shadows, typography, transitions, inputStyles, buttonStyles } from "../../utils/designSystem"; 

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
        // backend returns either data.user (for User) or data.vendor (for Vendor)
        const userObj = data.user || data.vendor || null;
        // Store user data in localStorage
        if (userObj) localStorage.setItem("user", JSON.stringify(userObj));
        localStorage.setItem("token", data.token || "");

        // Normalize role casing to simplify routing logic
        const roleRaw = (userObj && (userObj.role || '')) || '';
        const role = roleRaw.toLowerCase();

        if (onLogin) onLogin(role);

        // Route to role-specific dashboard (use lowercase comparisons)
        if (role === "vendor") {
          navigate("/VendorDashboard");
        } else if (role === "student") {
          navigate("/student-dashboard");
        } else if (role === "ta") {
          navigate("/TaDashboard");
        } else if (role === "professor") {
          navigate("/ProfessorDashboard");
        } else if (role === "eventoffice") {
          navigate("/EventOfficeDashboard");
        } else if (role === "staff") {
          navigate("/StaffDashboard");
        }else if (role === "admin") {
          navigate("/Admin");
        } 
        else {
          // fallback
          navigate('/');
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
        background: colors.bgPrimary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
      }}
    >
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        padding: spacing['3xl'],
        background: colors.bgCard,
        borderRadius: borderRadius['2xl'],
        boxShadow: shadows.lg,
        border: `1px solid ${colors.gray200}`,
      }}>
        <div style={{ textAlign: 'center', marginBottom: spacing['3xl'] }}>
          <h2 style={{ 
            fontSize: typography.fontSize['2xl'], 
            fontWeight: typography.fontWeight.bold, 
            color: colors.primary, 
            marginBottom: spacing.md 
          }}>
            Welcome Back
          </h2>
          <p style={{ 
            fontSize: typography.fontSize.base, 
            color: colors.gray500 
          }}>
            Sign in to continue to your account
          </p>
        </div>

        {error && (
          <p style={{
            marginBottom: spacing.xl,
            color: colors.error,
            textAlign: "center",
            fontWeight: typography.fontWeight.medium,
            fontSize: typography.fontSize.sm,
            padding: spacing.md,
            background: colors.errorLight,
            borderRadius: borderRadius.md,
          }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: spacing.xl }}>
            <label style={{
              display: 'block',
              marginBottom: spacing.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.primary
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  ...inputStyles.base,
                  width: '100%',
                  boxSizing: 'border-box',
                  paddingLeft: '44px',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.accent;
                  e.target.style.boxShadow = `0 0 0 3px rgba(212, 175, 55, 0.1)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.gray200;
                  e.target.style.boxShadow = "none";
                }}
              />
              <span style={{
                position: 'absolute',
                left: spacing.lg,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: typography.fontSize.lg,
                color: colors.gray400,
              }}>📧</span>
            </div>
          </div>

          <div style={{ marginBottom: spacing.xl }}>
            <label style={{
              display: 'block',
              marginBottom: spacing.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.primary
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  ...inputStyles.base,
                  width: '100%',
                  boxSizing: 'border-box',
                  paddingLeft: '44px',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.accent;
                  e.target.style.boxShadow = `0 0 0 3px rgba(212, 175, 55, 0.1)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.gray200;
                  e.target.style.boxShadow = "none";
                }}
              />
              <span style={{
                position: 'absolute',
                left: spacing.lg,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: typography.fontSize.lg,
                color: colors.gray400,
              }}>🔒</span>
            </div>
          </div>

          <button 
            type="submit"
            style={{
              ...buttonStyles.primary,
              width: '100%',
              marginTop: spacing.md
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = shadows.accentHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = shadows.accent;
            }}
          >
            Sign In
          </button>
        </form>

        <p style={{
          marginTop: spacing.xl,
          textAlign: 'center',
          fontSize: typography.fontSize.sm,
          color: colors.gray500
        }}>
          Don't have an account?{" "}
          <button 
            onClick={() => navigate('/ChooseRole')}
            style={{
              color: colors.accent,
              fontWeight: typography.fontWeight.semibold,
              textDecoration: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
              transition: transitions.fast
            }}
            onMouseEnter={(e) => {
              e.target.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.target.style.textDecoration = 'none';
            }}
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}