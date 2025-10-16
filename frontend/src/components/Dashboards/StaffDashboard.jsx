import React, { useState } from "react";
import EventList from "../EventList";





function StaffDashboard() {
  const storedUser = localStorage.getItem("user");
  const user = storedUser
    ? JSON.parse(storedUser)
    : { firstName: "Guest", role: "staff" };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #003366 0%, #000d1a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      

      <div
        style={{
          paddingTop: "120px",
          padding: "120px 40px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "35px 40px",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              marginBottom: "40px",
            }}
          >
            <h1
              style={{
                fontSize: "2.2rem",
                fontWeight: "bold",
                color: "#003366",
                marginBottom: "8px",
              }}
            >
              Welcome, {user.firstName}! 👋
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#6b7280",
                margin: 0,
              }}
            >
              Browse all university events
            </p>
          </div>

          {/* Content */}
          <EventList />
        </div>
      </div>
    </div>
  );
}

export default StaffDashboard;