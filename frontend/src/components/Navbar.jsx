import React from "react";
import { useNavigate } from "react-router-dom";

function Navbar({ isLoggedIn, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "rgba(0, 51, 102, 0.95)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 2px 20px rgba(212, 175, 55, 0.3)",
        zIndex: 1000,
        padding: "20px 0",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div
            style={{
              width: "45px",
              height: "45px",
              background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
          >
            🎓
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "white",
              margin: 0,
            }}
          >
            GUC Events
          </h1>
        </div>
        <div style={{ display: "flex", gap: "15px" }}>
          {isLoggedIn ? (
            // Logged in: Show Dashboard and Logout buttons
            <>
              <button
                onClick={() => handleNavigation("/dashboard")} // Adjust path as needed (e.g., based on role)
                style={{
                  padding: "12px 28px",
                  background: "transparent",
                  color: "#d4af37",
                  border: "2px solid #d4af37",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#d4af37";
                  e.target.style.color = "#003366";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.color = "#d4af37";
                }}
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: "12px 28px",
                  background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                  color: "#003366",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  boxShadow: "0 4px 15px rgba(212, 175, 55, 0.4)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(212, 175, 55, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 15px rgba(212, 175, 55, 0.4)";
                }}
              >
                Logout
              </button>
            </>
          ) : (
            // Not logged in: Show Login and Sign Up buttons (styled like the second Navbar)
            // Optionally add About/Contact as links if needed, but prioritizing the styled version's content
            <>
              <button
                onClick={() => handleNavigation("/login")}
                style={{
                  padding: "12px 28px",
                  background: "transparent",
                  color: "#d4af37",
                  border: "2px solid #d4af37",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#d4af37";
                  e.target.style.color = "#003366";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.color = "#d4af37";
                }}
              >
                Login
              </button>
              <button
                onClick={() => handleNavigation("/ChooseRole")}
                style={{
                  padding: "12px 28px",
                  background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                  color: "#003366",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  boxShadow: "0 4px 15px rgba(212, 175, 55, 0.4)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(212, 175, 55, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 15px rgba(212, 175, 55, 0.4)";
                }}
              >
                Sign Up
              </button>

            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;