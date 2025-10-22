const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { verifyToken, verifyManager } = require('../middleware/auth');
const { validateManagerLogin, validateDeviceRegistration, validateEmployeeLogin } = require('../middleware/validation');

// Manager login
router.post('/manager/login', validateManagerLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginManager(email, password);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// Employee login
router.post('/employee/login', validateEmployeeLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginEmployee(email, password);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// Device registration for employee
router.post('/device', validateDeviceRegistration, async (req, res) => {
  try {
    const { employeeId, platform, deviceToken } = req.body;
    const result = await authService.registerDevice(employeeId, platform, deviceToken);
    
    res.json({
      success: true,
      message: 'Device registered successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get current user info
router.get('/me', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'manager') {
      const manager = await authService.getManagerById(req.user.id);
      res.json({
        success: true,
        data: { user: manager, role: 'manager' }
      });
    } else if (req.user.role === 'employee') {
      const employee = await authService.getEmployeeById(req.user.id);
      res.json({
        success: true,
        data: { user: employee, role: 'employee' }
      });
    } else {
      res.status(403).json({
        success: false,
        error: 'Invalid user role'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching user info'
    });
  }
});

// Refresh token
router.post('/refresh', verifyToken, async (req, res) => {
  try {
    // In a production app, you'd validate the refresh token here
    // For simplicity, we'll generate new tokens
    const { generateTokens } = require('../middleware/auth');
    const tokens = generateTokens({
      id: req.user.id,
      role: req.user.role,
      ...(req.user.deviceId && { deviceId: req.user.deviceId })
    });

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});

module.exports = router;
