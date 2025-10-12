import React from "react";
import { useNavigate } from "react-router-dom";

function Navbar({ isLoggedIn, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

 return (
    <nav
      style={{
        backgroundColor: "#1e3a8a",
        color: "white",
        padding: "10px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
      }}
    >
      <h2 style={{ margin: 0 }}>University Event Management</h2>
      <div>
        {isLoggedIn ? (
          // Show Logout button when logged in
          <button
            onClick={handleLogout}
            style={{
              color: "white",
              textDecoration: "none",
              marginRight: "20px",
              fontWeight: "500",
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '5px 10px'
            }}
          >
            Logout
          </button>
        ) : (
          // Show About and Contact when logged out
          <>
            <a
              href="/about"
              style={{
                color: "white",
                textDecoration: "none",
                marginRight: "20px",
                fontWeight: "500",
              }}
            >
              About
            </a>
            <a
              href="/contact"
              style={{
                color: "white",
                textDecoration: "none",
                fontWeight: "500",
              }}
            >
              Contact Us
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
export default Navbar;