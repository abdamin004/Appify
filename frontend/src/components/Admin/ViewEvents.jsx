import React from "react";
import { useNavigate } from "react-router-dom";
import EventList from "../EventList";
import { deleteEvent } from "../../services/eventService";
import { showToast, confirmDialog } from "../../utils/toast";
import { colors, spacing, buttonStyles, typography } from "../../utils/designSystem";

function ViewEvents() {
  const navigate = useNavigate();
  
  const handleDeleteEvent = async (id) => {
    const confirmed = await confirmDialog('Delete this event? This cannot be undone.', 'Delete Event');
    if (!confirmed) return;
    try {
      await deleteEvent(id);
      showToast.success('Event deleted successfully');
      // EventList will handle refreshing
    } catch (err) {
      console.error('Failed to delete event', err);
      showToast.error(err.message || 'Failed to delete event');
    }
  };

  
  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bgPrimary,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          paddingTop: spacing['8xl'],
          padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <EventList
            headerAction={
              <button
                onClick={() => navigate('/Admin')}
                style={{
                  ...buttonStyles.back,
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
                ← Back
              </button>
            }
            onDelete={handleDeleteEvent}
            enableFavorites={false}
          />
        </div>
      </div>
    </div>
  );
}

export default ViewEvents;