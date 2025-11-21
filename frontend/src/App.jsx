import React from "react";
import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ChooseRole from "./components/ChooseRole"; // make sure path is correct
import Login from "./components/Auth/Login";
import VerifyEmail from "./components/Auth/VerifyEmail";
import VendorDashboard from "./components/Dashboards/VendorDashboard";
import StudentDashboard from "./components/Dashboards/StudentDashboard";
import Navbar from "./components/Navbar";
import EventList from "./components/EventList";
// Events management pages (role-based)
import BazaarsManager from "./components/Events/EventsOffice/BazaarsManager";
import BoothsManager from "./components/Events/EventsOffice/BoothsManager";
import TripsManager from "./components/Events/EventsOffice/TripsManager";
import WorkshopsManager from "./components/Events/Professor/WorkshopsManager";
import ConferencesManager from "./components/Events/EventsOffice/ConferencesManager";
import GymSessionsManager from "./components/Events/EventsOffice/GymSessionsManager";
import WelcomePage from "./components/WelcomePage";
import ProfessorDashboard from "./components/Dashboards/ProfessorDashboard";
import EventOfficeDashboard from "./components/Dashboards/EventOfficeDashboard";
import StaffDashboard from "./components/Dashboards/StaffDashboard";
import TaDashboard from "./components/Dashboards/TaDashboard";
import RequestBooth from "./components/Vendor/RequestBooth";
import AdminDashboard from "./components/Admin/AdminDashboard";
import UserManagement from "./components/Admin/UserManagement";
import CreateAdmin from "./components/Admin/CreateAdmin";
import VendorApplications from "./components/Admin/VendorApplications";
import AdminNotifications from "./components/Admin/AdminNotifications";
import CommentModeration from "./components/Admin/CommentModeration";
import ViewEvents from "./components/Admin/ViewEvents";
import RegisterEvents from "./components/RegisterEvents";
import GymSessions from "./components/GymSessions";
import EventDetails from "./components/EventDetails";
import VendorDocuments from "./components/Admin/VendorDocuments";
import AttendeesReport from "./components/Admin/AttendeesReport";
import SalesReport from "./components/Admin/SalesReport";


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
      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={true}
        theme="light"
        limit={3}
        toastClassName="custom-toast"
        bodyClassName="custom-toast-body"
      />
      <Navbar isLoggedIn={isLoggedIn} onLogout={handleLogout} />
      
      
      <div style={{ paddingTop: '70px' }}>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/ChooseRole" element={<ChooseRole />} />
          <Route 
            path="/Login" 
            element={<Login onLogin={handleLogin} />} 
          />
          <Route path="/verify/:token" element={<VerifyEmail />} />
          
          <Route path="/ChooseRole" element={<ChooseRole />} />
          <Route path="/VendorDashboard" element={<VendorDashboard />} />
          <Route path="/Student-dashboard" element={<StudentDashboard />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/EventOfficeDashboard" element={<EventOfficeDashboard />} />
          <Route path="/ProfessorDashboard" element={<ProfessorDashboard />} />
          <Route path="/StaffDashboard" element={<StaffDashboard />} />
          {/* Events Office */}
          <Route path="/events-office/bazaars" element={<BazaarsManager />} />
          <Route path="/events-office/bazaars/edit/:id" element={<BazaarsManager editOnly={true} />} />
          <Route path="/events-office/booths" element={<BoothsManager />} />
          <Route path="/events-office/trips" element={<TripsManager />} />
          <Route path="/events-office/trips/edit/:id" element={<TripsManager editOnly={true} />} />
          <Route path="/events-office/conferences" element={<ConferencesManager />} />
          <Route path="/events-office/conferences/edit/:id" element={<ConferencesManager editOnly={true} />} />
          <Route path="/events-office/gym-sessions" element={<GymSessionsManager />} />
          <Route path="/events-office/gym-sessions/edit/:id" element={<GymSessionsManager editOnly={true} />} />
          {/* Student */}
          {/* Professor */}
          <Route path="/professor/workshops" element={<WorkshopsManager />} />
          <Route path="/professor/workshops/edit/:id" element={<WorkshopsManager editOnly={true} />} />
          {/* Public events listing */}
          <Route path="/events" element={<EventList />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/register-events" element={<RegisterEvents />} />
          <Route path="/gym-sessions" element={<GymSessions />} />
        
        
          <Route path="/TaDashboard" element={<TaDashboard />} />
          <Route path="/vendor/request-booth" element={<RequestBooth />} />
          <Route path="/Admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/create" element={<CreateAdmin />} />
          <Route path="/admin/vendor-applications" element={<VendorApplications />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/comments" element={<CommentModeration />} />
          <Route path="/admin/view-events" element={<ViewEvents />} />
          <Route path="/admin/vendor-documents" element={<VendorDocuments />} />
          <Route path="/admin/attendees-report" element={<AttendeesReport />} />
          <Route path="/admin/sales-report" element={<SalesReport />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
