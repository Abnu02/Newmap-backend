const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEmployees() {
  console.log('\n🔍 Checking database for employees...\n');

  try {
    // Get all employees
    const employees = await prisma.employee.findMany({
      include: {
        presence: true,
        locations: {
          take: 1,
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    console.log(`📊 Total Employees: ${employees.length}\n`);

    if (employees.length === 0) {
      console.log('❌ No employees found in database!');
      console.log('\n💡 To fix this:');
      console.log('   1. Login to manager app');
      console.log('   2. Go to Employee Registration');
      console.log('   3. Register at least one employee');
      console.log('   OR run: node scripts/create-test-employees.js\n');
    } else {
      console.log('✅ Employees found:\n');
      
      employees.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.fullName || emp.firstName + ' ' + emp.lastName}`);
        console.log(`   ID: ${emp.id}`);
        console.log(`   Email: ${emp.email}`);
        console.log(`   Department: ${emp.department || 'N/A'}`);
        console.log(`   Status: ${emp.presence?.isOnline ? '🟢 Online' : '⚫ Offline'}`);
        
        if (emp.locations && emp.locations.length > 0) {
          const loc = emp.locations[0];
          console.log(`   📍 Location: ${loc.latitude}, ${loc.longitude}`);
          console.log(`   Last Update: ${loc.timestamp}`);
        } else {
          console.log(`   📍 No location data yet`);
        }
        console.log('');
      });

      // Statistics
      const withLocation = employees.filter(e => e.locations && e.locations.length > 0).length;
      const online = employees.filter(e => e.presence?.isOnline).length;
      
      console.log('📈 Statistics:');
      console.log(`   Total: ${employees.length}`);
      console.log(`   With Locations: ${withLocation}`);
      console.log(`   Online: ${online}`);
      console.log(`   Offline: ${employees.length - online}`);
      
      if (withLocation === 0) {
        console.log('\n⚠️  No employees have location data!');
        console.log('💡 To add locations:');
        console.log('   1. Open employee app');
        console.log('   2. Login with employee credentials');
        console.log('   3. Start location tracking');
        console.log('   4. The map will then show their location\n');
      }
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmployees();




