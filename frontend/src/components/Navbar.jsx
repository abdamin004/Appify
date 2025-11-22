import React from "react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { colors, spacing, borderRadius, shadows, typography, transitions } from "../utils/designSystem";

function Navbar({ onLogout }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check authentication status on every render
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      const hasValidAuth = !!(token && user && user !== 'null' && user !== 'undefined');
      setIsLoggedIn(hasValidAuth);
    };
    
    checkAuth();
    
    // Optional: Check more frequently for development
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    
    if (onLogout) {
      onLogout();
    }
    navigate("/");
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  // Get user role for dashboard routing
  const getUserRole = () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return null;
      const user = JSON.parse(userData);
      return user.role ? user.role.toLowerCase() : null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  const getDashboardPath = () => {
    const role = getUserRole();
    console.log("Current user role:", role);
    
    switch (role) {
      case "vendor": return "/VendorDashboard";
      case "student": return "/student-dashboard";
      case "ta": return "/TaDashboard";
      case "professor": return "/ProfessorDashboard";
      case "eventoffice": return "/EventOfficeDashboard";
      case "staff": return "/StaffDashboard";
      case "admin": return "/Admin";
      default: return "/";
    }
  };

  console.log("Navbar auth status:", isLoggedIn);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: colors.bgOverlay,
        backdropFilter: "blur(12px)",
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        padding: `${spacing.lg} 0`,
        borderBottom: `1px solid rgba(212, 175, 55, 0.2)`,
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: `0 ${spacing['4xl']}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div 
          style={{ display: "flex", alignItems: "center", gap: spacing.lg, cursor: "pointer" }}
          onClick={() => handleNavigation("/")}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
              borderRadius: borderRadius.xl,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: typography.fontSize['2xl'],
              boxShadow: shadows.accent,
            }}
          >
            🎓
          </div>
          <h1
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.white,
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            GUC Events
          </h1>
        </div>
        <div style={{ display: "flex", gap: spacing.lg, alignItems: "center" }}>
          {isLoggedIn ? (
            // Logged in: Show Dashboard and Logout buttons
            <>
              <button
                onClick={() => handleNavigation(getDashboardPath())}
                style={{
                  padding: `${spacing.sm} ${spacing.xl}`,
                  background: "transparent",
                  color: colors.accent,
                  border: `1.5px solid ${colors.accent}`,
                  borderRadius: borderRadius.lg,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: "pointer",
                  transition: transitions.fast,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = colors.accent;
                  e.target.style.color = colors.primary;
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.color = colors.accent;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <span>📊</span> Dashboard
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: `${spacing.sm} ${spacing.xl}`,
                  background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
                  color: colors.primary,
                  border: "none",
                  borderRadius: borderRadius.lg,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  cursor: "pointer",
                  transition: transitions.fast,
                  boxShadow: '0 2px 6px rgba(212, 175, 55, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = '0 4px 10px rgba(212, 175, 55, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = '0 2px 6px rgba(212, 175, 55, 0.3)';
                }}
              >
                <span>↪️</span> Logout
              </button>
            </>
          ) : (
            // Not logged in: Show Login and Sign Up buttons
            <>
              <button
                onClick={() => handleNavigation("/login")}
                style={{
                  padding: `${spacing.sm} ${spacing.xl}`,
                  background: "transparent",
                  color: colors.accent,
                  border: `1.5px solid ${colors.accent}`,
                  borderRadius: borderRadius.lg,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: "pointer",
                  transition: transitions.fast,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = colors.accent;
                  e.target.style.color = colors.primary;
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.color = colors.accent;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                🔑 Login
              </button>
              <button
                onClick={() => handleNavigation("/ChooseRole")}
                style={{
                  padding: `${spacing.sm} ${spacing.xl}`,
                  background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
                  color: colors.primary,
                  border: "none",
                  borderRadius: borderRadius.lg,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  cursor: "pointer",
                  transition: transitions.fast,
                  boxShadow: '0 2px 6px rgba(212, 175, 55, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = '0 4px 10px rgba(212, 175, 55, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = '0 2px 6px rgba(212, 175, 55, 0.3)';
                }}
              >
                ➕ Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;