const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Get all events created by the current user
 */
export async function getMyCreatedEvents() {
  const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
  if (!token) {
    throw new Error('You must be logged in to view your events');
  }

  const res = await fetch(`${API_BASE}/events/my-events`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/Login';
      }
      throw new Error('Session expired. Please login again.');
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Failed to fetch events (${res.status})`);
  }

  return res.json();
}

/**
 * Get analytics for a specific event
 */
export async function getEventAnalytics(eventId) {
  const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
  if (!token) {
    throw new Error('You must be logged in to view analytics');
  }

  console.log(`Fetching analytics for event ${eventId}`);

  // Fetch ratings and comments in parallel
  const [ratingsRes, commentsRes] = await Promise.all([
    fetch(`${API_BASE}/events/${eventId}/ratings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }),
    fetch(`${API_BASE}/events/${eventId}/comments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
  ]);

  if (!ratingsRes.ok && ratingsRes.status !== 404) {
    if (ratingsRes.status === 401) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/Login';
      }
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!commentsRes.ok && commentsRes.status !== 404) {
    if (commentsRes.status === 401) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/Login';
      }
      throw new Error('Session expired. Please login again.');
    }
  }

  let ratingsData, commentsData;
  
  try {
    ratingsData = ratingsRes.ok ? await ratingsRes.json() : { success: false, ratings: [], count: 0, averageRating: 0 };
  } catch {
    ratingsData = { success: false, ratings: [], count: 0, averageRating: 0 };
  }
  
  try {
    commentsData = commentsRes.ok ? await commentsRes.json() : { success: false, comments: [], count: 0 };
  } catch {
    commentsData = { success: false, comments: [], count: 0 };
  }

  // Extract ratings - handle multiple response formats
  let ratings = [];
  if (Array.isArray(ratingsData)) {
    ratings = ratingsData;
  } else if (ratingsData && Array.isArray(ratingsData.ratings)) {
    ratings = ratingsData.ratings;
  } else if (ratingsData && ratingsData.success && Array.isArray(ratingsData.ratings)) {
    ratings = ratingsData.ratings;
  }

  // Extract comments - handle multiple response formats
  let comments = [];
  if (Array.isArray(commentsData)) {
    comments = commentsData;
  } else if (commentsData && Array.isArray(commentsData.comments)) {
    comments = commentsData.comments;
  } else if (commentsData && commentsData.success && Array.isArray(commentsData.comments)) {
    comments = commentsData.comments;
  }
  
  // Debug logging
  console.log(`Event ${eventId} analytics:`, {
    ratingsCount: ratings.length,
    commentsCount: comments.length,
    ratingsDataKeys: ratingsData ? Object.keys(ratingsData) : [],
    commentsDataKeys: commentsData ? Object.keys(commentsData) : [],
    commentsDataSuccess: commentsData?.success,
    commentsDataCount: commentsData?.count,
    commentsIsArray: Array.isArray(commentsData)
  });
  
  if (comments.length > 0) {
    console.log('Sample comment structure:', JSON.stringify(comments[0], null, 2));
  } else if (commentsData && commentsData.count > 0) {
    console.warn(`Comments count is ${commentsData.count} but comments array is empty or missing`);
  }

  // Calculate average rating
  const averageRating = ratingsData.averageRating !== undefined ? ratingsData.averageRating : (ratings.length > 0 
    ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length 
    : 0);

  // Calculate rating distribution
  const ratingDistribution = [1, 2, 3, 4, 5].reduce((acc, rating) => {
    acc[rating] = ratings.filter(r => r.rating === rating).length;
    return acc;
  }, {});

  // Extract most common words from comments (excluding common stop words)
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
  
  const allCommentText = comments.map(c => (c.content || '').toLowerCase()).join(' ');
  const words = allCommentText.split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
  const wordFrequency = {};
  words.forEach(word => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  
  const mostCommonWords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // Get most recent comments - ensure content is preserved
  const recentComments = comments
    .map(comment => {
      // Ensure we preserve the full comment object with all fields
      return {
        ...comment,
        content: comment.content || comment.text || comment.comment || comment.message || '',
        user: comment.user || {},
        createdAt: comment.createdAt || comment.date || comment.timestamp || new Date()
      };
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 10);

  // Ensure eventId is a string for consistent matching
  const normalizedEventId = String(eventId);
  
  return {
    eventId: normalizedEventId,
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalRatings: ratings.length,
    totalComments: comments.length,
    totalResponses: ratings.length + comments.length,
    ratingDistribution,
    mostCommonWords,
    recentComments,
    allRatings: ratings,
    allComments: comments
  };
}

/**
 * Get analytics for all events created by the current user
 */
export async function getAllMyEventsAnalytics() {
  try {
    const events = await getMyCreatedEvents();
    const eventsArray = Array.isArray(events) ? events : [];

    // Fetch analytics for all events in parallel (with limit to avoid overwhelming)
    const analyticsPromises = eventsArray.slice(0, 50).map(event => {
      const eventId = event._id || event.id;
      if (!eventId) {
        console.warn('Event missing ID:', event);
        return Promise.resolve(null);
      }
      return getEventAnalytics(String(eventId)).catch(err => {
        console.error(`Error fetching analytics for event ${eventId}:`, err);
        return null;
      });
    });

    const analyticsResults = await Promise.all(analyticsPromises);
    const validAnalytics = analyticsResults.filter(a => a !== null);

    // Debug: Log analytics results
    console.log('Analytics summary calculation:', {
      totalEvents: eventsArray.length,
      validAnalyticsCount: validAnalytics.length,
      analyticsDetails: validAnalytics.map(a => ({
        eventId: a.eventId,
        totalRatings: a.totalRatings,
        totalComments: a.totalComments,
        totalResponses: a.totalResponses
      }))
    });

    // Calculate overall statistics
    const totalEvents = eventsArray.length;
    const eventsWithRatings = validAnalytics.filter(a => a && a.totalRatings > 0).length;
    const eventsWithComments = validAnalytics.filter(a => a && a.totalComments > 0).length;
    
    // Calculate average rating only from events that have ratings
    const eventsWithRatingsArray = validAnalytics.filter(a => a && a.totalRatings > 0);
    const overallAverageRating = eventsWithRatingsArray.length > 0
      ? eventsWithRatingsArray.reduce((sum, a) => sum + (a.averageRating || 0), 0) / eventsWithRatingsArray.length
      : 0;
    
    const totalResponses = validAnalytics.reduce((sum, a) => sum + (a?.totalResponses || 0), 0);
    
    console.log('Final summary:', {
      totalEvents,
      eventsWithRatings,
      eventsWithComments,
      overallAverageRating,
      totalResponses
    });

    return {
      events: eventsArray,
      analytics: validAnalytics,
      summary: {
        totalEvents,
        eventsWithRatings,
        eventsWithComments,
        overallAverageRating: Math.round(overallAverageRating * 10) / 10,
        totalResponses
      }
    };
  } catch (err) {
    console.error('Error fetching all events analytics:', err);
    throw err;
  }
}

