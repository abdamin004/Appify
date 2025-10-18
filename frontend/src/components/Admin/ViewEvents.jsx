import React, { useState } from "react";
import EventList from "../EventList";





function ViewEvents() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #003366 0%, #000d1a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      

      <div
        style={{
          paddingTop: "120px",
          padding: "120px 40px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

          {/* Content */}
          <EventList />
        </div>
      </div>
    </div>
  );
}

export default ViewEvents;