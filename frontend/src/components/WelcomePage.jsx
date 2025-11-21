import React, { useState } from 'react';
import Navbar from './Navbar';
import { useNavigate } from "react-router-dom";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from '../utils/designSystem';

export default function WelcomePage() {
const navigate = useNavigate();

  const [hoveredCard, setHoveredCard] = useState(null);

  const eventTypes = [
    {
      icon: '🛠️',
      title: 'Workshops',
      description: 'Hands-on learning sessions led by industry experts and professors',
      color: colors.primary
    },
    {
      icon: '🚌',
      title: 'Trips',
      description: 'Educational excursions and cultural visits across Egypt',
      color: colors.accent
    },
    {
      icon: '🎤',
      title: 'Conferences',
      description: 'Academic conferences featuring keynote speakers and research presentations',
      color: colors.primary
    },
    {
      icon: '🏪',
      title: 'Bazaars',
      description: 'Student markets showcasing handmade crafts, food, and creative products',
      color: colors.accentDark
    },
    {
      icon: '🎪',
      title: 'Booths',
      description: 'Exhibition spaces for student startups and innovative projects',
      color: colors.accent
    }
  ];


  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        position: 'relative',
        overflow: 'hidden'
      }}
    >

      {/* Animated Background */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '500px',
          height: '500px',
          background: 'rgba(212, 175, 55, 0.08)',
          borderRadius: '50%',
          filter: 'blur(80px)'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '600px',
          height: '600px',
          background: 'rgba(212, 175, 55, 0.08)',
          borderRadius: '50%',
          filter: 'blur(80px)'
        }}
      />

      {/* Hero Section */}
      <div style={{ 
        paddingTop: spacing['8xl'], 
        padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, 
        position: 'relative', 
        zIndex: 1 
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: typography.fontSize['5xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.white,
              marginBottom: spacing['3xl'],
              lineHeight: typography.lineHeight.tight,
              textShadow: shadows.lg
            }}
          >
            Welcome to GUC Event Manager
          </h2>
          <p
            style={{
              fontSize: typography.fontSize.xl,
              color: colors.accent,
              marginBottom: spacing['5xl'],
              maxWidth: '800px',
              margin: `0 auto ${spacing['5xl']}`,
              lineHeight: typography.lineHeight.relaxed
            }}
          >
            Your gateway to discovering and participating in the vibrant community of the German University in Cairo
          </p>

          <div style={{ display: 'flex', gap: spacing.xl, justifyContent: 'center', flexWrap: 'wrap' }}>
            
            <button
              onClick={() => navigate('/ChooseRole')}
              style={{
                ...buttonStyles.secondary,
                padding: `${spacing.lg} ${spacing['2xl']}`,
                fontSize: typography.fontSize.lg,
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = colors.accent;
                e.target.style.color = colors.primary;
                e.target.style.boxShadow = shadows.accent;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = colors.accent;
                e.target.style.boxShadow = 'none';
              }}
              
            >
              Get Started →
            </button>
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div style={{ 
        padding: `${spacing['6xl']} ${spacing['2xl']} ${spacing['7xl']}`, 
        position: 'relative', 
        zIndex: 1 
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: spacing['6xl'] }}>
            <h3
              style={{
                fontSize: typography.fontSize['3xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.white,
                marginBottom: spacing.lg
              }}
            >
              What We Offer
            </h3>
            <p
              style={{
                fontSize: typography.fontSize.lg,
                color: colors.accent,
                maxWidth: '700px',
                margin: '0 auto'
              }}
            >
              Explore a diverse range of events designed to enrich your university experience
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: spacing['3xl']
            }}
          >
            {eventTypes.map((event, index) => (
              <div
                key={index}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: colors.bgCard,
                  borderRadius: borderRadius['2xl'],
                  padding: `${spacing['3xl']} ${spacing['3xl']}`,
                  textAlign: 'center',
                  transition: transitions.slow,
                  transform:
                    hoveredCard === index ? 'translateY(-10px) scale(1.02)' : 'translateY(0) scale(1)',
                  boxShadow:
                    hoveredCard === index
                      ? shadows.xl
                      : shadows.md,
                  cursor: 'pointer',
                  border: hoveredCard === index ? `2px solid ${colors.accent}` : `2px solid transparent`,
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    background: hoveredCard === index ? event.color : colors.gray100,
                    borderRadius: borderRadius['2xl'],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: typography.fontSize['3xl'],
                    margin: `0 auto ${spacing.xl}`,
                    transition: transitions.normal,
                    transform: hoveredCard === index ? 'rotate(10deg)' : 'rotate(0deg)'
                  }}
                >
                  {event.icon}
                </div>
                <h4
                  style={{
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.primary,
                    marginBottom: spacing.lg
                  }}
                >
                  {event.title}
                </h4>
                <p
                  style={{
                    fontSize: typography.fontSize.base,
                    color: colors.gray500,
                    lineHeight: typography.lineHeight.relaxed
                  }}
                >
                  {event.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div
        style={{
          padding: `${spacing['6xl']} ${spacing['2xl']}`,
          background: 'rgba(212, 175, 55, 0.1)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: spacing['2xl'],
              textAlign: 'center'
            }}
          >
            {[
              { value: '500+', label: 'Events Annually' },
              { value: '10,000+', label: 'Active Students' },
              { value: '100+', label: 'Expert Speakers' },
              { value: '50+', label: 'Student Clubs' }
            ].map((stat, index) => (
              <div key={index}>
                <div
                  style={{
                    fontSize: typography.fontSize['4xl'],
                    fontWeight: typography.fontWeight.bold,
                    color: colors.accent,
                    marginBottom: spacing.md
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.lg,
                    color: colors.white,
                    fontWeight: typography.fontWeight.medium
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div
        style={{
          padding: `${spacing['6xl']} ${spacing['2xl']}`,
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        <h3
          style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.white,
            marginBottom: spacing.xl
          }}
        >
          Ready to Get Started?
        </h3>
        <p
          style={{
            fontSize: typography.fontSize.lg,
            color: colors.accent,
            marginBottom: spacing['3xl'],
            maxWidth: '600px',
            margin: `0 auto ${spacing['3xl']}`
          }}
        >
          Join thousands of students exploring amazing opportunities at GUC
        </p>
        <button
          onClick={() => navigate('/ChooseRole')}
          style={{
            ...buttonStyles.primary,
            padding: `${spacing.lg} ${spacing['5xl']}`,
            fontSize: typography.fontSize.lg,
            boxShadow: shadows.lg,
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px) scale(1.05)';
            e.target.style.boxShadow = shadows.accentHover;
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0) scale(1)';
            e.target.style.boxShadow = shadows.lg;
          }}
        >
          Create Your Account
        </button>
      </div>
    </div>
  );
}
