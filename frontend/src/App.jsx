import React from "react";
import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import ChooseRole from "./components/ChooseRole"; // make sure path is correct
import Login from "./components/Auth/Login";
import VendorDashboard from "./components/VendorDashboard";
import StudentDashboard from "./components/StudentDashboard";
import StaffDashboard from "./components/StaffDashboard";
import Navbar from "./components/Navbar";
import EventList from "./components/EventList";
// Events management pages (role-based)
import BazaarsManager from "./components/Events/EventsOffice/BazaarsManager";
import TripsManager from "./components/Events/EventsOffice/TripsManager";
import WorkshopsManager from "./components/Events/Professor/WorkshopsManager";
import ConferencesManager from "./components/Events/EventsOffice/ConferencesManager";


function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };
  return (
  <>
      <Navbar isLoggedIn={isLoggedIn} onLogout={handleLogout} />
      
      <div style={{ paddingTop: '70px' }}>
        <Routes>
          <Route path="/" element={<ChooseRole />} />
          <Route path="/ChooseRole" element={<ChooseRole />} />
          <Route 
            path="/Login" 
            element={<Login onLogin={handleLogin} />} 
          />
          <Route path="/VendorDashboard" element={<VendorDashboard />} />
          <Route path="/StudentDashboard" element={<StudentDashboard />} />
          <Route path="/StaffDashboard" element={<StaffDashboard />} />
          {/* Events Office */}
          <Route path="/events-office/bazaars" element={<BazaarsManager />} />
          <Route path="/events-office/trips" element={<TripsManager />} />
          <Route path="/events-office/conferences" element={<ConferencesManager />} />
          {/* Professor */}
          <Route path="/professor/workshops" element={<WorkshopsManager />} />
          {/* Public events listing */}
          <Route path="/events" element={<EventList />} />
        
        
        </Routes>
      </div>
    </>
  );
}

export default App;
