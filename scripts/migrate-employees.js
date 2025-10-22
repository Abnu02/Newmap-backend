/**
 * Migration Script for Existing Employees
 * 
 * This script adds passwords to existing employees that don't have them.
 * Password format: LastName#321
 * 
 * Usage: node scripts/migrate-employees.js
 */

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateEmployees() {
  try {
    console.log('🔄 Starting employee migration...\n');

    // Get all employees
    const employees = await prisma.employee.findMany();

    console.log(`📊 Found ${employees.length} employee(s)\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const employee of employees) {
      try {
        // Check if employee has required fields
        if (!employee.fullName) {
          console.log(`⚠️  Skipping employee ${employee.id}: No fullName`);
          skippedCount++;
          continue;
        }

        // Split fullName to get firstName and lastName
        const nameParts = employee.fullName.trim().split(' ');
        let firstName, lastName;

        if (nameParts.length === 1) {
          // If only one name, use it for both
          firstName = nameParts[0];
          lastName = nameParts[0];
        } else if (nameParts.length === 2) {
          firstName = nameParts[0];
          lastName = nameParts[1];
        } else {
          // If more than 2 names, first is firstName, rest is lastName
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        }

        // Generate password
        const password = `${lastName}#321`;
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update employee
        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            firstName: firstName,
            lastName: lastName,
            password: hashedPassword,
          },
        });

        console.log(`✅ Migrated: ${employee.fullName} (${employee.email})`);
        console.log(`   Password: ${password}\n`);
        
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrating ${employee.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${employees.length}\n`);

    if (migratedCount > 0) {
      console.log('🎉 Migration completed successfully!\n');
      console.log('📝 Note: Save the passwords shown above and share them with the employees.\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateEmployees();

