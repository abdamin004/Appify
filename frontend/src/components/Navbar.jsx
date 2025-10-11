import React from "react";

function Navbar() {
  return (
    <nav
      style={{
        backgroundColor: "#1e3a8a",     // nice dark blue
        color: "white",
        padding: "10px 30px",           // slightly smaller padding
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "fixed",              // keep it at the top
        top: 0,                         // stick to the top edge
        left: 0,
        right: 0,
        zIndex: 1000,                   // make sure it’s above everything
        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)", // subtle shadow
      }}
    >
      <h2 style={{ margin: 0 }}>University Event Management</h2>
      <div>
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
      </div>
    </nav>
  );
}

export default Navbar;