const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { sendPaymentReceiptEmail } = require('../utils/sendEmail');

// Helper to compute payable amount and currency
function computeAmount(event) {
  if (!event) return { amount: 0, currency: 'egp' };
  // Trip: use price; Workshop: fallback to requiredBudget; otherwise amount/price if present
  const amount = Number(
    (event.price ?? event.amount ?? event.requiredBudget ?? 0)
  ) || 0;
  const currency = (event.currency || 'egp').toLowerCase();
  return { amount, currency };
}

// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const eventId = req.body?.eventId || req.body?.id;
    if (!eventId) return res.status(400).json({ message: 'eventId is required' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const { amount, currency } = computeAmount(event);
    const successBase = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    let returnPath = req.body?.returnPath || '/student-dashboard';
    if (typeof returnPath !== 'string' || !returnPath.startsWith('/')) returnPath = '/student-dashboard';
    const successUrl = `${successBase}${returnPath}?eventId=${event._id}&status=success`;
    const cancelUrl = `${successBase}${returnPath}?eventId=${event._id}&status=cancel`;

    // Try real Stripe checkout if configured; otherwise return a mock URL so frontend can proceed
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      try {
        // Lazy require so the app can run without stripe installed in dev
        // If not installed, fall back to mock URL below
        // eslint-disable-next-line global-require
        const Stripe = require('stripe');
        const stripe = Stripe(key);
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency: currency || 'egp',
                product_data: {
                  name: `${event.type || 'Event'}: ${event.title}`,
                  description: event.shortDescription || event.description || undefined,
                },
                unit_amount: Math.max(0, Math.round((amount || 0) * 100)),
              },
              quantity: 1,
            },
          ],
          success_url: `${successBase}${returnPath}?status=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl,
          metadata: {
            eventId: String(event._id),
            userId: String(req.user._id || ''),
            type: event.type || '',
          },
        });
        return res.json({ url: session.url });
      } catch (e) {
        // Fall through to mock URL if stripe lib not installed or any error occurs
      }
    }

    // Fallback: return a mock URL to allow frontend redirect/testing
    return res.json({ url: `${successUrl}&mock=1` });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to create checkout session' });
  }
});

// Wallet endpoints (simple stubs – adapt to your data model)
router.get('/wallet/balance', auth, async (req, res) => {
  try {
    const balance = typeof req.user.walletBalance === 'number' ? req.user.walletBalance : 0;
    return res.json({ balance });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch wallet balance' });
  }
});

// Add funds to wallet (top-up)
router.post('/wallet/topup', auth, async (req, res) => {
  try {
    const amountRaw = req.body?.amount;
    const amount = Number(amountRaw);
    const currency = (req.body?.currency || 'egp').toLowerCase();
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    user.walletBalance = Number((user.walletBalance || 0) + amount);
    await user.save();

    // Send top-up receipt email
    try {
      await sendPaymentReceiptEmail(user, { title: 'Wallet Top-Up' }, { amount, currency: currency.toUpperCase(), method: 'Wallet Top-Up', reference: `TOPUP-${Date.now()}` });
    } catch (e) { console.error('Top-up email failed:', e?.message || e); }

    return res.json({ success: true, balance: user.walletBalance });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to top up wallet' });
  }
});

router.post('/wallet/pay', auth, async (req, res) => {
  try {
    const eventId = req.body?.eventId || req.body?.id;
    if (!eventId) return res.status(400).json({ message: 'eventId is required' });
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    // Deduct from wallet and persist payment state
    const { amount, currency } = computeAmount(event);
    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if ((user.walletBalance || 0) < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }
    user.walletBalance = Number((user.walletBalance || 0) - amount);
    await user.save();

    await Payment.create({ user: user._id, event: event._id, amount, currency, method: 'wallet', status: 'paid' });

    // Send receipt email
    try {
      await sendPaymentReceiptEmail(user, event, { amount, currency, method: 'Wallet', reference: `WALLET-${Date.now()}` });
    } catch (e) {
      console.error('Receipt email failed (wallet):', e?.message || e);
    }

    return res.json({ success: true, paid: true, balance: user.walletBalance });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Wallet payment failed' });
  }
});

// Verify Stripe session and send receipt (called by frontend after redirect)
router.get('/receipt', async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.status(400).json({ message: 'session_id is required' });
    const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
      // If Stripe not configured, just acknowledge
      return res.json({ success: true, message: 'Stripe not configured' });
    }
    let session;
    try {
      const Stripe = require('stripe');
      const stripe = Stripe(key);
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (e) {
      return res.status(500).json({ message: e.message || 'Failed to retrieve session' });
    }
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    const eventId = session.metadata && session.metadata.eventId;
    const userId = session.metadata && session.metadata.userId;
    const event = eventId ? await Event.findById(eventId) : null;
    let user = req.user;
    if ((!user || !user.email) && userId) {
      try { user = await User.findById(userId); } catch (_) {}
    }
    if (!user || !user.email) {
      const email = session.customer_details && session.customer_details.email;
      user = user || { email, firstName: email && email.split('@')[0] };
    }

    try {
      const amount = typeof session.amount_total === 'number' ? session.amount_total / 100 : undefined;
      const currency = session.currency || 'egp';
      // Record card payment
      try {
        if (user && event && typeof amount === 'number') {
          await Payment.create({ user: user._id || user.id, event: event._id, amount, currency, method: 'card', status: 'paid', sessionId });
        }
      } catch (e2) { console.error('Payment record failed (card):', e2?.message || e2); }
      await sendPaymentReceiptEmail(user, event || { title: session?.metadata?.type || 'Event' }, {
        amount, currency, method: 'Card', sessionId
      });
    } catch (e) {
      console.error('Receipt email failed (card):', e?.message || e);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Receipt endpoint error:', err);
    return res.status(500).json({ message: err.message || 'Failed to send receipt' });
  }
});

// Manual receipt + record payment for fallback (e.g., mock success without session)
router.post('/receipt/manual', auth, async (req, res) => {
  try {
    const eventId = req.body?.eventId || req.query?.eventId;
    if (!eventId) return res.status(400).json({ message: 'eventId is required' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const user = req.user;
    const { amount, currency } = computeAmount(event);

    // Record a "card" payment to unify behavior with Stripe
    try {
      await Payment.create({ user: user._id, event: event._id, amount, currency, method: 'card', status: 'paid', sessionId: 'MOCK' });
    } catch (e2) {
      // ignore duplicate or other persistence errors
    }

    try {
      await sendPaymentReceiptEmail(user, event, { amount, currency, method: 'Card', reference: 'MOCK' });
    } catch (e) {
      console.error('Manual receipt email failed:', e?.message || e);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Manual receipt error:', err);
    return res.status(500).json({ message: err.message || 'Failed to send manual receipt' });
  }
});

// Cancel registration and refund to wallet (only wallet payments)
router.post('/refund-and-cancel/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Cannot cancel after start
    if (event.startDate && new Date(event.startDate) <= new Date()) {
      return res.status(400).json({ message: 'Event already started; cannot cancel' });
    }

    // Ensure user was registered
    const wasRegistered = Array.isArray(event.registeredUsers) && event.registeredUsers.some(id => String(id) === String(userId));
    if (!wasRegistered) return res.status(400).json({ message: 'You are not registered for this event' });

    // Find latest payment (wallet or card) to refund
    const payment = await Payment.findOne({ user: userId, event: eventId, status: 'paid' }).sort({ createdAt: -1 });
    if (!payment) return res.status(400).json({ message: 'No payment found to refund' });

    // Refund to wallet for both wallet and card payments
    const user = await User.findById(userId);
    user.walletBalance = Number((user.walletBalance || 0) + (payment.amount || 0));
    await user.save();

    payment.status = 'refunded';
    payment.refundedAt = new Date();
    await payment.save();

    // Unregister user from event
    event.registeredUsers = (event.registeredUsers || []).filter(id => String(id) !== String(userId));
    await event.save();

    // Remove event from user's registeredEvents
    user.registeredEvents = (user.registeredEvents || []).filter(id => String(id) !== String(eventId));
    await user.save();

    return res.json({ success: true, refunded: payment.amount, balance: user.walletBalance, message: 'Refund returned to wallet successfully' });
  } catch (err) {
    console.error('Refund-and-cancel error:', err);
    return res.status(500).json({ message: err.message || 'Refund failed' });
  }
});

module.exports = router;
