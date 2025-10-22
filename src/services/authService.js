const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/database');
const { generateTokens } = require('../middleware/auth');

class AuthService {
  // Manager login
  async loginManager(email, password) {
    try {
      const manager = await prisma.manager.findUnique({
        where: { email, isActive: true }
      });

      if (!manager) {
        throw new Error('Invalid credentials');
      }

      const isValidPassword = await bcrypt.compare(password, manager.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const tokens = generateTokens({
        id: manager.id,
        email: manager.email,
        role: 'manager'
      });

      return {
        manager: {
          id: manager.id,
          fullName: manager.fullName,
          email: manager.email,
          company: manager.company
        },
        ...tokens
      };
    } catch (error) {
      console.error('Error in manager login:', error);
      throw error;
    }
  }

  // Register device for employee
  async registerDevice(employeeId, platform, deviceToken = null) {
    try {
      // Check if employee exists and is active
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId, isActive: true }
      });

      if (!employee) {
        throw new Error('Employee not found or inactive');
      }

      // Create or update device
      const device = await prisma.device.upsert({
        where: {
          employeeId_platform: {
            employeeId,
            platform
          }
        },
        update: {
          deviceToken,
          lastSeenAt: new Date(),
          isActive: true
        },
        create: {
          id: uuidv4(),
          employeeId,
          platform,
          deviceToken,
          lastSeenAt: new Date(),
          isActive: true
        }
      });

      const tokens = generateTokens({
        id: employee.id,
        deviceId: device.id,
        role: 'employee'
      });

      return {
        device: {
          id: device.id,
          platform: device.platform,
          lastSeenAt: device.lastSeenAt
        },
        employee: {
          id: employee.id,
          fullName: employee.fullName,
          department: employee.department,
          avatarUrl: employee.avatarUrl
        },
        ...tokens
      };
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  // Create manager (for initial setup)
  async createManager(managerData) {
    try {
      const hashedPassword = await bcrypt.hash(managerData.password, 12);

      const manager = await prisma.manager.create({
        data: {
          fullName: managerData.fullName,
          email: managerData.email,
          password: hashedPassword,
          company: managerData.company
        }
      });

      return {
        id: manager.id,
        fullName: manager.fullName,
        email: manager.email,
        company: manager.company
      };
    } catch (error) {
      console.error('Error creating manager:', error);
      throw error;
    }
  }

  // Create employee
  async createEmployee(employeeData) {
    try {
      // Generate password: lastName + # + 321
      const password = `${employeeData.lastName}#321`;
      const hashedPassword = await bcrypt.hash(password, 12);

      const employee = await prisma.employee.create({
        data: {
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          fullName: `${employeeData.firstName} ${employeeData.lastName}`,
          department: employeeData.department,
          email: employeeData.email,
          phone: employeeData.phone,
          gender: employeeData.gender,
          avatarUrl: employeeData.avatarUrl,
          password: hashedPassword
        }
      });

      // Return employee without password
      const { password: _, ...employeeWithoutPassword } = employee;
      return {
        ...employeeWithoutPassword,
        initialPassword: password // Send initial password only once
      };
    } catch (error) {
      console.error('Error creating employee:', error);
      if (error.code === 'P2002') {
        throw new Error('An employee with this email already exists');
      }
      throw error;
    }
  }

  // Employee login
  async loginEmployee(email, password) {
    try {
      const employee = await prisma.employee.findUnique({
        where: { email, isActive: true }
      });

      if (!employee) {
        throw new Error('Invalid credentials');
      }

      const isValidPassword = await bcrypt.compare(password, employee.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const tokens = generateTokens({
        id: employee.id,
        email: employee.email,
        role: 'employee'
      });

      return {
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          fullName: employee.fullName,
          email: employee.email,
          phone: employee.phone,
          gender: employee.gender,
          department: employee.department,
          avatarUrl: employee.avatarUrl
        },
        ...tokens
      };
    } catch (error) {
      console.error('Error in employee login:', error);
      throw error;
    }
  }

  // Get employee by ID
  async getEmployeeById(employeeId) {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId, isActive: true },
        include: {
          devices: {
            where: { isActive: true }
          },
          presence: true
        }
      });

      return employee;
    } catch (error) {
      console.error('Error getting employee:', error);
      throw error;
    }
  }

  // Update device last seen
  async updateDeviceLastSeen(deviceId) {
    try {
      await prisma.device.update({
        where: { id: deviceId },
        data: { lastSeenAt: new Date() }
      });
    } catch (error) {
      console.error('Error updating device last seen:', error);
    }
  }

  // Get manager by ID
  async getManagerById(managerId) {
    try {
      const manager = await prisma.manager.findUnique({
        where: { id: managerId, isActive: true }
      });

      return manager;
    } catch (error) {
      console.error('Error getting manager:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
