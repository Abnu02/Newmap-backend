const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./dev.db');

// Initialize database tables
db.serialize(() => {
  // Employees table
  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    department TEXT,
    avatarUrl TEXT,
    tenantId TEXT,
    active BOOLEAN DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Devices table
  db.run(`CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    employeeId TEXT NOT NULL,
    platform TEXT,
    pushToken TEXT,
    lastSeenAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES employees (id)
  )`);

  // Presence table
  db.run(`CREATE TABLE IF NOT EXISTS presence (
    employeeId TEXT PRIMARY KEY,
    online BOOLEAN DEFAULT 0,
    lastSeenAt DATETIME,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES employees (id)
  )`);

  // Locations table
  db.run(`CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    employeeId TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    altitude REAL,
    speed REAL,
    heading REAL,
    batteryLevel INTEGER,
    batteryState TEXT,
    isOnline BOOLEAN,
    connectionType TEXT,
    signalStrength INTEGER,
    timestamp DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES employees (id)
  )`);

  // Device status table
  db.run(`CREATE TABLE IF NOT EXISTS device_status (
    id TEXT PRIMARY KEY,
    employeeId TEXT NOT NULL,
    batteryLevel INTEGER,
    batteryState TEXT,
    isOnline BOOLEAN,
    connectionType TEXT,
    signalStrength INTEGER,
    connectivityResults TEXT,
    timestamp DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES employees (id)
  )`);

  // Insert sample data
  db.run(`INSERT OR IGNORE INTO employees (id, fullName, department, avatarUrl, tenantId) VALUES 
    ('EMP001', 'Sarah Johnson', 'Field Operations', 'https://images.unsplash.com/photo-1702089050621-62646a2b748f', 'tenant1'),
    ('EMP-001', 'John Doe', 'Sales', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', 'tenant1')`);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Device authentication
app.post('/auth/device', (req, res) => {
  const { deviceId, employeeId } = req.body;

  if (!deviceId || !employeeId) {
    return res.status(400).json({ error: 'Device ID and Employee ID are required' });
  }

  // Check if employee exists
  db.get('SELECT * FROM employees WHERE id = ?', [employeeId], (err, employee) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Create or update device record
    const deviceRecord = {
      id: deviceId,
      employeeId: employeeId,
      platform: req.headers['user-agent'] || 'unknown',
      lastSeenAt: new Date().toISOString()
    };

    db.run(
      'INSERT OR REPLACE INTO devices (id, employeeId, platform, lastSeenAt) VALUES (?, ?, ?, ?)',
      [deviceRecord.id, deviceRecord.employeeId, deviceRecord.platform, deviceRecord.lastSeenAt],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to register device' });
        }

        // Generate JWT token
        const token = jwt.sign(
          { 
            employeeId: employeeId,
            deviceId: deviceId,
            type: 'employee'
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          token: token,
          employee: employee,
          device: deviceRecord
        });
      }
    );
  });
});

// Send device status
app.post('/location/device-status', authenticateToken, (req, res) => {
  const { deviceStatus } = req.body;
  const employeeId = req.user.employeeId;

  if (!deviceStatus) {
    return res.status(400).json({ error: 'Device status is required' });
  }

  const statusRecord = {
    id: uuidv4(),
    employeeId: employeeId,
    batteryLevel: deviceStatus.batteryLevel,
    batteryState: deviceStatus.batteryState,
    isOnline: deviceStatus.isOnline,
    connectionType: deviceStatus.connectionType,
    signalStrength: deviceStatus.signalStrength,
    connectivityResults: JSON.stringify(deviceStatus.connectivityResults),
    timestamp: deviceStatus.timestamp
  };

  // Insert device status
  db.run(
    `INSERT INTO device_status (id, employeeId, batteryLevel, batteryState, isOnline, connectionType, signalStrength, connectivityResults, timestamp) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [statusRecord.id, statusRecord.employeeId, statusRecord.batteryLevel, statusRecord.batteryState, 
     statusRecord.isOnline, statusRecord.connectionType, statusRecord.signalStrength, 
     statusRecord.connectivityResults, statusRecord.timestamp],
    function(err) {
      if (err) {
        console.error('Error saving device status:', err);
        return res.status(500).json({ error: 'Failed to save device status' });
      }

      // Update presence
      db.run(
        'INSERT OR REPLACE INTO presence (employeeId, online, lastSeenAt) VALUES (?, ?, ?)',
        [employeeId, deviceStatus.isOnline, new Date().toISOString()],
        (err) => {
          if (err) {
            console.error('Error updating presence:', err);
          }
        }
      );

      // Broadcast to manager clients
      io.to('managers').emit('deviceStatusUpdate', {
        employeeId: employeeId,
        deviceStatus: deviceStatus,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, id: statusRecord.id });
    }
  );
});

// Send location update
app.post('/location', authenticateToken, (req, res) => {
  const { latitude, longitude, accuracy, altitude, speed, heading, deviceStatus } = req.body;
  const employeeId = req.user.employeeId;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const locationRecord = {
    id: uuidv4(),
    employeeId: employeeId,
    latitude: latitude,
    longitude: longitude,
    accuracy: accuracy,
    altitude: altitude,
    speed: speed,
    heading: heading,
    batteryLevel: deviceStatus?.batteryLevel,
    batteryState: deviceStatus?.batteryState,
    isOnline: deviceStatus?.isOnline,
    connectionType: deviceStatus?.connectionType,
    signalStrength: deviceStatus?.signalStrength,
    timestamp: new Date().toISOString()
  };

  // Insert location
  db.run(
    `INSERT INTO locations (id, employeeId, latitude, longitude, accuracy, altitude, speed, heading, 
     batteryLevel, batteryState, isOnline, connectionType, signalStrength, timestamp) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [locationRecord.id, locationRecord.employeeId, locationRecord.latitude, locationRecord.longitude,
     locationRecord.accuracy, locationRecord.altitude, locationRecord.speed, locationRecord.heading,
     locationRecord.batteryLevel, locationRecord.batteryState, locationRecord.isOnline,
     locationRecord.connectionType, locationRecord.signalStrength, locationRecord.timestamp],
    function(err) {
      if (err) {
        console.error('Error saving location:', err);
        return res.status(500).json({ error: 'Failed to save location' });
      }

      // Update presence
      db.run(
        'INSERT OR REPLACE INTO presence (employeeId, online, lastSeenAt) VALUES (?, ?, ?)',
        [employeeId, true, new Date().toISOString()],
        (err) => {
          if (err) {
            console.error('Error updating presence:', err);
          }
        }
      );

      // Broadcast to manager clients
      io.to('managers').emit('locationUpdate', {
        employeeId: employeeId,
        location: {
          latitude: latitude,
          longitude: longitude,
          accuracy: accuracy,
          timestamp: locationRecord.timestamp
        },
        deviceStatus: deviceStatus
      });

      res.json({ success: true, id: locationRecord.id });
    }
  );
});

