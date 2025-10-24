/**
 * Test All Accounts - Verify Manager and Employee Authentication
 * 
 * This script tests:
 * 1. Manager login for all roles (admin, manager, supervisor)
 * 2. Employee device registration
 * 3. Token validation
 * 
 * Usage: node test-all-accounts.js
 */

const BASE_URL = 'http://localhost:4000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.yellow}═══ ${msg} ═══${colors.reset}\n`)
};

// Manager accounts to test
const managers = [
  { 
    email: 'admin@company.com', 
    password: 'admin123', 
    role: 'admin',
    name: 'Admin Manager'
  },
  { 
    email: 'manager@company.com', 
    password: 'manager123', 
    role: 'manager',
    name: 'John Manager'
  },
  { 
    email: 'supervisor@company.com', 
    password: 'supervisor123', 
    role: 'supervisor',
    name: 'Jane Supervisor'
  }
];

// Employee to test
const testEmployee = {
  id: 'EMP001',
  deviceId: 'TEST-DEVICE-001',
  name: 'Sarah Johnson'
};

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test manager login
 */
async function testManagerLogin(manager) {
  try {
    const response = await fetch(`${BASE_URL}/auth/manager/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: manager.email,
        password: manager.password
      })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      log.success(`${manager.role.toUpperCase()} Login: ${manager.name}`);
      console.log(`   Token: ${data.token.substring(0, 30)}...`);
      console.log(`   Role: ${data.manager.role}`);
      console.log(`   ID: ${data.manager.id}`);
      return data.token;
    } else {
      log.error(`${manager.role.toUpperCase()} Login Failed: ${data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    log.error(`${manager.role.toUpperCase()} Login Error: ${error.message}`);
    return null;
  }
}

/**
 * Test employee device registration
 */
async function testEmployeeAuth(employee) {
  try {
    const response = await fetch(`${BASE_URL}/auth/device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: employee.deviceId,
        employeeId: employee.id
      })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      log.success(`Employee Registration: ${employee.name} (${employee.id})`);
      console.log(`   Token: ${data.token.substring(0, 30)}...`);
      console.log(`   Device: ${data.device.id}`);
      return data.token;
    } else {
      log.error(`Employee Registration Failed: ${data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    log.error(`Employee Registration Error: ${error.message}`);
    return null;
  }
}

/**
 * Test authenticated endpoint with token
 */
async function testAuthenticatedRequest(token, tokenType) {
  try {
    const response = await fetch(`${BASE_URL}/employees`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (response.ok && Array.isArray(data)) {
      log.success(`${tokenType} Token Valid - Retrieved ${data.length} employees`);
      return true;
    } else {
      log.error(`${tokenType} Token Invalid: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    log.error(`${tokenType} Token Test Error: ${error.message}`);
    return false;
  }
}

/**
 * Check if server is running
 */
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'OK') {
      log.success('Server is running');
      console.log(`   Status: ${data.status}`);
      console.log(`   Time: ${data.timestamp}`);
      return true;
    } else {
      log.error('Server health check failed');
      return false;
    }
  } catch (error) {
    log.error(`Cannot connect to server at ${BASE_URL}`);
    console.log(`   Error: ${error.message}`);
    console.log(`\n   Please ensure the server is running:`);
    console.log(`   cd Newmap-backend && node server.js`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   ACCOUNT AUTHENTICATION TEST SUITE                   ║');
  console.log('║   Testing Manager & Employee Account Access           ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Check server
  log.section('SERVER HEALTH CHECK');
  const serverOk = await checkServer();
  if (!serverOk) {
    process.exit(1);
  }

  await delay(500);

  // Test manager logins
  log.section('TESTING MANAGER ACCOUNTS');
  const managerTokens = [];
  
  for (const manager of managers) {
    const token = await testManagerLogin(manager);
    managerTokens.push({ role: manager.role, token });
    await delay(300);
  }

  await delay(500);

  // Test authenticated requests with manager tokens
  log.section('TESTING MANAGER TOKEN AUTHORIZATION');
  for (const { role, token } of managerTokens) {
    if (token) {
      await testAuthenticatedRequest(token, role.toUpperCase());
      await delay(300);
    }
  }

  await delay(500);

  // Test employee authentication
  log.section('TESTING EMPLOYEE DEVICE REGISTRATION');
  const employeeToken = await testEmployeeAuth(testEmployee);

  await delay(500);

  // Test employee token authorization
  if (employeeToken) {
    log.section('TESTING EMPLOYEE TOKEN AUTHORIZATION');
    await testAuthenticatedRequest(employeeToken, 'EMPLOYEE');
  }

  await delay(500);

  // Summary
  log.section('TEST SUMMARY');
  const managerSuccess = managerTokens.filter(t => t.token).length;
  const managerTotal = managers.length;
  
  console.log(`Manager Logins: ${managerSuccess}/${managerTotal} successful`);
  console.log(`Employee Auth: ${employeeToken ? '1/1 successful' : '0/1 failed'}`);
  
  if (managerSuccess === managerTotal && employeeToken) {
    console.log(`\n${colors.green}${colors.bold}✅ ALL TESTS PASSED!${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}${colors.bold}⚠️  SOME TESTS FAILED${colors.reset}\n`);
  }
}

// Run the tests
runTests().catch(error => {
  log.error(`Test suite error: ${error.message}`);
  process.exit(1);
});

