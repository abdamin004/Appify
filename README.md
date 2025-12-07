# **Appify – University Event Management System**

A centralized MERN-based web application for managing, organizing, and participating in university events.  
This system streamlines the entire event lifecycle — from creation and approval to student participation, vendor management, and event reminders.

---

## 🚀 **Project Theme & Motivation**

The **Appify-University Event Management Application** is a centralized platform built to streamline how campus events are created, approved, managed, and attended.

It enables:

- **Events Office** to create/monitor university events (bazaars, workshops, trips, conferences, competitions…)
- **Students, TAs, and Staff** to browse events, register, favorite them, and receive reminders
- **Professors** to propose academic workshops or conferences (subject to approvals)
- **Admins** to validate student/staff identities and approve vendors
- **Vendors & External Companies** to register for bazaars/career fairs and upload verification documents

This solves the problem of scattered communication and manual registration.

---
## 🚦 Build Status

The project is currently stable and fully functional. All major components build and run successfully.

### ✔️ Backend Status
- Backend builds successfully with Node.js & Express  
- MongoDB connection stable  
- All major routes tested in Postman  
- Dockerized backend runs without errors  

### ✔️ Frontend Status
- React frontend builds successfully  
- No major UI-breaking issues  
- API integration functional  
- Dockerized frontend runs without errors  

### 🐞 Known Issues / Bugs
At the moment, only minor issues exist:
- None blocking core functionality  
- Small UI inconsistencies may occur on smaller screens  
- Occasional console warnings in React (non-breaking)
- 
## 🔄 System Flow

This section provides a high-level walkthrough of how the Appify platform works from login to event participation.  
Screenshots will be added to illustrate the full user journey.

---

