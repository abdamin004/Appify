import React from 'react';

const AdminEventCard = ({ event, onClick, onDelete, onArchive, hasEventPassed, onGenerateQR }) => {
  const icons = { Workshop: '🛠️', Trip: '🚌', Bazaar: '🏪', Booth: '🎪', Conference: '🎤' };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (date) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const spotsLeft = event.capacity - (event.registeredCount || 0);
  const isAlmostFull = spotsLeft <= 10 && spotsLeft > 0;
  const isFull = event.capacity > 0 && spotsLeft <= 0;

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(event._id);
  };

  const handleArchiveClick = (e) => {
    e.stopPropagation();
    if (onArchive) onArchive(event._id, event);
  };

  const handleQRCodeClick = (e) => {
    e.stopPropagation();
    if (onGenerateQR) {
      console.log('Generating QR code for event:', event.title, event.type);
      onGenerateQR(event);
    } else {
      console.warn('onGenerateQR prop not provided');
    }
  };

  const eventHasPassed = hasEventPassed ? hasEventPassed(event) : false;
  // Check if archived (backend status or frontend localStorage)
  const isArchived = event.status === 'completed' || (typeof window !== 'undefined' && (() => {
    try {
      const stored = localStorage.getItem('archivedEvents');
      const archivedSet = stored ? new Set(JSON.parse(stored)) : new Set();
      return archivedSet.has(event._id);
    } catch {
      return false;
    }
  })());

  const hasRegistrations = (event.registeredCount || (event.registeredUsers && event.registeredUsers.length) || 0) > 0;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-md overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-transparent hover:border-emerald-500/30 cursor-pointer"
    >
      {/* Image */}
      <div
        className="h-48 relative bg-slate-900 flex items-center justify-center overflow-hidden"
        style={{ background: event.imageUrl ? `url(${event.imageUrl}) center/cover` : undefined }}
      >
        {!event.imageUrl && (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <span className="text-6xl">{icons[event.type] || '📅'}</span>
          </div>
        )}
        {event.status === 'cancelled' && (
          <div className="absolute top-4 right-4 px-2 py-1 bg-red-600 text-white rounded-md text-xs font-bold z-10 shadow-sm">
            CANCELLED
          </div>
        )}
        {isArchived && (
          <div className="absolute top-4 right-4 px-2 py-1 bg-slate-600 text-white rounded-md text-xs font-bold z-10 shadow-sm">
            ARCHIVED
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${event.type === 'Workshop' ? 'bg-amber-50 text-amber-800 border-amber-200' :
              event.type === 'Trip' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                event.type === 'Bazaar' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                  event.type === 'Booth' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                    'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
            {event.type}
          </span>
          {event.price > 0 && (
            <span className="text-lg font-bold text-emerald-600">{event.price} EGP</span>
          )}
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 min-h-[3.5rem]">
          {event.title}
        </h3>
        <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">
          {event.shortDescription || event.description || 'No description available'}
        </p>

        <div className="border-t border-slate-100 pt-4 mt-auto space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
            <span>📅</span>
            <span>{formatDate(event.startDate)} • {formatTime(event.startDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
            <span>📍</span>
            <span>{event.location}</span>
          </div>

          {event.capacity > 0 && (
            <div className={`flex items-center gap-2 text-sm font-medium ${isFull ? 'text-red-600' : isAlmostFull ? 'text-amber-600' : 'text-emerald-600'
              }`}>
              <span>👥</span>
              <span>{isFull ? 'Full' : isAlmostFull ? `Only ${spotsLeft} spots left!` : `${event.registeredCount || 0} / ${event.capacity} registered`}</span>
            </div>
          )}

          {(event.type === 'Bazaar' || event.type === 'Booth') && event.vendors?.length > 0 && (
            <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 font-medium">
              🏪 {event.vendors.length} Vendor{event.vendors.length > 1 ? 's' : ''} Participating
            </div>
          )}

          {(event.type === 'Bazaar' || event.type === 'Booth') && (!Array.isArray(event.vendors) || event.vendors.length === 0) &&
            typeof event.participantsCount === 'number' && event.participantsCount > 0 && (
              <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 font-medium">
                Vendors Participating: {event.participantsCount}
                {Array.isArray(event.participants) && event.participants.length > 0 && (
                  <div className="mt-1 text-xs text-slate-500">
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
            <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800 font-medium">
              ⏰ Register by {formatDate(event.registrationDeadline)}
            </div>
          )}

          {/* Action buttons for admins */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            {/* Show QR code button for Bazaar, Booth, Conference events when onGenerateQR is provided */}
            {onGenerateQR && (
              <button
                onClick={handleQRCodeClick}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 rounded-lg font-bold text-sm hover:from-amber-500 hover:to-amber-600 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <span>📱</span> Generate QR
              </button>
            )}
            {onDelete && !hasRegistrations && (
              <button
                onClick={handleDeleteClick}
                className="py-2 px-3 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
              >
                Delete
              </button>
            )}
            {onArchive && eventHasPassed && !isArchived && (
              <button
                onClick={handleArchiveClick}
                className="py-2 px-3 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
              >
                Archive
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEventCard;
