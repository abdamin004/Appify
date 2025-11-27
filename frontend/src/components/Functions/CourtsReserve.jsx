import React, { useState, useMemo, useEffect } from "react";
import courtService from "../../services/courtService";
import { showToast } from "../../utils/toast";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from "../../utils/designSystem";

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
      <div style={{ 
        background: colors.bgCard, 
        padding: `${spacing['6xl']} ${spacing['2xl']}`, 
        borderRadius: borderRadius['2xl'], 
        textAlign: "center", 
        boxShadow: shadows.lg,
        border: `1px solid ${colors.gray200}`,
      }}>
        <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.xl }}>📦</div>
        <h3 style={{ 
          fontSize: typography.fontSize.xl, 
          color: colors.primary, 
          marginBottom: spacing.md,
          fontWeight: typography.fontWeight.bold,
        }}>Loading...</h3>
        <p style={{ color: colors.gray500, fontSize: typography.fontSize.base }}>Please wait while we fetch court information.</p>
      </div>
    );
  }

  if (courts.length === 0) {
    return (
      <div style={{ 
        background: colors.bgCard, 
        padding: `${spacing['6xl']} ${spacing['2xl']}`, 
        borderRadius: borderRadius['2xl'], 
        textAlign: "center", 
        boxShadow: shadows.lg,
        border: `1px solid ${colors.gray200}`,
      }}>
        <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.xl }}>🏟️</div>
        <h3 style={{ 
          fontSize: typography.fontSize.xl, 
          color: colors.primary, 
          marginBottom: spacing.md,
          fontWeight: typography.fontWeight.bold,
        }}>No courts available</h3>
        <p style={{ color: colors.gray500, fontSize: typography.fontSize.base }}>There are no courts listed at the moment.</p>
      </div>
    );
  }

  const getCourtIcon = (type) => {
    const icons = { basketball: "🏀", tennis: "🎾", football: "⚽" };
    return icons[(type || '').toLowerCase()] || "🏟️";
  };

  const getCourtColor = (type) => {
    const colors = { basketball: "#ff6b35", tennis: "#00b4d8", football: "#06d6a0" };
    return colors[(type || '').toLowerCase()] || "#6b7280";
  };

  const getCourtColorDark = (type) => {
    const colors = { basketball: "#e63946", tennis: "#0077b6", football: "#048067" };
    return colors[(type || '').toLowerCase()] || "#4b5563";
  };

  // Get available slots for selected court, filtered by date
  const availableSlots = useMemo(() => {
    if (!selectedCourt) return [];
    
    // Use availability array if available, otherwise fall back to availabilityDates
    const allSlots = Array.isArray(selectedCourt.availability) 
      ? selectedCourt.availability 
      : Array.isArray(selectedCourt.availabilityDates)
        ? selectedCourt.availabilityDates.map(s => ({
            _id: s.slotId || s._id,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            isBooked: false // availabilityDates are pre-filtered to available only
          }))
        : [];
    
    // Filter out booked slots and past slots
    const now = new Date();
    let slots = allSlots.filter(slot => {
      if (slot.isBooked) return false;
      
      // Filter out past slots
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
    
    // Filter by selected date if provided
    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);
      
      slots = slots.filter(slot => {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate.getTime() === filterDate.getTime();
      });
    }
    
    // Sort by date and time
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
    
    // Use availability array if available, otherwise fall back to availabilityDates
    const allSlots = Array.isArray(selectedCourt.availability) 
      ? selectedCourt.availability 
      : Array.isArray(selectedCourt.availabilityDates)
        ? selectedCourt.availabilityDates
        : [];
    
    const now = new Date();
    const dates = new Set();
    
    allSlots
      .filter(slot => {
        // Filter out booked slots
        if (slot.isBooked) return false;
        
        // Filter out past slots
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
      // If clicking the same court, close it
      setSelectedCourt(null);
      setSelectedDate('');
    } else {
      // Open new court
      setSelectedCourt(court);
      setSelectedDate('');
    }
  };

  const handleReserve = async (courtId, slotId) => {
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
      
      // Update selected court to reflect the booking immediately
      if (selectedCourt && (selectedCourt._id || selectedCourt.id) === courtId) {
        const updatedCourt = { ...selectedCourt };
        
        // Update in availability array if it exists
        if (Array.isArray(updatedCourt.availability)) {
          const slot = updatedCourt.availability.find(s => String(s._id) === String(slotId));
          if (slot) {
            slot.isBooked = true;
          }
        }
        
        // Update in availabilityDates array if it exists
        if (Array.isArray(updatedCourt.availabilityDates)) {
          updatedCourt.availabilityDates = updatedCourt.availabilityDates.filter(
            s => String(s.slotId || s._id) !== String(slotId)
          );
        }
        
        setSelectedCourt(updatedCourt);
      }
      
      // Refresh the court data by calling onReserved callback
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
    <div>
      {/* Courts List - Only show courts, no slots */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
        gap: spacing['3xl'],
        marginBottom: selectedCourt ? spacing['3xl'] : 0
      }}>
        {courts.map((court) => {
          const courtId = court._id || court.id;
          const isSelected = selectedCourt && (selectedCourt._id || selectedCourt.id) === courtId;
          
          // Calculate available count from availability or availabilityDates
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
              style={{ 
                background: colors.bgCard, 
                borderRadius: borderRadius['2xl'], 
                overflow: "hidden", 
                boxShadow: isSelected ? shadows.xl : shadows.lg, 
                transition: transitions.normal,
                border: `2px solid ${isSelected ? colors.accent : colors.gray200}`,
                cursor: "pointer",
                transform: isSelected ? 'translateY(-5px)' : 'translateY(0)',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = shadows.xl;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = shadows.lg;
                }
              }}
            >
              <div style={{ 
                height: "200px", 
                background: `linear-gradient(135deg, ${getCourtColor(court.type)} 0%, ${getCourtColorDark(court.type)} 100%)`, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                fontSize: typography.fontSize['5xl'] 
              }}>
                {getCourtIcon(court.type)}
              </div>
              <div style={{ padding: spacing['3xl'] }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: spacing.md, 
                  marginBottom: spacing.lg 
                }}>
                  <span style={{ 
                    padding: `${spacing.sm} ${spacing.lg}`, 
                    background: 'rgba(212, 175, 55, 0.15)', 
                    color: colors.accent, 
                    borderRadius: borderRadius.lg, 
                    fontSize: typography.fontSize.xs, 
                    fontWeight: typography.fontWeight.bold, 
                    textTransform: "uppercase" 
                  }}>{court.type || "Court"}</span>
                  <span style={{ 
                    padding: `${spacing.sm} ${spacing.lg}`, 
                    background: court.status === 'available' ? colors.successLight : colors.errorLight, 
                    color: court.status === 'available' ? colors.success : colors.error, 
                    borderRadius: borderRadius.lg, 
                    fontSize: typography.fontSize.xs, 
                    fontWeight: typography.fontWeight.bold 
                  }}>{court.status === 'available' ? "Available" : court.status}</span>
                </div>
                <h3 style={{ 
                  fontSize: typography.fontSize.xl, 
                  fontWeight: typography.fontWeight.bold, 
                  color: colors.primary, 
                  marginBottom: spacing.md 
                }}>{court.name || `${court.type} Court`}</h3>
                
                {(court.availability || court.availabilityDates) && (
                  <div style={{
                    padding: spacing.md,
                    background: colors.gray50,
                    borderRadius: borderRadius.lg,
                    marginTop: spacing.md,
                    textAlign: "center"
                  }}>
                    <div style={{ 
                      fontSize: typography.fontSize.sm, 
                      color: colors.gray600,
                      marginBottom: spacing.xs
                    }}>
                      {availableCount} available slot{availableCount !== 1 ? 's' : ''}
                    </div>
                    {!isSelected && (
                      <div style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.accent,
                        fontWeight: typography.fontWeight.semibold,
                        marginTop: spacing.xs
                      }}>
                        👆 Click to view and reserve slots
                      </div>
                    )}
                    {isSelected && (
                      <div style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.success,
                        fontWeight: typography.fontWeight.semibold,
                        marginTop: spacing.xs
                      }}>
                        ✓ Viewing slots below
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Court Slots View */}
      {selectedCourt && (
        <div style={{
          background: colors.bgCard,
          borderRadius: borderRadius['2xl'],
          padding: spacing['3xl'],
          boxShadow: shadows.xl,
          border: `2px solid ${colors.accent}`,
          marginTop: spacing['3xl']
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing.xl,
            flexWrap: "wrap",
            gap: spacing.md
          }}>
            <div>
              <h2 style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.primary,
                marginBottom: spacing.xs
              }}>
                {selectedCourt.name || `${selectedCourt.type} Court`}
              </h2>
              <p style={{
                fontSize: typography.fontSize.sm,
                color: colors.gray500
              }}>
                Select a date to filter available slots
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCourt(null);
                setSelectedDate('');
              }}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                background: colors.gray200,
                color: colors.primary,
                border: 'none',
                borderRadius: borderRadius.lg,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
                transition: transitions.normal
              }}
              onMouseEnter={(e) => {
                e.target.style.background = colors.gray300;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = colors.gray200;
              }}
            >
              ✕ Close
            </button>
          </div>

          {/* Date Filter */}
          {availableDates.length > 0 && (
            <div style={{ marginBottom: spacing.xl }}>
              <label style={{
                display: "block",
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.primary,
                marginBottom: spacing.sm
              }}>
                Filter by Date:
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  ...inputStyles.base,
                  padding: `${spacing.md} ${spacing.lg}`,
                  fontSize: typography.fontSize.base,
                  minWidth: '250px',
                  cursor: 'pointer'
                }}
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

          {/* Available Slots */}
          {availableSlots.length > 0 ? (
            <div>
              <h3 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.primary,
                marginBottom: spacing.lg
              }}>
                Available Slots {selectedDate && `for ${new Date(selectedDate).toLocaleDateString()}`}
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: spacing.lg
              }}>
                {availableSlots.map((slot) => {
                  const courtId = selectedCourt._id || selectedCourt.id;
                  const slotId = slot._id || slot.id;
                  const slotKey = `${courtId}_${slotId}`;
                  const isReserving = reserving[slotKey];
                  
                  return (
                    <div
                      key={slotId}
                      style={{
                        padding: spacing.lg,
                        background: colors.gray50,
                        borderRadius: borderRadius.lg,
                        border: `1px solid ${colors.gray200}`,
                        transition: transitions.normal
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.white;
                        e.currentTarget.style.borderColor = colors.accent;
                        e.currentTarget.style.boxShadow = shadows.sm;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.gray50;
                        e.currentTarget.style.borderColor = colors.gray200;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.primary,
                        marginBottom: spacing.sm,
                        fontSize: typography.fontSize.base
                      }}>
                        📅 {new Date(slot.date).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div style={{
                        color: colors.gray600,
                        marginBottom: spacing.md,
                        fontSize: typography.fontSize.sm
                      }}>
                        ⏰ {slot.startTime} - {slot.endTime}
                      </div>
                      <button
                        onClick={() => handleReserve(courtId, slotId)}
                        disabled={isReserving}
                        style={{
                          ...buttonStyles.primary,
                          padding: `${spacing.sm} ${spacing.lg}`,
                          fontSize: typography.fontSize.sm,
                          width: '100%',
                          opacity: isReserving ? 0.7 : 1,
                          cursor: isReserving ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isReserving ? '⏳ Reserving...' : '✅ Reserve Slot'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{
              padding: spacing['3xl'],
              background: colors.gray50,
              borderRadius: borderRadius.lg,
              textAlign: "center"
            }}>
              <div style={{ fontSize: typography.fontSize['2xl'], marginBottom: spacing.md }}>📅</div>
              <h3 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.primary,
                marginBottom: spacing.sm
              }}>
                {selectedDate 
                  ? `No available slots for ${new Date(selectedDate).toLocaleDateString()}`
                  : 'No available slots'}
              </h3>
              <p style={{
                color: colors.gray500,
                fontSize: typography.fontSize.sm
              }}>
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

