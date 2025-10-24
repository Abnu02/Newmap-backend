# Newmap Backend - Employee Location Tracking System

A Node.js backend service for real-time employee location tracking with WebSocket support, JWT authentication, and RESTful API endpoints.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Testing the API](#testing-the-api)
- [Creating Initial Data](#creating-initial-data)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

## Features

- ✅ Real-time location tracking via WebSocket (Socket.IO)
- ✅ RESTful API for employee and location management
- ✅ JWT-based authentication for managers and employees
- ✅ Device registration and token management
- ✅ Employee presence tracking (Online/Offline status)
- ✅ Location history with timestamps
- ✅ Reverse geocoding using OpenStreetMap Nominatim
- ✅ CORS and security middleware (Helmet)
- ✅ Rate limiting for API protection
- ✅ SQLite database with Prisma ORM

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite (Prisma ORM)
- **Real-time**: Socket.IO
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, bcryptjs
- **Geocoding**: OpenStreetMap Nominatim API

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **pnpm**
- **Git** (optional, for version control)

To verify your installations:

```bash
node --version    # Should be v18.0.0 or higher
npm --version     # Should be 8.0.0 or higher
```

## Installation & Setup

### Step 1: Navigate to the Backend Directory

```bash
cd Newmap-backend
```

### Step 2: Install Dependencies

```bash
npm install
```

Or if you prefer pnpm:

```bash
pnpm install
```

This will install all required dependencies including:
- Express, Socket.IO, Prisma
- JWT, bcryptjs for authentication
- CORS, Helmet for security
- And more...

### Step 3: Create Environment File

Copy the example environment file and configure it:

```bash
# On Windows PowerShell
copy env.example .env

# On macOS/Linux
cp env.example .env
```

### Step 4: Configure Environment Variables

Edit the `.env` file with your preferred text editor:

```env
# Environment Configuration
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL="file:./prisma/dev.db"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# External APIs
NOMINATIM_API_URL=https://nominatim.openstreetmap.org

# CORS Configuration (add your frontend URLs)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Location Update Settings
LOCATION_UPDATE_INTERVAL_MS=30000
PRESENCE_TIMEOUT_MS=120000
```

**Important**: Change the `JWT_SECRET` to a strong, random string in production!

## Database Setup

### Step 1: Generate Prisma Client

```bash
npm run db:generate
```

This generates the Prisma Client based on your schema.

### Step 2: Create/Update Database

```bash
npm run db:push
```

This creates the SQLite database file at `prisma/dev.db` and sets up all tables.

### Step 3: (Optional) View Database with Prisma Studio

```bash
npm run db:studio
```

This opens a web interface at `http://localhost:5555` where you can view and edit your database.

## Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

The server will start on `http://localhost:4000` (or the PORT specified in your `.env` file).

You should see:

```
🗄️  Database connected successfully
🚀 Server running on port 4000
📡 Socket.IO server is ready
```

### Production Mode

```bash
npm start
```

### Stopping the Server

Press `Ctrl + C` in the terminal to stop the server.

## API Documentation

### Base URL

```
http://localhost:4000
```

### Authentication Endpoints

#### 1. Manager Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "manager@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "manager": {
    "id": "...",
    "fullName": "John Doe",
    "email": "manager@example.com"
  }
}
```

#### 2. Employee Device Registration
```http
POST /auth/device
Content-Type: application/json

{
  "employeeId": "employee_id_here",
  "platform": "android",
  "password": "employee_password"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "device": {
    "id": "device_id",
    "employeeId": "...",
    "platform": "android"
  }
}
```

### Employee Endpoints

#### 3. Get All Employees
```http
GET /employees
Authorization: Bearer <manager_token>

Response:
{
  "success": true,
  "employees": [
    {
      "id": "...",
      "fullName": "Jane Smith",
      "department": "Sales",
      "presence": {
        "isOnline": true,
        "lastSeenAt": "2025-10-23T10:30:00Z"
      }
    }
  ]
}
```

#### 4. Get Employee Details
```http
GET /employees/:id
Authorization: Bearer <manager_token>

Response:
{
  "success": true,
  "employee": {
    "id": "...",
    "fullName": "Jane Smith",
    "department": "Sales",
    "email": "jane@example.com",
    "phone": "+1234567890"
  }
}
```

### Location Endpoints

#### 5. Submit Location Update (Employee)
```http
POST /location
Authorization: Bearer <device_token>
Content-Type: application/json

{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy": 10.5,
  "altitude": 15.0,
  "speed": 0,
  "heading": 90,
  "battery": 85,
  "timestamp": "2025-10-23T10:30:00Z"
}

Response:
{
  "success": true,
  "location": {
    "id": "...",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "San Francisco, CA"
  }
}
```

#### 6. Get Latest Location
```http
GET /employees/:id/location/latest
Authorization: Bearer <manager_token>

Response:
{
  "success": true,
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 10.5,
    "address": "San Francisco, CA",
    "timestamp": "2025-10-23T10:30:00Z"
  }
}
```

#### 7. Get Location History
```http
GET /employees/:id/location/history?from=2025-10-22&to=2025-10-23&limit=100
Authorization: Bearer <manager_token>

