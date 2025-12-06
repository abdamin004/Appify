import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function Navbar({ onLogout }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      const hasValidAuth = !!(token && user && user !== 'null' && user !== 'undefined');
      setIsLoggedIn(hasValidAuth);
    };

    checkAuth();
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);

    if (onLogout) {
      onLogout();
    }
    navigate("/");
  };

  const getUserRole = () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return null;
      const user = JSON.parse(userData);
      return user.role ? user.role.toLowerCase() : null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  const getDashboardPath = () => {
    const role = getUserRole();

    switch (role) {
      case "vendor": return "/VendorDashboard";
      case "student": return "/student-dashboard";
      case "ta": return "/TaDashboard";
      case "professor": return "/ProfessorDashboard";
      case "eventoffice": return "/EventOfficeDashboard";
      case "staff": return "/StaffDashboard";
      case "admin": return "/Admin";
      default: return "/";
    }
  };

  return (
    <div className="navbar bg-slate-900/90 backdrop-blur-md fixed top-0 z-50 border-b border-slate-700/50 px-4">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-slate-800 rounded-box w-52 border border-slate-700">
            {isLoggedIn ? (
              <>
                <li><Link to={getDashboardPath()} className="text-white">Dashboard</Link></li>
                <li><a onClick={handleLogout} className="text-white">Logout</a></li>
              </>
            ) : (
              <>
                <li><Link to="/Login" className="text-white">Login</Link></li>
                <li><Link to="/ChooseRole" className="text-white">Sign Up</Link></li>
              </>
            )}
          </ul>
        </div>

        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            GUC Events
          </span>
        </Link>
      </div>

      <div className="navbar-end hidden lg:flex">
        <ul className="menu menu-horizontal px-1 gap-2">
          {isLoggedIn ? (
            <>
              <li>
                <Link to={getDashboardPath()} className="btn btn-ghost btn-sm text-slate-300 hover:text-white hover:bg-slate-800">
                  Dashboard
                </Link>
              </li>
              <li>
                <button onClick={handleLogout} className="btn btn-sm bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-none hover:shadow-lg hover:shadow-emerald-500/50">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/Login" className="btn btn-ghost btn-sm text-slate-300 hover:text-white hover:bg-slate-800">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/ChooseRole" className="btn btn-sm bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-none hover:shadow-lg hover:shadow-emerald-500/50">
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

export default Navbar;