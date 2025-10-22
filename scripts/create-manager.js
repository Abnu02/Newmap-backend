/**
 * Create Manager Account
 * 
 * This script creates a manager account in the database.
 * Usage: node scripts/create-manager.js
 */

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createManager() {
  try {
    console.log('🔐 Creating manager account...\n');

    // Manager details
    const managerData = {
      fullName: 'Admin Manager',
      email: 'admin@company.com',
      password: 'admin123',  // Change this for production!
      company: 'Company Name'
    };

    // Check if manager already exists
    const existingManager = await prisma.manager.findUnique({
      where: { email: managerData.email }
    });

    if (existingManager) {
      console.log('⚠️  Manager already exists!');
      console.log(`📧 Email: ${managerData.email}`);
      console.log(`🔑 Use existing password to login\n`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(managerData.password, 12);

    // Create manager
    const manager = await prisma.manager.create({
      data: {
        fullName: managerData.fullName,
        email: managerData.email,
        password: hashedPassword,
        company: managerData.company
      }
    });

    console.log('✅ Manager account created successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('┌─────────────────────────────────────────┐');
    console.log(`│ Email:    ${managerData.email.padEnd(26)} │`);
    console.log(`│ Password: ${managerData.password.padEnd(26)} │`);
    console.log('└─────────────────────────────────────────┘');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

  } catch (error) {
    console.error('❌ Error creating manager:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createManager();

