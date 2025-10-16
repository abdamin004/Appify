import React, { useState, useEffect } from "react";
import EventsList from "../EventList";

import MyEventsList from "../Functions/MyEventsList";

function VendorDashboard() {
  const [activeTab, setActiveTab] = useState("browse");
  const [upcomingBazaars, setUpcomingBazaars] = useState([]);
  const [user, setUser] = useState({ 
    companyName: "", 
    firstName: "Vendor",
    email: "" 
  });

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (activeTab === "upcoming-bazaars") {
      fetchUpcomingBazaars();
    }
  }, [activeTab]);

  const fetchUpcomingBazaars = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/api/vendor/bazaars/upcoming", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      console.log("Upcoming Bazaars Response:", data);
      
      if (data.success && Array.isArray(data.bazaars)) {
        setUpcomingBazaars(data.bazaars);
      } else if (Array.isArray(data)) {
        setUpcomingBazaars(data);
      } else {
        setUpcomingBazaars([]);
        console.warn("No upcoming bazaars found");
      }
    } catch (err) {
      console.error("Error fetching upcoming bazaars:", err);
      setUpcomingBazaars([]);
    }
  };

  const handleRequestBooth = () => {
    window.location.href = "/vendor/request-booth";
  };

  const displayName = user.companyName || user.firstName || "Vendor";

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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "2.2rem",
                  fontWeight: "bold",
                  color: "#003366",
                  marginBottom: "8px",
                }}
              >
                Welcome, {displayName}! 👋
              </h1>
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                View and manage bazaars and booths
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "15px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={handleRequestBooth}
                style={{
                  padding: "14px 28px",
                  background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                  color: "#003366",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                + Request Booth/Bazaar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "10px",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              marginBottom: "30px",
              display: "flex",
              gap: "10px",
            }}
          >
            <button
              onClick={() => setActiveTab("browse")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "browse"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "browse" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              🏪 Browse Bazaars & Booths
            </button>
            <button
              onClick={() => setActiveTab("upcoming-bazaars")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "upcoming-bazaars"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "upcoming-bazaars" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              🗓️ Upcoming Bazaars
            </button>
          </div>

          {/* Content */}
          {activeTab === "browse" && (
            <EventsList filterByTypes={["Bazaar", "Booth"]} />
          )}
          {activeTab === "upcoming-bazaars" && (
            <MyEventsList events={upcomingBazaars} />
          )}
        </div>
      </div>
    </div>
  );
}

export default VendorDashboard;