import React from 'react';

const EventCard = ({ event, onClick, onDelete }) => {
  const icons = { Workshop: '🛠️', Trip: '🚌', Bazaar: '🏪', Booth: '🎪', Conference: '🎤' };
  const typeColors = {
    Workshop: { bg: 'rgba(212, 175, 55, 0.15)', text: '#003366' },
    Trip: { bg: 'rgba(0, 51, 102, 0.1)', text: '#003366' },
    Bazaar: { bg: 'rgba(212, 175, 55, 0.2)', text: '#b8941f' },
    Booth: { bg: 'rgba(0, 51, 102, 0.15)', text: '#003366' },
    Conference: { bg: 'rgba(212, 175, 55, 0.15)', text: '#b8941f' }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (date) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const color = typeColors[event.type] || { bg: 'rgba(212, 175, 55, 0.1)', text: '#003366' };
  const spotsLeft = event.capacity - (event.registeredCount || 0);
  const isAlmostFull = spotsLeft <= 10 && spotsLeft > 0;
  const isFull = event.capacity > 0 && spotsLeft <= 0;

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(event._id);
  };

  const hasRegistrations = (event.registeredCount || (event.registeredUsers && event.registeredUsers.length) || 0) > 0;
  const vendorCount = typeof event.participantsCount === 'number'
    ? event.participantsCount
    : (Array.isArray(event.vendors) ? event.vendors.length : 0);

  return (
    <div onClick={onClick} className="event-card">
      {/* Image */}
      <div className="event-image" style={{ background: event.imageUrl ? `url(${event.imageUrl}) center/cover` : 'linear-gradient(135deg, #003366 0%, #001a33 100%)' }}>
        {!event.imageUrl && <span className="event-icon">{icons[event.type] || '📅'}</span>}
        {event.status === 'cancelled' && <div className="cancelled-badge">CANCELLED</div>}
      </div>

      {/* Content */}
      <div className="event-content">
        <div className="event-header">
          <span className="type-badge" style={{ background: color.bg, color: color.text }}>{event.type}</span>
          {event.price > 0 && <span className="price">${event.price}</span>}
        </div>

        <h3 className="event-title">{event.title}</h3>
        <p className="event-description">{event.shortDescription || event.description || 'No description available'}</p>

        <div className="event-details">
          <div className="detail-row">
            <span>📅</span>
            <span>{formatDate(event.startDate)} • {formatTime(event.startDate)}</span>
          </div>
          <div className="detail-row">
            <span>📍</span>
            <span>{event.location}</span>
          </div>

          {event.capacity > 0 && (
            <div className="detail-row" style={{ color: isFull ? '#dc2626' : isAlmostFull ? '#d97706' : '#003366' }}>
              <span>👥</span>
              <span>{isFull ? 'Full' : isAlmostFull ? `Only ${spotsLeft} spots left!` : `${event.registeredCount || 0} / ${event.capacity} registered`}</span>
            </div>
          )}

          {false && (event.type === 'Bazaar' || event.type === 'Booth') && event.vendors?.length > 0 && (
            <div className="vendor-info">
              🏪 {event.vendors.length} Vendor{event.vendors.length > 1 ? 's' : ''} Participating
            </div>
          )}

          {(event.type === 'Bazaar' || event.type === 'Booth') && vendorCount > 0 && (
            <div className="vendor-info">
              Vendors Participating: {vendorCount}
              {Array.isArray(event.participants) && event.participants.length > 0 && (
                <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#6b7280' }}>
                  {(() => {
                    const names = (event.participants || [])
                      .map(p => (p && (p.organization || p.vendorCompany || p.vendorEmail)) || null)
                      .filter(Boolean);
                    const shown = names.slice(0, 3);
                    const extra = Math.max(0, names.length - shown.length);
                    return `${shown.join(', ')}${extra > 0 ? ` and ${extra} more` : ''}`;
                  })()}
                </div>
              )}
            </div>
          )}

          {event.registrationDeadline && new Date(event.registrationDeadline) > new Date() && (
            <div className="deadline-info">⏰ Register by {formatDate(event.registrationDeadline)}</div>
          )}
         
        </div>
      </div>

      <style jsx>{`
        .event-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 51, 102, 0.15);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
          border: 2px solid transparent;
        }
        .event-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 24px rgba(212, 175, 55, 0.25);
          border: 2px solid rgba(212, 175, 55, 0.3);
        }
        .event-image {
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .event-icon {
          font-size: 4rem;
        }
        .cancelled-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 6px 12px;
          background: #dc2626;
          color: white;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: bold;
        }
        .event-content {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .type-badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid rgba(212, 175, 55, 0.2);
        }
        .price {
          font-size: 1.1rem;
          font-weight: bold;
          color: #d4af37;
        }
        .event-title {
          font-size: 1.25rem;
          font-weight: bold;
          color: #003366;
          margin-bottom: 10px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.6rem;
        }
        .event-description {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 16px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }
        .event-details {
          border-top: 2px solid rgba(212, 175, 55, 0.2);
          padding-top: 16px;
          margin-top: auto;
        }
        .detail-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 0.9rem;
          color: #003366;
          font-weight: 500;
        }
        .vendor-info {
          margin-top: 12px;
          padding: 10px 12px;
          background: rgba(212, 175, 55, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(212, 175, 55, 0.3);
          font-size: 0.85rem;
          color: #b8941f;
          font-weight: 600;
        }
        .deadline-info {
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(212, 175, 55, 0.15);
          border-radius: 8px;
          font-size: 0.8rem;
          color: #003366;
          font-weight: 500;
          border: 1px solid rgba(212, 175, 55, 0.25);
        }
      `}</style>
    </div>
  );
};

export default EventCard;
