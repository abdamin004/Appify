import React, { useEffect, useState } from "react";
import EventCard from "./EventCard";
import Navbar from "./Navbar.jsx";
import "./Events.css";

function EventList() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/events");
        if (!response.ok) throw new Error("Failed to fetch events");
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="events-page">
      <Navbar />
      <h2 className="events-title">Upcoming Events</h2>
      <div className="events-container">
        {events.length > 0 ? (
          events.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              onViewDetails={() => setSelectedEvent(event)}
            />
          ))
        ) : (
          <p className="no-events">No upcoming events found.</p>
        )}
      </div>

      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedEvent.name}</h3>
            <p><strong>Type:</strong> {selectedEvent.type}</p>
            <p><strong>Date:</strong> {selectedEvent.date}</p>
            <p><strong>Location:</strong> {selectedEvent.location}</p>
            <p><strong>Description:</strong> {selectedEvent.description}</p>
            {selectedEvent.type === "bazaar" || selectedEvent.type === "booth" ? (
              <>
                <h4>Participating Vendors:</h4>
                <ul>
                  {selectedEvent.vendors?.length > 0 ? (
                    selectedEvent.vendors.map((vendor, idx) => (
                      <li key={idx}>{vendor.name || vendor}</li>
                    ))
                  ) : (
                    <p>No vendors registered yet.</p>
                  )}
                </ul>
              </>
            ) : null}
            <button className="close-btn" onClick={() => setSelectedEvent(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventList;
