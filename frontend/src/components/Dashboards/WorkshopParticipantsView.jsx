import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getEventById } from "../../services/eventService";

function WorkshopParticipantsView({ workshops }) {
  const navigate = useNavigate();
  const [participantsData, setParticipantsData] = useState({}); // { [workshopId]: { participants: [], loading: boolean, error: string } }
  const [openWorkshopId, setOpenWorkshopId] = useState(null);
  const [showEditRequests, setShowEditRequests] = useState({}); // { [workshopId]: boolean }

  // Parse edit requests from workshop description
  const parseEditRequests = (description) => {
    if (!description) return [];
    const requests = [];
    const regex = /--- EDIT REQUEST FROM EVENTS OFFICE \(([^)]+)\) ---\s*([\s\S]*?)\s*--- END EDIT REQUEST ---/g;
    let match;
    while ((match = regex.exec(description)) !== null) {
      requests.push({
        timestamp: match[1],
        request: match[2].trim(),
      });
    }
    return requests;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#d97706', label: 'Pending Approval' };
      case 'published':
        return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981', label: 'Published' };
      case 'rejected':
        return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', label: 'Rejected' };
      case 'draft':
        return { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)', text: '#6b7280', label: 'Draft' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)', text: '#6b7280', label: status || 'Unknown' };
    }
  };

  const fetchParticipants = async (workshopId) => {
    if (participantsData[workshopId]?.loading) return; // Already loading
    
    setParticipantsData(prev => ({
      ...prev,
      [workshopId]: { ...prev[workshopId], loading: true, error: null }
    }));

    try {
      const event = await getEventById(workshopId);
      const registeredUsers = event?.registeredUsers || [];
      const capacity = event?.capacity || 0;
      const registeredCount = Array.isArray(registeredUsers) ? registeredUsers.length : 0;
      const remainingSpots = capacity > 0 ? Math.max(0, capacity - registeredCount) : null;

      // Fetch user details for each registered user
      const participants = [];
      if (Array.isArray(registeredUsers)) {
        for (const userRef of registeredUsers) {
          let userInfo = null;
          // If userRef is already populated (has name/email), use it
          if (typeof userRef === 'object' && userRef !== null && (userRef.firstName || userRef.lastName || userRef.email || userRef.name)) {
            userInfo = {
              id: userRef._id || userRef.id || String(userRef),
              name: `${userRef.firstName || ''} ${userRef.lastName || ''}`.trim() || userRef.name || 'Unknown User',
              email: userRef.email || 'No email provided',
            };
          } else {
            // If it's just an ID or not populated, show a generic entry
            // In a real scenario, you'd need backend support to fetch user details
            const userId = typeof userRef === 'object' && userRef !== null ? (userRef._id || userRef.id) : userRef;
            userInfo = {
              id: String(userId),
              name: `Participant ${participants.length + 1}`,
              email: 'Details not available',
            };
          }
          participants.push(userInfo);
        }
      }

      setParticipantsData(prev => ({
        ...prev,
        [workshopId]: {
          participants,
          registeredCount,
          capacity,
          remainingSpots,
          loading: false,
          error: null
        }
      }));
    } catch (err) {
      setParticipantsData(prev => ({
        ...prev,
        [workshopId]: {
          ...prev[workshopId],
          loading: false,
          error: err?.message || 'Failed to load participants'
        }
      }));
    }
  };

  const toggleParticipants = (workshopId) => {
    if (openWorkshopId === workshopId) {
      setOpenWorkshopId(null);
    } else {
      setOpenWorkshopId(workshopId);
      if (!participantsData[workshopId]) {
        fetchParticipants(workshopId);
      }
    }
  };

  if (!workshops || !Array.isArray(workshops) || workshops.length === 0) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          padding: "60px 40px",
          borderRadius: "20px",
          textAlign: "center",
          boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🛠️</div>
        <h3 style={{ fontSize: "1.5rem", color: "#003366", marginBottom: "10px" }}>
          No Workshops Found
        </h3>
        <p style={{ color: "#6b7280" }}>
          You haven't created any workshops yet.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "25px",
      }}
    >
      {workshops.map((workshop) => {
        const workshopId = workshop._id || workshop.id;
        const title = workshop.title || "Untitled Workshop";
        const capacity = workshop.capacity || 0;
        const registeredCount = workshop.registeredUsers?.length || 0;
        const remainingSpots = capacity > 0 ? Math.max(0, capacity - registeredCount) : null;
        const isOpen = openWorkshopId === workshopId;
        const data = participantsData[workshopId];
        const status = workshop.status || 'pending';
        const statusStyle = getStatusColor(status);
        const editRequests = parseEditRequests(workshop.description);
        const hasEditRequests = editRequests.length > 0;
        const showEditRequestsForThis = showEditRequests[workshopId] || false;

        return (
          <div
            key={workshopId}
            style={{
              background: "rgba(255,255,255,0.95)",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              transition: "all 0.3s",
            }}
          >
            <div
              style={{
                padding: "25px",
                borderBottom: isOpen ? "2px solid rgba(212, 175, 55, 0.3)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "15px",
                }}
              >
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px", flexWrap: "wrap" }}>
                    <h3
                      style={{
                        fontSize: "1.3rem",
                        fontWeight: "bold",
                        color: "#003366",
                        margin: 0,
                      }}
                    >
                      {title}
                    </h3>
                    <div
                      style={{
                        padding: "4px 12px",
                        background: statusStyle.bg,
                        border: `1px solid ${statusStyle.border}`,
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        color: statusStyle.text,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {statusStyle.label}
                    </div>
                    {hasEditRequests && (
                      <div
                        style={{
                          padding: "4px 12px",
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.4)",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          color: "#d97706",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>✏️</span>
                        <span>{editRequests.length} Edit Request{editRequests.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      fontSize: "0.9rem",
                      color: "#6b7280",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>👥</span>
                      <span>
                        Registered: <strong>{registeredCount}</strong>
                        {capacity > 0 && ` / ${capacity}`}
                      </span>
                    </div>
                    {remainingSpots !== null && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>✅</span>
                        <span>
                          Remaining Spots: <strong style={{ color: remainingSpots > 0 ? "#10b981" : "#ef4444" }}>
                            {remainingSpots}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => navigate(`/professor/workshops?edit=${workshopId}`)}
                    style={{
                      padding: "12px 24px",
                      background: "#f59e0b",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "0.95rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.3s",
                      boxShadow: "0 2px 4px rgba(245, 158, 11, 0.2)",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#d97706";
                      e.target.style.transform = "translateY(-1px)";
                      e.target.style.boxShadow = "0 4px 8px rgba(245, 158, 11, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "#f59e0b";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 2px 4px rgba(245, 158, 11, 0.2)";
                    }}
                  >
                    ✏️ Edit Workshop
                  </button>
                  <button
                    onClick={() => toggleParticipants(workshopId)}
                    style={{
                      padding: "12px 24px",
                      background: isOpen
                        ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                        : "rgba(212, 175, 55, 0.15)",
                      color: isOpen ? "#003366" : "#b8941f",
                      border: isOpen ? "none" : "2px solid rgba(212, 175, 55, 0.3)",
                      borderRadius: "12px",
                      fontSize: "0.95rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                  >
                    {isOpen ? "Hide Participants" : "View Participants"}
                  </button>
                </div>
              </div>
            </div>

            {hasEditRequests && (
              <div
                style={{
                  padding: "20px 25px",
                  background: "rgba(245, 158, 11, 0.08)",
                  borderTop: "2px solid rgba(245, 158, 11, 0.3)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showEditRequestsForThis ? "15px" : "0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "1.2rem" }}>✏️</span>
                    <h4
                      style={{
                        fontSize: "1rem",
                        fontWeight: "700",
                        color: "#d97706",
                        margin: 0,
                      }}
                    >
                      Edit Requests from Events Office ({editRequests.length})
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowEditRequests(prev => ({ ...prev, [workshopId]: !prev[workshopId] }))}
                    style={{
                      padding: "8px 16px",
                      background: showEditRequestsForThis ? "rgba(245, 158, 11, 0.2)" : "transparent",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: "#d97706",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "rgba(245, 158, 11, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      if (!showEditRequestsForThis) {
                        e.target.style.background = "transparent";
                      }
                    }}
                  >
                    {showEditRequestsForThis ? "Hide Requests" : "Show Requests"}
                  </button>
                </div>
                {showEditRequestsForThis && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {editRequests.map((editRequest, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "15px",
                          background: "white",
                          borderRadius: "10px",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <strong style={{ color: "#d97706", fontSize: "0.85rem" }}>
                            Request from Events Office
                          </strong>
                          <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                            {editRequest.timestamp}
                          </span>
                        </div>
                        <p
                          style={{
                            color: "#374151",
                            margin: 0,
                            lineHeight: "1.6",
                            whiteSpace: "pre-wrap",
                            fontSize: "0.9rem",
                          }}
                        >
                          {editRequest.request}
                        </p>
                      </div>
                    ))}
                    <div style={{ marginTop: "8px" }}>
                      <button
                        onClick={() => navigate(`/professor/workshops?edit=${workshopId}`)}
                        style={{
                          padding: "10px 20px",
                          background: "#f59e0b",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.9rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "#d97706";
                          e.target.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "#f59e0b";
                          e.target.style.transform = "translateY(0)";
                        }}
                      >
                        ✏️ Edit Workshop to Address Requests
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isOpen && (
              <div
                style={{
                  padding: "25px",
                  background: "rgba(212, 175, 55, 0.05)",
                  borderTop: "2px solid rgba(212, 175, 55, 0.2)",
                }}
              >
                {data?.loading ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "10px" }}>⏳</div>
                    Loading participants...
                  </div>
                ) : data?.error ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#ef4444" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "10px" }}>❌</div>
                    {data.error}
                  </div>
                ) : data?.participants && data.participants.length > 0 ? (
                  <div>
                    <h4
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "700",
                        color: "#003366",
                        marginBottom: "15px",
                      }}
                    >
                      Participants ({data.registeredCount})
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        maxHeight: "400px",
                        overflowY: "auto",
                      }}
                    >
                      {data.participants.map((participant, index) => (
                        <div
                          key={participant.id || index}
                          style={{
                            padding: "15px",
                            background: "white",
                            borderRadius: "10px",
                            border: "1px solid rgba(212, 175, 55, 0.2)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "15px",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: "600",
                                color: "#003366",
                                marginBottom: "4px",
                              }}
                            >
                              {participant.name}
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "#6b7280",
                              }}
                            >
                              {participant.email}
                            </div>
                          </div>
                          <div
                            style={{
                              padding: "6px 12px",
                              background: "rgba(212, 175, 55, 0.15)",
                              color: "#b8941f",
                              borderRadius: "8px",
                              fontSize: "0.85rem",
                              fontWeight: "600",
                            }}
                          >
                            #{index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    {data.remainingSpots !== null && (
                      <div
                        style={{
                          marginTop: "20px",
                          padding: "15px",
                          background: data.remainingSpots > 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                          borderRadius: "10px",
                          border: `2px solid ${data.remainingSpots > 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: "700",
                            color: data.remainingSpots > 0 ? "#10b981" : "#ef4444",
                          }}
                        >
                          {data.remainingSpots > 0
                            ? `${data.remainingSpots} Spot${data.remainingSpots !== 1 ? "s" : ""} Remaining`
                            : "Workshop is Full"}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "10px" }}>👥</div>
                    No participants registered yet.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default WorkshopParticipantsView;

