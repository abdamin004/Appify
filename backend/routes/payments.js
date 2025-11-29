const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const User = require('../models/User');
const Payment = require('../models/Payment');
const VendorApplication = require('../models/VendorApplication');
const { sendPaymentReceiptEmail } = require('../utils/sendEmail');

// Helper to compute payable amount and currency
function computeAmount(entity, type = 'event') {
  if (!entity) return { amount: 0, currency: 'egp' };

  if (type === 'application') {
    // entity is VendorApplication with populated event
    // Use participationFee from application if available, otherwise calculate
    if (entity.participationFee && entity.participationFee > 0) {
      return { amount: entity.participationFee, currency: 'usd' };
    }
    // Fallback: calculate fee if not set
    const { calculateParticipationFee } = require('../utils/paymentCalculator');
    const fee = calculateParticipationFee(entity, entity.event);
    return { amount: fee, currency: 'usd' };
  }

  // For Workshops: calculate price per person based on capacity and funding source
  if (entity.type === 'Workshop') {
    const requiredBudget = Number(entity.requiredBudget || 0);
    const capacity = Number(entity.capacity || 0);
    const fundingSource = entity.fundingSource || '';
    
    // If funding is from Grant, Sponsor, or External, students don't pay
    // The budget is covered by external funding sources
    if (['Grant', 'Sponsor', 'External'].includes(fundingSource)) {
      return { amount: 0, currency: 'egp' };
    }
    
    // For Internal funding: students pay their share
    // requiredBudget = total cost needed (venue, materials, instructor fees, etc.)
    // capacity = maximum number of attendees
    // Price per person = requiredBudget / capacity (fixed price, regardless of actual registrations)
    //
    // IMPORTANT: This price is FIXED per person. If capacity isn't filled:
    // - Example: Budget = 1000 EGP, Capacity = 20, Price = 50 EGP/person
    // - If only 10 register: Total collected = 500 EGP (500 EGP shortfall)
    // - The Event Office must handle the shortfall (cancel, adjust budget, or cover from other sources)
    //
    // If capacity is 0 or invalid, use full budget as fallback (single person pays all)
    if (capacity > 0 && requiredBudget > 0) {
      const pricePerPerson = requiredBudget / capacity;
      // Add extra fee if extra resources are required (10% surcharge)
      const extraFee = entity.extraRequiredResourses ? (pricePerPerson * 0.1) : 0;
      return { amount: Number((pricePerPerson + extraFee).toFixed(2)), currency: 'egp' };
    }
    
    // Fallback: use full budget if capacity is invalid (shouldn't happen in normal flow)
    return { amount: requiredBudget, currency: 'egp' };
  }

  // Trip: use price directly
  if (entity.type === 'Trip') {
    const amount = Number(entity.price || 0);
    return { amount, currency: (entity.currency || 'egp').toLowerCase() };
  }

  // Bazaar/Booth: use participationFee if available
  if (entity.type === 'Bazaar' || entity.type === 'Booth') {
    const amount = Number(entity.participationFee || 0);
    return { amount, currency: 'usd' };
  }

  // Default: use price, amount, or 0
  const amount = Number(
    (entity.price ?? entity.amount ?? entity.participationFee ?? 0)
  ) || 0;
  const currency = (entity.currency || 'egp').toLowerCase();
  return { amount, currency };
}

// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const eventId = req.body?.eventId || req.body?.id;
    const applicationId = req.body?.applicationId;

    let entity, type, amount, currency, title, description;

    if (applicationId) {
      entity = await VendorApplication.findById(applicationId).populate('event').populate('vendorUser');
      if (!entity) return res.status(404).json({ message: 'Application not found' });
      
      // Authorization check: Only the vendor who owns the application can pay
      // Check if req.user is a Vendor and matches the application's vendorUser
      const isVendor = req.user.companyName !== undefined || (req.user.role && req.user.role.toLowerCase() === 'vendor');
      const isOwner = String(entity.vendorUser._id || entity.vendorUser) === String(req.user._id);
      const isAdmin = req.user.role === 'Admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'You are not authorized to pay for this application' });
      }
      
      // Check if application is approved (required for payment)
      if (entity.status !== 'approved') {
        return res.status(400).json({ message: 'Payment is only available for approved applications' });
      }
      
      // Check if already paid
      if (entity.paid) {
        return res.status(400).json({ message: 'Application already paid' });
      }
      
      type = 'application';
      const computed = computeAmount(entity, 'application');
      amount = computed.amount;
      currency = computed.currency;
      title = `Vendor Fee: ${entity.event.title}`;
      description = `Booth: ${entity.boothSize}`;
    } else if (eventId) {
      entity = await Event.findById(eventId).populate('registeredUsers');
      if (!entity) return res.status(404).json({ message: 'Event not found' });
      
      // Authorization check: Only registered users can pay for events
      const isRegistered = entity.registeredUsers && entity.registeredUsers.some(
        user => String(user._id || user) === String(req.user._id)
      );
      const isAdmin = req.user.role === 'Admin';
      
      // Skip check for events that don't require payment (price/amount is 0 or undefined)
      const { amount: eventAmount } = computeAmount(entity, 'event');
      if (eventAmount > 0 && !isRegistered && !isAdmin) {
        return res.status(403).json({ 
          message: 'You must be registered for this event before making a payment' 
        });
      }
      
      type = 'event';
      const computed = computeAmount(entity, 'event');
      amount = computed.amount;
      currency = computed.currency;
      title = `${entity.type || 'Event'}: ${entity.title}`;
      description = entity.shortDescription || entity.description;
    } else {
      return res.status(400).json({ message: 'eventId or applicationId is required' });
    }

    const frontendUrl = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.replace(/\/$/, '')
      : (process.env.NODE_ENV === 'production' ? 'https://appify-events.com' : 'http://localhost:3000');
    const successBase = frontendUrl;
    // For vendor applications, default to vendor dashboard
    let returnPath = req.body?.returnPath || (applicationId ? '/vendor-dashboard' : '/student-dashboard');
    if (typeof returnPath !== 'string' || !returnPath.startsWith('/')) {
      returnPath = applicationId ? '/vendor-dashboard' : '/student-dashboard';
    }

    // Construct success/cancel URLs
    const successUrl = `${successBase}${returnPath}?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${successBase}${returnPath}?status=cancel`;

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
                  name: title,
                  description: description || undefined,
                },
                unit_amount: Math.max(0, Math.round((amount || 0) * 100)),
              },
              quantity: 1,
            },
          ],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            eventId: eventId ? String(eventId) : undefined,
            applicationId: applicationId ? String(applicationId) : undefined,
            userId: String(req.user._id || ''),
            type: type || '',
          },
        });
        return res.json({ url: session.url });
      } catch (e) {
        console.error('Stripe error:', e);
        // Fall through to mock URL if stripe lib not installed or any error occurs
      }
    }

    // Fallback: return a mock URL to allow frontend redirect/testing
    return res.json({ url: `${successBase}${returnPath}?status=success&mock=1&eventId=${eventId || ''}&applicationId=${applicationId || ''}` });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to create checkout session' });
  }
});

// Get calculated price for an event (for frontend display)
router.get('/price/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    const { amount, currency } = computeAmount(event, 'event');
    return res.json({ amount, currency, eventType: event.type || 'Event' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to calculate price' });
  }
});

// Wallet endpoints (simple stubs – adapt to your data model)
router.get('/wallet/balance', auth, async (req, res) => {
  try {
    // Handle vendors - they authenticate as Vendor but wallet is on User model
    // Try to find User account by email if req.user is a Vendor
    let userAccount = null;
    if (req.user.companyName !== undefined) {
      // This is a Vendor, find corresponding User account by email
      userAccount = await User.findOne({ email: req.user.email });
      if (!userAccount) {
        // Vendor doesn't have User account yet, return 0 balance (don't create here, let top-up create it)
        return res.json({ balance: 0 });
      }
    } else {
      // Regular User
      userAccount = await User.findById(req.user._id);
    }
    
    if (!userAccount) {
      return res.json({ balance: 0 });
    }
    
    const balance = userAccount.walletBalance || 0;
    return res.json({ balance });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch wallet balance' });
  }
});

