require('dotenv').config();

const config = {
  // Server
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // External APIs
  nominatimApiUrl: process.env.NOMINATIM_API_URL || 'https://nominatim.openstreetmap.org',
  
  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080'
  ],
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Location Settings
  locationUpdateIntervalMs: parseInt(process.env.LOCATION_UPDATE_INTERVAL_MS) || 30000, // 30 seconds
  presenceTimeoutMs: parseInt(process.env.PRESENCE_TIMEOUT_MS) || 120000, // 2 minutes
};

module.exports = config;
