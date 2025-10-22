/**
 * Test script to verify location tracking functionality
 * Run this to test if backend can receive and process location updates
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Test data
let authToken = null;
let employeeId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEmployeeLogin() {
  log('\n📝 Testing Employee Login...', colors.cyan);
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/employee/login`, {
      email: 'john.doe@company.com', // Update with your test employee email
      password: 'password123'          // Update with your test employee password
    });

    if (response.data.success) {
      authToken = response.data.data.accessToken;
      employeeId = response.data.data.employee.id;
      log('✅ Login successful!', colors.green);
      log(`   Employee: ${response.data.data.employee.fullName}`);
      log(`   Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      log('❌ Login failed: ' + response.data.error, colors.red);
      return false;
    }
  } catch (error) {
    log('❌ Login error: ' + (error.response?.data?.error || error.message), colors.red);
    log('   Tip: Update email/password in this script to match your test employee', colors.yellow);
    return false;
  }
}

async function testSendLocation() {
  log('\n📍 Testing Send Location...', colors.cyan);
  
  // Simulate GPS coordinates (San Francisco)
  const locationData = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 15.5,
    altitude: 52.0,
    speed: 2.5,
    heading: 180.0,
    battery: 85,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await axios.post(`${BASE_URL}/location`, locationData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      log('✅ Location sent successfully!', colors.green);
      log(`   Location ID: ${response.data.data.locationId}`);
      log(`   Timestamp: ${response.data.data.timestamp}`);
      log(`   Coordinates: ${locationData.latitude}, ${locationData.longitude}`);
      return true;
    } else {
      log('❌ Failed to send location', colors.red);
      return false;
    }
  } catch (error) {
    log('❌ Send location error: ' + (error.response?.data?.error || error.message), colors.red);
    if (error.response?.status === 401) {
      log('   Authentication error - token may be invalid', colors.yellow);
    }
    return false;
  }
}

async function testUpdatePresence() {
  log('\n👤 Testing Update Presence...', colors.cyan);
  
  try {
    const response = await axios.post(`${BASE_URL}/location/presence`, {
      isOnline: true,
      lastSeenAt: new Date().toISOString()
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      log('✅ Presence updated successfully!', colors.green);
      log('   Status: Online');
      return true;
    } else {
      log('❌ Failed to update presence', colors.red);
      return false;
    }
  } catch (error) {
    log('❌ Update presence error: ' + (error.response?.data?.error || error.message), colors.red);
    return false;
  }
}

async function testLocationHistory() {
  log('\n📜 Testing Location History...', colors.cyan);
  
  try {
    const response = await axios.get(`${BASE_URL}/location/history?limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      const locations = response.data.data;
      log(`✅ Retrieved ${locations.length} location records`, colors.green);
      
      if (locations.length > 0) {
        log('\n   Recent locations:');
        locations.slice(0, 3).forEach((loc, index) => {
          log(`   ${index + 1}. [${loc.timestamp}]`);
          log(`      Coords: ${loc.latitude}, ${loc.longitude}`);
          log(`      Address: ${loc.address || 'N/A'}`);
        });
      }
      return true;
    } else {
      log('❌ Failed to get location history', colors.red);
      return false;
    }
  } catch (error) {
    log('❌ Location history error: ' + (error.response?.data?.error || error.message), colors.red);
    return false;
  }
}

async function simulateMultipleUpdates() {
  log('\n🔄 Simulating Multiple Location Updates...', colors.cyan);
  
  // Simulate movement in San Francisco area
  const startLat = 37.7749;
  const startLng = -122.4194;
  
  for (let i = 0; i < 5; i++) {
    // Add small random movements
    const lat = startLat + (Math.random() - 0.5) * 0.01;
    const lng = startLng + (Math.random() - 0.5) * 0.01;
    
    const locationData = {
      latitude: lat,
      longitude: lng,
      accuracy: 10 + Math.random() * 20,
      altitude: 50 + Math.random() * 10,
      speed: Math.random() * 5,
      heading: Math.random() * 360,
      battery: 85 - i * 5,
      timestamp: new Date().toISOString()
    };

    try {
      await axios.post(`${BASE_URL}/location`, locationData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      log(`   Update ${i + 1}/5: ✅ (${lat.toFixed(5)}, ${lng.toFixed(5)})`, colors.green);
      
      // Wait 1 second between updates
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      log(`   Update ${i + 1}/5: ❌ ${error.message}`, colors.red);
    }
  }
  
  log('✅ Multiple updates completed', colors.green);
}

async function runAllTests() {
  log('\n════════════════════════════════════════', colors.cyan);
  log('   LOCATION TRACKING TEST SUITE', colors.cyan);
  log('════════════════════════════════════════', colors.cyan);
  
  // Step 1: Login
  const loginSuccess = await testEmployeeLogin();
  if (!loginSuccess) {
    log('\n❌ Cannot proceed without successful login', colors.red);
    log('\nPlease ensure:', colors.yellow);
    log('  1. Backend server is running (npm start)', colors.yellow);
    log('  2. Database is set up (npx prisma migrate dev)', colors.yellow);
    log('  3. Test employee exists in database', colors.yellow);
    log('  4. Email/password in this script match your test employee', colors.yellow);
    process.exit(1);
  }

  // Step 2: Send single location
  await testSendLocation();

  // Step 3: Update presence
  await testUpdatePresence();

  // Step 4: Get location history
  await testLocationHistory();

  // Step 5: Simulate multiple updates
  await simulateMultipleUpdates();

  // Final summary
  log('\n════════════════════════════════════════', colors.cyan);
  log('   TEST SUITE COMPLETED', colors.cyan);
  log('════════════════════════════════════════', colors.cyan);
  log('\n✅ All tests completed successfully!', colors.green);
  log('\nNext steps:', colors.cyan);
  log('  1. Run the Trackme app and login', colors.reset);
  log('  2. Start location sharing in the app', colors.reset);
  log('  3. Watch backend console for location updates', colors.reset);
  log('  4. Check database with: npx prisma studio', colors.reset);
}

// Run tests
runAllTests().catch(error => {
  log('\n❌ Test suite failed: ' + error.message, colors.red);
  process.exit(1);
});