// Get wallet transactions
router.get('/wallet/transactions', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('event');
    return res.json(payments);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch transactions' });
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

    // Handle vendors - they authenticate as Vendor but wallet is on User model
    let userAccount = null;
    if (req.user.companyName !== undefined) {
      // This is a Vendor, find or create corresponding User account
      userAccount = await User.findOne({ email: req.user.email });
      if (!userAccount) {
        // Create a User account for the vendor to hold wallet balance
        userAccount = await User.create({
          email: req.user.email,
          firstName: req.user.companyName || 'Vendor',
          lastName: 'Account', // Required field - this is a wallet-only account
          password: 'vendor-wallet-only-' + Date.now(), // Dummy password, vendor won't use this to login
          role: 'Vendor',
          walletBalance: 0,
        });
      }
    } else {
      // Regular User
      userAccount = await User.findById(req.user._id);
    }
    
    if (!userAccount) return res.status(401).json({ message: 'User account not found' });
    
    userAccount.walletBalance = Number((userAccount.walletBalance || 0) + amount);
    await userAccount.save();

    // Send top-up receipt email
    try {
      await sendPaymentReceiptEmail(userAccount, { title: 'Wallet Top-Up' }, { amount, currency: currency.toUpperCase(), method: 'Wallet Top-Up', reference: `TOPUP-${Date.now()}` });
    } catch (e) { console.error('Top-up email failed:', e?.message || e); }

    return res.json({ success: true, balance: userAccount.walletBalance });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to top up wallet' });
  }
});

