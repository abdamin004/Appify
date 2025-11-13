const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
export { API_BASE };

async function http(method, url, body) {
  const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  // Some payment endpoints may respond 200 with no JSON body on success
  // Try to parse JSON, but tolerate empty body.
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })() : {};
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// Try a few common endpoint shapes to maximize compatibility
export async function createCheckoutSession(eventId) {
  const candidates = [
    `${API_BASE}/payments/create-checkout-session`,
    `${API_BASE}/payments/checkout-session`,
    `${API_BASE}/payments/checkout`,
  ];
  let lastErr;
  for (const url of candidates) {
    try {
      let returnPath = '/student-dashboard';
      try { if (typeof window !== 'undefined' && window.location && window.location.pathname) { returnPath = window.location.pathname; } } catch (_) {}
      const res = await http('POST', url, { eventId, returnPath });
      const urlCandidate = res?.url || res?.sessionUrl || res?.checkoutUrl || res?.session?.url;
      if (urlCandidate) return { url: urlCandidate };
      // Fallback if backend returns full session without url
      if (res?.session && typeof res.session === 'object') {
        if (res.session.url) return { url: res.session.url };
      }
      // If backend returns a redirect location header encoded in data
      if (res?.location) return { url: res.location };
      // If we reached here but no URL, still return raw payload for debugging
      return { url: undefined, raw: res };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Unable to create checkout session');
}

export async function getWalletBalance() {
  const res = await http('GET', `${API_BASE}/payments/wallet/balance`);
  if (typeof res === 'number') return { balance: res };
  if (res && typeof res.balance === 'number') return { balance: res.balance };
  if (res && res.wallet && typeof res.wallet.balance === 'number') return { balance: res.wallet.balance };
  return { balance: 0 };
}

export async function payWithWallet(eventId) {
  // Common patterns: { eventId } or { id }
  try {
    return await http('POST', `${API_BASE}/payments/wallet/pay`, { eventId });
  } catch (e1) {
    // Try a fallback body shape
    return await http('POST', `${API_BASE}/payments/wallet/pay`, { id: eventId });
  }
}

export async function confirmStripeReceipt(sessionId) {
  const url = new URL(`${API_BASE}/payments/receipt`);
  url.searchParams.set('session_id', sessionId);
  return http('GET', url.toString());
}

export function refundAndCancel(eventId) {
  return http('POST', `${API_BASE}/payments/refund-and-cancel/${eventId}`);
}

export function topupWallet(amount, currency = 'EGP') {
  return http('POST', `${API_BASE}/payments/wallet/topup`, { amount, currency });
}

export function sendManualReceipt(eventId) {
  return http('POST', `${API_BASE}/payments/receipt/manual`, { eventId });
}
