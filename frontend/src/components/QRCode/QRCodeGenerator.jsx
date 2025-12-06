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
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-[500px] w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 m-0">QR Code for External Visitors</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            ×
          </button>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">{event.title || 'Event'}</h3>
          <p className="text-slate-500 text-sm mb-4">
            {event.type || 'Event'} • {event.location || 'Location TBA'}
          </p>
        </div>

        {qrUrl ? (
          <div className="text-center mb-6">
            <img
              src={qrUrl}
              alt="QR Code"
              className="w-[300px] h-[300px] border border-slate-200 rounded-xl p-2 bg-white mx-auto shadow-sm"
            />
            <p className="text-slate-500 text-sm mt-4">
              Scan this QR code to register for the event
            </p>
          </div>
        ) : (
          <div className="text-center p-10 text-slate-500">
            <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
            <p>Generating QR code...</p>
          </div>
        )}

        {registrationUrl && (
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500 mb-2 font-bold">
              Registration URL:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={registrationUrl}
                readOnly
                onClick={(e) => e.target.select()}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(registrationUrl).then(() => {
                    showToast.success('URL copied to clipboard!');
                  }).catch(() => {
                    showToast.error('Failed to copy URL to clipboard');
                  });
                }}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={downloadQRCode}
            disabled={!qrUrl || downloading}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 ${downloading
              ? 'bg-slate-400 text-white cursor-not-allowed'
              : 'bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-md hover:-translate-y-0.5'
              }`}
          >
            {downloading ? 'Downloading...' : '📥 Download QR Code'}
          </button>
          <button
            onClick={printQRCode}
            disabled={!qrUrl}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border ${!qrUrl
              ? 'border-slate-200 text-slate-400 cursor-not-allowed'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
          >
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
}

export default QRCodeGenerator;
