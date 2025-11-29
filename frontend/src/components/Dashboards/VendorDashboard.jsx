import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import EventsList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";
import VisitorQRCodeManager from "../Vendor/VisitorQRCodeManager";
import CompanyDocumentsUpload from "../Vendor/CompanyDocumentsUpload";
import AttendeeIDUpload from "../Vendor/AttendeeIDUpload";
import Navbar from "../Navbar";
import vendorService from "../../services/vendorService";
import LoyaltyProgramForm from "../Vendor/LoyaltyProgramForm";
import LoyaltyApplicationsList from "../Vendor/LoyaltyApplicationsList";
import { showToast, confirmDialog } from "../../utils/toast";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from "../../utils/designSystem";
import { headerContainerStyle, statCardBase, statValueStyle, statLabelStyle, getTabButtonStyle, tabRowStyle } from "./dashboardStyles";
import { payApplicationWithWallet, getWalletBalance, createCheckoutSession, confirmStripeReceipt } from "../../services/paymentService";
import TopUpDialog from "../Payments/TopUpDialog";
import WalletBadge from "../Wallet/WalletBadge";

function VendorDashboard() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("browse");
  const [activeApplicationTab, setActiveApplicationTab] = useState("all");
  const [activeUpcomingTab, setActiveUpcomingTab] = useState("bazaars");
  const [upcomingBazaars, setUpcomingBazaars] = useState([]);
  const [upcomingBooths, setUpcomingBooths] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [showLoyaltyForm, setShowLoyaltyForm] = useState(false);
  const [loyaltyRefreshKey, setLoyaltyRefreshKey] = useState(0);
  const [payingApplicationId, setPayingApplicationId] = useState(null);
  const [walletBalance, setWalletBalance] = useState(undefined);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [bannerMsg, setBannerMsg] = useState("");
  const paymentProcessedRef = useRef(new Set());
  const [user, setUser] = useState({ 
    companyName: "", 
    firstName: "Vendor",
    email: "" 
  });

  const totalApplications = applications.length;
  const pendingPaymentCount = applications.filter(
    (app) => (app.status || '').toLowerCase() === 'approved' && !app.paid
  ).length;
  const upcomingEventsCount = (upcomingBazaars?.length || 0) + (upcomingBooths?.length || 0);
  const vendorStatCards = [
    { label: "Total Applications", value: totalApplications },
    { label: "Pending Payments", value: pendingPaymentCount },
    { label: "Upcoming Events", value: upcomingEventsCount },
  ];

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
    
    // Load wallet balance
    const loadWalletBalance = async () => {
      try {
        const balanceData = await getWalletBalance();
        setWalletBalance(balanceData.balance || 0);
      } catch (err) {
        console.error("Error loading wallet balance:", err);
        setWalletBalance(undefined);
      }
    };
    loadWalletBalance();
    
    // Listen to wallet updates
    const handleWalletUpdate = (e) => {
      // Use balance from event detail if available (faster), otherwise fetch
      if (e?.detail?.balance !== undefined && typeof e.detail.balance === 'number') {
        setWalletBalance(e.detail.balance);
      } else {
        loadWalletBalance();
      }
    };
    window.addEventListener('wallet:updated', handleWalletUpdate);
    return () => {
      window.removeEventListener('wallet:updated', handleWalletUpdate);
    };
  }, []);

  // Handle Stripe redirect after card payment - check on mount and URL changes
  useEffect(() => {
    const processPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search || '');
        const sessionId = params.get('session_id');
        const status = params.get('status');
        const applicationId = params.get('applicationId');
        const mock = params.get('mock');
        
        console.log('Payment redirect handler - URL params:', { sessionId, status, applicationId, mock });
        
        // Only process if we have payment-related parameters
        if (!sessionId && !(status === 'success' && applicationId)) {
          console.log('No payment parameters found, skipping');
          return;
        }
        
        // Check if already processed for this specific payment
        const paymentKey = `${sessionId || 'mock'}-${applicationId}`;
        const processedKey = `payment_processed_${paymentKey}`;
        if (sessionStorage.getItem(processedKey)) {
          console.log('Payment already processed, skipping');
          return;
        }
        
        // Mark as processed
        sessionStorage.setItem(processedKey, 'true');
        
        console.log('Processing payment...');
        
        if (sessionId) {
          // Card payment via Stripe
          try {
            await confirmStripeReceipt(sessionId);
          } catch (err) {
            console.error('Error confirming receipt:', err);
          }
          // Refresh applications to show paid status
          try {
            await fetchApplications(activeApplicationTab);
          } catch (err) {
            console.error('Error refreshing applications:', err);
          }
          // Show success message
          const email = user?.email ? ` Receipt emailed to ${user.email}.` : '';
          setBannerMsg(`Payment successful.${email}`);
          setTimeout(() => setBannerMsg(''), 6000);
          // Clean URL
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          url.searchParams.delete('applicationId');
          url.searchParams.delete('mock');
          window.history.replaceState({}, document.title, url.toString());
        } else if (status === 'success' && applicationId) {
          console.log('Processing mock payment for application:', applicationId);
          // Ensure we're on the applications tab to see the update
          if (activeTab !== 'my-applications') {
            setActiveTab('my-applications');
          }
          // Mock payment or manual success - mark as paid
          if (mock === '1') {
            // Mock payment - call backend to mark as paid
            try {
              const token = localStorage.getItem("token");
              const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
              console.log('Calling manual receipt endpoint with applicationId:', applicationId);
              const response = await fetch(`${API_BASE}/payments/receipt/manual`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ applicationId }),
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Manual receipt error response:', errorData);
                throw new Error(errorData.message || `HTTP ${response.status}`);
              }
              
              const result = await response.json();
              console.log('Mock payment processed successfully:', result);
              showToast.success('Payment processed successfully!');
            } catch (err) {
              console.error('Error marking mock payment:', err);
              showToast.error(err.message || 'Failed to process mock payment');
              // Remove processed flag to allow retry
              sessionStorage.removeItem(processedKey);
              return; // Don't continue if payment failed
            }
          }
          // Show success message immediately
          const email = user?.email ? ` Receipt emailed to ${user.email}.` : '';
          setBannerMsg(mock === '1' 
            ? `Payment successful (mock mode - Stripe not configured).${email}` 
            : `Payment successful.${email}`);
          setTimeout(() => setBannerMsg(''), 6000);
          // Refresh applications to show paid status - wait a bit for backend to process
          setTimeout(async () => {
            try {
              console.log('Refreshing applications after payment, activeTab:', activeTab, 'activeApplicationTab:', activeApplicationTab);
              await fetchApplications(activeApplicationTab || 'all');
              console.log('Applications refreshed');
            } catch (err) {
              console.error('Error refreshing applications:', err);
            }
          }, 1500); // Increased delay to ensure backend has processed
          // Clean URL
          const url = new URL(window.location.href);
          url.searchParams.delete('status');
          url.searchParams.delete('applicationId');
          url.searchParams.delete('mock');
          url.searchParams.delete('eventId');
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (err) {
        console.error('Error handling payment redirect:', err);
        showToast.error('Error processing payment. Please refresh the page.');
        // Remove processed flag on error to allow retry
        const params = new URLSearchParams(location.search || '');
        const sessionId = params.get('session_id');
        const applicationId = params.get('applicationId');
        const paymentKey = `${sessionId || 'mock'}-${applicationId}`;
        sessionStorage.removeItem(`payment_processed_${paymentKey}`);
      }
    };
    
    // Process immediately when location.search changes
    processPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]); // Run when URL search params change

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

  const handlePayApplication = async (applicationId, paymentMethod = 'wallet') => {
    const app = applications.find(a => a._id === applicationId);
    if (!app) {
      showToast.error('Application not found');
      return;
    }

    const fee = app.participationFee || 0;
    
    if (paymentMethod === 'card') {
      // Card payment - direct API call (no Stripe redirect)
      try {
        setPayingApplicationId(applicationId);
        
        // Confirm payment
        const confirmed = await confirmDialog(
          `Pay $${fee.toFixed(2)} for participation fee by card?`,
          'Confirm Card Payment'
        );
        if (!confirmed) {
          setPayingApplicationId(null);
          return;
        }

        // Call backend to mark as paid
        const token = localStorage.getItem("token");
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE}/payments/receipt/manual`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ applicationId }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Card payment processed successfully:', result);
        
        // Show success messages
        showToast.success('Payment processed successfully!');
        const email = user?.email ? ` Receipt emailed to ${user.email}.` : '';
        setBannerMsg(`Payment successful.${email}`);
        setTimeout(() => setBannerMsg(''), 6000);
        
        // Refresh applications to show paid status
        await fetchApplications(activeApplicationTab);
        
      } catch (err) {
        console.error('Error processing card payment:', err);
        showToast.error(err.message || 'Payment failed. Please try again.');
      } finally {
        setPayingApplicationId(null);
      }
      return;
    }

    // Wallet payment
    try {
      // Check wallet balance first
      const balanceData = await getWalletBalance();
      const balance = balanceData.balance || 0;
      setWalletBalance(balance);
      
      if (balance < fee) {
        // Show option to use card payment instead
        const useCard = await confirmDialog(
          `Insufficient wallet balance. You need $${fee.toFixed(2)} but have $${balance.toFixed(2)}.\n\nWould you like to pay by card instead?`,
          'Insufficient Balance'
        );
        if (useCard) {
          await handlePayApplication(applicationId, 'card');
        }
        return;
      }

      const confirmed = await confirmDialog(
        `Pay $${fee.toFixed(2)} USD for participation fee?`,
        'Confirm Payment'
      );
      if (!confirmed) return;

      setPayingApplicationId(applicationId);
      await payApplicationWithWallet(applicationId);
      showToast.success('Payment completed successfully!');
      // Show success banner
      const email = user?.email ? ` Receipt emailed to ${user.email}.` : '';
      setBannerMsg(`Payment successful.${email}`);
      setTimeout(() => setBannerMsg(''), 6000);
      // Refresh applications to show paid status
      await fetchApplications(activeApplicationTab);
      // Refresh wallet balance
      const newBalance = await getWalletBalance();
      setWalletBalance(newBalance.balance || 0);
    } catch (err) {
      // If wallet payment fails, offer card payment as fallback
      if (err.message && err.message.includes('user account')) {
        const useCard = await confirmDialog(
          `Wallet payment requires a user account. Would you like to pay by card instead?`,
          'Payment Method'
        );
        if (useCard) {
          await handlePayApplication(applicationId, 'card');
        }
      } else {
        showToast.error(err.message || 'Payment failed. Please try again.');
      }
    } finally {
      setPayingApplicationId(null);
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

      {/* Success Banner */}
      {bannerMsg && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            background: colors.success,
            color: colors.white,
            padding: `${spacing.md} ${spacing.xl}`,
            borderRadius: borderRadius.xl,
            boxShadow: shadows.lg,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            maxWidth: "90%",
            textAlign: "center",
          }}
        >
          {bannerMsg}
        </div>
      )}

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
              flexDirection: "column",
              gap: spacing.lg,
              border: `1px solid ${colors.gray200}`,
            }}
          >
            <div style={headerContainerStyle}>
              <div style={{ flex: "1 1 520px", minWidth: 320 }}>
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
                <div style={{ height: spacing.md }} />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: spacing.md,
                  alignItems: "center",
                  flexShrink: 0,
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: spacing.md,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={handleRequestBooth}
                    style={{
                      ...buttonStyles.primary,
                      padding: `${spacing.md} ${spacing['2xl']}`,
                      minWidth: 220,
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
                  {vendorStatCards.map((stat) => (
                    <div
                      key={stat.label}
                      style={statCardBase}
                    >
                      <div style={statValueStyle}>
                        {stat.value}
                      </div>
                      <div style={statLabelStyle}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      transform: "translateX(60px)",
                    }}
                  >
                    <WalletBadge
                      balance={walletBalance}
                      currency="USD"
                      onTopUp={() => setTopUpOpen(true)}
                      label="Wallet Balance"
                      style={{ width: "auto" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          {(() => {
            const tabButtons = [
              { key: "browse", label: "🏪 Browse Bazaars & Booths", onClick: () => setActiveTab("browse") },
              { key: "upcoming", label: "📅 Upcoming Events", onClick: () => setActiveTab("upcoming") },
              { key: "my-applications", label: "📋 My Applications", onClick: () => setActiveTab("my-applications") },
              { key: "loyalty", label: "⭐ Loyalty Program", onClick: () => setActiveTab("loyalty") },
              { key: "visitor-qrcodes", label: "📧 Visitor QR Codes", onClick: () => setActiveTab("visitor-qrcodes"), variant: "gold" },
              { key: "company-documents", label: "📄 Company Documents", onClick: () => setActiveTab("company-documents"), variant: "gold" },
              { key: "attendee-ids", label: "🆔 Attendee IDs", onClick: () => setActiveTab("attendee-ids"), variant: "gold" },
            ];

            const firstRowCount = Math.ceil(tabButtons.length / 2);
            const tabRows = [tabButtons.slice(0, firstRowCount), tabButtons.slice(firstRowCount)];

            const renderTabButton = (tab) => {
              const isActive = activeTab === tab.key;
              const style = getTabButtonStyle(isActive, tab.variant);
              return (
                <button key={tab.key} onClick={tab.onClick} style={style}>
                  {tab.label}
                  {tab.badgeCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: spacing.sm,
                        right: spacing.sm,
                        background: colors.error,
                        color: colors.white,
                        borderRadius: borderRadius.full,
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                      }}
                    >
                      {tab.badgeCount}
                    </span>
                  )}
                </button>
              );
            };

            return (
              <div
                style={{
                  background: colors.bgCard,
                  padding: spacing.md,
                  borderRadius: borderRadius['2xl'],
                  boxShadow: shadows.lg,
                  marginBottom: spacing['2xl'],
                  border: `1px solid ${colors.gray200}`,
                }}
              >
                {tabRows.map((row, idx) => (
                  <div key={idx} style={tabRowStyle}>
                    {row.map(renderTabButton)}
                  </div>
                ))}
              </div>
            );
          })()}

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
                              {/* Payment Information for Approved Applications */}
                              {app.status === "approved" && !app.paid && (
                                <div style={{
                                  background: colors.warningLight,
                                  border: `1px solid ${colors.warning}`,
                                  borderRadius: borderRadius.md,
                                  padding: spacing.md,
                                  marginTop: spacing.md,
                                  marginBottom: spacing.md,
                                }}>
                                  <p style={{ 
                                    color: colors.warning, 
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: typography.fontWeight.bold,
                                    marginBottom: spacing.xs,
                                  }}>
                                    💳 Payment Required
                                  </p>
                                  <p style={{ color: colors.gray700, fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>
                                    Participation Fee: <strong>${(app.participationFee || 0).toFixed(2)}</strong>
                                  </p>
                                  {app.paymentDeadline && (
                                    <p style={{ color: colors.gray700, fontSize: typography.fontSize.sm, marginBottom: spacing.sm }}>
                                      Payment Deadline: <strong>{new Date(app.paymentDeadline).toLocaleDateString()}</strong>
                                      {new Date(app.paymentDeadline) < new Date() && (
                                        <span style={{ color: colors.error, marginLeft: spacing.xs }}>(Overdue)</span>
                                      )}
                                    </p>
                                  )}
                                  <div style={{ display: 'flex', gap: spacing.sm, flexDirection: 'column' }}>
                                    <button
                                      onClick={() => handlePayApplication(app._id, 'card')}
                                      disabled={payingApplicationId === app._id}
                                      style={{
                                        width: "100%",
                                        background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
                                        color: colors.primary,
                                        border: 'none',
                                        padding: spacing.sm,
                                        borderRadius: borderRadius.md,
                                        fontSize: typography.fontSize.sm,
                                        fontWeight: typography.fontWeight.bold,
                                        opacity: payingApplicationId === app._id ? 0.7 : 1,
                                        cursor: payingApplicationId === app._id ? 'not-allowed' : 'pointer',
                                        transition: transitions.fast,
                                      }}
                                      onMouseEnter={(e) => {
                                        if (payingApplicationId !== app._id) {
                                          e.target.style.transform = 'translateY(-1px)';
                                          e.target.style.boxShadow = shadows.md;
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    >
                                      💳 Pay by Card
                                    </button>
                                    <button
                                      onClick={() => handlePayApplication(app._id, 'wallet')}
                                      disabled={payingApplicationId === app._id}
                                      style={{
                                        width: "100%",
                                        ...buttonStyles.primary,
                                        padding: spacing.sm,
                                        fontSize: typography.fontSize.sm,
                                        opacity: payingApplicationId === app._id ? 0.7 : 1,
                                        cursor: payingApplicationId === app._id ? 'not-allowed' : 'pointer',
                                      }}
                                    >
                                      {payingApplicationId === app._id ? 'Processing...' : '💵 Pay from Wallet'}
                                    </button>
                                  </div>
                                </div>
                              )}
                              {app.status === "approved" && app.paid && app.paidAt && (
                                <div style={{
                                  background: colors.successLight,
                                  border: `1px solid ${colors.success}`,
                                  borderRadius: borderRadius.md,
                                  padding: spacing.md,
                                  marginTop: spacing.md,
                                  marginBottom: spacing.md,
                                }}>
                                  <p style={{ color: colors.success, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                                    ✓ Payment Completed
                                  </p>
                                  <p style={{ color: colors.gray700, fontSize: typography.fontSize.xs, marginTop: spacing.xs }}>
                                    Paid on {new Date(app.paidAt).toLocaleDateString()}
                                  </p>
                                </div>
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
          {activeTab === "visitor-qrcodes" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
                border: `1px solid ${colors.gray200}`,
              }}
            >
              <VisitorQRCodeManager />
            </div>
          )}
          {activeTab === "company-documents" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
                border: `1px solid ${colors.gray200}`,
              }}
            >
              <CompanyDocumentsUpload />
            </div>
          )}
          {activeTab === "attendee-ids" && (
            <div
              style={{
                background: colors.bgCard,
                padding: spacing['3xl'],
                borderRadius: borderRadius['2xl'],
                boxShadow: shadows.lg,
                border: `1px solid ${colors.gray200}`,
              }}
            >
              <AttendeeIDUpload />
            </div>
          )}
        </div>
      </div>
      {topUpOpen && (
        <TopUpDialog
          open={topUpOpen}
          onClose={() => setTopUpOpen(false)}
          onSuccess={(res) => {
            const next = (res && typeof res.balance === 'number') ? res.balance : undefined;
            if (typeof next === 'number') setWalletBalance(next);
          }}
        />
      )}
    </div>
  );
}

export default VendorDashboard;
