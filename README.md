# CEDOI Meeting Management System (Enterprise Grade)

Operational business management system for CEDOI meetings, built with 2026 enterprise-scale architectural standards.

## Enterprise Architecture Principles
- **Monorepo Platform:** Single commit synchronization across client, server, and shared logic.
- **Strict Type Safety:** End-to-end TypeScript with shared Zod schemas for zero-trust data validation.
- **Resilience:** Global Error Boundaries (Frontend) and Standardized Error Middleware (Backend).
- **Observability:** Structured logging with Winston for categorized, searchable production logs.
- **Performance:** Memoized UI components and virtualized lists for handling high-volume operational data.
- **State Persistence:** Persistent Zustand stores for seamless session management.

## Project Structure
- `apps/client`: Expo React Native application (Mobile + Web) with persistent state and error resilience.
- `apps/server`: Node.js Express backend with structured logging and centralized error handling.
- `packages/shared`: The single source of truth for Types and Validation Schemas.

## Tech Stack
- Frontend: Expo, React Native, NativeWind, Zustand (with Persist), Lucide Icons.
- Backend: Node.js, Express, Firebase Admin, Winston Logger, Helmet.
- Infrastructure: Firestore, Firebase Auth.

## Getting Started
1. Install dependencies: `npm install`
2. Set up environment variables: Copy `.env.example` to `.env` and fill in your Firebase credentials.
3. Start the server: `npm run server`
4. Start the client: `npm run client`

## Key Features
- **Fast Check-in:** Optimized search and check-in workflow for live events.
- **Offline Support:** Firestore native caching ensures data availability during weak connectivity.
- **Role-based Access:** Separate dashboards for Admins and Staff.
- **Real-time Sync:** Instant updates of attendance counts and payment status.
