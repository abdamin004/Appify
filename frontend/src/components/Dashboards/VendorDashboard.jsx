import React, { useState, useEffect } from "react";
import EventsList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";
import VisitorQRCodeManager from "../Vendor/VisitorQRCodeManager";
import CompanyDocumentsUpload from "../Vendor/CompanyDocumentsUpload";
import AttendeeIDUpload from "../Vendor/AttendeeIDUpload";
import vendorService from "../../services/vendorService";
import LoyaltyProgramForm from "../Vendor/LoyaltyProgramForm";
import LoyaltyApplicationsList from "../Vendor/LoyaltyApplicationsList";

function VendorDashboard() {
  const [activeTab, setActiveTab] = useState("browse");
  const [activeApplicationTab, setActiveApplicationTab] = useState("all");
  const [activeUpcomingTab, setActiveUpcomingTab] = useState("bazaars");
  const [upcomingBazaars, setUpcomingBazaars] = useState([]);
  const [upcomingBooths, setUpcomingBooths] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [showLoyaltyForm, setShowLoyaltyForm] = useState(false);
  const [loyaltyRefreshKey, setLoyaltyRefreshKey] = useState(0);
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
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${API_BASE}/vendor/bazaars/upcoming`, {
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
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${API_BASE}/vendor/booths/upcoming`, {
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
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      let endpoint = "";

      // Endpoints + local filtering by status where needed
      switch (type) {
        case "all":
          endpoint = `${API_BASE}/vendor/applications/mine`;
          break;
        case "approved":
          endpoint = `${API_BASE}/vendor/applications/participating/upcoming`;
          break;
        case "pending":
          endpoint = `${API_BASE}/vendor/applications/requests/upcoming`;
          break;
        case "rejected":
          endpoint = `${API_BASE}/vendor/applications/requests/upcoming`;
          break;
        case "cancelled":
          // No dedicated endpoint; fetch all and filter locally
          endpoint = `${API_BASE}/vendor/applications/mine`;
          break;
        default:
          endpoint = `${API_BASE}/vendor/applications/mine`;
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

      // Local filter by status for pending/rejected/cancelled
      if (type === 'pending') {
        applicationsData = applicationsData.filter(a => (a.status || '').toLowerCase() === 'pending');
      } else if (type === 'rejected') {
        applicationsData = applicationsData.filter(a => (a.status || '').toLowerCase() === 'rejected');
      } else if (type === 'cancelled') {
        applicationsData = applicationsData.filter(a => (a.status || '').toLowerCase() === 'cancelled');
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

  const handleCancelApplication = async (applicationId) => {
    if (!window.confirm('Are you sure you want to cancel this application? You will be able to apply again to this event if needed.')) {
      return;
    }

    try {
      await vendorService.cancelVendorApplication(applicationId);
      alert('Application cancelled successfully');
      fetchApplications(activeApplicationTab);
    } catch (err) {
      alert(err.message || 'Failed to cancel application. Make sure payment has not been completed.');
    }
  };

  const handleRequestBooth = () => {
    window.location.href = "/vendor/request-booth";
  };

  const handleDeleteApplication = async (applicationId) => {
    if (!window.confirm('Delete this cancelled application permanently? This cannot be undone.')) {
      return;
    }
    try {
      await vendorService.deleteVendorApplication(applicationId);
      alert('Application deleted');
      fetchApplications(activeApplicationTab);
    } catch (err) {
      alert(err.message || 'Failed to delete application');
    }
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
            <button
              onClick={() => setActiveTab("loyalty")}
              style={{
                flex: 1,
                padding: "15px 20px",
                background:
                  activeTab === "loyalty"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "loyalty" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                minWidth: "180px",
              }}
            >
              ⭐ Loyalty Program
            </button>
            <button
              onClick={() => setActiveTab("visitor-qrcodes")}
              style={{
                flex: 1,
                padding: "15px 20px",
                background:
                  activeTab === "visitor-qrcodes"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "visitor-qrcodes" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                minWidth: "180px",
              }}
            >
              📧 Visitor QR Codes
            </button>
            <button
              onClick={() => setActiveTab("company-documents")}
              style={{
                flex: 1,
                padding: "15px 20px",
                background:
                  activeTab === "company-documents"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "company-documents" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                minWidth: "180px",
              }}
            >
              📄 Company Documents
            </button>
            <button
              onClick={() => setActiveTab("attendee-ids")}
              style={{
                flex: 1,
                padding: "15px 20px",
                background:
                  activeTab === "attendee-ids"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "attendee-ids" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                minWidth: "180px",
              }}
            >
              🆔 Attendee IDs
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
              <button
                onClick={() => setActiveApplicationTab("cancelled")}
                style={{
                  padding: "12px 16px",
                  background:
                    activeApplicationTab === "cancelled"
                      ? "linear-gradient(135deg, #6b7280 0%, #374151 100%)"
                      : "transparent",
                  color: activeApplicationTab === "cancelled" ? "white" : "#6b7280",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  minWidth: "120px",
                }}
              >
                Cancelled
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
                <div>
                  <div style={{ 
                    background: "rgba(255,255,255,0.95)", 
                    padding: "30px", 
                    borderRadius: "20px", 
                    boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
                    marginBottom: "30px"
                  }}>
                    {applications.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "20px" }}>📭</div>
                        <h3 style={{ fontSize: "1.5rem", color: "#003366", marginBottom: "10px" }}>No Applications</h3>
                        <p style={{ color: "#6b7280" }}>You don't have any {activeApplicationTab} applications yet.</p>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "30px" }}>
                        {applications.map((app) => (
                          <div key={app._id} style={{ 
                            background: "#f9fafb", 
                            borderRadius: "15px", 
                            padding: "20px",
                            border: "2px solid #e5e7eb"
                          }}>
                            <div style={{ marginBottom: "15px" }}>
                              <h4 style={{ fontSize: "1.2rem", color: "#003366", marginBottom: "10px" }}>
                                {app.event?.title || "Event"}
                              </h4>
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                                <span style={{
                                  padding: "6px 12px",
                                  background: app.status === "approved" ? "rgba(34, 197, 94, 0.15)" : 
                                             app.status === "pending" ? "rgba(251, 191, 36, 0.15)" :
                                             app.status === "cancelled" ? "rgba(107, 114, 128, 0.15)" :
                                             "rgba(239, 68, 68, 0.15)",
                                  color: app.status === "approved" ? "#22c55e" : 
                                         app.status === "pending" ? "#fbbf24" :
                                         app.status === "cancelled" ? "#6b7280" :
                                         "#ef4444",
                                  borderRadius: "6px",
                                  fontSize: "0.85rem",
                                  fontWeight: "600",
                                  textTransform: "capitalize"
                                }}>
                                  {app.status}
                                </span>
                                {app.paid && (
                                  <span style={{
                                    padding: "6px 12px",
                                    background: "rgba(59, 130, 246, 0.15)",
                                    color: "#3b82f6",
                                    borderRadius: "6px",
                                    fontSize: "0.85rem",
                                    fontWeight: "600"
                                  }}>
                                    Paid
                                  </span>
                                )}
                              </div>
                              {app.event?.startDate && (
                                <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                                  📅 {new Date(app.event.startDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            {app.status === "pending" && !app.paid && (
                              <button
                                onClick={() => handleCancelApplication(app._id)}
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  border: "1px solid #fecaca",
                                  borderRadius: "8px",
                                  fontSize: "0.9rem",
                                  fontWeight: "600",
                                  cursor: "pointer"
                                }}
                              >
                                Cancel Application
                              </button>
                            )}
                            {app.paid && (
                              <p style={{ color: "#6b7280", fontSize: "0.85rem", fontStyle: "italic" }}>
                                Cannot cancel: Payment completed
                              </p>
                            )}
                            {app.status === "cancelled" && (
                              <button
                                onClick={() => handleDeleteApplication(app._id)}
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  background: "#f3f4f6",
                                  color: "#374151",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "8px",
                                  fontSize: "0.9rem",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  marginTop: "8px"
                                }}
                              >
                                Delete Application
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === "loyalty" && (
            <div>
              {showLoyaltyForm ? (
                <LoyaltyProgramForm
                  onSuccess={() => {
                    setShowLoyaltyForm(false);
                    setLoyaltyRefreshKey(prev => prev + 1); // Trigger refresh
                    alert('Loyalty program application submitted successfully!');
                  }}
                  onCancel={() => setShowLoyaltyForm(false)}
                />
              ) : (
                <div>
                  <div style={{
                    background: "rgba(255,255,255,0.95)",
                    padding: "30px",
                    borderRadius: "20px",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
                    marginBottom: "30px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <h3 style={{ fontSize: "1.5rem", color: "#003366", marginBottom: "8px" }}>
                        GUC Loyalty Program
                      </h3>
                      <p style={{ color: "#6b7280" }}>
                        Apply to join the GUC loyalty program and offer discounts to students
                      </p>
                    </div>
                    <button
                      onClick={() => setShowLoyaltyForm(true)}
                      style={{
                        padding: "14px 28px",
                        background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                        color: "#003366",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "1rem",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      + Apply to Loyalty Program
                    </button>
                  </div>
                  <LoyaltyApplicationsList key={loyaltyRefreshKey} />
                </div>
              )}
            </div>
          )}
          {activeTab === "visitor-qrcodes" && (
            <VisitorQRCodeManager />
          )}
          {activeTab === "company-documents" && (
            <CompanyDocumentsUpload />
          )}
          {activeTab === "attendee-ids" && (
            <AttendeeIDUpload />
          )}
        </div>
      </div>
    </div>
  );
}

export default VendorDashboard;
