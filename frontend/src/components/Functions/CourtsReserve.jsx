import React, { useState, useMemo, useEffect } from "react";
import courtService from "../../services/courtService";
import { showToast } from "../../utils/toast";
import { checkCourtSlotOverlap } from "../../utils/overlapDetection";
import { showOverlapWarning } from "../UI/OverlapWarningDialog";

function CourtsReserve({ courts, onReserved }) {
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [reserving, setReserving] = useState({});

  // Sync selectedCourt with updated courts data
  useEffect(() => {
    if (selectedCourt && courts && Array.isArray(courts)) {
      const updatedCourt = courts.find(
        c => (c._id || c.id) === (selectedCourt._id || selectedCourt.id)
      );
      if (updatedCourt) {
        setSelectedCourt(updatedCourt);
      }
    }
  }, [courts]);

  if (!courts || !Array.isArray(courts)) {
    return (
      <div className="bg-white p-20 rounded-2xl text-center shadow-sm border border-slate-100">
        <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Loading courts...</h3>
        <p className="text-slate-500">Please wait while we fetch court information.</p>
      </div>
    );
  }

  if (courts.length === 0) {
    return (
      <div className="bg-white p-20 rounded-2xl text-center shadow-sm border border-slate-100">
        <div className="text-6xl mb-6">🏟️</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No courts available</h3>
        <p className="text-slate-500">There are no courts listed at the moment.</p>
      </div>
    );
  }

  const getCourtIcon = (type) => {
    const icons = { basketball: "🏀", tennis: "🎾", football: "⚽" };
    return icons[(type || '').toLowerCase()] || "🏟️";
  };

  const getCourtColor = (type) => {
    const colors = {
      basketball: "from-orange-500 to-red-600",
      tennis: "from-sky-400 to-blue-600",
      football: "from-emerald-400 to-teal-600"
    };
    return colors[(type || '').toLowerCase()] || "from-slate-400 to-slate-600";
  };

  // Get available slots for selected court, filtered by date
  const availableSlots = useMemo(() => {
    if (!selectedCourt) return [];

    const allSlots = Array.isArray(selectedCourt.availability)
      ? selectedCourt.availability
      : Array.isArray(selectedCourt.availabilityDates)
        ? selectedCourt.availabilityDates.map(s => ({
          _id: s.slotId || s._id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          isBooked: false
        }))
        : [];

    const now = new Date();
    let slots = allSlots.filter(slot => {
      if (slot.isBooked) return false;
      try {
        const slotDate = new Date(slot.date);
        if (!slot.startTime) return false;
        const [h, m] = slot.startTime.split(':').map(x => parseInt(x, 10));
        slotDate.setHours(h || 0, m || 0, 0, 0);
        return slotDate >= now;
      } catch (e) {
        return false;
      }
    });

    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);

      slots = slots.filter(slot => {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate.getTime() === filterDate.getTime();
      });
    }

    slots.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB;
      }
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return slots;
  }, [selectedCourt, selectedDate]);

  // Get unique dates from available slots
  const availableDates = useMemo(() => {
    if (!selectedCourt) return [];

    const allSlots = Array.isArray(selectedCourt.availability)
      ? selectedCourt.availability
      : Array.isArray(selectedCourt.availabilityDates)
        ? selectedCourt.availabilityDates
        : [];

    const now = new Date();
    const dates = new Set();

    allSlots
      .filter(slot => {
        if (slot.isBooked) return false;
        try {
          const slotDate = new Date(slot.date);
          if (!slot.startTime) return false;
          const [h, m] = slot.startTime.split(':').map(x => parseInt(x, 10));
          slotDate.setHours(h || 0, m || 0, 0, 0);
          return slotDate >= now;
        } catch (e) {
          return false;
        }
      })
      .forEach(slot => {
        const date = new Date(slot.date);
        date.setHours(0, 0, 0, 0);
        dates.add(date.toISOString().split('T')[0]);
      });

    return Array.from(dates).sort();
  }, [selectedCourt]);

  const handleCourtClick = (court) => {
    if (selectedCourt && (selectedCourt._id || selectedCourt.id) === (court._id || court.id)) {
      setSelectedCourt(null);
      setSelectedDate('');
    } else {
      setSelectedCourt(court);
      setSelectedDate('');
    }
  };

  const handleReserve = async (courtId, slotId) => {
    // Find the slot being reserved
    const slot = availableSlots.find(s => (s._id || s.id) === slotId);
    if (!slot) {
      showToast.error('Slot not found');
      return;
    }

    // Check for time overlaps with existing registrations
    try {
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${API_BASE}/events/registered`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (res.ok) {
        const registeredEvents = await res.json();
        const events = Array.isArray(registeredEvents) ? registeredEvents : [];
        const conflicts = checkCourtSlotOverlap(slot, events);
        
        if (conflicts.length > 0) {
          const courtName = selectedCourt?.name || `${selectedCourt?.type || 'Court'} Court`;
          const slotTime = `${slot.startTime} - ${slot.endTime || 'TBA'}`;
          const slotDate = new Date(slot.date);
          const proceed = await showOverlapWarning(conflicts, `${courtName} (${slotTime})`, slotDate);
          if (!proceed) {
            return; // User cancelled
          }
        }
      }
    } catch (err) {
      console.error('Error checking for overlaps:', err);
      // Continue with reservation even if overlap check fails
    }

    const slotKey = `${courtId}_${slotId}`;
    setReserving(prev => ({ ...prev, [slotKey]: true }));

    const userName = (() => {
      try {
        const raw = localStorage.getItem('user');
        const u = raw ? JSON.parse(raw) : null;
        if (!u) return 'Student';
        const n = [u.firstName, u.lastName].filter(Boolean).join(' ');
        return n || u.email || 'Student';
      } catch { return 'Student'; }
    })();

    try {
      const res = await courtService.reserveCourt(courtId, slotId);
      const apiMsg = res && res.message;
      const name = (res && res.booking && res.booking.studentName) || userName;
      showToast.success(apiMsg || `Court reserved successfully. Reserved by ${name}.`);

      if (selectedCourt && (selectedCourt._id || selectedCourt.id) === courtId) {
        const updatedCourt = { ...selectedCourt };
        if (Array.isArray(updatedCourt.availability)) {
          const slot = updatedCourt.availability.find(s => String(s._id) === String(slotId));
          if (slot) {
            slot.isBooked = true;
          }
        }
        if (Array.isArray(updatedCourt.availabilityDates)) {
          updatedCourt.availabilityDates = updatedCourt.availabilityDates.filter(
            s => String(s.slotId || s._id) !== String(slotId)
          );
        }
        setSelectedCourt(updatedCourt);
      }

      if (typeof onReserved === 'function') {
        onReserved(courtId, slotId);
      }
    } catch (err) {
      const errorMsg = err?.message || 'Failed to reserve court';
      showToast.error(errorMsg);
    } finally {
      setReserving(prev => {
        const newState = { ...prev };
        delete newState[slotKey];
        return newState;
      });
    }
  };

  return (
    <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
      <div className="text-center mb-8 relative">
        <h2 className="text-2xl font-bold text-slate-900">Sports Courts</h2>
        <p className="text-slate-500 mt-1">Reserve courts for your favorite sports</p>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${selectedCourt ? 'mb-10' : ''}`}>
        {courts.map((court) => {
          const courtId = court._id || court.id;
          const isSelected = selectedCourt && (selectedCourt._id || selectedCourt.id) === courtId;

          let availableCount = 0;
          if (Array.isArray(court.availability)) {
            const now = new Date();
            availableCount = court.availability.filter(s => {
              if (s.isBooked) return false;
              try {
                const slotDate = new Date(s.date);
                if (!s.startTime) return false;
                const [h, m] = s.startTime.split(':').map(x => parseInt(x, 10));
                slotDate.setHours(h || 0, m || 0, 0, 0);
                return slotDate >= now;
              } catch (e) {
                return false;
              }
            }).length;
          } else if (Array.isArray(court.availabilityDates)) {
            availableCount = court.availabilityDates.length;
          }

          return (
            <div
              key={courtId}
              onClick={() => handleCourtClick(court)}
              className={`bg-white rounded-2xl overflow-hidden shadow-sm transition-all duration-300 cursor-pointer group border ${isSelected
                ? 'border-amber-400 ring-2 ring-amber-400 ring-offset-2 shadow-lg -translate-y-1'
                : 'border-slate-100 hover:shadow-md hover:-translate-y-1 hover:border-slate-200'
                }`}
            >
              <div className={`h-48 bg-gradient-to-br ${getCourtColor(court.type)} flex items-center justify-center text-6xl shadow-inner`}>
                <span className="transform group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">
                  {getCourtIcon(court.type)}
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">
                    {court.type || "Court"}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${court.status === 'available'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                    }`}>
                    {court.status === 'available' ? "Available" : court.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                  {court.name || `${court.type} Court`}
                </h3>

                {(court.availability || court.availabilityDates) && (
                  <div className={`p-4 rounded-xl mt-4 text-center transition-colors ${isSelected ? 'bg-amber-50' : 'bg-slate-50 group-hover:bg-slate-100'}`}>
                    <div className="text-sm text-slate-700 font-semibold mb-1">
                      {availableCount} available slot{availableCount !== 1 ? 's' : ''}
                    </div>
                    {!isSelected && (
                      <div className="text-xs text-slate-500 font-medium mt-1">
                        Click to view slots
                      </div>
                    )}
                    {isSelected && (
                      <div className="text-xs text-amber-600 font-bold mt-1">
                        Viewing slots below
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedCourt && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-100 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                {selectedCourt.name || `${selectedCourt.type} Court`}
              </h2>
              <p className="text-slate-500">
                Select a date to filter available slots
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCourt(null);
                setSelectedDate('');
              }}
              className="btn btn-ghost btn-sm text-slate-500 hover:text-slate-800"
            >
              ✕ Close View
            </button>
          </div>

          {availableDates.length > 0 && (
            <div className="mb-8 max-w-xs">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Filter by Date
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="select select-bordered w-full bg-slate-50 focus:bg-white transition-colors"
              >
                <option value="">All Available Dates</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableSlots.length > 0 ? (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                Available Slots {selectedDate && `for ${new Date(selectedDate).toLocaleDateString()}`}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {availableSlots.map((slot) => {
                  const courtId = selectedCourt._id || selectedCourt.id;
                  const slotId = slot._id || slot.id;
                  const slotKey = `${courtId}_${slotId}`;
                  const isReserving = reserving[slotKey];

                  return (
                    <div
                      key={slotId}
                      className="p-5 bg-white rounded-xl border border-slate-200 transition-all hover:border-emerald-400 hover:shadow-md group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-emerald-400 transition-colors"></div>
                      <div className="pl-2">
                        <div className="font-bold text-slate-900 mb-1 text-base">
                          {new Date(slot.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-slate-500 mb-4 text-sm font-medium flex items-center gap-1">
                          ⏰ {slot.startTime} - {slot.endTime}
                        </div>
                        <button
                          onClick={() => handleReserve(courtId, slotId)}
                          disabled={isReserving}
                          className={`w-full py-2.5 px-4 rounded-lg text-sm font-bold transition-all shadow-sm ${isReserving
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-md hover:-translate-y-0.5'
                            }`}
                        >
                          {isReserving ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="loading loading-spinner loading-xs"></span>
                              Reserving...
                            </span>
                          ) : 'Reserve Slot'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-16 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-300">
              <div className="text-5xl mb-4 opacity-50">📅</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {selectedDate
                  ? `No slots available on ${new Date(selectedDate).toLocaleDateString()}`
                  : 'No available slots'}
              </h3>
              <p className="text-slate-500">
                {selectedDate
                  ? 'Try selecting a different date or check back later.'
                  : 'All slots for this court are currently booked.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CourtsReserve;
