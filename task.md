Act as a senior full-stack software architect, senior product manager, senior React Native engineer, senior UI/UX designer, and Firebase system architect.

Build a production-ready cross-platform CEDOI Meeting Management Application using modern scalable architecture.

Application Name:
CEDOI Meeting Management System

Company:
GodivaTech

Project Goal:
The purpose of this application is to simplify and digitize the complete meeting management workflow for CEDOI business meetings conducted at Marriott Madurai.

The application must support:
- Android mobile app
- iPhone mobile app
- Web admin dashboard

The system should use a shared architecture and reusable logic wherever possible.

Primary Objective:
Create a fast, operational, mobile-first business management system where staff can:
- Search members quickly
- Mark attendance instantly
- Collect/update payments
- Manage meetings efficiently during live events

The application should prioritize:
- Speed
- Simplicity
- Operational usability
- Minimal clicks
- Real-time synchronization
- Clean UI/UX
- Mobile-first workflow

====================================================
TECH STACK
====================================================

Frontend:
- React Native
- Expo latest SDK
- Expo Router
- TypeScript
- NativeWind (Tailwind CSS for React Native)

Web:
- Expo Web support
- Responsive admin dashboard

Backend:
- Node.js
- Express.js

Database:
- Firebase Firestore

Authentication:
- Firebase Authentication

Hosting:
- Vercel (web)
- Railway (backend)

State Management:
- Zustand

Forms:
- React Hook Form + Zod validation

Notifications:
- Firebase Cloud Messaging

Architecture Style:
- Modular scalable architecture
- Feature-based folder structure
- Reusable components
- Clean separation of concerns

====================================================
APPLICATION MODULES
====================================================

1. AUTHENTICATION MODULE
Features:
- Secure login
- Role-based access
- Session persistence
- Logout
- Protected routes

User Roles:
1. Super Admin
2. Limited Staff User

Super Admin Permissions:
- Manage meetings
- Manage members
- Manage reports
- Manage settings
- View analytics
- Manage users

Limited Staff Permissions:
- Search members
- Mark attendance
- Update payment status

====================================================
2. MEMBER MANAGEMENT MODULE
====================================================

Features:
- Add member
- Edit member
- Search member
- View member details
- Filter members
- Membership status

Member Fields:
- Full Name
- Company Name
- Mobile Number
- Email
- Business Category
- City
- Membership Type
- Join Date
- Notes
- Profile Photo (optional)

Search must support:
- Name
- Mobile Number
- Company Name

UI Requirements:
- Fast searchable list
- Card-based mobile UI
- Table-based web UI

====================================================
3. MEETING MANAGEMENT MODULE
====================================================

Features:
- Create meeting
- Edit meeting
- Schedule meeting
- View upcoming meetings
- View completed meetings

Meeting Fields:
- Meeting Title
- Date
- Start Time
- End Time
- Venue
- Description
- Entry Fee
- Maximum Capacity

Meeting Status Logic:
- Draft
- Scheduled
- Ongoing
- Completed
- Cancelled

IMPORTANT:
Most statuses should be automated:
- Scheduled automatically after publish
- Ongoing automatically at meeting start time
- Completed automatically after end time

Only:
- Draft
- Cancelled

should require manual control.

====================================================
4. ATTENDANCE MANAGEMENT MODULE
====================================================

MOST IMPORTANT MODULE.

This screen must be extremely fast and optimized for live event operations.

Workflow:
1. Staff opens today's meeting
2. Search member
3. Open quick check-in popup
4. Mark attendance
5. Update payment
6. Save

Target:
Entire workflow should take under 5 seconds.

Features:
- Real-time attendance count
- Search suggestions
- Fast check-in
- Duplicate attendance prevention
- Attendance history

Attendance Fields:
- Member ID
- Meeting ID
- Check-in time
- Attendance status
- Notes

====================================================
5. PAYMENT MANAGEMENT MODULE
====================================================

Features:
- Update payment status
- Payment collection tracking
- Payment summary
- Pending payments

Payment Modes:
- Cash
- UPI
- Card
- Complimentary

Payment Status:
- Paid
- Pending
- Waived
- Partial

Important UX:
After attendance is marked,
application should immediately ask:
"Collect payment now?"

====================================================
6. REPORTS MODULE
====================================================

Admin Reports:
- Total attendees
- Payment collection summary
- Pending payments
- Meeting-wise attendance
- Member attendance history

Features:
- Filter by date
- Export reports
- Meeting analytics

====================================================
7. FUTURE READY ARCHITECTURE
====================================================

Structure system to support future scalability:
- Multi-city support
- Multiple CEDOI chapters
- QR attendance
- WhatsApp notifications
- Push notifications
- Membership renewal system
- Advanced analytics

Database structure should be scalable.

====================================================
UI/UX REQUIREMENTS
====================================================

Design Style:
- Modern
- Minimal
- Professional
- Operationally fast
- Mobile-first

Design Priorities:
- Large tap areas
- Minimal typing
- Quick navigation
- Fast loading
- Simple workflows

Use:
- Clean cards
- Status badges
- Floating action buttons
- Bottom navigation on mobile
- Responsive admin dashboard on web

Color Palette:
Professional modern business theme.

Dark mode support required.

====================================================
OFFLINE SUPPORT
====================================================

Very important.

Requirements:
- Attendance should work even with weak internet
- Cache latest meeting data locally
- Sync automatically when internet returns

====================================================
REALTIME FEATURES
====================================================

Use Firestore realtime listeners for:
- Attendance updates
- Payment updates
- Meeting updates
- Dashboard counts

====================================================
PERFORMANCE REQUIREMENTS
====================================================

Application should:
- Load quickly
- Handle large member lists smoothly
- Use optimized FlatList rendering
- Use pagination where needed
- Avoid unnecessary rerenders

====================================================
FOLDER STRUCTURE
====================================================

Create scalable folder structure including:
- app
- components
- modules
- services
- hooks
- store
- utils
- constants
- firebase
- backend

====================================================
DELIVERABLES REQUIRED
====================================================

Generate:
1. Full application architecture
2. Folder structure
3. Database schema
4. Firestore collection structure
5. Authentication flow
6. Complete UI/UX flow
7. Screen-by-screen breakdown
8. Backend API structure
9. State management structure
10. Navigation flow
11. Reusable component structure
12. Security rules
13. Offline sync strategy
14. Responsive web strategy
15. Deployment strategy
16. Future scalability recommendations

====================================================
IMPORTANT PRODUCT REQUIREMENTS
====================================================

This is NOT a social media app.
This is NOT a fancy animation app.

This is an operational business workflow application.

Success metric:
Staff should be able to:
- Search member
- Mark attendance
- Update payment

within seconds during live meetings.

Optimize the entire product around operational efficiency and simplicity.