// Get employees list (for managers)
app.get('/employees', authenticateToken, (req, res) => {
  const query = `
    SELECT e.*, p.online, p.lastSeenAt,
           (SELECT batteryLevel FROM device_status WHERE employeeId = e.id ORDER BY timestamp DESC LIMIT 1) as batteryLevel,
           (SELECT connectionType FROM device_status WHERE employeeId = e.id ORDER BY timestamp DESC LIMIT 1) as connectionType
    FROM employees e
    LEFT JOIN presence p ON e.id = p.employeeId
    WHERE e.active = 1
    ORDER BY e.fullName
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching employees:', err);
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }

    res.json(rows);
  });
});

// Get employee details
app.get('/employees/:id', authenticateToken, (req, res) => {
  const employeeId = req.params.id;

  const query = `
    SELECT e.*, p.online, p.lastSeenAt,
           (SELECT batteryLevel FROM device_status WHERE employeeId = e.id ORDER BY timestamp DESC LIMIT 1) as batteryLevel,
           (SELECT connectionType FROM device_status WHERE employeeId = e.id ORDER BY timestamp DESC LIMIT 1) as connectionType,
           (SELECT signalStrength FROM device_status WHERE employeeId = e.id ORDER BY timestamp DESC LIMIT 1) as signalStrength
    FROM employees e
    LEFT JOIN presence p ON e.id = p.employeeId
    WHERE e.id = ?
  `;

  db.get(query, [employeeId], (err, row) => {
    if (err) {
      console.error('Error fetching employee:', err);
      return res.status(500).json({ error: 'Failed to fetch employee' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(row);
  });
});

// Get latest location for employee
app.get('/employees/:id/location/latest', authenticateToken, (req, res) => {
  const employeeId = req.params.id;

  db.get(
    'SELECT * FROM locations WHERE employeeId = ? ORDER BY timestamp DESC LIMIT 1',
    [employeeId],
    (err, row) => {
      if (err) {
        console.error('Error fetching latest location:', err);
        return res.status(500).json({ error: 'Failed to fetch location' });
      }

      res.json(row || {});
    }
  );
});

// Get location history for employee
app.get('/employees/:id/location/history', authenticateToken, (req, res) => {
  const employeeId = req.params.id;
  const { from, to, limit = 100 } = req.query;

  let query = 'SELECT * FROM locations WHERE employeeId = ?';
  const params = [employeeId];

  if (from) {
    query += ' AND timestamp >= ?';
    params.push(from);
  }

  if (to) {
    query += ' AND timestamp <= ?';
    params.push(to);
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching location history:', err);
      return res.status(500).json({ error: 'Failed to fetch location history' });
    }

    res.json(rows);
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (data) => {
    if (data.role === 'manager') {
      socket.join('managers');
      console.log('Manager joined:', socket.id);
    } else if (data.role === 'employee') {
      socket.join(`employee:${data.employeeId}`);
      console.log('Employee joined:', data.employeeId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
