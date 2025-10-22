const express = require('express');
const router = express.Router();
const locationService = require('../services/locationService');
const authService = require('../services/authService');
const { verifyToken, verifyEmployeeDevice } = require('../middleware/auth');
const { validateLocationUpdate } = require('../middleware/validation');

// Update location (Employee only)
router.post('/', verifyToken, verifyEmployeeDevice, validateLocationUpdate, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, altitude, speed, heading, battery, timestamp } = req.body;
    
    const location = await locationService.saveLocationUpdate(req.employee.id, {
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      heading,
      battery,
      timestamp
    });

    // Update device last seen
    await authService.updateDeviceLastSeen(req.device.id);

    // Emit real-time update to managers
    req.app.get('io').to('managers').emit('locationUpdate', {
      employeeId: req.employee.id,
      employee: {
        id: req.employee.id,
        fullName: req.employee.fullName,
        department: req.employee.department,
        avatarUrl: req.employee.avatarUrl
      },
      location: {
        latitude,
        longitude,
        accuracy,
        battery,
        address: location.address,
        timestamp: location.timestamp
      }
    });

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        locationId: location.id,
        timestamp: location.timestamp
      }
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating location'
    });
  }
});

// Get my location history (Employee only)
router.get('/history', verifyToken, verifyEmployeeDevice, async (req, res) => {
  try {
    const { from, to, limit = 50 } = req.query;
    const locations = await locationService.getLocationHistory(req.employee.id, { from, to, limit: parseInt(limit) });
    
    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching location history'
    });
  }
});

// Update presence status (Employee only)
router.post('/presence', verifyToken, verifyEmployeeDevice, async (req, res) => {
  try {
    const { isOnline } = req.body;
    
    await locationService.updatePresence(req.employee.id, isOnline);
    
    // Update device last seen
    await authService.updateDeviceLastSeen(req.device.id);

    // Emit presence update to managers
    req.app.get('io').to('managers').emit('presenceUpdate', {
      employeeId: req.employee.id,
      employee: {
        id: req.employee.id,
        fullName: req.employee.fullName,
        department: req.employee.department,
        avatarUrl: req.employee.avatarUrl
      },
      isOnline,
      lastSeenAt: new Date()
    });

    res.json({
      success: true,
      message: 'Presence updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error updating presence'
    });
  }
});

module.exports = router;
