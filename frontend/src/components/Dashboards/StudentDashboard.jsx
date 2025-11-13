import React, { useState, useEffect } from "react";
import EventsList from "../EventList";
import Navbar from "../Navbar";
import MyEventsList from "../Functions/MyEventsList";
import CourtsReserve from "../Functions/CourtsReserve";
import { API_BASE } from "../../services/eventService";
import { getWalletBalance as apiGetWalletBalance } from "../../services/paymentService";
import { confirmStripeReceipt, sendManualReceipt } from "../../services/paymentService";
import TopUpDialog from "../Payments/TopUpDialog";
import { getFavouriteIds } from "../../services/favoritesService";

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("browse");
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [courts, setCourts] = useState([]);
  const [presetType, setPresetType] = useState("");
  const [favouriteEvents, setFavouriteEvents] = useState([]);
  const [walletBalance, setWalletBalance] = useState(undefined);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [bannerMsg, setBannerMsg] = useState("");

  const storedUser = localStorage.getItem("user");
  const user = storedUser
    ? JSON.parse(storedUser)
    : { firstName: "Guest", role: "student" };

  useEffect(() => {
    fetchRegisteredEvents();
    fetchCourts();
    fetchWallet();
  }, []);

  // Listen to wallet updates from child dialogs (wallet pay/refund/top-up)
  useEffect(() => {
    const handler = () => { fetchWallet(); };
    const onPaymentSuccess = (e) => {
      try {
        const amt = e?.detail?.amount;
        const method = e?.detail?.method;
        const raw = localStorage.getItem('user');
        const u = raw ? JSON.parse(raw) : {};
        const email = u?.email ? ` Receipt emailed to ${u.email}.` : '';
        const m1 = method ? `${method} payment successful` : 'Payment successful';
        const amtTxt = typeof amt === 'number' ? ` (${amt} EGP)` : '';
        setBannerMsg(`${m1}${amtTxt}.${email}`);
        setTimeout(() => setBannerMsg(''), 6000);
      } catch (_) {}
    };
    window.addEventListener('wallet:updated', handler);
    window.addEventListener('payment:success', onPaymentSuccess);
    return () => {
      window.removeEventListener('wallet:updated', handler);
      window.removeEventListener('payment:success', onPaymentSuccess);
    };
  }, []);

  // After Stripe redirect: if session_id or status=success present, confirm/send receipt and show banner
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search || '');
        const sessionId = params.get('session_id');
        const status = params.get('status');
        const eventId = params.get('eventId');
        if (sessionId) {
          try { await confirmStripeReceipt(sessionId); } catch (_) {}
          // Refresh registered events to reflect paid flag
          try { await fetchRegisteredEvents(); } catch (_) {}
          // Banner message
          try {
            const raw = localStorage.getItem('user');
            const u = raw ? JSON.parse(raw) : {};
            const email = u?.email ? ` Receipt emailed to ${u.email}.` : '';
            setBannerMsg(`Payment successful.${email}`);
            setTimeout(() => setBannerMsg(''), 6000);
          } catch (_) {}
          // Clean the URL to avoid repeat calls on navigation
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          window.history.replaceState({}, document.title, url.toString());
        } else if (status === 'success') {
          try {
            if (eventId) { await sendManualReceipt(eventId); }
          } catch (_) {}
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

  // Fetch data when switching tabs
  useEffect(() => {
    if (activeTab === "registered" && registeredEvents.length === 0) {
      fetchRegisteredEvents();
    } else if (activeTab === "courts" && courts.length === 0) {
      fetchCourts();
    } else if (activeTab === "favourites") {
      fetchFavourites();
    }
  }, [activeTab]);

  const fetchRegisteredEvents = async () => {
    try {
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
      const res = await fetch(`${API_BASE}/events/registered`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        // Likely unauthorized if no token; keep empty list gracefully
        try { const err = await res.json(); console.warn('registered fetch failed:', err); } catch (_) {}
        setRegisteredEvents([]);
        return;
      }
      const data = await res.json();
      setRegisteredEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setRegisteredEvents([]);
    }
  };

  const fetchCourts = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/courts");
      const data = await res.json();
      const raw = Array.isArray(data) ? data : (Array.isArray(data.courts) ? data.courts : []);
      // normalize each court to include availabilityDates and available boolean
      const now = new Date();
      const processed = raw.map(court => {
        const slots = Array.isArray(court.availability) ? court.availability : [];
        // filter future slots that are not booked
        const availabilityDates = slots
          .filter(s => {
            try {
              if (s.isBooked) return false;
              const slotDate = new Date(s.date);
              // combine with startTime
              if (!s.startTime) return false;
              const [h, m] = s.startTime.split(':').map(x=>parseInt(x,10));
              slotDate.setHours(h||0, m||0, 0, 0);
              return slotDate >= now;
            } catch (e) { return false; }
          })
          .map(s => ({ slotId: s._id, date: s.date, startTime: s.startTime, endTime: s.endTime }));

        const available = (court.status === 'available') && availabilityDates.length > 0;

        return { ...court, availabilityDates, available };
      });

      if (processed.length === 0) {
        setCourts(generateFakeCourts());
      } else {
        setCourts(processed);
      }
    } catch (err) {
      console.error(err);
      // Frontend-only fallback
      setCourts(generateFakeCourts());
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await apiGetWalletBalance();
      const balance = (res && typeof res.balance === 'number') ? res.balance : undefined;
      setWalletBalance(balance);
    } catch (_) {
      setWalletBalance(undefined);
    }
  };

  function generateFakeCourts() {
    const types = [
      { type: 'basketball', name: 'Basketball Court A' },
      { type: 'tennis', name: 'Tennis Court 1' },
      { type: 'football', name: 'Football Field' }
    ];
    const now = new Date();
    return types.map((t, idx) => {
      const slots = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const startHour = 10 + i;
        const endHour = startHour + 1;
        slots.push({
          slotId: `fake-slot-${idx}-${i}`,
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
          startTime: `${String(startHour).padStart(2,'0')}:00`,
          endTime: `${String(endHour).padStart(2,'0')}:00`
        });
      }
      return {
        _id: `fake-court-${idx}`,
        id: `fake-court-${idx}`,
        name: t.name,
        type: t.type,
        status: 'available',
        available: true,
        location: 'Sports Complex',
        availabilityDates: slots
      };
    });
  }

  function handleReserve(courtId, slotId) {
    setCourts(prev => (prev || []).map(c => {
      const cid = String(c._id || c.id);
      if (cid !== String(courtId)) return c;
      const remaining = (c.availabilityDates || []).filter(s => String(s.slotId) !== String(slotId));
      return { ...c, availabilityDates: remaining };
    }));
  }

  const fetchFavourites = async () => {
    try {
      const ids = getFavouriteIds().map(String);
      if (!ids.length) { setFavouriteEvents([]); return; }
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
      const filtered = list.filter(ev => ids.includes(String(ev._id || ev.id)));
      setFavouriteEvents(filtered);
    } catch (e) {
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
      <Navbar />

      <div
        style={{
          paddingTop: "120px",
          padding: "120px 40px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {Boolean(bannerMsg) && (
          <div style={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#10b981',
            color: '#fff',
            borderRadius: 12,
            padding: '12px 18px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            zIndex: 9999,
            fontWeight: 800,
            letterSpacing: 0.3,
          }}>
            {bannerMsg}
          </div>
        )}
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header + Stats */}
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
                Welcome back, {user.firstName}! 👋
              </h1>
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                Discover and register for amazing events
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
              <div
                style={{
                  padding: "12px 20px",
                  background: "rgba(212, 175, 55, 0.15)",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#003366",
                  }}
                >
                  {registeredEvents.length}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                  }}
                >
                  Registered Events
                </div>
              </div>

              <div
                style={{
                  padding: "12px 20px",
                  background: "rgba(212, 175, 55, 0.15)",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#003366",
                  }}
                >
                  {courts.filter(c => c.available).length}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                  }}
                >
                  Available Courts
                </div>
              </div>

              <div
                style={{
                  padding: "12px 20px",
                  background: "rgba(212, 175, 55, 0.15)",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#003366",
                  }}
                >
                  {typeof walletBalance === 'number' ? `${walletBalance} EGP` : '—'}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                  }}
                >
                  Wallet Balance
                </div>
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setTopUpOpen(true)}
                    style={{ padding: '6px 10px', background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)', color: '#003366', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                  >
                    Add Funds
                  </button>
                </div>
              </div>
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
              🎯 Browse Events
            </button>

            {/* Register Events button inside the same bar */}
            <button
              onClick={() => (window.location.href = "/register-events")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                color: "#003366",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 6px 20px rgba(212, 175, 55, 0.4)",
              }}
            >
              Register Events
            </button>

            <button
              onClick={() => (window.location.href = "/gym-sessions")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                color: "#003366",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 6px 20px rgba(212, 175, 55, 0.4)",
              }}
            >
              🏋️ Gym Sessions
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
              ✓ My Registered Events
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
              ♥ Favourites
            </button>

            <button
              onClick={() => setActiveTab("courts")}
              style={{
                flex: 1,
                padding: "15px 30px",
                background:
                  activeTab === "courts"
                    ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                    : "transparent",
                color: activeTab === "courts" ? "#003366" : "#6b7280",
                border: "none",
                borderRadius: "15px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              🏀 Courts
            </button>

          </div>

          {/* Content */}
          {activeTab === "browse" && <EventsList presetType={presetType} showQuickNav={true} enableFavorites={true} />}
          {activeTab === "registered" && <MyEventsList events={registeredEvents} showRefundButton />}
          {activeTab === "favourites" && <MyEventsList events={favouriteEvents} />}
          {activeTab === "courts" && <CourtsReserve courts={courts} onReserved={handleReserve} />}
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

export default StudentDashboard;

