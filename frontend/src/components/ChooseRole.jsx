import React, { useState } from 'react';
import SignupStudent from './SignupStudent';
import SignupStaff from './SignupStaff';
import SignupVendor from './SignupVendor';
import Navbar from './Navbar.jsx';
import { useNavigate } from "react-router-dom";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from '../utils/designSystem';

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
    <div style={{ 
      minHeight: '100vh', 
      background: colors.bgPrimary,
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
      
      <div style={{ 
        paddingTop: spacing['8xl'], 
        paddingBottom: spacing['5xl'], 
        padding: `${spacing['8xl']} ${spacing.xl} ${spacing['5xl']}`, 
        position: 'relative', 
        zIndex: 1 
      }}>
        {!selectedRole ? (
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: spacing['6xl'] }}>
              <h2 style={{ 
                fontSize: typography.fontSize['4xl'], 
                fontWeight: typography.fontWeight.bold, 
                color: colors.white, 
                marginBottom: spacing.lg,
                textShadow: shadows.lg
              }}>
                Welcome to GUC Event Manager
              </h2>
              <p style={{ 
                fontSize: typography.fontSize.xl, 
                color: colors.accent 
              }}>
                Choose your role to get started
              </p>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: spacing['3xl'],
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  style={{
                    background: colors.bgCard,
                    borderRadius: borderRadius['2xl'],
                    boxShadow: shadows.md,
                    padding: `${spacing['2xl']} ${spacing['3xl']}`,
                    textAlign: 'center',
                    border: '2px solid transparent',
                    cursor: 'pointer',
                    transition: transitions.normal,
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = shadows.xl;
                    e.currentTarget.style.border = `2px solid ${colors.accent}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = shadows.md;
                    e.currentTarget.style.border = '2px solid transparent';
                  }}
                >
                  <div style={{ marginBottom: spacing.xl }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      background: 'rgba(212, 175, 55, 0.15)',
                      borderRadius: borderRadius.full,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      fontSize: typography.fontSize['3xl'],
                      transition: transitions.normal
                    }}>
                      {role.icon}
                    </div>
                  </div>
                  <h3 style={{ 
                    fontSize: typography.fontSize.xl, 
                    fontWeight: typography.fontWeight.bold, 
                    color: colors.primary, 
                    marginBottom: spacing.md 
                  }}>
                    {role.label}
                  </h3>
                  <p style={{ 
                    color: colors.gray500, 
                    fontSize: typography.fontSize.sm 
                  }}>
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
            background: colors.bgCard, 
            borderRadius: borderRadius['2xl'], 
            boxShadow: shadows.lg, 
            padding: spacing['2xl'],
            border: `1px solid ${colors.gray200}`,
          }}>
            <button
              onClick={() => setSelectedRole('')}
              style={{
                ...buttonStyles.back,
                marginBottom: spacing['3xl'],
                background: colors.bgCard,
                color: colors.primary,
                borderColor: colors.primary
              }}
              onMouseEnter={(e) => {
                e.target.style.background = colors.accent;
                e.target.style.color = colors.primary;
                e.target.style.borderColor = colors.accent;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = colors.bgCard;
                e.target.style.color = colors.primary;
                e.target.style.borderColor = colors.primary;
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
