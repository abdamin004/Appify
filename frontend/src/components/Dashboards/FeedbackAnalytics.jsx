import React, { useState, useEffect } from 'react';
import { getAllMyEventsAnalytics } from '../../services/analyticsService';
import { showToast } from '../../utils/toast';

function FeedbackAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [expandedEvents, setExpandedEvents] = useState(new Set());

  useEffect(() => {
    fetchAnalytics();

    // Listen for refresh events from parent dashboard (when feedback is added from other dashboards)
    const handleRefresh = (event) => {
      console.log('FeedbackAnalytics: Received refresh event', event.detail);
      // Small delay to ensure backend has processed the comment/rating
      setTimeout(() => {
        fetchAnalytics();
      }, 1000);
    };
    
    window.addEventListener('feedback:refresh', handleRefresh);

    return () => {
      window.removeEventListener('feedback:refresh', handleRefresh);
    };
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getAllMyEventsAnalytics();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      showToast.error(err.message || 'Failed to load feedback analytics');
    } finally {
      setLoading(false);
    }
  };

  const toggleEventExpansion = (eventId) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <span key={i} className="text-yellow-400 text-lg">★</span>
        ))}
        {hasHalfStar && <span className="text-yellow-400 text-lg">☆</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={i} className="text-gray-300 text-lg">★</span>
        ))}
        <span className="ml-2 text-slate-600 font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!analyticsData || !analyticsData.events || analyticsData.events.length === 0) {
    return (
      <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">📊 Feedback Analytics</h2>
        <p className="text-slate-600">You haven't created any events yet.</p>
      </div>
    );
  }

  const { events, analytics, summary } = analyticsData;

  // Create a map of eventId to analytics for quick lookup (normalize IDs to strings)
  const analyticsMap = new Map();
  analytics.forEach(a => {
    if (a && a.eventId) {
      analyticsMap.set(String(a.eventId), a);
    }
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="text-blue-600 text-3xl mb-2">📅</div>
          <div className="text-2xl font-bold text-blue-900">{summary.totalEvents}</div>
          <div className="text-blue-700 text-sm">Total Events</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200">
          <div className="text-yellow-600 text-3xl mb-2">⭐</div>
          <div className="text-2xl font-bold text-yellow-900">
            {summary.overallAverageRating > 0 ? summary.overallAverageRating.toFixed(1) : 'N/A'}
          </div>
          <div className="text-yellow-700 text-sm">Avg Rating</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="text-green-600 text-3xl mb-2">💬</div>
          <div className="text-2xl font-bold text-green-900">{summary.totalResponses}</div>
          <div className="text-green-700 text-sm">Total Responses</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="text-purple-600 text-3xl mb-2">📝</div>
          <div className="text-2xl font-bold text-purple-900">{summary.eventsWithComments}</div>
          <div className="text-purple-700 text-sm">Events with Comments</div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Event Feedback Details</h2>
        <div className="space-y-4">
          {events.map((event) => {
            const eventId = String(event._id || event.id);
            const eventAnalytics = analyticsMap.get(eventId);
            const hasAnalytics = eventAnalytics && (eventAnalytics.totalRatings > 0 || eventAnalytics.totalComments > 0);
            const isExpanded = expandedEvents.has(eventId);

            return (
              <div
                key={eventId}
                className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="p-4 bg-slate-50 cursor-pointer"
                  onClick={() => toggleEventExpansion(eventId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-lg">{event.title || 'Untitled Event'}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {formatDate(event.startDate)} • {event.type || 'Event'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {hasAnalytics ? (
                        <>
                          <div className="text-center">
                            <div className="text-lg font-bold text-slate-700">
                              {eventAnalytics.averageRating > 0 ? eventAnalytics.averageRating.toFixed(1) : 'N/A'}
                            </div>
                            <div className="text-xs text-slate-500">Rating</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-slate-700">{eventAnalytics.totalResponses}</div>
                            <div className="text-xs text-slate-500">Responses</div>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-slate-400">No feedback yet</div>
                      )}
                      <button className="text-slate-600 hover:text-slate-800">
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && hasAnalytics && (
                  <div className="p-6 bg-white border-t border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Ratings Section */}
                      <div>
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <span>⭐</span> Ratings
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Average Rating:</span>
                            {renderStars(eventAnalytics.averageRating)}
                          </div>
                          <div className="text-sm text-slate-600">
                            Total Ratings: <span className="font-semibold">{eventAnalytics.totalRatings}</span>
                          </div>
                          {/* Rating Distribution */}
                          <div className="mt-4 space-y-2">
                            <div className="text-sm font-semibold text-slate-700">Rating Distribution:</div>
                            {[5, 4, 3, 2, 1].map((rating) => {
                              const count = eventAnalytics.ratingDistribution[rating] || 0;
                              const percentage = eventAnalytics.totalRatings > 0
                                ? (count / eventAnalytics.totalRatings) * 100
                                : 0;
                              return (
                                <div key={rating} className="flex items-center gap-2">
                                  <span className="text-sm text-slate-600 w-8">{rating}★</span>
                                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                                    <div
                                      className="bg-yellow-400 h-2 rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-slate-500 w-12 text-right">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Comments Section */}
                      <div>
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <span>💬</span> Comments ({eventAnalytics.totalComments})
                        </h4>
                        {eventAnalytics.recentComments.length > 0 ? (
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {eventAnalytics.recentComments.map((comment, idx) => {
                              // Handle different comment structures
                              const commentText = comment.content || comment.text || comment.comment || comment.message || 'No content';
                              const userName = comment.user?.firstName 
                                ? `${comment.user.firstName}${comment.user.lastName ? ' ' + comment.user.lastName : ''}`
                                : (comment.user?.name || comment.userName || 'Anonymous User');
                              const commentDate = comment.createdAt || comment.date || comment.timestamp;
                              
                              return (
                                <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                  <div className="text-sm text-slate-700 mb-2 whitespace-pre-wrap break-words">
                                    {commentText}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {userName} • {formatDate(commentDate)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm">No comments yet</p>
                        )}
                      </div>
                    </div>

                    {/* Most Common Words */}
                    {eventAnalytics.mostCommonWords.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <span>🔤</span> Most Common Words in Comments
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {eventAnalytics.mostCommonWords.map((item, idx) => (
                            <span
                              key={idx}
                              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                            >
                              {item.word} ({item.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FeedbackAnalytics;

