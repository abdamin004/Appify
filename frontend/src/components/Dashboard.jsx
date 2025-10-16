import React, { useState, useEffect } from "react";
import EventsList from "./EventList";
import Navbar from "./Navbar";
import MyEventsList from "./Functions/MyEventsList";
import CourtsList from "./Functions/CourtsList";

function Dashboard() {
  const [activeTab, setActiveTab] = useState("browse");
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [courts, setCourts] = useState([]);
  const [Bazaars, setBazaars] = useState([]);


  const storedUser = localStorage.getItem("user");
  const user = storedUser
    ? JSON.parse(storedUser)
    : { firstName: "Guest", role: "student" };

  useEffect(() => {
    if (user.role === "student") {
      fetchRegisteredEvents();
      fetchCourts();
    } else if (["professor", "eventoffice", "ta", "vendor", "staff"].includes(user.role)) {
      fetchMyCreatedEvents();
    }
  }, [user.role]);

  // Fetch data when switching tabs
  useEffect(() => {
    if (activeTab === "registered" && user.role === "student" && registeredEvents.length === 0) {
      fetchRegisteredEvents();
    } else if (activeTab === "courts" && user.role === "student" && courts.length === 0) {
      fetchCourts();
    } else if (activeTab === "my-workshops" && user.role === "professor" ) {
      fetchMyCreatedEvents();
    } else if (activeTab === "my-events" && (user.role === "eventoffice" || user.role === "staff") && myEvents.length === 0) {
      fetchMyCreatedEvents();
    } else if (activeTab === "my-bazaars" && user.role === "vendor" && myEvents.length === 0) {
      fetchMyCreatedEvents();
    }
  }, [activeTab]);

  useEffect(() => {
  if (activeTab === "upcoming-bazaars" && Bazaars.length === 0) {
    fetchBazaars();
  }
}, [activeTab]);


  const fetchRegisteredEvents = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/events/registered");
      const data = await res.json();
      setRegisteredEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCourts = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/courts");
      const data = await res.json();
      if (Array.isArray(data)) setCourts(data);
      else if (Array.isArray(data.courts)) setCourts(data.courts);
      else setCourts([]);
    } catch (err) {
      console.error(err);
      setCourts([]);
    }
  };

  const fetchMyCreatedEvents = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/events/created/mine");
      const data = await res.json();
      setMyEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMyEvents([]);
    }
  };

  const fetchBazaars = async () => {
  try {
    const token = localStorage.getItem("token"); // your auth token
    const res = await fetch("http://localhost:5001/api/vendor/bazaars/upcoming", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (data.success) {
      setBazaars(data.bazaars || []);
    } else {
      setBazaars([]);
      console.error(data.error);
    }
  } catch (err) {
    console.error(err);
  }
};



  const handleCreateEvent = () => {
    if (user.role === "professor") window.location.href = "/create-workshop";
    else if (user.role === "eventoffice") window.location.href = "/create-event";
    else if (user.role === "vendor") window.location.href = "/request-booth";
  };

  const getRoleConfig = () => {
    switch (user.role) {
      case "student":
        return {
          title: `Welcome back, ${user.firstName}!`,
          subtitle: "Discover and register for amazing events",
          tabs: [
            { id: "browse", label: "🎯 Browse Events", show: true },
            { id: "registered", label: "✓ My Registered Events", show: true },
            { id: "courts", label: "🏀 Courts", show: true },
          ],
          stats: [
            { value: Array.isArray(registeredEvents) ? registeredEvents.length : 0, label: "Registered Events" },
            { value: Array.isArray(courts) ? courts.filter(c => c.available).length : 0, label: "Available Courts" },
          ],
          canCreate: false,
        };

      case "professor":
        return {
          title: `Welcome, Prof. ${user.lastName || user.firstName}!`,
          subtitle: "Manage your workshops and view university events",
          tabs: [
            { id: "browse", label: "🎯 Browse Events", show: true },
            { id: "my-workshops", label: "📚 My Workshops", show: true },
          ],
          stats: [{ value: Array.isArray(myEvents) ? myEvents.length : 0, label: "My Workshops" }],
          canCreate: true,
          createLabel: "Create Workshop",
          allowedEventTypes: ["Workshop", "Conference"],
        };

      case "eventoffice":
        return {
          title: `Welcome, Event Office ${user.firstName}!`,
          subtitle: "Manage university events and coordinate activities",
          tabs: [
            { id: "browse", label: "🎯 Browse Events", show: true },
            { id: "my-events", label: "📋 Managed Events", show: true },
          ],
          stats: [{ value: Array.isArray(myEvents) ? myEvents.length : 0, label: "Managed Events" }],
          canCreate: true,
          createLabel: "Create Event",
          allowedEventTypes: ["Workshop", "Trip", "Bazaar", "Booth", "Conference"],
        };

      case "ta":
        return {
          title: `Welcome, TA ${user.firstName}!`,
          subtitle: "Browse events and manage your workshops",
          tabs: [{ id: "browse", label: "🎯 Browse Events", show: true }],
          stats: [{ value: Array.isArray(myEvents) ? myEvents.length : 0, label: "My Workshops" }],
          canCreate: true,
          createLabel: "Create Workshop",
          allowedEventTypes: ["Workshop"],
        };

      case "vendor":
        return {
          title: `Welcome, ${user.firstName}!`,
          subtitle: "View and manage bazaars and booths",
          tabs: [
            { id: "browse", label: "🏪 Browse Bazaars & Booths", show: true },
            { id: "my-bazaars", label: "📋 My Bazaars/Booths", show: true },
            { id: "upcoming-bazaars", label: "🗓️ Upcoming Bazaars", show: true },
          ],
          stats: [],
          canCreate: true,
          createLabel: "Request Booth/Bazaar",
          filterByTypes: ["Bazaar", "Booth"],
        };



      case "staff":
        return {
          title: `Welcome, ${user.firstName}!`,
          subtitle: "Manage all events and create new experiences",
          tabs: [
            { id: "browse", label: "🎯 All Events", show: true },
            { id: "my-events", label: "📋 My Created Events", show: true },
          ],
          stats: [{ value: Array.isArray(myEvents) ? myEvents.length : 0, label: "Created Events" }],
          canCreate: true,
          createLabel: "Create Event",
          allowedEventTypes: ["Workshop", "Trip", "Bazaar", "Booth", "Conference"],
        };

      default:
        return {
          title: `Welcome, ${user.firstName}!`,
          subtitle: "Discover events at GUC",
          tabs: [{ id: "browse", label: "🎯 Browse Events", show: true }],
          stats: [],
          canCreate: false,
        };
    }
  };

  const config = getRoleConfig();

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
          {/* Header + Stats + Create Button */}
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
                {config.title} 👋
              </h1>
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                {config.subtitle}
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
              {config.stats.map((stat, idx) => (
                <div
                  key={idx}
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
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#6b7280",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}

              {config.canCreate && (
                <button
                  onClick={handleCreateEvent}
                  style={{
                    padding: "14px 28px",
                    background:
                      "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
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
                  + {config.createLabel}
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          {config.tabs.length > 1 && (
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
              {config.tabs.map(
                (tab) =>
                  tab.show && (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        flex: 1,
                        padding: "15px 30px",
                        background:
                          activeTab === tab.id
                            ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                            : "transparent",
                        color:
                          activeTab === tab.id ? "#003366" : "#6b7280",
                        border: "none",
                        borderRadius: "15px",
                        fontSize: "1rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.3s",
                      }}
                    >
                      {tab.label}
                    </button>
                  )
              )}
            </div>
          )}

          {/* Content */}
          {activeTab === "browse" && <EventsList filterByTypes={config.filterByTypes} />}
          {activeTab === "registered" && user.role === "student" && <MyEventsList events={registeredEvents} />}
          {activeTab === "courts" && user.role === "student" && <CourtsList courts={courts} />}
          {activeTab === "my-workshops" && user.role === "professor" && <MyEventsList events={myEvents} />}
          {activeTab === "my-events" && (user.role === "eventoffice" || user.role === "staff") && <MyEventsList events={myEvents} />}
          {activeTab === "my-bazaars" && user.role === "vendor" && <MyEventsList events={myEvents} />}
          {activeTab === "upcoming-bazaars" && user.role === "vendor" && (<MyEventsList events={Bazaars} />)}

        </div>
      </div>
    </div>
  );
}

export default Dashboard;
