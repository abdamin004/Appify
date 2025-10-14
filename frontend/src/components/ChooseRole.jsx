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
      icon: '👨‍🎓',
      description: 'Discover and attend university events'
    },
    { 
      id: 'staff', 
      label: 'Staff/TA/Professor   /EventOffice',
      icon: '👔',
      description: 'Organize and manage academic events'
    },
    { 
      id: 'vendor', 
      label: 'Vendor',
      icon: '🏪',
      description: 'Provide services for university events'
    },
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Elements */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '500px',
        height: '500px',
        background: 'rgba(212, 175, 55, 0.08)',
        borderRadius: '50%',
        filter: 'blur(80px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-5%',
        width: '600px',
        height: '600px',
        background: 'rgba(212, 175, 55, 0.08)',
        borderRadius: '50%',
        filter: 'blur(80px)'
      }} />
      
      <Navbar />
      
      <div style={{ paddingTop: '100px', paddingBottom: '50px', padding: '100px 20px 50px 20px', position: 'relative', zIndex: 1 }}>
        {!selectedRole ? (
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{ 
                fontSize: '3rem', 
                fontWeight: 'bold', 
                color: 'white', 
                marginBottom: '15px',
                textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}>
                Welcome to GUC Event Manager
              </h2>
              <p style={{ fontSize: '1.3rem', color: 'rgba(212, 175, 55, 0.95)' }}>
                Choose your role to get started
              </p>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '30px',
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                    padding: '40px 30px',
                    textAlign: 'center',
                    border: '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(212, 175, 55, 0.3)';
                    e.currentTarget.style.border = '2px solid rgba(212, 175, 55, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)';
                    e.currentTarget.style.border = '2px solid transparent';
                  }}
                >
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      background: 'rgba(212, 175, 55, 0.15)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      fontSize: '2.5rem',
                      transition: 'all 0.3s ease'
                    }}>
                      {role.icon}
                    </div>
                  </div>
                  <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    color: '#003366', 
                    marginBottom: '10px' 
                  }}>
                    {role.label}
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                    {role.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ 
            maxWidth: '700px', 
            margin: '0 auto', 
            background: 'rgba(255, 255, 255, 0.95)', 
            borderRadius: '20px', 
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)', 
            padding: '40px'
          }}>
            <button
              onClick={() => setSelectedRole('')}
              style={{
                marginBottom: '30px',
                color: '#d4af37',
                fontWeight: '600',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#b8941f';
                e.currentTarget.style.transform = 'translateX(-5px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#d4af37';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              ← Back to role selection
            </button>
            
            {selectedRole === 'student' && <SignupStudent />}
            {selectedRole === 'staff' && <SignupStaff />}
            {selectedRole === 'vendor' && <SignupVendor />}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChooseRole;