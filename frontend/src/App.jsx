import React from "react";
import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import ChooseRole from "./components/ChooseRole"; // make sure path is correct
import Login from "./components/Auth/Login";
import VendorDashboard from "./components/Dashboards/VendorDashboard";
import StudentDashboard from "./components/Dashboards/StudentDashboard";
import Navbar from "./components/Navbar";
import WelcomePage from "./components/WelcomePage";
import ProfessorDashboard from "./components/Dashboards/ProfessorDashboard";
import EventOfficeDashboard from "./components/Dashboards/EventOfficeDashboard";
import StaffDashboard from "./components/Dashboards/StaffDashboard";
import TaDashboard from "./components/Dashboards/TaDashboard";


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
          <Route path="/" element={<WelcomePage />} />
          <Route 
            path="/Login" 
            element={<Login onLogin={handleLogin} />} 
          />
          
          <Route path="/ChooseRole" element={<ChooseRole />} />
          <Route path="/VendorDashboard" element={<VendorDashboard />} />
          <Route path="/StudentDashboard" element={<StudentDashboard />} />
          <Route path="/EventOfficeDashboard" element={<EventOfficeDashboard />} />
          <Route path="/ProfessorDashboard" element={<ProfessorDashboard />} />
          <Route path="/StaffDashboard" element={<StaffDashboard />} />
          <Route path="/TaDashboard" element={<TaDashboard />} />
        </Routes>
      </div>
    </>
  );
}

export default App;