const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testManagerLogin() {
  console.log('\n🔐 Testing Manager Login...\n');

  try {
    // Test login with default credentials
    console.log('Attempting login with:');
    console.log('  Email: admin@company.com');
    console.log('  Password: admin123\n');

    const response = await axios.post(`${BASE_URL}/auth/manager/login`, {
      email: 'admin@company.com',
      password: 'admin123'
    });

    if (response.data.success) {
      console.log('✅ Login successful!\n');
      console.log('Manager Details:');
      console.log(`  ID: ${response.data.data.manager.id}`);
      console.log(`  Name: ${response.data.data.manager.fullName}`);
      console.log(`  Email: ${response.data.data.manager.email}`);
      console.log(`\n🎟️  Access Token: ${response.data.data.accessToken.substring(0, 50)}...\n`);
      console.log('✅ Manager login is working correctly!');
      console.log('\n📝 Use these credentials in your Flutter app:');
      console.log('   Email: admin@company.com');
      console.log('   Password: admin123');
    } else {
      console.log('❌ Login failed:', response.data.error);
    }
  } catch (error) {
    if (error.response) {
      console.log('❌ Login failed!');
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
      
      if (error.response.status === 404) {
        console.log('\n💡 The login endpoint was not found.');
        console.log('   Make sure the backend server is running and has been restarted after adding the manager login route.');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to server!');
      console.log('\n💡 Make sure the backend is running:');
      console.log('   cd Newmap-backend');
      console.log('   node server.js');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

// Test invalid credentials
async function testInvalidLogin() {
  console.log('\n\n🧪 Testing with invalid credentials...\n');
  
  try {
    await axios.post(`${BASE_URL}/auth/manager/login`, {
      email: 'admin@company.com',
      password: 'wrongpassword'
    });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Correctly rejected invalid password');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
}

async function testHealth() {
  console.log('🏥 Checking server health...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running');
    console.log(`   ${JSON.stringify(response.data, null, 2)}\n`);
    return true;
  } catch (error) {
    console.log('❌ Server is not responding');
    console.log('\n💡 Start the backend server:');
    console.log('   cd Newmap-backend');
    console.log('   node server.js\n');
    return false;
  }
}

async function run() {
  const isHealthy = await testHealth();
  
  if (isHealthy) {
    await testManagerLogin();
    await testInvalidLogin();
  }
}

run();




