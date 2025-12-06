import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import ParticleBackground from './Effects/ParticleBackground';

export default function WelcomePage() {
  const navigate = useNavigate();

  const eventTypes = [
    {
      title: 'Workshops',
      description: 'Hands-on learning sessions led by industry experts and professors',
      gradient: 'from-emerald-600 to-emerald-400',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
    {
      title: 'Trips',
      description: 'Educational excursions and cultural visits across Egypt',
      gradient: 'from-teal-600 to-teal-400',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Conferences',
      description: 'Academic conferences featuring keynote speakers and research presentations',
      gradient: 'from-green-600 to-green-400',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: 'Bazaars',
      description: 'Student markets showcasing handmade crafts, food, and creative products',
      gradient: 'from-cyan-600 to-cyan-400',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      title: 'Booths',
      description: 'Exhibition spaces for student startups and innovative projects',
      gradient: 'from-emerald-700 to-emerald-500',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <ParticleBackground />

      {/* Hero Section */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-6xl mx-auto text-center">
          {/* Logo and Title */}
          <div className="mb-8 inline-block">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                GUC Events
              </h1>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
          </div>

          <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Your gateway to discovering and participating in the vibrant community of the German University in Cairo
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate('/ChooseRole')}
              className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/50"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            <button
              onClick={() => navigate('/Login')}
              className="px-8 py-4 bg-slate-800/50 backdrop-blur-sm text-white font-bold rounded-full border-2 border-slate-600 hover:border-emerald-400 transition-all duration-300 hover:bg-slate-700/50"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Events Showcase */}
      <div className="relative z-10 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Explore Events
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventTypes.map((event, index) => (
              <div
                key={index}
                className="group relative bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${event.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>

                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${event.gradient} mb-4 flex items-center justify-center shadow-lg`}>
                    {event.icon}
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-3">{event.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative z-10 py-20 px-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Events Annually' },
              { value: '10,000+', label: 'Active Students' },
              { value: '100+', label: 'Expert Speakers' },
              { value: '50+', label: 'Student Clubs' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of students exploring amazing opportunities at GUC
          </p>
          <button
            onClick={() => navigate('/ChooseRole')}
            className="group relative px-10 py-5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-lg rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/50"
          >
            <span className="relative z-10">Create Your Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
