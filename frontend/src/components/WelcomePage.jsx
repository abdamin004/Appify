import React, { useState } from 'react';
import Navbar from './Navbar';
import { useNavigate } from "react-router-dom";

export default function WelcomePage() {
const navigate = useNavigate();

  const [hoveredCard, setHoveredCard] = useState(null);

  const eventTypes = [
    {
      icon: '🛠️',
      title: 'Workshops',
      description: 'Hands-on learning sessions led by industry experts and professors',
      color: '#003366'
    },
    {
      icon: '🚌',
      title: 'Trips',
      description: 'Educational excursions and cultural visits across Egypt',
      color: '#d4af37'
    },
    {
      icon: '🎤',
      title: 'Conferences',
      description: 'Academic conferences featuring keynote speakers and research presentations',
      color: '#003366'
    },
    {
      icon: '🏪',
      title: 'Bazaars',
      description: 'Student markets showcasing handmade crafts, food, and creative products',
      color: '#b8941f'
    },
    {
      icon: '🎪',
      title: 'Booths',
      description: 'Exhibition spaces for student startups and innovative projects',
      color: '#d4af37'
    }
  ];


  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)',
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
      <div style={{ paddingTop: '120px', padding: '120px 40px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: '4rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '25px',
              lineHeight: '1.2',
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            Welcome to GUC Event Manager
          </h2>
          <p
            style={{
              fontSize: '1.5rem',
              color: 'rgba(212, 175, 55, 0.95)',
              marginBottom: '50px',
              maxWidth: '800px',
              margin: '0 auto 50px',
              lineHeight: '1.6'
            }}
          >
            Your gateway to discovering and participating in the vibrant community of the German University in Cairo
          </p>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            
            <button
              onClick={() => navigate('/ChooseRole')}
              style={{
                padding: '18px 40px',
                background: 'rgba(212, 175, 55, 0.15)',
                color: '#d4af37',
                border: '2px solid #d4af37',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#d4af37';
                e.target.style.color = '#003366';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(212, 175, 55, 0.15)';
                e.target.style.color = '#d4af37';
              }}
              
            >
              Get Started →
            </button>
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div style={{ padding: '80px 40px 100px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h3
              style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '15px'
              }}
            >
              What We Offer
            </h3>
            <p
              style={{
                fontSize: '1.2rem',
                color: 'rgba(212, 175, 55, 0.9)',
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
              gap: '30px'
            }}
          >
            {eventTypes.map((event, index) => (
              <div
                key={index}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '20px',
                  padding: '35px 30px',
                  textAlign: 'center',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform:
                    hoveredCard === index ? 'translateY(-10px) scale(1.02)' : 'translateY(0) scale(1)',
                  boxShadow:
                    hoveredCard === index
                      ? '0 20px 40px rgba(0, 0, 0, 0.3)'
                      : '0 8px 20px rgba(0, 0, 0, 0.2)',
                  cursor: 'pointer'
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    background: hoveredCard === index ? event.color : '#f3f4f6',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    margin: '0 auto 20px',
                    transition: 'all 0.3s',
                    transform: hoveredCard === index ? 'rotate(10deg)' : 'rotate(0deg)'
                  }}
                >
                  {event.icon}
                </div>
                <h4
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#003366',
                    marginBottom: '12px'
                  }}
                >
                  {event.title}
                </h4>
                <p
                  style={{
                    fontSize: '1rem',
                    color: '#6b7280',
                    lineHeight: '1.6'
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
          padding: '60px 40px',
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
              gap: '40px',
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
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: '#d4af37',
                    marginBottom: '10px'
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: '1.1rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: '500'
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
          padding: '80px 40px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        <h3
          style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '20px'
          }}
        >
          Ready to Get Started?
        </h3>
        <p
          style={{
            fontSize: '1.2rem',
            color: 'rgba(212, 175, 55, 0.9)',
            marginBottom: '35px',
            maxWidth: '600px',
            margin: '0 auto 35px'
          }}
        >
          Join thousands of students exploring amazing opportunities at GUC
        </p>
        <button
          onClick={() => navigate('/ChooseRole')}
          style={{
            padding: '18px 50px',
            background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            color: '#003366',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.2rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px) scale(1.05)';
            e.target.style.boxShadow = '0 12px 35px rgba(212, 175, 55, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0) scale(1)';
            e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
          }}
        >
          Create Your Account
        </button>
      </div>
    </div>
  );
}
