import React, { useState, useEffect, useCallback, useRef } from "react";
import DateTimePicker from '../UI/DateTimePicker';

export default function SalesReport() {
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState({
    revenueByType: [],
    tripEvents: [],
    vendorEvents: [],
    vendorApplications: [],
    topRevenueEvents: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  // Debounce for event name search
  const [titleDebounce, setTitleDebounce] = useState("");

  const buildQuery = useCallback(() => {
    const q = new URLSearchParams();
    if (type) q.append("type", type);
    if (title) q.append("title", title);
    if (status) q.append("status", status);
    if (startDate) q.append("startDate", startDate);
    if (endDate) q.append("endDate", endDate);
    q.append("sortBy", "revenue");
    q.append("sortOrder", sortOrder);
    return q.toString();
  }, [type, title, status, startDate, endDate, sortOrder]);

  const fetchSales = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token found. Please login.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${API_BASE}/admin/reports/sales?${buildQuery()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text}`);
      }

      const data = await res.json();
      const report = data.report;

      setSummary(report?.summary || {});
      setSales({
        revenueByType: report?.revenueByType || [],
        tripEvents: report?.tripRevenue?.events || [],
        vendorEvents: report?.vendorRevenue?.events || [],
        vendorApplications: report?.vendorRevenue?.applications || [],
        topRevenueEvents: report?.topRevenueEvents || [],
      });

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch sales report");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  // Track if component has mounted to prevent duplicate fetches
  const isMountedRef = useRef(false);

  // initial fetch on mount
  useEffect(() => {
    fetchSales();
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
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Auto-fetch when status, type, or sortOrder changes (but not on initial mount)
  useEffect(() => {
    if (!isMountedRef.current) return;
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type, sortOrder]);

  // Auto-fetch when dates change (but not on initial mount)
  useEffect(() => {
    if (!isMountedRef.current) return;
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handleApply = async (e) => {
    e?.preventDefault();
    await fetchSales();
  };

  const handleReset = () => {
    setType("");
    setTitle("");
    setTitleDebounce("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setSortOrder("desc");
    setTimeout(() => fetchSales(), 0);
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

  const formatDate = (d) => d ? new Date(d).toLocaleString() : "N/A";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Financial Reports</h2>
          <p className="text-slate-500 mt-2 text-lg">Financial overview and revenue analysis</p>
        </div>

        {/* Filters */}
        <form onSubmit={handleApply} className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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

            <div>
              <label className="label text-slate-600 text-sm font-medium">Sort Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="select select-bordered w-full bg-white border-slate-300 text-slate-700 focus:border-emerald-500"
              >
                <option value="desc">Revenue: High → Low</option>
                <option value="asc">Revenue: Low → High</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <button type="submit" className="btn bg-emerald-600 hover:bg-emerald-700 text-white border-none">Apply Filters</button>
            <button type="button" onClick={handleReset} className="btn btn-ghost text-slate-500 hover:text-slate-800">Reset Filters</button>
          </div>
        </form>

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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="text-emerald-500">💰</span> Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100">
                  <div className="text-base text-emerald-700 font-medium mb-1">Total Revenue</div>
                  <div className="text-4xl font-bold text-emerald-600">{summary?.totalRevenue ?? 0} EGP</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <div className="text-base text-slate-500 font-medium mb-1">Trip Revenue</div>
                  <div className="text-3xl font-bold text-slate-800">{summary?.tripRevenue ?? 0} EGP</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <div className="text-base text-slate-500 font-medium mb-1">Vendor Revenue</div>
                  <div className="text-3xl font-bold text-slate-800">{summary?.vendorRevenue ?? 0} EGP</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <div className="text-base text-slate-500 font-medium mb-1">Total Trip Events</div>
                  <div className="text-3xl font-bold text-slate-800">{summary?.totalTripEvents ?? 0}</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <div className="text-base text-slate-500 font-medium mb-1">Total Vendor Applications</div>
                  <div className="text-3xl font-bold text-slate-800">{summary?.totalVendorApplications ?? 0}</div>
                </div>
              </div>
            </div>

            {/* Revenue by Type */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800">Revenue by Type</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b-slate-200">
                      <th>Type</th>
                      <th>Count</th>
                      <th className="text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.revenueByType.length > 0 ? sales.revenueByType.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 border-b-slate-100">
                        <td className="font-medium text-slate-900">{r.type}</td>
                        <td className="text-slate-600">{r.count}</td>
                        <td className="text-right font-bold text-emerald-600">{r.revenue} EGP</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="3" className="text-center text-slate-500 py-4">No revenue data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trip Events */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800">Trip Events Revenue</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b-slate-200">
                      <th>Title</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Attendees</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.tripEvents.length > 0 ? sales.tripEvents.map((ev, i) => (
                      <tr key={i} className="hover:bg-slate-50 border-b-slate-100">
                        <td className="font-medium text-slate-900">{ev.title}</td>
                        <td>
                          <span className={`badge badge-sm border-none ${ev.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                            ev.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                              ev.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="text-sm text-slate-500">{formatDate(ev.startDate)}</td>
                        <td className="text-slate-600">{ev.attendeeCount}</td>
                        <td className="text-right text-slate-600">{ev.price} EGP</td>
                        <td className="text-right font-bold text-emerald-600">{ev.revenue} EGP</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="text-center text-slate-500 py-4">No trip events available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Vendor Events */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">Vendor Event Revenue</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b-slate-200">
                        <th>Event</th>
                        <th className="text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.vendorEvents.length > 0 ? sales.vendorEvents.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50 border-b-slate-100">
                          <td className="font-medium text-slate-900">{v.title}</td>
                          <td className="text-right font-bold text-emerald-600">{v.revenue} EGP</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="2" className="text-center text-slate-500 py-4">No vendor events available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vendor Applications */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">Vendor Applications</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b-slate-200">
                        <th>Vendor</th>
                        <th className="text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.vendorApplications.length > 0 ? sales.vendorApplications.map((a, i) => (
                        <tr key={i} className="hover:bg-slate-50 border-b-slate-100">
                          <td className="font-medium text-slate-900">{a.vendorName}</td>
                          <td className="text-right font-bold text-emerald-600">{a.revenue} EGP</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="2" className="text-center text-slate-500 py-4">No vendor applications available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Top Revenue Events */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800">Top Revenue Events</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b-slate-200">
                      <th>Title</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th className="text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.topRevenueEvents.length > 0 ? sales.topRevenueEvents.map((ev, i) => (
                      <tr key={i} className="hover:bg-slate-50 border-b-slate-100">
                        <td className="font-bold text-slate-800">{ev.title}</td>
                        <td><span className="badge bg-slate-100 text-slate-600 border-none badge-sm">{ev.type}</span></td>
                        <td><span className="badge bg-emerald-100 text-emerald-800 border-none badge-sm">{ev.source}</span></td>
                        <td className="text-right font-bold text-emerald-600">{ev.revenue} EGP</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="text-center text-slate-500 py-4">No top revenue events available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