### Login Dashboard
![edash](https://github.com/abdamin004/Appify/blob/main/IMG-20251207-WA0031.jpg)

### Sign Up Dashboard
![adash](https://github.com/abdamin004/Appify/blob/main/IMG-20251207-WA0032.jpg)

### TA Dashboard
![vdash](https://github.com/abdamin004/Appify/blob/main/IMG-20251207-WA0033.jpg)


### Vendor Dashboard
![pdash](https://github.com/abdamin004/Appify/blob/main/IMG-20251207-WA0034.jpg)


### Student Dashboard
![sdash](https://github.com/abdamin004/Appify/blob/main/IMG-20251207-WA0035.jpg)


### Professor Dashboard
![tadash](https://github.com/abdamin004/Appify/blob/main/IMG-20251207-WA0036.jpg)

 
## 🛠️ **Tech Stack**

| Layer | Technology |
|-------|------------|
| **Frontend** | React + Vite |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose) |
| **Containerization** | Docker |
| **Testing** | Postman |
| **Project Management** | Trello |
| **Authentication** | JWT |
| **Cron Jobs** | node-cron |

---
## ✨ Features

Appify offers a unified platform for managing and participating in university events. Key features include:

---

### 🔐 Authentication & User Roles  
- Secure login, registration, and email verification.  
- Role-based access for Students, Staff, Professors, TAs, Vendors, Events Office, and Admins.  
- Admin tools for managing users, roles, and account status.

---

### 📅 Event Management  
- Browse, search, filter, and view all event types (workshops, trips, bazaars, booths, conferences).  
- Professors and Events Office can create, edit, publish, archive, and delete events.  
- Participant export, QR code generation, and restricted event access.

---

### 📝 Participation & Payments  
- Register for events, handle cancellations, and receive certificates.  
- Stripe and wallet payments with automated email receipts.  
- Wallet refunds for eligible cancellations.

---

### ⭐ Social & Feedback Features  
- Event ratings and comments with admin moderation.  
- Favorites list for quick access to preferred events.  
- In-system and email notifications for reminders, updates, approvals, and vendor actions.

---

### 🛒 Vendors, Facilities & Extras  
- Vendor applications for bazaars/booths, document uploads, and payment handling.  
- Loyalty program with partner discounts.  
- Court booking system and gym session schedule/registration.  
- Voting polls for vendor booth allocations.
---

---

## 📦 **Installation & Setup**
```bash
git clone https://github.com/abdamin004/Appify.git
cd appify
```

## 🧠 Code Examples

### 1. Role Check 
```bash
module.exports = function roleCheck(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if user is a Vendor - multiple detection methods
      const modelName = req.user.constructor && req.user.constructor.modelName;
      
      // Method 1: Check modelName
      // Method 2: Check if it has companyName (vendors always have this, users don't)
      // Method 3: Check collection name
      // Method 4: Check role field (vendors have role='Vendor' by default)
      const hasCompanyName = req.user.companyName !== undefined && req.user.companyName !== null;
      const hasFirstName = req.user.firstName !== undefined && req.user.firstName !== null;
      const collectionName = req.user.collection && req.user.collection.name;
      
      const isVendorModel = modelName === 'Vendor' || 
                           collectionName === 'vendors' ||
                           (hasCompanyName && !hasFirstName) || // Vendors have companyName but no firstName
                           (hasCompanyName && req.user.role === 'Vendor') || // Vendor with role field
                           (req.user.role && req.user.role.toLowerCase() === 'vendor'); // Case-insensitive role check
      
      const effectiveRoleRaw = isVendorModel ? 'Vendor' : (req.user.role || 'user');
      
      // Debug logging (remove in production)
      if (process.env.NODE_ENV !== 'production' && allowedRoles.includes('Vendor')) {
        console.log('[RoleCheck] Vendor detection:', {
          modelName,
          collectionName,
          hasCompanyName,
          hasFirstName,
          userRole: req.user.role,
          isVendorModel,
          effectiveRoleRaw,
          allowedRoles
        });
      }
```
### 2. Creating a Workshop (Professor)
 ```bash
 event = await Workshop.create({ ...eventData, professors, facultyName, requiredBudget, fundingSource, extraRequiredResourses });
 const eventOffice = await User.find({ role: 'EventOffice' });
 eventOffice.forEach(office => {
     office.notifications.push({
         message: `New workshop titled "${event.title}" has been submitted for approval.`,
         date: new Date(),
         read: false,
     });
```


### 3. Event Reminder Cron Job and Notification Systems
 ```bash
async function sendRemindersForOffset(offsetHours, type, label) {
    const now = new Date();

    // We will look at all future published events with registered users
    const events = await Event.find({
        status: 'published',
        startDate: { $gt: now },
        registeredUsers: { $exists: true, $not: { $size: 0 } }
    }).select('title startDate registeredUsers');

    for (const ev of events) {
        if (!ev.startDate) continue;

        const diffMs = new Date(ev.startDate) - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        // Trigger when diffHours is roughly equal to offsetHours,
        // with a small window so it works with the 5-min cron schedule.
        // Example: 24h reminder -> between 23.7 and 24.3 hours.
        const lowerBound = offsetHours - 0.3;
        const upperBound = offsetHours + 0.3;

        if (diffHours < lowerBound || diffHours > upperBound) {
            continue;
        }

        // For each registered user, create a notification if not already created
        // Only send to users with allowed roles: Student, Staff, TA, Professor, EventOffice
        // IMPORTANT: Only create reminders for users who are actually registered for this event
        const allowedRoles = ['Student', 'Staff', 'TA', 'Professor', 'EventOffice'];
        
        // Ensure registeredUsers is an array and contains valid user IDs
        if (!Array.isArray(ev.registeredUsers) || ev.registeredUsers.length === 0) {
            continue; // Skip events with no registered users
        }
        
        for (const userId of ev.registeredUsers) {
            if (!userId) continue;

            // Double-check: Verify user is actually in the registeredUsers array
            const isRegistered = ev.registeredUsers.some(id => String(id) === String(userId));
            if (!isRegistered) {
                console.log(`User ${userId} is not in registeredUsers array, skipping reminder`);
                continue;
            }

            // Check if user exists and has an allowed role
            const user = await User.findById(userId).select('role');
            if (!user || !allowedRoles.includes(user.role)) {
                continue; // Skip users with disallowed roles (e.g., Admin, Vendor)
            }

            const exists = await reminderExists(userId, ev._id, type);
            if (exists) continue; // avoid duplicates

            await Notification.create({
                type, // 'EventReminder1Day' or 'EventReminder1Hour'
                message: `Reminder (${label}): "${ev.title}" starts at ${new Date(ev.startDate).toLocaleString()}.`,
                event: ev._id,
                recipientUser: userId,
                recipientModel: 'User'
                // recipientsRoles is intentionally empty for per-user reminders
            });
        }
    }
}
 ```
### 4. Vendor Application to GUC Loyalty Program 
 ```bash
exports.applyToLoyaltyProgram = async (req, res, next) => {
    try {
        const vendorId = req.user._id;
        const {
            organization,
            discountRate,
            promoCode,
            termsAndConditions
        } = req.body;

        // basic validation
        if (!organization) {
            return res.status(400).json({ success: false, message: 'Organization is required' });
        }
        if (discountRate == null || isNaN(discountRate) || discountRate < 0 || discountRate > 100) {
            return res.status(400).json({ success: false, message: 'Discount rate must be between 0 and 100' });
        }
        if (!promoCode) {
            return res.status(400).json({ success: false, message: 'Promo code is required' });
        }
        if (!termsAndConditions) {
            return res.status(400).json({ success: false, message: 'Terms and conditions are required' });
        }

        // extra: prevent duplicate applications by same vendor
        const existing = await LoyaltyApplication.findOne({ vendorUser: vendorId, promoCode });
        if (existing) {
            return res.status(409).json({ success: false, message: 'You already applied with this promo code' });
        }

        const app = await LoyaltyApplication.create({
            vendorUser: vendorId,
            organization,
            discountRate,
            promoCode,
            termsAndConditions,
            status: 'approved'
        });

        try {
            const discountInfo = typeof discountRate === 'number' ? `${discountRate}%` : 'a special';
            const promoInfo = promoCode ? ` Use code ${promoCode}.` : '';
            await Notification.create({
                type: 'LoyaltyPartnerAdded',
                message: `${organization} has joined the GUC loyalty program offering ${discountInfo} off.${promoInfo}`,
                recipientsRoles: ['Student', 'Staff', 'TA', 'Professor', 'Vendor'],
                organization
            });
        } catch (notifyErr) {
            console.error('Failed to create instant loyalty notification:', notifyErr?.message || notifyErr);
        }

        return res.status(201).json({
            success: true,
            message: 'Loyalty program offer is live and visible to all users',
            application: app
        });
    } catch (err) {
        next(err);
    }
};
 ```

### 5. Voting on a Poll
 ```bash
exports.voteOnPoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { vendorApplicationId } = req.body;

    if (!vendorApplicationId) {
      return res.status(400).json({ 
        success: false,
        message: 'vendorApplicationId is required' 
      });
    }

    // Get poll
    const poll = await Poll.findById(pollId)
      .populate('vendorApplications');

    if (!poll) {
      return res.status(404).json({ 
        success: false,
        message: 'Poll not found' 
      });
    }

    // Check if poll is active
    if (poll.status !== 'active') {
      return res.status(400).json({ 
        success: false,
        message: 'Poll is not active' 
      });
    }

    // Check if voting period is open
    const now = new Date();
    if (now < poll.votingStartDate || now > poll.votingEndDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Voting period is not open' 
      });
    }

    // Validate vendor application is in this poll
    const isValidApplication = poll.vendorApplications.some(
      app => String(app._id) === String(vendorApplicationId)
    );

    if (!isValidApplication) {
      return res.status(400).json({ 
        success: false,
        message: 'Vendor application is not part of this poll' 
      });
    }

    // Check if user has already voted
    const existingVote = poll.votes.find(
      vote => String(vote.user) === String(req.user._id)
    );

    if (existingVote) {
      // Update existing vote
      existingVote.vendorApplication = vendorApplicationId;
      existingVote.votedAt = now;
    } else {
      // Add new vote
      poll.votes.push({
        user: req.user._id,
        vendorApplication: vendorApplicationId,
        votedAt: now
      });
    }
 ```
## 📚 API Reference

All endpoints are prefixed with `/api` (e.g. `/api/auth/login`).

| #  | Method | Endpoint                                        | Description                                                | Access                          |
|----|--------|--------------------------------------------------|------------------------------------------------------------|---------------------------------|
| 1  | POST   | `/auth/register`                                | Register a new user (Student/Staff/TA/Professor/Vendor).  | Public                          |
| 2  | POST   | `/auth/login`                                   | Login with email & password, returns JWT.                  | Public                          |
| 3  | GET    | `/events`                                       | Get all upcoming events with optional filters & sorting.   | Authenticated                   |
| 4  | POST   | `/events/:eventId/register`                     | Register current user for a workshop/trip.                 | Student/Staff/TA/Professor      |
| 5  | POST   | `/payments/checkout`                            | Create a Stripe payment (card or wallet) for an event.     | Authenticated                   |
| 6  | POST   | `/events/:eventId/cancel`                       | Cancel registration and refund to wallet (if allowed).     | Student/Staff/TA/Professor      |
| 7  | GET    | `/vendors/bazaars`                              | Get a list of upcoming bazaars for vendors to join.        | Vendor                          |
| 8  | POST   | `/vendors/bazaars/:bazaarId/applications`       | Apply to join a bazaar (booth size, attendees, etc.).      | Vendor                          |
| 9  | GET    | `/reports/attendance`                           | Get total attendees report (with optional filters).        | Events Office / Admin           |
| 10 | GET    | `/notifications`                                | Get current user’s in-system notifications.                | Authenticated                   |

> For full request/response schemas and additional endpoints (e.g. comments, favorites, loyalty program, courts, gym, polls), see the Postman Testing section.
---
## 🧪 API Testing with Postman
All core backend functionalities were tested using **Postman**.  
Below is a sample of the main test cases used to validate critical system behavior.
###Login
![Login](https://github.com/abdamin004/Appify/blob/main/Screenshot%202025-11-29%20225150.png)
### Events
![Events](https://github.com/abdamin004/Appify/blob/main/Screenshot%202025-11-29%20225415.png)
### Courts
![Courts](https://github.com/abdamin004/Appify/blob/main/Screenshot%202025-11-29%20225515.png)
### Logout 
![Logout](https://github.com/abdamin004/Appify/blob/main/Screenshot%202025-11-29%20225802.png)
### Notifications
![Notifications](https://github.com/abdamin004/Appify/blob/main/Screenshot%202025-11-29%20230001.png)

 
---
## 🤝 Contribution Guidelines

We welcome contributions to improve Appify!  
Although the system is fully functional, there is still plenty of room for enhancements, optimizations, and new features.

Here’s how you can contribute:

- 🔧 Code cleanup & refactoring  
- 🧪 Adding additional test cases   
- 🛡️ Enhancing security (rate limiting, validation, etc.)   
- 💳 Improving payment/error handling flows      

---
## 🙏 Credits & Acknowledgements

- The project structure and some of the backend/frontend setup was inspired by the tutorial  
  **“MERN Stack Tutorial for Beginners with Deployment – 2025”** on YouTube. Special thanks to the creator for providing a clear, practical full-stack foundation.  
  Link: https://youtu.be/F9gB5b4jgOI
- We were introduced to and got familiar and comfortable with using Docker through the youtube tutorial titled **"The Only Docker Tutorial You Need To Get Started"**
  Link: https://youtu.be/gAkwW2tuIqE?si=tjrBjKPWP08Xeqli  
- Any resemblance to real university systems or workflows is coincidental; Appify is built for demonstration and academic purposes only.
---
## 📄 License

This project does **not use any formal open-source license**.

Appify was developed solely as part of a **university academic project**, and is not intended for commercial distribution or public licensing.  
You are free to view the code for learning purposes, but redistribution, sublicensing, or commercial use is not permitted unless explicitly approved by the project owners.

If you wish to reuse any part of this project, please contact the team first.





