import React from "react";
import EventList from "../EventList";
import { deleteEvent } from "../../services/eventService";
import { showToast, confirmDialog } from "../../utils/toast";

function ViewEvents() {
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
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">


      <EventList
        onDelete={handleDeleteEvent}
        enableFavorites={false}
      />
    </div>
  );
}

export default ViewEvents;