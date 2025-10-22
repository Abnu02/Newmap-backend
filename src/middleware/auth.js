const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Verify manager token
const verifyManager = async (req, res, next) => {
  try {
    const manager = await prisma.manager.findUnique({
      where: { id: req.user.id, isActive: true }
    });

    if (!manager) {
      return res.status(403).json({ error: 'Manager not found or inactive.' });
    }

    req.manager = manager;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error verifying manager.' });
  }
};

// Verify employee device token
const verifyEmployeeDevice = async (req, res, next) => {
  try {
    const device = await prisma.device.findFirst({
      where: { 
        id: req.user.deviceId,
        isActive: true 
      },
      include: {
        employee: true
      }
    });

    if (!device || !device.employee.isActive) {
      return res.status(403).json({ error: 'Device not found or employee inactive.' });
    }

    req.device = device;
    req.employee = device.employee;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error verifying device.' });
  }
};

// Generate JWT tokens
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, config.jwtSecret, { 
    expiresIn: config.jwtExpiresIn 
  });
  
  const refreshToken = jwt.sign(payload, config.jwtSecret, { 
    expiresIn: config.jwtRefreshExpiresIn 
  });

  return { accessToken, refreshToken };
};

module.exports = {
  verifyToken,
  verifyManager,
  verifyEmployeeDevice,
  generateTokens
};
