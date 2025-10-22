const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testAPI() {
  try {
    console.log('Testing Employee Location Tracking API...\n');

    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);

    // Test 2: Device authentication
    console.log('\n2. Testing device authentication...');
    const authResponse = await axios.post(`${BASE_URL}/auth/device`, {
      deviceId: 'TEST-DEVICE-001',
      employeeId: 'EMP001'
    });
    console.log('✅ Device authentication successful');
    const token = authResponse.data.token;

    // Test 3: Send device status
    console.log('\n3. Testing device status update...');
    const deviceStatus = {
      batteryLevel: 85,
      batteryState: 'charging',
      isOnline: true,
      connectionType: 'WiFi',
      signalStrength: 4,
      connectivityResults: ['wifi'],
      timestamp: new Date().toISOString()
    };

    const statusResponse = await axios.post(`${BASE_URL}/location/device-status`, {
      deviceStatus: deviceStatus
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Device status sent successfully');

    // Test 4: Send location update
    console.log('\n4. Testing location update...');
    const locationResponse = await axios.post(`${BASE_URL}/location`, {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10.5,
      altitude: 10.0,
      speed: 0,
      heading: 0,
      deviceStatus: deviceStatus
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Location update sent successfully');

    // Test 5: Get employees list
    console.log('\n5. Testing employees list...');
    const employeesResponse = await axios.get(`${BASE_URL}/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Employees list retrieved:', employeesResponse.data.length, 'employees');

    // Test 6: Get employee details
    console.log('\n6. Testing employee details...');
    const employeeResponse = await axios.get(`${BASE_URL}/employees/EMP001`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Employee details retrieved:', employeeResponse.data.fullName);

    // Test 7: Get latest location
    console.log('\n7. Testing latest location...');
    const locationLatestResponse = await axios.get(`${BASE_URL}/employees/EMP001/location/latest`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Latest location retrieved:', locationLatestResponse.data);

    console.log('\n🎉 All tests passed successfully!');
    console.log('\nDevice Status Data Structure:');
    console.log(JSON.stringify(deviceStatus, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAPI();