Response:
{
  "success": true,
  "locations": [
    {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "timestamp": "2025-10-23T10:30:00Z"
    }
  ]
}
```

### WebSocket Events (Socket.IO)

#### Connection
```javascript
// Manager connection
const socket = io('http://localhost:4000', {
  auth: { token: 'manager_jwt_token' }
});

// Employee connection
const socket = io('http://localhost:4000', {
  auth: { token: 'device_token' }
});
```

#### Events

**Employee → Server:**
- `location:update` - Send location update

**Server → Manager:**
- `location:broadcast` - Receive real-time location updates
- `presence:update` - Receive employee online/offline status

## Testing the API

### Option 1: Using Test Scripts

The backend includes test scripts in the root directory:

```bash
# Test manager login
node test-manager-login.js

# Test employee operations
node test-employees.js

# Test location tracking
node test-location.js
```

### Option 2: Using cURL

```bash
# Test server health
curl http://localhost:4000/

# Test manager login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@example.com","password":"password123"}'
```

### Option 3: Using Postman or Thunder Client

1. Import the API endpoints from the documentation above
2. Create an environment with `baseUrl = http://localhost:4000`
3. Test each endpoint sequentially

## Creating Initial Data

### Create a Manager Account

```bash
node scripts/create-manager.js
```

Or manually using Prisma Studio:

```bash
npm run db:studio
```

Then add a manager with:
- Email: `manager@example.com`
- Password: (hash of `password123`)

### Create Employees

You can use the setup script:

```bash
npm run setup
```

Or create employees manually via Prisma Studio.

### Default Test Credentials

After running the setup script, you can use these test accounts:

**Manager:**
- Email: `manager@example.com`
- Password: `password123`

**Employee:**
- Email: `employee@example.com`
- Password: `password123`

## Project Structure

```
Newmap-backend/
├── prisma/
│   ├── schema.prisma       # Database schema definition
│   └── dev.db             # SQLite database file (auto-generated)
├── scripts/
│   ├── create-manager.js  # Script to create manager accounts
│   ├── migrate-employees.js
│   └── setup.js           # Initial setup script
├── src/
│   ├── config/
│   │   ├── database.js    # Database configuration
│   │   └── socket.js      # Socket.IO configuration
│   ├── middleware/
│   │   ├── auth.js        # JWT authentication middleware
│   │   ├── errorHandler.js
│   │   └── validators.js  # Request validation
│   ├── routes/
│   │   ├── auth.js        # Authentication routes
│   │   ├── employees.js   # Employee routes
│   │   └── location.js    # Location routes
│   ├── services/
│   │   ├── geocoding.js   # Geocoding service (Nominatim)
│   │   ├── location.js    # Location service
│   │   └── presence.js    # Presence tracking service
│   └── server.js          # Main server file
├── test-*.js              # API test scripts
├── .env                   # Environment variables (create this)
├── env.example            # Example environment file
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Troubleshooting

### Problem: Port 4000 is already in use

**Solution**: Change the PORT in your `.env` file:
```env
PORT=5000
```

### Problem: Database connection error

**Solution**: 
1. Delete `prisma/dev.db` file
2. Run `npm run db:push` again
3. Recreate initial data

### Problem: JWT token errors

**Solution**: 
1. Make sure your JWT_SECRET is set in `.env`
2. Verify the token is being sent in the Authorization header: `Bearer <token>`
3. Check if the token has expired (default: 24h)

### Problem: CORS errors from frontend

**Solution**: Add your frontend URL to ALLOWED_ORIGINS in `.env`:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Problem: Socket.IO connection fails

**Solution**:
1. Check if the server is running
2. Verify the JWT token is valid
3. Check browser console for error messages
4. Ensure Socket.IO client version matches server version (~4.7.x)

### Problem: Geocoding not working

**Solution**:
1. Verify NOMINATIM_API_URL is set correctly
2. Check internet connection
3. OpenStreetMap Nominatim has rate limits - wait a few seconds between requests
4. Consider using a self-hosted Nominatim instance for production

### Problem: npm install fails

**Solution**:
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` folder and `package-lock.json`
3. Run `npm install` again
4. Make sure you have Node.js 18+ installed

## Production Deployment

### Environment Variables

For production, update these values:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET=<strong-random-secret-change-this>
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use HTTPS (TLS/SSL certificates)
- [ ] Set proper CORS origins (remove localhost)
- [ ] Enable rate limiting
- [ ] Use environment variables for all secrets
- [ ] Regular database backups
- [ ] Monitor server logs
- [ ] Keep dependencies updated

### Deployment Platforms

This backend can be deployed to:
- **Heroku**: Add `Procfile` with `web: npm start`
- **Railway**: Connect GitHub repo, auto-deploys
- **DigitalOcean**: Use App Platform or Droplet with PM2
- **AWS**: EC2 or Elastic Beanstalk
- **Vercel/Netlify**: Requires serverless configuration

### Using PostgreSQL in Production

For production, consider switching from SQLite to PostgreSQL:

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update DATABASE_URL:
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

3. Run migration:
```bash
npm run db:migrate
```

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Socket.IO Documentation](https://socket.io/docs/)
- [JWT.io](https://jwt.io/)
- [OpenStreetMap Nominatim](https://nominatim.org/)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review server logs in the console
3. Check `prisma/dev.db` with Prisma Studio
4. Verify all environment variables are set correctly

## License

ISC

---

**Made with ❤️ for Employee Location Tracking**
