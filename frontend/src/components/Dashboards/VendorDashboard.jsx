import React, { useState, useEffect } from "react";
import EventsList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";

function VendorDashboard() {
  const [activeTab, setActiveTab] = useState("browse");
  const [activeApplicationTab, setActiveApplicationTab] = useState("all");
  const [activeUpcomingTab, setActiveUpcomingTab] = useState("bazaars");
  const [upcomingBazaars, setUpcomingBazaars] = useState([]);
  const [upcomingBooths, setUpcomingBooths] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
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
    if (activeTab === "upcoming") {
      if (activeUpcomingTab === "bazaars") {
        fetchUpcomingBazaars();
      } else if (activeUpcomingTab === "booths") {
        fetchUpcomingBooths();
      }
    } else if (activeTab === "my-applications") {
      fetchApplications(activeApplicationTab);
    }
  }, [activeTab, activeUpcomingTab, activeApplicationTab]);

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

  const fetchUpcomingBooths = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/api/vendor/booths/upcoming", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      console.log("Upcoming Booths Response:", data);
      
      if (data.success && Array.isArray(data.booths)) {
        setUpcomingBooths(data.booths);
      } else if (Array.isArray(data)) {
        setUpcomingBooths(data);
      } else {
        setUpcomingBooths([]);
        console.warn("No upcoming booths found");
      }
    } catch (err) {
      console.error("Error fetching upcoming booths:", err);
      setUpcomingBooths([]);
    }
  };

  const fetchApplications = async (type) => {
    setLoadingApplications(true);
    try {
      const token = localStorage.getItem("token");
      let endpoint = "";

      // Endpoints + local filtering by status where needed
      switch (type) {
        case "all":
          endpoint = "http://localhost:5001/api/vendor/applications/mine";
          break;
        case "approved":
          endpoint = "http://localhost:5001/api/vendor/applications/participating/upcoming";
          break;
        case "pending":
          endpoint = "http://localhost:5001/api/vendor/applications/requests/upcoming";
          break;
        case "rejected":
          endpoint = "http://localhost:5001/api/vendor/applications/requests/upcoming";
          break;
        default:
          endpoint = "http://localhost:5001/api/vendor/applications/mine";
      }

      console.log(`Fetching ${type} applications from:`, endpoint);
      
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log(`Applications (${type}) Response:`, data);
      
      // Normalize array from various shapes
      let applicationsData = [];
      if (data && data.success) {
        applicationsData = data.applications || data.requests || data.data || [];
      } else if (Array.isArray(data)) {
        applicationsData = data;
      } else if (data && Array.isArray(data.applications)) {
        applicationsData = data.applications;
      } else if (data && Array.isArray(data.requests)) {
        applicationsData = data.requests;
      }

      // Local filter by status for pending/rejected
      if (type === 'pending') {
        applicationsData = applicationsData.filter(a => (a.status || '').toLowerCase() === 'pending');
      } else if (type === 'rejected') {
        applicationsData = applicationsData.filter(a => (a.status || '').toLowerCase() === 'rejected');
      }

      setApplications(applicationsData);
      
      if (applicationsData.length === 0) {
        console.warn(`No ${type} applications found in response`);
      }
    } catch (err) {
      console.error(`Error fetching ${type} applications:`, err);
      setApplications([]);
    } finally {
      setLoadingApplications(false);
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
              flexWrap: "wrap",
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
                minWidth: "180px",
              }}
            >
              🏪 Browse Bazaars & Booths
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              style={{
                flex: 1,
                padding: "15px 20px",
                background:
                  activeTab === "upcoming"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "upcoming" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                minWidth: "180px",
              }}
            >
              📅 Upcoming Events
            </button>
            <button
              onClick={() => setActiveTab("my-applications")}
              style={{
                flex: 1,
                padding: "15px 20px",
                background:
                  activeTab === "my-applications"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "my-applications" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                minWidth: "180px",
              }}
            >
              📋 My Applications
            </button>
          </div>

          {/* Upcoming Events Sub-Tabs */}
          {activeTab === "upcoming" && (
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                padding: "8px",
                borderRadius: "15px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                marginBottom: "30px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setActiveUpcomingTab("bazaars")}
                style={{
                  padding: "12px 16px",
                  background:
                    activeUpcomingTab === "bazaars"
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "transparent",
                  color: activeUpcomingTab === "bazaars" ? "white" : "#6b7280",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  minWidth: "120px",
                }}
              >
                🗓️ Bazaars
              </button>
              <button
                onClick={() => setActiveUpcomingTab("booths")}
                style={{
                  padding: "12px 16px",
                  background:
                    activeUpcomingTab === "booths"
                      ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
                      : "transparent",
                  color: activeUpcomingTab === "booths" ? "white" : "#6b7280",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  minWidth: "120px",
                }}
              >
                🛒 Booths
              </button>
            </div>
          )}

          {/* Application Sub-Tabs */}
          {activeTab === "my-applications" && (
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                padding: "8px",
                borderRadius: "15px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                marginBottom: "30px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setActiveApplicationTab("all")}
                style={{
                  padding: "12px 16px",
                  background:
                    activeApplicationTab === "all"
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "transparent",
                  color: activeApplicationTab === "all" ? "white" : "#6b7280",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  minWidth: "120px",
                }}
              >
                All Applications
              </button>
              <button
                onClick={() => setActiveApplicationTab("approved")}
                style={{
                  padding: "12px 16px",
                  background:
                    activeApplicationTab === "approved"
                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                      : "transparent",
                  color: activeApplicationTab === "approved" ? "white" : "#6b7280",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  minWidth: "120px",
                }}
              >
                Approved
              </button>
              <button
                onClick={() => setActiveApplicationTab("pending")}
                style={{
                  padding: "12px 16px",
                  background:
                    activeApplicationTab === "pending"
                      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                      : "transparent",
                  color: activeApplicationTab === "pending" ? "white" : "#6b7280",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  minWidth: "120px",
                }}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveApplicationTab("rejected")}
                style={{
                  padding: "12px 16px",
                  background:
                    activeApplicationTab === "rejected"
                      ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                      : "transparent",
                  color: activeApplicationTab === "rejected" ? "white" : "#6b7280",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  minWidth: "120px",
                }}
              >
                Rejected
              </button>
            </div>
          )}

          {/* Content */}
          {activeTab === "browse" && (
            <EventsList filterByTypes={["Bazaar", "Booth"]}/>
          )}
          {activeTab === "upcoming" && activeUpcomingTab === "bazaars" && (
            <MyEventsList
              events={(upcomingBazaars || []).map(e => ({ ...e, date: e.startDate }))}
              title="Upcoming Bazaars"
            />
          )}
          {activeTab === "upcoming" && activeUpcomingTab === "booths" && (
            <MyEventsList
              events={(upcomingBooths || []).map(e => ({ ...e, date: e.startDate }))}
              title="Upcoming Booths"
            />
          )}
          {activeTab === "my-applications" && (
            <div>
              {loadingApplications ? (
                <div style={{ 
                  background: "rgba(255,255,255,0.95)", 
                  padding: "60px 40px", 
                  borderRadius: "20px", 
                  textAlign: "center", 
                  boxShadow: "0 8px 25px rgba(0,0,0,0.3)" 
                }}>
                  <div style={{ fontSize: "3rem", marginBottom: "20px" }}>⏳</div>
                  <h3 style={{ fontSize: "1.5rem", color: "#003366", marginBottom: "10px" }}>Loading Applications...</h3>
                  <p style={{ color: "#6b7280" }}>Please wait while we fetch your {activeApplicationTab} applications.</p>
                </div>
              ) : (
                <MyEventsList 
                  events={(applications || []).map(a => ({ ...(a?.event || {}), date: a?.event?.startDate, status: a?.status }))} 
                  title={`${activeApplicationTab.charAt(0).toUpperCase() + activeApplicationTab.slice(1)} Applications`}
                  emptyMessage={`No ${activeApplicationTab} applications found.`}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VendorDashboard;
