const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    console.log('🔄 Setting up database...');
    
    // Generate Prisma client
    console.log('📦 Generating Prisma client...');
    const { execSync } = require('child_process');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Push schema to database
    console.log('🗄️  Pushing schema to database...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    console.log('✅ Database setup completed!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

async function createSampleData() {
  try {
    console.log('🔄 Creating sample data...');
    
    // Create a sample manager
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const manager = await prisma.manager.upsert({
      where: { email: 'admin@company.com' },
      update: {},
      create: {
        fullName: 'Admin Manager',
        email: 'admin@company.com',
        password: hashedPassword,
        company: 'Sample Company'
      }
    });
    
    console.log('👤 Created manager:', manager.email);
    
    // Create sample employees
    const employees = [
      {
        fullName: 'John Doe',
        department: 'Sales',
        email: 'john.doe@company.com',
        phone: '+1234567890',
        avatarUrl: null
      },
      {
        fullName: 'Jane Smith',
        department: 'Marketing',
        email: 'jane.smith@company.com',
        phone: '+1234567891',
        avatarUrl: null
      },
      {
        fullName: 'Mike Johnson',
        department: 'Sales',
        email: 'mike.johnson@company.com',
        phone: '+1234567892',
        avatarUrl: null
      }
    ];
    
    for (const employeeData of employees) {
      const employee = await prisma.employee.upsert({
        where: { email: employeeData.email },
        update: {},
        create: employeeData
      });
      
      // Create presence record
      await prisma.presence.upsert({
        where: { employeeId: employee.id },
        update: {},
        create: {
          employeeId: employee.id,
          isOnline: false,
          lastSeenAt: new Date()
        }
      });
      
      console.log('👤 Created employee:', employee.fullName);
    }
    
    console.log('✅ Sample data created successfully!');
    console.log('\n📋 Login credentials:');
    console.log('Manager Email: admin@company.com');
    console.log('Manager Password: admin123');
    console.log('\n👥 Employee IDs for device registration:');
    const allEmployees = await prisma.employee.findMany();
    allEmployees.forEach(emp => {
      console.log(`${emp.fullName}: ${emp.id}`);
    });
    
  } catch (error) {
    console.error('❌ Sample data creation failed:', error);
  }
}

async function main() {
  try {
    await setupDatabase();
    await createSampleData();
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { setupDatabase, createSampleData };
