import React, { useEffect, useState } from "react";
import EventList from "../EventList";
import MyEventsList from "../Functions/MyEventsList";
import { API_BASE } from "../../services/eventService";
import { getWalletBalance as apiGetWalletBalance, confirmStripeReceipt, sendManualReceipt } from "../../services/paymentService";
import TopUpDialog from "../Payments/TopUpDialog";
import { getFavouriteIds } from "../../services/favoritesService";





function StaffDashboard() {
  const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem("user") : null;
  const user = storedUser ? JSON.parse(storedUser) : { firstName: "Guest", role: "staff" };

  const [activeTab, setActiveTab] = useState("browse");
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favouriteEvents, setFavouriteEvents] = useState([]);
  const [walletBalance, setWalletBalance] = useState(undefined);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [bannerMsg, setBannerMsg] = useState("");

  useEffect(() => { fetchRegisteredEvents(); fetchWallet(); }, []);

  useEffect(() => {
    const onWallet = () => { fetchWallet(); };
    const onPaymentSuccess = (e) => {
      try {
        const amt = e?.detail?.amount;
        const method = e?.detail?.method;
        const m1 = method ? `${method} payment successful` : 'Payment successful';
        const amtTxt = typeof amt === 'number' ? ` (${amt} EGP)` : '';
        setBannerMsg(`${m1}${amtTxt}. Receipt emailed to you.`);
        setTimeout(() => setBannerMsg(''), 6000);
      } catch (_) {}
    };
    window.addEventListener('wallet:updated', onWallet);
    window.addEventListener('payment:success', onPaymentSuccess);
    return () => {
      window.removeEventListener('wallet:updated', onWallet);
      window.removeEventListener('payment:success', onPaymentSuccess);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search || '');
        const sessionId = params.get('session_id');
        const status = params.get('status');
        const eventId = params.get('eventId');
        if (sessionId) {
          try { await confirmStripeReceipt(sessionId); } catch (_) {}
          try { await fetchRegisteredEvents(); } catch (_) {}
          setBannerMsg('Payment successful. Receipt emailed to you.');
          setTimeout(() => setBannerMsg(''), 6000);
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          window.history.replaceState({}, document.title, url.toString());
        } else if (status === 'success') {
          try { if (eventId) { await sendManualReceipt(eventId); } } catch (_) {}
          try { await fetchRegisteredEvents(); } catch (_) {}
          setBannerMsg('Payment successful.');
          setTimeout(() => setBannerMsg(''), 6000);
          const url = new URL(window.location.href);
          url.searchParams.delete('status');
          url.searchParams.delete('eventId');
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 'favourites') fetchFavourites();
  }, [activeTab]);

  const fetchRegisteredEvents = async () => {
    try {
      setLoading(true);
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
      const res = await fetch(`${API_BASE}/events/registered`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        try { const err = await res.json(); console.warn('registered fetch failed:', err); } catch(_) {}
        setRegisteredEvents([]);
      } else {
        const data = await res.json();
        setRegisteredEvents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading registered events:', err);
      setRegisteredEvents([]);
    } finally { setLoading(false); }
  };

  const fetchFavourites = async () => {
    try {
      const ids = getFavouriteIds().map(String);
      if (!ids.length) { setFavouriteEvents([]); return; }
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
      const filtered = list.filter(ev => ids.includes(String(ev._id || ev.id)));
      setFavouriteEvents(filtered);
    } catch (_) {
      setFavouriteEvents([]);
    }
  };

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
        {Boolean(bannerMsg) && (
          <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: '#fff', borderRadius: 12, padding: '12px 18px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', zIndex: 9999, fontWeight: 800, letterSpacing: 0.3 }}>
            {bannerMsg}
          </div>
        )}
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

            <div style={{ marginTop: "16px", display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => (window.location.href = "/register-events")}
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
                  boxShadow: "0 6px 20px rgba(212, 175, 55, 0.4)",
                }}
              >
                Register Events
              </button>
              <div style={{ padding: '10px 16px', background: 'rgba(212, 175, 55, 0.15)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#003366' }}>{typeof walletBalance === 'number' ? `${walletBalance} EGP` : '—'}</div>
                <div style={{ fontSize: '.85rem', color: '#6b7280' }}>Wallet Balance</div>
                <div style={{ marginTop: 6 }}>
                  <button type='button' onClick={() => setTopUpOpen(true)} style={{ padding: '6px 10px', background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)', color: '#003366', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Add Funds</button>
                </div>
              </div>
              <button
                onClick={() => (window.location.href = "/gym-sessions")}
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
                  boxShadow: "0 6px 20px rgba(212, 175, 55, 0.4)",
                }}
              >
                🏋️ Gym Sessions
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
              Browse Events
          </button>

            <button
              onClick={() => setActiveTab("favourites")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "favourites"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "favourites" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              {'\u2764\uFE0F'} Favourites
            </button>

            <button
              onClick={() => setActiveTab("registered")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "registered"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "registered" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              My Registered Events
            </button>
          </div>

          {/* Content */}
          {activeTab === "browse" && <EventList enableFavorites={true} />}
          {activeTab === "favourites" && <MyEventsList events={favouriteEvents} />}
          {activeTab === "registered" && (
            loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 20px",
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: "16px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ fontSize: "1.2rem", color: "#6b7280", fontWeight: 500 }}>
                  Loading your registered events...
                </div>
              </div>
            ) : (
              <MyEventsList events={registeredEvents} showRefundButton />
            )
          )}
        </div>
      </div>
      {topUpOpen && (
        <TopUpDialog open={topUpOpen} onClose={() => setTopUpOpen(false)} onSuccess={(res) => {
          const next = (res && typeof res.balance === 'number') ? res.balance : undefined;
          if (typeof next === 'number') setWalletBalance(next);
        }} />
      )}
    </div>
  );
}

export default StaffDashboard;
  const fetchWallet = async () => {
    try {
      const res = await apiGetWalletBalance();
      const bal = (res && typeof res.balance === 'number') ? res.balance : undefined;
      setWalletBalance(bal);
    } catch (_) { setWalletBalance(undefined); }
  };
