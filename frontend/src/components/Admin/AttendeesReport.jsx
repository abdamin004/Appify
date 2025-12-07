import React, { useState, useEffect, useCallback, useRef } from "react";

// Full-report component that mirrors the Postman JSON 1:1 and keeps the filters/search working
import DateTimePicker from '../UI/DateTimePicker';

export default function AttendeesReport() {
  // Report pieces (match backend shape)
  const [filtersState, setFiltersState] = useState({});
  const [summary, setSummary] = useState(null);
  const [breakdownByType, setBreakdownByType] = useState([]);
  const [topEvents, setTopEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [generatedAt, setGeneratedAt] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters (controlled inputs)
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Debounce for event name search
  const [titleDebounce, setTitleDebounce] = useState("");

  // Helper: build query string used by backend
  const buildQuery = useCallback(() => {
    const q = new URLSearchParams();
    if (status) q.append("status", status);
    if (type) q.append("type", type);
    // backend expects eventName as shown in your code
    if (title) q.append("eventName", title);
    if (startDate) q.append("startDate", startDate);
    if (endDate) q.append("endDate", endDate);
    return q.toString();
  }, [status, type, title, startDate, endDate]);

  // Fetch reports from backend
  const fetchReports = useCallback(async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    setError(null);

    if (!token) {
      setError("No token found. Please login.");
      setLoading(false);
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
      const queryString = buildQuery();
      const url = `${API_BASE}/admin/reports/attendees${queryString ? `?${queryString}` : ""}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        // try to provide useful error message
        throw new Error(`Error ${res.status}: ${text || res.statusText}`);
      }

      const data = await res.json();
      // Expecting data.success and data.report to exist
      const report = data.report || {};

      setFiltersState(report.filters || {});
      setSummary(report.summary || null);
      setBreakdownByType(report.breakdownByType || []);
      setTopEvents(report.topEvents || []);
      setAllEvents(report.allEvents || []);
      setGeneratedAt(report.generatedAt || "");

      // keep console trace for debugging
      // eslint-disable-next-line no-console
      console.log("Fetched attendees report:", data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError(err.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  // Track if component has mounted to prevent duplicate fetches
  const isMountedRef = useRef(false);

  // initial fetch on mount
  useEffect(() => {
    fetchReports();
    isMountedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-filter event name with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setTitle(titleDebounce);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [titleDebounce]);

  // Fetch when title changes (after debounce)
  useEffect(() => {
    if (!isMountedRef.current || title !== titleDebounce) return; // Only fetch when debounced value matches and after mount
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Auto-fetch when status or type changes (but not on initial mount)
  useEffect(() => {
    if (!isMountedRef.current) return;
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type]);

  // Auto-fetch when dates change (but not on initial mount)
  useEffect(() => {
    if (!isMountedRef.current) return;
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handleApply = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    await fetchReports();
  };

  const handleReset = () => {
    setStatus("");
    setType("");
    setTitle("");
    setTitleDebounce("");
    setStartDate("");
    setEndDate("");
    // fetch without filters
    setTimeout(() => fetchReports(), 0);
  };

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
  };

  const handleTypeChange = (e) => {
    setType(e.target.value);
  };

  const handleTitleChange = (e) => {
    setTitleDebounce(e.target.value);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Attendees Report</h2>
          <p className="text-slate-500 mt-2 text-lg">Comprehensive overview of event attendance</p>
        </div>

        {/* Filters */}
        <form onSubmit={handleApply} className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label text-slate-600 text-sm font-medium">Event Status</label>
              <select
                value={status}
                onChange={handleStatusChange}
                className="select select-bordered w-full bg-white border-slate-300 text-slate-700 focus:border-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="label text-slate-600 text-sm font-medium">Event Type</label>
              <select
                value={type}
                onChange={handleTypeChange}
                className="select select-bordered w-full bg-white border-slate-300 text-slate-700 focus:border-emerald-500"
              >
                <option value="">All Types</option>
                <option value="Workshop">Workshop</option>
                <option value="Trip">Trip</option>
                <option value="Bazaar">Bazaar</option>
                <option value="Booth">Booth</option>
                <option value="Conference">Conference</option>
                <option value="GymSession">Gym Session</option>
              </select>
            </div>

            <div>
              <label className="label text-slate-600 text-sm font-medium">Event Name</label>
              <input
                type="text"
                placeholder="Search by event name..."
                value={titleDebounce}
                onChange={handleTitleChange}
                className="input input-bordered w-full bg-white border-slate-300 text-slate-700 focus:border-emerald-500"
              />
            </div>

            <div>
              <DateTimePicker
                label="Start Date"
                showTime={false}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value ? e.target.value.slice(0, 10) : '')}
                placeholder="Select start date"
              />
            </div>

            <div>
              <DateTimePicker
                label="End Date"
                showTime={false}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value ? e.target.value.slice(0, 10) : '')}
                placeholder="Select end date"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <button type="submit" className="btn bg-emerald-600 hover:bg-emerald-700 text-white border-none">Apply Filters</button>
            <button type="button" onClick={handleReset} className="btn btn-ghost text-slate-500 hover:text-slate-800">Reset Filters</button>
            <div className="ml-auto text-slate-500 text-sm">
              {generatedAt ? `Generated at: ${new Date(generatedAt).toLocaleString()}` : null}
            </div>
          </div>
        </form>

        {/* Loading/Error */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-emerald-600 mb-4"></span>
            <p className="text-lg font-medium text-slate-500">Loading report...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error bg-red-50 border-red-100 text-red-600 shadow-sm mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary */}
            {summary && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-emerald-500">📊</span> Summary
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-center">
                    <div className="text-4xl font-bold text-emerald-600 mb-2">{summary.totalEvents}</div>
                    <div className="text-slate-600 font-medium text-lg">Total Events</div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-center">
                    <div className="text-4xl font-bold text-emerald-600 mb-2">{summary.totalAttendees}</div>
                    <div className="text-slate-600 font-medium text-lg">Total Attendees</div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-center">
                    <div className="text-4xl font-bold text-emerald-600 mb-2">{summary.averageAttendeesPerEvent}</div>
                    <div className="text-slate-600 font-medium text-lg">Avg. Attendees/Event</div>
                  </div>
                </div>
              </div>
            )}

            {/* Breakdown by Type */}
            {breakdownByType.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2">Breakdown by Type</h2>
                {breakdownByType.map((typeGroup, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-800">{typeGroup.type}</h3>
                      <div className="flex gap-4 text-sm">
                        <span className="badge bg-slate-200 text-slate-700 border-none">Events: {typeGroup.totalEvents}</span>
                        <span className="badge bg-emerald-100 text-emerald-800 border-none">Attendees: {typeGroup.totalAttendees}</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="table w-full">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b-slate-200">
                            <th>Title</th>
                            <th>Status</th>
                            <th>Attendees</th>
                            <th>Capacity</th>
                            <th>Utilization</th>
                          </tr>
                        </thead>
                        <tbody>
                          {typeGroup.events.map((event, j) => (
                            <tr key={j} className="hover:bg-slate-50 border-b-slate-100">
                              <td className="font-medium text-slate-900">{event.title}</td>
                              <td>
                                <span className={`badge badge-sm border-none ${event.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                                  event.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                                    event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                      'bg-slate-100 text-slate-600'
                                  }`}>
                                  {event.status}
                                </span>
                              </td>
                              <td className="text-slate-600">{event.attendeeCount}</td>
                              <td className="text-slate-600">{event.capacity}</td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <progress
                                    className={`progress w-20 ${parseFloat(event.utilizationRate) > 90 ? 'progress-success' :
                                      parseFloat(event.utilizationRate) > 50 ? 'progress-warning' : 'progress-error'
                                      }`}
                                    value={parseFloat(event.utilizationRate)}
                                    max="100"
                                  ></progress>
                                  <span className="text-xs font-mono text-slate-500">{event.utilizationRate}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top Events */}
            {topEvents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-emerald-500">🏆</span> Top Events
                </h2>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b-slate-200">
                        <th>Title</th>
                        <th>Type</th>
                        <th>Start Date</th>
                        <th>Attendees</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topEvents.map((event, i) => (
                        <tr key={i} className="hover:bg-slate-50 border-b-slate-100">
                          <td className="font-bold text-slate-800">{event.title}</td>
                          <td><span className="badge bg-slate-100 text-slate-600 border-none badge-sm">{event.type}</span></td>
                          <td className="text-slate-500 text-sm">{new Date(event.startDate).toLocaleString()}</td>
                          <td className="font-bold text-emerald-600">{event.attendeeCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* All Events */}
            {allEvents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">All Events</h2>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b-slate-200">
                        <th>Title</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Attendees</th>
                        <th>Capacity</th>
                        <th>Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allEvents.map((event, i) => (
                        <tr key={i} className="hover:bg-slate-50 border-b-slate-100">
                          <td className="font-medium text-slate-900">{event.title}</td>
                          <td><span className="badge bg-slate-100 text-slate-600 border-none badge-sm">{event.type}</span></td>
                          <td>
                            <span className={`badge badge-sm border-none ${event.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                              event.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                                event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-slate-100 text-slate-600'
                              }`}>
                              {event.status}
                            </span>
                          </td>
                          <td className="text-slate-600">{event.attendeeCount}</td>
                          <td className="text-slate-600">{event.capacity}</td>
                          <td className="text-slate-600">{event.utilizationRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
