import React, { useState } from 'react';
import SignupStudent from './SignupStudent';
import SignupStaff from './SignupStaff';
import SignupVendor from './SignupVendor';
import Navbar from './Navbar.jsx';
import { useNavigate } from "react-router-dom";

function ChooseRole() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('');

  const roles = [
    {
      id: 'student',
      label: 'Student',
      description: 'Discover and attend university events',
      gradient: 'from-blue-600 to-blue-400',
      icon: (
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      )
    },
    {
      id: 'staff',
      label: 'Staff/TA/Professor',
      description: 'Organize and manage academic events',
      gradient: 'from-cyan-600 to-cyan-400',
      icon: (
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'vendor',
      label: 'Vendor',
      description: 'Provide services for university events',
      gradient: 'from-indigo-600 to-indigo-400',
      icon: (
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <Navbar />

      <div className="relative z-10 pt-24 pb-12 px-4">
        {!selectedRole ? (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-4">
                Choose Your Role
              </h2>
              <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto rounded-full mb-6"></div>
              <p className="text-xl text-slate-300">
                Select your role to get started with GUC Events
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className="group relative bg-slate-800/40 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl text-left"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>

                  <div className="relative z-10">
                    <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${role.gradient} mb-6 flex items-center justify-center shadow-lg`}>
                      {role.icon}
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-3">{role.label}</h3>
                    <p className="text-slate-400 leading-relaxed">{role.description}</p>

                    <div className="mt-6 flex items-center text-emerald-400 font-semibold group-hover:translate-x-2 transition-transform">
                      Select
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-700 shadow-2xl">
              <button
                onClick={() => setSelectedRole('')}
                className="mb-6 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to role selection
              </button>

              {selectedRole === 'student' && <SignupStudent />}
              {selectedRole === 'staff' && <SignupStaff />}
              {selectedRole === 'vendor' && <SignupVendor />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChooseRole;
