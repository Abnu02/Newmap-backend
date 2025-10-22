const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const locationService = require('./locationService');

class SocketService {
  constructor(io) {
    this.io = io;
    this.setupNamespaces();
  }

  setupNamespaces() {
    // Manager namespace
    const managerNamespace = this.io.of('/manager');
    managerNamespace.use(this.authenticateManager.bind(this));
    managerNamespace.on('connection', this.handleManagerConnection.bind(this));

    // Employee namespace
    const employeeNamespace = this.io.of('/employee');
    employeeNamespace.use(this.authenticateEmployee.bind(this));
    employeeNamespace.on('connection', this.handleEmployeeConnection.bind(this));
  }

  // Authenticate manager connection
  async authenticateManager(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      
      if (decoded.role !== 'manager') {
        return next(new Error('Authentication error: Invalid role'));
      }

      const manager = await prisma.manager.findUnique({
        where: { id: decoded.id, isActive: true }
      });

      if (!manager) {
        return next(new Error('Authentication error: Manager not found'));
      }

      socket.managerId = manager.id;
      socket.manager = manager;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  }

  // Authenticate employee connection
  async authenticateEmployee(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      
      if (decoded.role !== 'employee') {
        return next(new Error('Authentication error: Invalid role'));
      }

      const device = await prisma.device.findFirst({
        where: { 
          id: decoded.deviceId,
          isActive: true 
        },
        include: {
          employee: true
        }
      });

      if (!device || !device.employee.isActive) {
        return next(new Error('Authentication error: Device or employee not found'));
      }

      socket.deviceId = device.id;
      socket.employeeId = device.employee.id;
      socket.employee = device.employee;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  }

  // Handle manager connection
  async handleManagerConnection(socket) {
    console.log(`Manager connected: ${socket.manager.fullName} (${socket.managerId})`);
    
    // Join managers room for broadcasts
    socket.join('managers');

    // Send initial data
    try {
      const employees = await locationService.getAllEmployeesWithLocations('', 1, 100);
      socket.emit('initialData', {
        employees: employees.employees
      });
    } catch (error) {
      console.error('Error sending initial data to manager:', error);
    }

    // Handle manager events
    socket.on('requestEmployeeUpdate', async (data) => {
      try {
        const { employeeId } = data;
        const location = await locationService.getLatestLocation(employeeId);
        
        socket.emit('employeeUpdate', {
          employeeId,
          location
        });
      } catch (error) {
        console.error('Error handling employee update request:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Manager disconnected: ${socket.manager.fullName}`);
    });
  }

  // Handle employee connection
  async handleEmployeeConnection(socket) {
    console.log(`Employee connected: ${socket.employee.fullName} (${socket.employeeId})`);
    
    // Update presence to online
    await locationService.updatePresence(socket.employeeId, true);

    // Notify managers about employee coming online
    this.io.of('/manager').to('managers').emit('presenceUpdate', {
      employeeId: socket.employeeId,
      employee: {
        id: socket.employee.id,
        fullName: socket.employee.fullName,
        department: socket.employee.department,
        avatarUrl: socket.employee.avatarUrl
      },
      isOnline: true,
      lastSeenAt: new Date()
    });

    // Handle employee events
    socket.on('heartbeat', async () => {
      try {
        // Update device last seen
        await prisma.device.update({
          where: { id: socket.deviceId },
          data: { lastSeenAt: new Date() }
        });

        // Update presence
        await locationService.updatePresence(socket.employeeId, true);

        socket.emit('heartbeatAck', { timestamp: new Date() });
      } catch (error) {
        console.error('Error handling heartbeat:', error);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Employee disconnected: ${socket.employee.fullName}`);
      
      // Update presence to offline after a delay
      setTimeout(async () => {
        try {
          await locationService.updatePresence(socket.employeeId, false);
          
          // Notify managers about employee going offline
          this.io.of('/manager').to('managers').emit('presenceUpdate', {
            employeeId: socket.employeeId,
            employee: {
              id: socket.employee.id,
              fullName: socket.employee.fullName,
              department: socket.employee.department,
              avatarUrl: socket.employee.avatarUrl
            },
            isOnline: false,
            lastSeenAt: new Date()
          });
        } catch (error) {
          console.error('Error updating presence on disconnect:', error);
        }
      }, config.presenceTimeoutMs);
    });
  }

  // Broadcast location update to all managers
  broadcastLocationUpdate(employeeId, locationData) {
    this.io.of('/manager').to('managers').emit('locationUpdate', {
      employeeId,
      location: locationData
    });
  }

  // Broadcast presence update to all managers
  broadcastPresenceUpdate(employeeId, presenceData) {
    this.io.of('/manager').to('managers').emit('presenceUpdate', {
      employeeId,
      ...presenceData
    });
  }
}

module.exports = SocketService;