router.post('/wallet/pay', auth, async (req, res) => {
  try {
    const eventId = req.body?.eventId || req.body?.id;
    if (!eventId) return res.status(400).json({ message: 'eventId is required' });
    const event = await Event.findById(eventId).populate('registeredUsers');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    // Authorization check: Only registered users can pay for events
    const isRegistered = event.registeredUsers && event.registeredUsers.some(
      user => String(user._id || user) === String(req.user._id)
    );
    const isAdmin = req.user.role === 'Admin';
    
    // Skip check for events that don't require payment (price/amount is 0 or undefined)
    const { amount: eventAmount } = computeAmount(event, 'event');
    if (eventAmount > 0 && !isRegistered && !isAdmin) {
      return res.status(403).json({ 
        message: 'You must be registered for this event before making a payment' 
      });
    }
    
    // Deduct from wallet and persist payment state
    const { amount, currency } = computeAmount(event, 'event');
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

// Pay for vendor application via wallet
router.post('/wallet/pay-application', auth, async (req, res) => {
  try {
    const applicationId = req.body?.applicationId;
    if (!applicationId) return res.status(400).json({ message: 'applicationId is required' });

    const application = await VendorApplication.findById(applicationId).populate('event').populate('vendorUser');
    if (!application) return res.status(404).json({ message: 'Application not found' });

    // Authorization check: Only the vendor who owns the application can pay
    const isVendor = req.user.companyName !== undefined || (req.user.role && req.user.role.toLowerCase() === 'vendor');
    const isOwner = String(application.vendorUser._id || application.vendorUser) === String(req.user._id);
    const isAdmin = req.user.role === 'Admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to pay for this application' });
    }
    
    // Check if application is approved (required for payment)
    if (application.status !== 'approved') {
      return res.status(400).json({ message: 'Payment is only available for approved applications' });
    }

    if (application.paid) return res.status(400).json({ message: 'Application already paid' });

    // Check if payment deadline has passed
    if (application.paymentDeadline && new Date(application.paymentDeadline) < new Date()) {
      return res.status(400).json({ message: 'Payment deadline has passed. Please contact support.' });
    }

    // Use participationFee if available, otherwise calculate
    const amount = application.participationFee || (computeAmount(application, 'application').amount);
    const currency = 'usd'; // Default currency
    
    // For vendors, we need to check if they have a User account with wallet
    // Vendors authenticate as Vendor model, but wallet might be on User model
    // Check if req.user is Vendor or User
    let user;
    if (isVendor) {
      // Try to find User account by email (vendors might have linked User accounts)
      user = await User.findOne({ email: req.user.email });
      if (!user) {
        // Create a User account for the vendor to hold wallet balance (same as top-up)
        user = await User.create({
          email: req.user.email,
          firstName: req.user.companyName || 'Vendor',
          lastName: 'Account', // Required field - this is a wallet-only account
          password: 'vendor-wallet-only-' + Date.now(), // Dummy password, vendor won't use this to login
          role: 'Vendor',
          walletBalance: 0,
        });
      }
    } else {
      user = await User.findById(req.user._id);
    }
    
    if (!user) return res.status(404).json({ message: 'User account not found' });

    if ((user.walletBalance || 0) < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    user.walletBalance = Number((user.walletBalance || 0) - amount);
    await user.save();

    // Update application payment status
    application.paid = true;
    application.paidAt = new Date();
    await application.save();

    await Payment.create({
      user: user._id,
      event: application.event._id, // Link to event for reference
      amount,
      currency,
      method: 'wallet',
      status: 'paid',
      metadata: { applicationId: String(application._id) } // Store app ID in metadata if Payment model allows mixed, or just rely on event link
    });

    // Send receipt email
    try {
      await sendPaymentReceiptEmail(user, application.event, { amount, currency, method: 'Wallet', reference: `APP-${Date.now()}` });
    } catch (e) {
      console.error('Receipt email failed (wallet app):', e?.message || e);
    }

    return res.json({ success: true, paid: true, balance: user.walletBalance });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Application payment failed' });
  }
});

// Verify Stripe session and send receipt (called by frontend after redirect)
router.get('/receipt', auth, async (req, res) => {
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
    const applicationId = session.metadata && session.metadata.applicationId;
    const userId = session.metadata && session.metadata.userId;

    let event, application;
    if (applicationId) {
      application = await VendorApplication.findById(applicationId).populate('event');
      event = application ? application.event : null;
    } else if (eventId) {
      event = await Event.findById(eventId);
    }

    let user = req.user;
    // Handle vendors - they authenticate as Vendor but need User account for payment records
    if (req.user && req.user.companyName !== undefined) {
      // This is a Vendor, find or create corresponding User account
      user = await User.findOne({ email: req.user.email });
      if (!user) {
        // Create User account for vendor if it doesn't exist (same as top-up)
        user = await User.create({
          email: req.user.email,
          firstName: req.user.companyName || 'Vendor',
          lastName: 'Account', // Required field - this is a wallet-only account
          password: 'vendor-wallet-only-' + Date.now(), // Dummy password, vendor won't use this to login
          role: 'Vendor',
          walletBalance: 0,
        });
      }
      if (!user && userId) {
        try { user = await User.findById(userId); } catch (_) { }
      }
    } else if ((!user || !user.email) && userId) {
      try { user = await User.findById(userId); } catch (_) { }
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
        if (user && (event || application) && typeof amount === 'number') {
          await Payment.create({
            user: user._id || user.id,
            event: event ? event._id : undefined,
            amount,
            currency,
            method: 'card',
            status: 'paid',
            sessionId,
            metadata: application ? { applicationId: String(application._id) } : undefined
          });

          if (application) {
            application.paid = true;
            application.paidAt = new Date();
            await application.save();
          }
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
    const applicationId = req.body?.applicationId || req.query?.applicationId;

    let event, application, amount, currency, user;

    if (applicationId) {
      // Handle vendor application payment
      application = await VendorApplication.findById(applicationId).populate('event').populate('vendorUser');
      if (!application) return res.status(404).json({ message: 'Application not found' });
      
      // Authorization check
      const isVendor = req.user.companyName !== undefined || (req.user.role && req.user.role.toLowerCase() === 'vendor');
      const isOwner = String(application.vendorUser._id || application.vendorUser) === String(req.user._id);
      const isAdmin = req.user.role === 'Admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'You are not authorized to pay for this application' });
      }

      if (application.paid) {
        return res.json({ success: true, message: 'Application already paid' });
      }

      event = application.event;
      const computed = computeAmount(application, 'application');
      amount = computed.amount;
      currency = computed.currency;

      // Handle vendors - find or create User account
      if (isVendor) {
        user = await User.findOne({ email: req.user.email });
        if (!user) {
          user = await User.create({
            email: req.user.email,
            firstName: req.user.companyName || 'Vendor',
            lastName: 'Account',
            password: 'vendor-wallet-only-' + Date.now(),
            role: 'Vendor',
            walletBalance: 0,
          });
        }
      } else {
        user = await User.findById(req.user._id);
      }

      // Mark application as paid
      application.paid = true;
      application.paidAt = new Date();
      await application.save();

      // Record payment
      try {
        await Payment.create({
          user: user._id,
          event: event ? event._id : undefined,
          amount,
          currency,
          method: 'card',
          status: 'paid',
          sessionId: 'MOCK',
          metadata: { applicationId: String(application._id) }
        });
      } catch (e2) {
        console.error('Payment record failed (mock):', e2?.message || e2);
      }

      // Send receipt email
      try {
        await sendPaymentReceiptEmail(user, event || { title: 'Vendor Application' }, { amount, currency, method: 'Card', reference: 'MOCK' });
      } catch (e) {
        console.error('Manual receipt email failed:', e?.message || e);
      }

      return res.json({ success: true });
    } else if (eventId) {
      // Handle event payment (existing logic)
      event = await Event.findById(eventId);
      if (!event) return res.status(404).json({ message: 'Event not found' });

      user = req.user;
      const computed = computeAmount(event);
      amount = computed.amount;
      currency = computed.currency;

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
    } else {
      return res.status(400).json({ message: 'eventId or applicationId is required' });
    }
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
