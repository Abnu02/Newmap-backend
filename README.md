# Newmap Backend (Node.js) — Employee Location Tracking System

A Node.js service that connects the Manager and Employee apps for real-time employee location tracking and presence visibility.

## Goals

- Ingest authenticated employee location updates (foreground/background)
- Maintain current presence (Online/Offline) and last-seen timestamps
- Broadcast live updates to authorized manager clients
- Serve historical location data and metadata for the details view

## Recommended Stack

- Runtime: Node.js 18+
- Framework: Express or Fastify
- Real-time: Socket.IO (WebSocket fallback support)
- Database: PostgreSQL + PostGIS (geo queries) with Prisma or TypeORM
- Cache/Events: Redis (pub/sub for multi-instance broadcasts)
- Auth: JWT (Access + Refresh) with roles (manager, employee)
- Maps/Geocoding: Google Maps Geocoding API (or open alternative)

## High-Level Architecture

- REST API for auth, employee directory, and history endpoints
- WebSocket (Socket.IO) namespace(s) for live presence and location updates
- Worker or cron tasks for data retention, cleanup, and analytics

```
Employee App  --(REST + JWT)-->  Backend API  --(DB)--> PostgreSQL
     |                               |  ^
     |--(WebSocket/Socket.IO)--------|  |
                                     |  |--(pub/sub)--> Redis
Manager App --(REST + JWT)----------> |  |
     |--(Socket.IO: subscribe)-------|  |
```

## API Surface (Proposed)

- Auth
  - POST /auth/login (manager)
  - POST /auth/device (employee device registration + token)
  - POST /auth/refresh
- Employees
  - GET /employees (manager scope; search/filter)
  - GET /employees/:id
- Location
  - POST /location (employee: lat, lng, accuracy, speed?, heading?, battery?, timestamp)
  - GET /employees/:id/location/latest (manager)
  - GET /employees/:id/location/history?from=...&to=...&limit=...
- Presence
  - GET /employees/:id/presence (manager)

## Socket.IO Events (Proposed)

- Namespaces
  - /manager: managers authenticate via JWT; join tenant/team room; receive updates
  - /employee: employees authenticate via device token; send updates; receive acks
- Events
  - employee:locationUpdate { employeeId, lat, lng, accuracy, battery, timestamp }
  - server:locationBroadcast { employeeId, lat, lng, status, lastSeenAt }
  - server:presence { employeeId, online, lastSeenAt }

## Data Model (Sketch)

- Employee: id, fullName, department, avatarUrl, tenantId, active
- Device: id, employeeId, platform, pushToken?, lastSeenAt
- Presence: employeeId, online, lastSeenAt
- Location: id, employeeId, point(geography), accuracy, speed?, heading?, battery?, timestamp

## Security & Privacy

- TLS everywhere; signed JWTs with short-lived access tokens
- Role-based authorization (manager vs employee)
- Device registration + per-device revocation
- Data minimization and retention windows for location history

## Local Development

1. Prerequisites
   - Node.js 18+, npm or pnpm
   - SQLite 3
   - Create a `.env` file (see below)

2. Install

```bash
npm install
# or
pnpm install
```

3. Environment

Create `.env` in `Newmap-backend/`:

```bash
NODE_ENV=development
PORT=4000
DATABASE_URL=file:./dev.db
JWT_SECRET=replace_me
NOMINATIM_API_URL=https://nominatim.openstreetmap.org
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

4. Run

```bash
npm run dev
```

5. Example Endpoints

- POST /auth/device
- POST /location
- GET /employees
- GET /employees/:id/location/latest

## Integration Notes

- Manager App
  - Connect to REST for list/details; connect to Socket.IO `/manager` for real-time.
  - Filter/search is server-powered with pagination.
- Employee App
  - Obtain a device token via `/auth/device`; send periodic `POST /location` updates.
  - Maintain a lightweight Socket.IO `/employee` connection for acknowledgements and presence.

## Roadmap

- Add geofencing alerts and low-battery notifications
- Add audit logs and analytics endpoints
- Add multi-tenant org boundaries and RBAC policies
- Add rate limiting and anomaly detection for spoofed data
