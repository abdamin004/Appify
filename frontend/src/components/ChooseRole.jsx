import React, { useState } from 'react';
import SignupStudent from './SignupStudent';
import SignupStaff from './SignupStaff';
import SignupVendor from './SignupVendor';
import Navbar from './Navbar';

function ChooseRole() {
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
      label: 'Staff/TA/Professor',
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)' }}>
      <Navbar />
      
      <div style={{ paddingTop: '100px', paddingBottom: '50px', padding: '100px 20px 50px 20px' }}>
        {!selectedRole ? (
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '15px' }}>
                Welcome to GU Event Manager
              </h2>
              <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
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
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    padding: '40px 30px',
                    textAlign: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      background: '#dbeafe',
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
                    color: '#1f2937', 
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
            background: 'white', 
            borderRadius: '16px', 
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', 
            padding: '40px' 
          }}>
            <button
              onClick={() => setSelectedRole('')}
              style={{
                marginBottom: '700px',
                color: '#2563eb',
                fontWeight: '500',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#2563eb'}
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