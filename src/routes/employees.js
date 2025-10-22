const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const locationService = require('../services/locationService');
const { verifyToken, verifyManager } = require('../middleware/auth');
const { validateEmployeeId, validatePagination } = require('../middleware/validation');

// Get all employees with their locations (Manager only)
router.get('/', verifyToken, verifyManager, validatePagination, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const result = await locationService.getAllEmployeesWithLocations(search, parseInt(page), parseInt(limit));
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching employees'
    });
  }
});

// Get specific employee details (Manager only)
router.get('/:id', verifyToken, verifyManager, validateEmployeeId, async (req, res) => {
  try {
    const employee = await authService.getEmployeeById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching employee'
    });
  }
});

// Get employee's latest location (Manager only)
router.get('/:id/location/latest', verifyToken, verifyManager, validateEmployeeId, async (req, res) => {
  try {
    const location = await locationService.getLatestLocation(req.params.id);
    
    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'No location data found for this employee'
      });
    }

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching latest location'
    });
  }
});

// Get employee's location history (Manager only)
router.get('/:id/location/history', verifyToken, verifyManager, validateEmployeeId, async (req, res) => {
  try {
    const { from, to, limit = 100 } = req.query;
    const locations = await locationService.getLocationHistory(req.params.id, { from, to, limit: parseInt(limit) });
    
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

// Get employee's presence status (Manager only)
router.get('/:id/presence', verifyToken, verifyManager, validateEmployeeId, async (req, res) => {
  try {
    const employee = await authService.getEmployeeById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: {
        employeeId: employee.id,
        isOnline: employee.presence?.isOnline || false,
        lastSeenAt: employee.presence?.lastSeenAt || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching presence status'
    });
  }
});

// Create new employee (Manager only)
router.post('/', verifyToken, verifyManager, async (req, res) => {
  try {
    console.log('📝 Employee registration request received:', req.body);
    
    const { firstName, lastName, department, email, phone, gender, avatarUrl } = req.body;
    
    if (!firstName || !lastName || !department || !email) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'First name, last name, department, and email are required'
      });
    }

    console.log('✅ Creating employee...');
    const employee = await authService.createEmployee({
      firstName,
      lastName,
      department,
      email,
      phone,
      gender,
      avatarUrl
    });

    console.log('✅ Employee created successfully:', employee.id);
    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
