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
        return { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-300', label: 'Pending Approval' };
      case 'published':
        return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-300', label: 'Published' };
      case 'rejected':
        return { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-300', label: 'Rejected' };
      case 'draft':
        return { bg: 'bg-slate-700', border: 'border-slate-600', text: 'text-slate-300', label: 'Draft' };
      default:
        return { bg: 'bg-slate-700', border: 'border-slate-600', text: 'text-slate-300', label: status || 'Unknown' };
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
      <div className="bg-slate-900/50 p-16 rounded-2xl text-center shadow-lg border border-slate-700 backdrop-blur-sm">
        <div className="text-5xl mb-6 opacity-50">🛠️</div>
        <h3 className="text-2xl font-bold text-white mb-3">
          No Workshops Found
        </h3>
        <p className="text-slate-400">
          You haven't created any workshops yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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
            className="bg-slate-800/40 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-emerald-500/50 border border-slate-700"
          >
            <div className={`p-6 ${isOpen ? 'border-b border-slate-700' : ''}`}>
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold text-white m-0">
                      {title}
                    </h3>
                    <div className={`px-3 py-1 border rounded-xl text-xs font-bold uppercase tracking-wide ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </div>
                    {hasEditRequests && (
                      <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <span>✏️</span>
                        <span>{editRequests.length} Edit Request{editRequests.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      <span>
                        Registered: <strong>{registeredCount}</strong>
                        {capacity > 0 && ` / ${capacity}`}
                      </span>
                    </div>
                    {remainingSpots !== null && (
                      <div className="flex items-center gap-2">
                        <span>✅</span>
                        <span>
                          Remaining Spots: <strong className={remainingSpots > 0 ? "text-emerald-400" : "text-red-400"}>
                            {remainingSpots}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => navigate(`/professor/workshops?edit=${workshopId}`)}
                    className="px-6 py-3 bg-slate-900 text-white border border-slate-700 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-sm hover:bg-emerald-600 hover:border-emerald-500 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    ✏️ Edit Workshop
                  </button>
                  <button
                    onClick={() => toggleParticipants(workshopId)}
                    className={`px-6 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all ${isOpen
                      ? "bg-slate-800 text-slate-400 border border-slate-600"
                      : "bg-slate-800/50 text-slate-300 border border-slate-600 hover:bg-slate-700"
                      }`}
                  >
                    {isOpen ? "Hide Participants" : "View Participants"}
                  </button>
                </div>
              </div>
            </div>

            {hasEditRequests && (
              <div className="p-6 bg-amber-900/20 border-t border-amber-500/30">
                <div className={`flex justify-between items-center ${showEditRequestsForThis ? 'mb-4' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">✏️</span>
                    <h4 className="text-base font-bold text-amber-300 m-0">
                      Edit Requests from Events Office ({editRequests.length})
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowEditRequests(prev => ({ ...prev, [workshopId]: !prev[workshopId] }))}
                    className={`px-4 py-2 border rounded-lg text-sm font-semibold text-amber-300 cursor-pointer transition-all ${showEditRequestsForThis
                      ? "bg-amber-500/20 border-amber-500/30"
                      : "bg-transparent border-amber-500/30 hover:bg-amber-500/10"
                      }`}
                  >
                    {showEditRequestsForThis ? "Hide Requests" : "Show Requests"}
                  </button>
                </div>
                {showEditRequestsForThis && (
                  <div className="flex flex-col gap-3">
                    {editRequests.map((editRequest, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-900/50 rounded-xl border border-amber-500/30 shadow-sm"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <strong className="text-amber-300 text-sm">
                            Request from Events Office
                          </strong>
                          <span className="text-slate-400 text-xs">
                            {editRequest.timestamp}
                          </span>
                        </div>
                        <p className="text-slate-300 m-0 leading-relaxed whitespace-pre-wrap text-sm">
                          {editRequest.request}
                        </p>
                      </div>
                    ))}
                    <div className="mt-2">
                      <button
                        onClick={() => navigate(`/professor/workshops?edit=${workshopId}`)}
                        className="px-5 py-2.5 bg-amber-600 text-white border-none rounded-lg text-sm font-bold cursor-pointer transition-all hover:bg-amber-500 hover:-translate-y-0.5"
                      >
                        ✏️ Edit Workshop to Address Requests
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isOpen && (
              <div className="p-6 bg-slate-900/30 border-t border-slate-700">
                {data?.loading ? (
                  <div className="text-center p-6 text-slate-400">
                    <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
                    <p>Loading participants...</p>
                  </div>
                ) : data?.error ? (
                  <div className="text-center p-6 text-red-300 bg-red-900/20 rounded-xl border border-red-500/30">
                    <div className="text-3xl mb-3">❌</div>
                    {data.error}
                  </div>
                ) : data?.participants && data.participants.length > 0 ? (
                  <div>
                    <h4 className="text-lg font-bold text-white mb-4">
                      Participants ({data.registeredCount})
                    </h4>
                    <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {data.participants.map((participant, index) => (
                        <div
                          key={participant.id || index}
                          className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 flex justify-between items-center gap-4 shadow-sm"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-white mb-1">
                              {participant.name}
                            </div>
                            <div className="text-sm text-slate-400">
                              {participant.email}
                            </div>
                          </div>
                          <div className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold">
                            #{index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    {data.remainingSpots !== null && (
                      <div className={`mt-5 p-4 rounded-xl border text-center ${data.remainingSpots > 0
                        ? "bg-emerald-900/20 border-emerald-500/30"
                        : "bg-red-900/20 border-red-500/30"
                        }`}>
                        <div className={`text-lg font-bold ${data.remainingSpots > 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                          {data.remainingSpots > 0
                            ? `${data.remainingSpots} Spot${data.remainingSpots !== 1 ? "s" : ""} Remaining`
                            : "Workshop is Full"}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-10 text-slate-400">
                    <div className="text-4xl mb-4 opacity-50">👥</div>
                    <p className="font-medium">No participants registered yet.</p>
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
