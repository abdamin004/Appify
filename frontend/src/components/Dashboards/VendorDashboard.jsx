import React, { useState, useEffect } from "react";
import EventsList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";
import Navbar from "../Navbar";
import vendorService from "../../services/vendorService";
import LoyaltyProgramForm from "../Vendor/LoyaltyProgramForm";
import LoyaltyApplicationsList from "../Vendor/LoyaltyApplicationsList";
import { showToast, confirmDialog } from "../../utils/toast";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from "../../utils/designSystem";

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
    const confirmed = await confirmDialog('Are you sure you want to cancel this application? You will be able to apply again to this event if needed.', 'Cancel Application');
    if (!confirmed) {
      return;
    }

    try {
      await vendorService.cancelVendorApplication(applicationId);
      showToast.success('Application cancelled successfully');
      fetchApplications(activeApplicationTab);
    } catch (err) {
      showToast.error(err.message || 'Failed to cancel application. Make sure payment has not been completed.');
    }
  };

  const handleRequestBooth = () => {
    window.location.href = "/vendor/request-booth";
  };

  const handleDeleteApplication = async (applicationId) => {
    const confirmed = await confirmDialog('Delete this cancelled application permanently? This cannot be undone.', 'Delete Application');
    if (!confirmed) {
      return;
    }
    try {
      await vendorService.deleteVendorApplication(applicationId);
      showToast.success('Application deleted');
      fetchApplications(activeApplicationTab);
    } catch (err) {
      showToast.error(err.message || 'Failed to delete application');
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
      <Navbar />

      <div
        style={{
          paddingTop: "120px",
          padding: "120px 40px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header + Stats */}
          <div
            style={{
              background: colors.bgCard,
              padding: `${spacing['3xl']} ${spacing['2xl']}`,
              borderRadius: borderRadius['2xl'],
              boxShadow: shadows.lg,
              marginBottom: spacing['2xl'],
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: spacing.xl,
              border: `1px solid ${colors.gray200}`,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.primary,
                  marginBottom: spacing.sm,
                }}
              >
                Welcome back, {displayName}! 👋
              </h1>
              <p
                style={{
                  fontSize: typography.fontSize.lg,
                  color: colors.gray500,
                  margin: 0,
                }}
              >
                View and manage bazaars and booths
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: spacing.lg,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={handleRequestBooth}
                style={{
                  ...buttonStyles.primary,
                  padding: `${spacing.md} ${spacing['2xl']}`,
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = shadows.accentHover;
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = shadows.accent;
                }}
              >
                + Request Booth/Bazaar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              background: colors.bgCard,
              padding: spacing.md,
              borderRadius: borderRadius['2xl'],
              boxShadow: shadows.lg,
              marginBottom: spacing['2xl'],
              display: "flex",
              gap: spacing.md,
              border: `1px solid ${colors.gray200}`,
            }}
          >
            <button
              onClick={() => setActiveTab("browse")}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "browse"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "browse" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              🏪 Browse Bazaars & Booths
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "upcoming"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "upcoming" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              📅 Upcoming Events
            </button>
            <button
              onClick={() => setActiveTab("my-applications")}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "my-applications"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "my-applications" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              📋 My Applications
            </button>
            <button
              onClick={() => setActiveTab("loyalty")}
              style={{
                flex: 1,
                padding: `${spacing.md} ${spacing['2xl']}`,
                background:
                  activeTab === "loyalty"
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : "transparent",
                color: activeTab === "loyalty" ? colors.primary : colors.gray500,
                border: "none",
                borderRadius: borderRadius.xl,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                transition: transitions.normal,
              }}
            >
              ⭐ Loyalty Program
            </button>
          </div>

          {/* Upcoming Events Sub-Tabs */}
          {activeTab === "upcoming" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing.md,
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
                marginBottom: spacing['2xl'],
                display: "flex",
                gap: spacing.md,
                border: `1px solid ${colors.gray200}`,
              }}
            >
              <button
                onClick={() => setActiveUpcomingTab("bazaars")}
                style={{
                  flex: 1,
                  padding: `${spacing.md} ${spacing['2xl']}`,
                  background:
                    activeUpcomingTab === "bazaars"
                      ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                      : "transparent",
                  color: activeUpcomingTab === "bazaars" ? colors.primary : colors.gray500,
                  border: "none",
                  borderRadius: borderRadius.xl,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  cursor: "pointer",
                  transition: transitions.normal,
                }}
              >
                🗓️ Bazaars
              </button>
              <button
                onClick={() => setActiveUpcomingTab("booths")}
                style={{
                  flex: 1,
                  padding: `${spacing.md} ${spacing['2xl']}`,
                  background:
                    activeUpcomingTab === "booths"
                      ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                      : "transparent",
                  color: activeUpcomingTab === "booths" ? colors.primary : colors.gray500,
                  border: "none",
                  borderRadius: borderRadius.xl,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  cursor: "pointer",
                  transition: transitions.normal,
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
                background: colors.bgCard,
                padding: spacing.md,
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
                marginBottom: spacing['2xl'],
                display: "flex",
                gap: spacing.md,
                border: `1px solid ${colors.gray200}`,
              }}
            >
              <button
                onClick={() => setActiveApplicationTab("all")}
                style={{
                  flex: 1,
                  padding: `${spacing.md} ${spacing['2xl']}`,
                  background:
                    activeApplicationTab === "all"
                      ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                      : "transparent",
                  color: activeApplicationTab === "all" ? colors.primary : colors.gray500,
                  border: "none",
                  borderRadius: borderRadius.xl,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  cursor: "pointer",
                  transition: transitions.normal,
                }}
              >
                All Applications
              </button>
              <button
                onClick={() => setActiveApplicationTab("approved")}
                style={{
                  flex: 1,
                  padding: `${spacing.md} ${spacing['2xl']}`,
                  background:
                    activeApplicationTab === "approved"
                      ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                      : "transparent",
                  color: activeApplicationTab === "approved" ? colors.primary : colors.gray500,
                  border: "none",
                  borderRadius: borderRadius.xl,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  cursor: "pointer",
                  transition: transitions.normal,
                }}
              >
                Approved
              </button>
              <button
                onClick={() => setActiveApplicationTab("pending")}
                style={{
                  flex: 1,
                  padding: `${spacing.md} ${spacing['2xl']}`,
                  background:
                    activeApplicationTab === "pending"
                      ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                      : "transparent",
                  color: activeApplicationTab === "pending" ? colors.primary : colors.gray500,
                  border: "none",
                  borderRadius: borderRadius.xl,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  cursor: "pointer",
                  transition: transitions.normal,
                }}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveApplicationTab("rejected")}
                style={{
                  flex: 1,
                  padding: `${spacing.md} ${spacing['2xl']}`,
                  background:
                    activeApplicationTab === "rejected"
                      ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                      : "transparent",
                  color: activeApplicationTab === "rejected" ? colors.primary : colors.gray500,
                  border: "none",
                  borderRadius: borderRadius.xl,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  cursor: "pointer",
                  transition: transitions.normal,
                }}
              >
                Rejected
              </button>
              <button
                onClick={() => setActiveApplicationTab("cancelled")}
                style={{
                  flex: 1,
                  padding: `${spacing.md} ${spacing['2xl']}`,
                  background:
                    activeApplicationTab === "cancelled"
                      ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                      : "transparent",
                  color: activeApplicationTab === "cancelled" ? colors.primary : colors.gray500,
                  border: "none",
                  borderRadius: borderRadius.xl,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  cursor: "pointer",
                  transition: transitions.normal,
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
                  background: colors.bgCard, 
                  padding: `${spacing['6xl']} ${spacing.xl}`, 
                  borderRadius: borderRadius['2xl'], 
                  textAlign: "center", 
                  boxShadow: shadows.lg,
                  border: `1px solid ${colors.gray200}`,
                }}>
                  <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.xl }}>⏳</div>
                  <h3 style={{ 
                    fontSize: typography.fontSize['2xl'], 
                    color: colors.primary, 
                    marginBottom: spacing.sm,
                    fontWeight: typography.fontWeight.bold,
                  }}>Loading Applications...</h3>
                  <p style={{ color: colors.gray500, fontSize: typography.fontSize.base }}>Please wait while we fetch your {activeApplicationTab} applications.</p>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    background: colors.bgCard, 
                    padding: spacing['3xl'], 
                    borderRadius: borderRadius['2xl'], 
                    boxShadow: shadows.lg,
                    marginBottom: spacing['2xl'],
                    border: `1px solid ${colors.gray200}`,
                  }}>
                    {applications.length === 0 ? (
                      <div style={{ textAlign: "center", padding: `${spacing['6xl']} ${spacing.xl}` }}>
                        <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.xl }}>📭</div>
                        <h3 style={{ 
                          fontSize: typography.fontSize['2xl'], 
                          color: colors.primary, 
                          marginBottom: spacing.sm,
                          fontWeight: typography.fontWeight.bold,
                        }}>No Applications</h3>
                        <p style={{ color: colors.gray500, fontSize: typography.fontSize.base }}>You don't have any {activeApplicationTab} applications yet.</p>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: spacing['2xl'] }}>
                        {applications.map((app) => (
                          <div key={app._id} style={{ 
                            background: colors.white, 
                            borderRadius: borderRadius.xl, 
                            padding: spacing.xl,
                            border: `1px solid ${colors.gray200}`,
                            boxShadow: shadows.md,
                          }}>
                            <div style={{ marginBottom: spacing.lg }}>
                              <h4 style={{ 
                                fontSize: typography.fontSize.lg, 
                                color: colors.primary, 
                                marginBottom: spacing.md,
                                fontWeight: typography.fontWeight.bold,
                              }}>
                                {app.event?.title || "Event"}
                              </h4>
                              <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap", marginBottom: spacing.md }}>
                                <span style={{
                                  padding: `${spacing.sm} ${spacing.md}`,
                                  background: app.status === "approved" ? colors.successLight : 
                                             app.status === "pending" ? colors.warningLight :
                                             app.status === "cancelled" ? colors.gray100 :
                                             colors.errorLight,
                                  color: app.status === "approved" ? colors.success : 
                                         app.status === "pending" ? colors.warning :
                                         app.status === "cancelled" ? colors.gray600 :
                                         colors.error,
                                  borderRadius: borderRadius.md,
                                  fontSize: typography.fontSize.sm,
                                  fontWeight: typography.fontWeight.semibold,
                                  textTransform: "capitalize"
                                }}>
                                  {app.status}
                                </span>
                                {app.paid && (
                                  <span style={{
                                    padding: `${spacing.sm} ${spacing.md}`,
                                    background: colors.infoLight,
                                    color: colors.info,
                                    borderRadius: borderRadius.md,
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: typography.fontWeight.semibold
                                  }}>
                                    Paid
                                  </span>
                                )}
                              </div>
                              {app.event?.startDate && (
                                <p style={{ color: colors.gray600, fontSize: typography.fontSize.sm }}>
                                  📅 {new Date(app.event.startDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            {app.status === "pending" && !app.paid && (
                              <button
                                onClick={() => handleCancelApplication(app._id)}
                                style={{
                                  width: "100%",
                                  ...buttonStyles.outline,
                                  padding: spacing.md,
                                  fontSize: typography.fontSize.sm,
                                  color: colors.error,
                                  borderColor: colors.error,
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = colors.errorLight;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = "transparent";
                                }}
                              >
                                Cancel Application
                              </button>
                            )}
                            {app.paid && (
                              <p style={{ color: colors.gray500, fontSize: typography.fontSize.sm, fontStyle: "italic" }}>
                                Cannot cancel: Payment completed
                              </p>
                            )}
                            {app.status === "cancelled" && (
                              <button
                                onClick={() => handleDeleteApplication(app._id)}
                                style={{
                                  width: "100%",
                                  ...buttonStyles.outline,
                                  padding: spacing.md,
                                  fontSize: typography.fontSize.sm,
                                  color: colors.gray700,
                                  borderColor: colors.gray300,
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = colors.gray100;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = "transparent";
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
                    showToast.success('Loyalty program application submitted successfully!');
                  }}
                  onCancel={() => setShowLoyaltyForm(false)}
                />
              ) : (
                <div>
                  <div style={{
                    background: colors.bgCard,
                    padding: spacing['3xl'],
                    borderRadius: borderRadius['2xl'],
                    boxShadow: shadows.lg,
                    marginBottom: spacing['2xl'],
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: `1px solid ${colors.gray200}`,
                  }}>
                    <div>
                      <h3 style={{ 
                        fontSize: typography.fontSize.xl, 
                        color: colors.primary, 
                        marginBottom: spacing.sm,
                        fontWeight: typography.fontWeight.bold,
                      }}>
                        GUC Loyalty Program
                      </h3>
                      <p style={{ 
                        color: colors.gray500,
                        fontSize: typography.fontSize.base,
                      }}>
                        Apply to join the GUC loyalty program and offer discounts to students
                      </p>
                    </div>
                    <button
                      onClick={() => setShowLoyaltyForm(true)}
                      style={{
                        ...buttonStyles.primary,
                        padding: `${spacing.md} ${spacing['2xl']}`,
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
        </div>
      </div>
    </div>
  );
}

export default VendorDashboard;
