import React, { useState, useRef } from 'react';
import { showToast } from '../../utils/toast';

function QRCodeGenerator({ event, onClose }) {
  const [qrUrl, setQrUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const canvasRef = useRef(null);

  // Get the public URL for QR codes
  const getPublicUrl = () => {
    // Check if there's a stored public URL
    const stored = localStorage.getItem('qrCodePublicUrl');
    if (stored) return stored;
    
    // Check environment variable
    const envUrl = import.meta.env.VITE_PUBLIC_URL;
    if (envUrl) return envUrl;
    
    // If on localhost, we need a public URL
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      // Return empty to show input field
      return '';
    }
    
    // Otherwise use the current origin (production)
    return origin;
  };

  // Generate QR code URL using a QR code API service
  const generateQRCode = () => {
    if (!event) return;
    
    const eventId = event._id || event.id;
    if (!eventId) return;

    // Get public URL (prefer stored or env, fallback to current origin)
    const baseUrl = publicUrl || getPublicUrl() || window.location.origin;

    // Create a registration URL for external visitors
    const registrationUrl = `${baseUrl}/register-events?eventId=${eventId}&type=${event.type || 'Bazaar'}`;
    
    // Use QR Server API (free, no API key needed)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(registrationUrl)}`;
    setQrUrl(qrCodeUrl);
  };

  const handleSavePublicUrl = () => {
    if (publicUrl.trim()) {
      localStorage.setItem('qrCodePublicUrl', publicUrl.trim());
      setShowUrlInput(false);
      generateQRCode();
    }
  };

  React.useEffect(() => {
    const url = getPublicUrl();
    if (url) {
      setPublicUrl(url);
    }
    // Check if we're on localhost to show warning
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      setShowUrlInput(true);
    }
  }, []);

  React.useEffect(() => {
    if (event) {
      generateQRCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, publicUrl]);

  const downloadQRCode = async () => {
    if (!qrUrl) return;
    
    setDownloading(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR-${event.title || 'Event'}-${event._id || 'code'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading QR code:', err);
      showToast.error('Failed to download QR code. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const printQRCode = async () => {
    if (!qrUrl) return;
    
    try {
      // Fetch the QR code image and convert to base64 data URL
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64Image = reader.result;
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
          showToast.warning('Please allow popups to print the QR code');
          return;
        }
        
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${event.title || 'Event'}</title>
              <style>
                @media print {
                  body { margin: 0; padding: 20px; }
                  @page { margin: 0; }
                }
                body {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  padding: 40px;
                  font-family: Arial, sans-serif;
                  min-height: 100vh;
                }
                h2 { 
                  margin-bottom: 20px; 
                  color: #003366; 
                  font-size: 24px;
                }
                img { 
                  border: 2px solid #003366; 
                  border-radius: 10px; 
                  width: 400px;
                  height: 400px;
                  max-width: 100%;
                }
                p { 
                  margin-top: 20px; 
                  color: #6b7280; 
                  font-size: 16px;
                }
                .event-info {
                  margin-bottom: 20px;
                  text-align: center;
                  color: #6b7280;
                }
              </style>
            </head>
            <body>
              <h2>${event.title || 'Event'}</h2>
              <div class="event-info">
                ${event.type ? `<p><strong>Type:</strong> ${event.type}</p>` : ''}
                ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
                ${event.startDate ? `<p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>` : ''}
              </div>
              <img src="${base64Image}" alt="QR Code" />
              <p>Scan this QR code to register for the event</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        
        // Wait for the image to load before printing
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      };
      
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error printing QR code:', err);
      showToast.error('Failed to print QR code. Please try downloading it instead.');
    }
  };

  if (!event) return null;

  const eventId = event._id || event.id;
  const baseUrlForDisplay = publicUrl || getPublicUrl() || window.location.origin;
  const registrationUrl = eventId ? `${baseUrlForDisplay}/register-events?eventId=${eventId}&type=${event.type || 'Bazaar'}` : '';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '30px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#003366', margin: 0 }}>QR Code for External Visitors</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: '#003366', marginBottom: '10px' }}>{event.title || 'Event'}</h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '20px' }}>
            {event.type || 'Event'} • {event.location || 'Location TBA'}
          </p>
        </div>

        {qrUrl ? (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img
              src={qrUrl}
              alt="QR Code"
              style={{
                width: '300px',
                height: '300px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                padding: '10px',
                background: 'white',
              }}
            />
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '15px' }}>
              Scan this QR code to register for the event
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Generating QR code...
          </div>
        )}

        {registrationUrl && (
          <div style={{ marginBottom: '20px', padding: '15px', background: '#f3f4f6', borderRadius: '10px' }}>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 8px 0', fontWeight: 600 }}>
              Registration URL:
            </p>
            <input
              type="text"
              value={registrationUrl}
              readOnly
              onClick={(e) => e.target.select()}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#003366',
                background: 'white',
              }}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(registrationUrl).then(() => {
                  showToast.success('URL copied to clipboard!');
                }).catch(() => {
                  showToast.error('Failed to copy URL to clipboard');
                });
              }}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                background: '#e5e7eb',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                color: '#003366',
              }}
            >
              Copy URL
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', marginBottom: '10px' }}>
          <button
            onClick={downloadQRCode}
            disabled={!qrUrl || downloading}
            style={{
              padding: '12px 24px',
              background: downloading ? '#9ca3af' : 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              color: '#003366',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: downloading ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              boxShadow: downloading ? 'none' : '0 2px 8px rgba(212, 175, 55, 0.3)',
            }}
          >
            {downloading ? 'Downloading...' : '📥 Download QR Code'}
          </button>
          <button
            onClick={printQRCode}
            disabled={!qrUrl}
            style={{
              padding: '12px 24px',
              background: !qrUrl ? '#9ca3af' : 'rgba(212, 175, 55, 0.15)',
              color: '#003366',
              border: '2px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: !qrUrl ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
            }}
          >
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
}

export default QRCodeGenerator;

