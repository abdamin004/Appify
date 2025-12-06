import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import EventsList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";
import VisitorQRCodeManager from "../Vendor/VisitorQRCodeManager";
import CompanyDocumentsUpload from "../Vendor/CompanyDocumentsUpload";
import AttendeeIDUpload from "../Vendor/AttendeeIDUpload";
import DashboardLayout from "../Layout/DashboardLayout";
import vendorService from "../../services/vendorService";
import LoyaltyProgramForm from "../Vendor/LoyaltyProgramForm";
import LoyaltyApplicationsList from "../Vendor/LoyaltyApplicationsList";
import { showToast, confirmDialog } from "../../utils/toast";
import { payApplicationWithWallet, getWalletBalance, confirmStripeReceipt } from "../../services/paymentService";
import TopUpDialog from "../Payments/TopUpDialog";
import WalletBadge from "../Wallet/WalletBadge";

function VendorDashboard() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("home");
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

  const menuItems = [
    { label: "Home", icon: "🏠", onClick: () => setActiveTab("home") },
    { label: "Browse Bazaars", icon: "🏪", onClick: () => setActiveTab("browse") },
    { label: "Upcoming Events", icon: "📅", onClick: () => setActiveTab("upcoming") },
    { label: "My Applications", icon: "📋", onClick: () => setActiveTab("my-applications"), badge: pendingPaymentCount > 0 ? pendingPaymentCount : undefined },
    { label: "Loyalty Program", icon: "⭐", onClick: () => setActiveTab("loyalty") },
    { label: "Visitor QR Codes", icon: "📧", onClick: () => setActiveTab("visitor-qrcodes") },
    { label: "Company Docs", icon: "📄", onClick: () => setActiveTab("company-documents") },
    { label: "Attendee IDs", icon: "🆔", onClick: () => setActiveTab("attendee-ids") },
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

    const handleWalletUpdate = (e) => {
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

  useEffect(() => {
    const processPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search || '');
        const sessionId = params.get('session_id');
        const status = params.get('status');
        const applicationId = params.get('applicationId');
        const mock = params.get('mock');

        if (!sessionId && !(status === 'success' && applicationId)) {
          return;
        }

        const paymentKey = `${sessionId || 'mock'}-${applicationId}`;
        const processedKey = `payment_processed_${paymentKey}`;
        if (sessionStorage.getItem(processedKey)) {
          return;
        }

        sessionStorage.setItem(processedKey, 'true');

        if (sessionId) {
          try {
            await confirmStripeReceipt(sessionId);
          } catch (err) {
            console.error('Error confirming receipt:', err);
          }
          try {
            await fetchApplications(activeApplicationTab);
          } catch (err) {
            console.error('Error refreshing applications:', err);
          }
          const email = user?.email ? ` Receipt emailed to ${user.email}.` : '';
          setBannerMsg(`Payment successful.${email}`);
          setTimeout(() => setBannerMsg(''), 6000);
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          url.searchParams.delete('applicationId');
          url.searchParams.delete('mock');
          window.history.replaceState({}, document.title, url.toString());
        } else if (status === 'success' && applicationId) {
          if (activeTab !== 'my-applications') {
            setActiveTab('my-applications');
          }
          if (mock === '1') {
            try {
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

              showToast.success('Payment processed successfully!');
            } catch (err) {
              console.error('Error marking mock payment:', err);
              showToast.error(err.message || 'Failed to process mock payment');
              sessionStorage.removeItem(processedKey);
              return;
            }
          }
          const email = user?.email ? ` Receipt emailed to ${user.email}.` : '';
          setBannerMsg(mock === '1'
            ? `Payment successful (mock mode - Stripe not configured).${email}`
            : `Payment successful.${email}`);
          setTimeout(() => setBannerMsg(''), 6000);
          setTimeout(async () => {
            try {
              await fetchApplications(activeApplicationTab || 'all');
            } catch (err) {
              console.error('Error refreshing applications:', err);
            }
          }, 1500);
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
        const params = new URLSearchParams(location.search || '');
        const sessionId = params.get('session_id');
        const applicationId = params.get('applicationId');
        const paymentKey = `${sessionId || 'mock'}-${applicationId}`;
        sessionStorage.removeItem(`payment_processed_${paymentKey}`);
      }
    };

    processPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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

      if (data.success && Array.isArray(data.bazaars)) {
        setUpcomingBazaars(data.bazaars);
      } else if (Array.isArray(data)) {
        setUpcomingBazaars(data);
      } else {
        setUpcomingBazaars([]);
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

      if (data.success && Array.isArray(data.booths)) {
        setUpcomingBooths(data.booths);
      } else if (Array.isArray(data)) {
        setUpcomingBooths(data);
      } else {
        setUpcomingBooths([]);
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
          endpoint = `${API_BASE}/vendor/applications/mine`;
          break;
        default:
          endpoint = `${API_BASE}/vendor/applications/mine`;
      }

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

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

      if (type === 'pending') {
        applicationsData = applicationsData.filter(a => (a.status || '').toLowerCase() === 'pending');
      } else if (type === 'rejected') {
        applicationsData = applicationsData.filter(a => (a.status || '').toLowerCase() === 'rejected');
      } else if (type === 'cancelled') {
        applicationsData = applicationsData.filter(a => (a.status || '').toLowerCase() === 'cancelled');
      }

      setApplications(applicationsData);
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
      try {
        setPayingApplicationId(applicationId);

        const confirmed = await confirmDialog(
          `Pay $${fee.toFixed(2)} for participation fee by card?`,
          'Confirm Card Payment'
        );
        if (!confirmed) {
          setPayingApplicationId(null);
          return;
        }

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

        showToast.success('Payment processed successfully!');
        const email = user?.email ? ` Receipt emailed to ${user.email}.` : '';
        setBannerMsg(`Payment successful.${email}`);
        setTimeout(() => setBannerMsg(''), 6000);

        await fetchApplications(activeApplicationTab);

      } catch (err) {
        console.error('Error processing card payment:', err);
        showToast.error(err.message || 'Payment failed. Please try again.');
      } finally {
        setPayingApplicationId(null);
      }
      return;
    }

    try {
      const balanceData = await getWalletBalance();
      const balance = balanceData.balance || 0;
      setWalletBalance(balance);

      if (balance < fee) {
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
        `Pay $${fee.toFixed(2)} EGP for participation fee?`,
        'Confirm Payment'
      );
      if (!confirmed) return;

      setPayingApplicationId(applicationId);
      await payApplicationWithWallet(applicationId);
      showToast.success('Payment completed successfully!');
      const email = user?.email ? ` Receipt emailed to ${user.email}.` : '';
      setBannerMsg(`Payment successful.${email}`);
      setTimeout(() => setBannerMsg(''), 6000);
      await fetchApplications(activeApplicationTab);
      const newBalance = await getWalletBalance();
      setWalletBalance(newBalance.balance || 0);
    } catch (err) {
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
    <DashboardLayout menuItems={menuItems}>
      {Boolean(bannerMsg) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-white rounded-lg px-6 py-3 shadow-xl z-[9999] font-bold text-sm tracking-wide">
          {bannerMsg}
        </div>
      )}

      {topUpOpen && (
        <TopUpDialog
          open={topUpOpen}
          onClose={() => setTopUpOpen(false)}
          onSuccess={(amount) => {
            setTopUpOpen(false);
            showToast.success(`Successfully topped up $${amount}!`);
            getWalletBalance().then(res => setWalletBalance(res.balance));
          }}
        />
      )}

      {activeTab === "home" && (
        <div className="space-y-8">
          <div className="bg-slate-100 p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              {/* Left Side: Welcome Text */}
              <div className="flex-1 min-w-[300px]">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2 leading-tight">
                  Welcome, {displayName}! 👋
                </h1>
                <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">
                  View and manage your bazaars and booths.
                </p>
              </div>

              {/* Right Side: Stats & Wallet */}
              <div className="flex flex-col gap-4 items-end flex-shrink-0 w-full md:w-auto">
                {/* Wallet Badge - Top Right */}
                <div className="w-full md:w-auto flex justify-end gap-3">
                  <button
                    onClick={handleRequestBooth}
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                  >
                    <span>➕</span> Request Booth
                  </button>
                  <WalletBadge
                    balance={walletBalance}
                    currency="EGP"
                    onTopUp={() => setTopUpOpen(true)}
                    className="w-full md:w-auto justify-between md:justify-start"
                  />
                </div>

                {/* Stats Cards */}
                <div className="flex gap-3 flex-wrap justify-end w-full md:w-auto">
                  {vendorStatCards.map((card) => (
                    <div
                      key={card.label}
                      className="bg-white border border-slate-200 rounded-xl p-4 min-w-[140px] flex-1 md:flex-none text-center hover:shadow-md transition-shadow duration-300"
                    >
                      <div className="text-2xl font-bold text-slate-900 mb-1">{card.value}</div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Quick Access & Chatbot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Access */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span>⚡</span> Quick Access
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleRequestBooth}
                  className="p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">➕</div>
                  <div className="font-bold text-slate-700 group-hover:text-emerald-700">Request Booth</div>
                  <div className="text-xs text-slate-500">Apply for events</div>
                </button>
                <button
                  onClick={() => setActiveTab('my-applications')}
                  className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📋</div>
                  <div className="font-bold text-slate-700 group-hover:text-blue-700">My Applications</div>
                  <div className="text-xs text-slate-500">Check status</div>
                </button>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className="p-4 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📅</div>
                  <div className="font-bold text-slate-700 group-hover:text-amber-700">Upcoming Events</div>
                  <div className="text-xs text-slate-500">View schedule</div>
                </button>
                <button
                  onClick={() => setTopUpOpen(true)}
                  className="p-4 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl transition-all text-left group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">💳</div>
                  <div className="font-bold text-slate-700 group-hover:text-purple-700">Top Up Wallet</div>
                  <div className="text-xs text-slate-500">Add funds</div>
                </button>
              </div>
            </div>

            {/* Chatbot Placeholder */}
            <div className="bg-slate-50 p-8 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center min-h-[200px] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-3xl mb-4 mx-auto">
                  🤖
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">AI Assistant</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  Coming soon! A smart chatbot to help you navigate events and answer your questions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        {activeTab === "upcoming" && (
          <div className="space-y-6">
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-center mb-8 relative">
                <h2 className="text-2xl font-bold text-slate-900">Upcoming Events</h2>
                <p className="text-slate-500 mt-1">View upcoming bazaars and booths</p>
              </div>
              <div className="flex gap-4 justify-center mb-8 border-b border-slate-200 pb-1">
                <button
                  onClick={() => setActiveUpcomingTab("bazaars")}
                  className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 ${activeUpcomingTab === "bazaars"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                >
                  🗓️ Bazaars
                </button>
                <button
                  onClick={() => setActiveUpcomingTab("booths")}
                  className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 ${activeUpcomingTab === "booths"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                >
                  🛒 Booths
                </button>
              </div>
              {/* Content will follow below outside this div or needs to be inside? The original code closed the div and then rendered list below. 
                  MyEventsList normally has its own styling. 
                  Wait, the original code had the tabs inside the "mb-2" div? No. 
                  Original lines 597-601 was header. 602-621 was tabs. 622 closed space-y-6.
                  Then lines 659+ rendered the list.
                  If I wrap the header and tabs in a card, the list (MyEventsList) separates from it.
                  MyEventsList usually has its own card? 
                  Checking MyEventsList usage: it renders a list. 
                  If I want the list INSIDE the card, I need to move the MyEventsList call inside.
                  But activeTab === "upcoming" renders header (lines 596-623) AND list (lines 659-670).
                  The list is rendered conditionally OUTSIDE the initial div block in original code.
                  To wrap EVERYTHING in a card, I need to restructuring.
                  However, MyEventsList might expect to be standalone.
                  Let's just wrap the Header + Tabs in a card for now to act as a "Controller" card. 
                  Actually, centering the header and tabs is good polish.
              */}
            </div>
          </div>
        )}

        {activeTab === "my-applications" && (
          <div className="space-y-6">
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-center mb-8 relative">
                <h2 className="text-2xl font-bold text-slate-900">My Applications</h2>
                <p className="text-slate-500 mt-1">Track the status of your applications</p>
              </div>
              <div className="flex gap-2 mb-2 overflow-x-auto pb-2 justify-center">
                {[
                  { id: "all", label: "All Applications" },
                  { id: "approved", label: "Approved" },
                  { id: "pending", label: "Pending" },
                  { id: "rejected", label: "Rejected" },
                  { id: "cancelled", label: "Cancelled" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveApplicationTab(tab.id)}
                    className={`py-2 px-4 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeApplicationTab === tab.id
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:bg-slate-100"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "browse" && (
          <div className="space-y-6">
            <EventsList filterByTypes={["Bazaar", "Booth"]} />
          </div>
        )}
        {activeTab === "upcoming" && activeUpcomingTab === "bazaars" && (
          <MyEventsList
            events={(upcomingBazaars || []).map(e => ({ ...e, date: e.startDate }))}
          />
        )}
        {activeTab === "upcoming" && activeUpcomingTab === "booths" && (
          <MyEventsList
            events={(upcomingBooths || []).map(e => ({ ...e, date: e.startDate }))}
          />
        )}
        {activeTab === "my-applications" && (
          <div>
            {loadingApplications ? (
              <div className="bg-white p-20 rounded-2xl text-center shadow-sm border border-slate-100">
                <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Loading Applications...</h3>
                <p className="text-slate-500">Please wait while we fetch your {activeApplicationTab} applications.</p>
              </div>
            ) : (
              <div>
                {applications.length === 0 ? (
                  <div className="bg-white p-20 rounded-2xl text-center shadow-sm border border-slate-100">
                    <div className="text-6xl mb-6 opacity-50">📭</div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Applications</h3>
                    <p className="text-slate-500">You don't have any {activeApplicationTab} applications yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {applications.map((app) => (
                      <div key={app._id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="mb-6">
                          <h4 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors">
                            {app.event?.title || "Event"}
                          </h4>
                          <div className="flex gap-2 flex-wrap mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize tracking-wide ${app.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                              app.status === "pending" ? "bg-amber-100 text-amber-700" :
                                app.status === "cancelled" ? "bg-slate-100 text-slate-500" :
                                  "bg-red-100 text-red-700"
                              }`}>
                              {app.status}
                            </span>
                            {app.paid && (
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold tracking-wide">
                                Paid
                              </span>
                            )}
                          </div>
                          {app.event?.startDate && (
                            <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                              📅 {new Date(app.event.startDate).toLocaleDateString()}
                            </p>
                          )}

                          {app.status === "approved" && !app.paid && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mt-5 mb-2">
                              <p className="text-amber-800 text-sm font-bold mb-2 flex items-center gap-2">
                                💳 Payment Required
                              </p>
                              <p className="text-slate-700 text-sm mb-1">
                                Fee: <strong className="text-slate-900">${(app.participationFee || 0).toFixed(2)}</strong>
                              </p>
                              {app.paymentDeadline && (
                                <p className="text-slate-600 text-sm mb-4">
                                  Deadline: <strong>{new Date(app.paymentDeadline).toLocaleDateString()}</strong>
                                  {new Date(app.paymentDeadline) < new Date() && (
                                    <span className="text-red-500 ml-1 font-bold">(Overdue)</span>
                                  )}
                                </p>
                              )}
                              <div className="flex flex-col gap-3">
                                <button
                                  onClick={() => handlePayApplication(app._id, 'card')}
                                  disabled={payingApplicationId === app._id}
                                  className="w-full py-2.5 px-4 bg-slate-900 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-600 hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                                >
                                  Pay by Card
                                </button>
                                <button
                                  onClick={() => handlePayApplication(app._id, 'wallet')}
                                  disabled={payingApplicationId === app._id}
                                  className="w-full py-2.5 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                                >
                                  {payingApplicationId === app._id ? 'Processing...' : 'Pay from Wallet'}
                                </button>
                              </div>
                            </div>
                          )}
                          {app.status === "approved" && app.paid && app.paidAt && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mt-5 mb-2">
                              <p className="text-emerald-700 text-sm font-bold flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                Payment Completed
                              </p>
                              <p className="text-emerald-600/80 text-xs mt-1 pl-4">
                                Paid on {new Date(app.paidAt).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                          {app.status === "pending" && (
                            <button
                              onClick={() => handleCancelApplication(app._id)}
                              className="text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Cancel Application
                            </button>
                          )}
                          {app.status === "cancelled" && (
                            <button
                              onClick={() => handleDeleteApplication(app._id)}
                              className="text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          )}
                          {app.status === "approved" && !app.paid && (
                            <button
                              onClick={() => handleCancelApplication(app._id)}
                              className="text-xs font-medium text-slate-400 hover:text-red-500 hover:underline transition-colors"
                            >
                              Cancel Application
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "loyalty" && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              {showLoyaltyForm ? (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <button
                      onClick={() => setShowLoyaltyForm(false)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Create New Program</h3>
                      <p className="text-slate-500 text-sm">Define a new loyalty offer for students</p>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <LoyaltyProgramForm
                      onSuccess={() => {
                        setShowLoyaltyForm(false);
                        setLoyaltyRefreshKey(prev => prev + 1);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8 relative flex flex-col items-center">
                    <h3 className="text-xl font-bold text-slate-800">Your Programs</h3>
                    <p className="text-slate-500 mt-1">Manage your loyalty programs and track applications</p>
                    <button
                      onClick={() => setShowLoyaltyForm(true)}
                      className="mt-4 md:mt-0 md:absolute md:right-0 md:top-0 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
                    >
                      Create New Program
                    </button>
                  </div>

                  <LoyaltyApplicationsList key={loyaltyRefreshKey} />
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "visitor-qrcodes" && (
          <div className="space-y-6">
            <VisitorQRCodeManager />
          </div>
        )}

        {activeTab === "company-documents" && (
          <div className="space-y-6">
            <CompanyDocumentsUpload />
          </div>
        )}

        {activeTab === "attendee-ids" && (
          <div className="space-y-6">
            <AttendeeIDUpload />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default VendorDashboard;
