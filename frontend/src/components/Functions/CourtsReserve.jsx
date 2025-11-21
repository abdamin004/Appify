import React from "react";
import courtService from "../../services/courtService";
import { showToast } from "../../utils/toast";
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from "../../utils/designSystem";

function CourtsReserve({ courts, onReserved }) {
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

  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
      gap: spacing['3xl'] 
    }}>
      {courts.map((court) => (
        <div 
          key={court._id || court.id} 
          style={{ 
            background: colors.bgCard, 
            borderRadius: borderRadius['2xl'], 
            overflow: "hidden", 
            boxShadow: shadows.lg, 
            transition: transitions.normal,
            border: `1px solid ${colors.gray200}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = shadows.xl;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = shadows.lg;
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
                background: court.available ? colors.successLight : colors.errorLight, 
                color: court.available ? colors.success : colors.error, 
                borderRadius: borderRadius.lg, 
                fontSize: typography.fontSize.xs, 
                fontWeight: typography.fontWeight.bold 
              }}>{court.available ? "Available" : "Occupied"}</span>
            </div>
            <h3 style={{ 
              fontSize: typography.fontSize.xl, 
              fontWeight: typography.fontWeight.bold, 
              color: colors.primary, 
              marginBottom: spacing.lg 
            }}>{court.name || `${court.type} Court`}</h3>
            {court.description && (
              <p style={{ 
                color: colors.gray500, 
                fontSize: typography.fontSize.sm, 
                marginBottom: spacing.lg, 
                lineHeight: typography.lineHeight.relaxed 
              }}>{court.description.substring(0, 100)}...</p>
            )}
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: spacing.lg, 
              fontSize: typography.fontSize.sm, 
              color: colors.gray500 
            }}>
              {court.location && (
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                  <span>📍</span>
                  <span>{court.location}</span>
                </div>
              )}
              {court.availabilityDates && court.availabilityDates.length > 0 ? (
                <div style={{ marginTop: spacing.md }}>
                  <div style={{ 
                    fontSize: typography.fontSize.sm, 
                    fontWeight: typography.fontWeight.semibold, 
                    color: colors.primary, 
                    marginBottom: spacing.sm 
                  }}>Available Dates & Times:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                    {court.availabilityDates.slice(0, 3).map((slot, idx) => (
                      <div key={slot.slotId || idx} style={{ 
                        padding: `${spacing.sm} ${spacing.lg}`, 
                        background: colors.gray50, 
                        borderRadius: borderRadius.lg, 
                        fontSize: typography.fontSize.xs 
                      }}>
                        <div style={{ 
                          fontWeight: typography.fontWeight.semibold, 
                          color: colors.primary 
                        }}>📅 {new Date(slot.date).toLocaleDateString()}</div>
                        <div style={{ 
                          color: colors.gray500, 
                          marginTop: spacing.xs 
                        }}>⏰ {slot.startTime} - {slot.endTime}</div>
                        <div style={{ marginTop: spacing.sm }}>
                          <button
                            onClick={async () => {
                              const cid = court._id || court.id;
                              const sid = slot.slotId;
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
                                const res = await courtService.reserveCourt(cid, sid);
                                const apiMsg = res && res.message;
                                const name = (res && res.booking && res.booking.studentName) || userName;
                                showToast.success(apiMsg || `Court reserved successfully. Reserved by ${name}.`);
                              } catch (err) {
                                const errorMsg = err?.message || 'Failed to reserve court';
                                showToast.error(errorMsg);
                              } finally {
                                if (typeof onReserved === 'function') onReserved(cid, sid);
                              }
                            }}
                            style={{ 
                              ...buttonStyles.primary,
                              padding: `${spacing.sm} ${spacing.md}`,
                              fontSize: typography.fontSize.xs,
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.boxShadow = shadows.accentHover;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.boxShadow = shadows.accent;
                            }}
                          >
                            Reserve
                          </button>
                        </div>
                      </div>
                    ))}
                    {court.availabilityDates.length > 3 && (
                      <div style={{ 
                        fontSize: typography.fontSize.xs, 
                        color: colors.accent, 
                        fontWeight: typography.fontWeight.semibold, 
                        marginTop: spacing.xs 
                      }}>+{court.availabilityDates.length - 3} more slots</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ 
                  padding: spacing.md, 
                  background: colors.errorLight, 
                  borderRadius: borderRadius.lg, 
                  fontSize: typography.fontSize.xs, 
                  color: colors.error, 
                  textAlign: "center" 
                }}>No availability slots at the moment</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CourtsReserve;
