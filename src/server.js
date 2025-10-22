const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const prisma = require('./config/database');
const { cors, helmet, limiter, errorHandler, notFoundHandler, requestLogger } = require('./middleware');
const SocketService = require('./services/socketService');
const locationService = require('./services/locationService');

// Import routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const locationRoutes = require('./routes/location');

// Create Express app
const app = express();
const server = createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: config.allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store io instance in app for use in routes
app.set('io', io);

// Middleware
app.use(helmet);
app.use(cors);
app.use(limiter);
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/location', locationRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize Socket.IO service
const socketService = new SocketService(io);

// Background tasks
const startBackgroundTasks = () => {
  // Mark inactive employees as offline every 2 minutes
  setInterval(async () => {
    try {
      await locationService.markInactiveEmployeesOffline();
    } catch (error) {
      console.error('Error in background task:', error);
    }
  }, 2 * 60 * 1000);
};

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Start background tasks
    startBackgroundTasks();
    console.log('✅ Background tasks started');

    // Start server
    server.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🌐 CORS origins: ${config.allowedOrigins.join(', ')}`);
      console.log(`🗄️  Database: ${config.databaseUrl}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('🔌 HTTP server closed');
    
    try {
      await prisma.$disconnect();
      console.log('🔌 Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = { app, server, io };
