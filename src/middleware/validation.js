const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Location update validation
const validateLocationUpdate = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('accuracy')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Accuracy must be a positive number'),
  body('battery')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Battery must be between 0 and 100'),
  handleValidationErrors
];

// Employee ID validation
const validateEmployeeId = [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Employee ID is required'),
  handleValidationErrors
];

// Manager login validation
const validateManagerLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

// Employee login validation
const validateEmployeeLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Device registration validation
const validateDeviceRegistration = [
  body('employeeId')
    .isString()
    .notEmpty()
    .withMessage('Employee ID is required'),
  body('platform')
    .isIn(['ios', 'android', 'web'])
    .withMessage('Platform must be ios, android, or web'),
  body('deviceToken')
    .optional()
    .isString()
    .withMessage('Device token must be a string'),
  handleValidationErrors
];

// Query validation for pagination
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateLocationUpdate,
  validateEmployeeId,
  validateManagerLogin,
  validateEmployeeLogin,
  validateDeviceRegistration,
  validatePagination
};
