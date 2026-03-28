const fs = require('fs');
const path = require('path');
const { parseCSV, validateUser } = require('./utils/csvParser');

const usersPath = path.join(__dirname, 'data', 'users.json');
const parentsPath = path.join(__dirname, '..', 'parents.csv');
const teachersPath = path.join(__dirname, '..', 'teachers.csv');

async function migrateUsers() {
  try {
    console.log('Starting user migration...');
    
    let allUsers = [];
    
    // Parse parents CSV
    if (fs.existsSync(parentsPath)) {
      console.log('Parsing parents.csv...');
      const parents = await parseCSV(parentsPath, 'parent');
      console.log(`Found ${parents.length} parents`);
      allUsers = allUsers.concat(parents);
    } else {
      console.log('parents.csv not found, skipping...');
    }
    
    // Parse teachers CSV
    if (fs.existsSync(teachersPath)) {
      console.log('Parsing teachers.csv...');
      const teachers = await parseCSV(teachersPath, 'teacher');
      console.log(`Found ${teachers.length} teachers`);
      allUsers = allUsers.concat(teachers);
    } else {
      console.log('teachers.csv not found, skipping...');
    }
    
    // Validate users
    const validUsers = [];
    const invalidUsers = [];
    
    allUsers.forEach(user => {
      const validation = validateUser(user);
      if (validation.valid) {
        validUsers.push(user);
      } else {
        invalidUsers.push({ user, errors: validation.errors });
      }
    });
    
    console.log(`Valid users: ${validUsers.length}`);
    console.log(`Invalid users: ${invalidUsers.length}`);
    
    if (invalidUsers.length > 0) {
      console.log('Invalid users:');
      invalidUsers.forEach(({ user, errors }) => {
        console.log(`- ${user.name} (${user.nationalNumber}): ${errors.join(', ')}`);
      });
    }
    
    // Remove duplicates based on national number
    const uniqueUsers = [];
    const seenNumbers = new Set();
    
    validUsers.forEach(user => {
      if (!seenNumbers.has(user.nationalNumber)) {
        seenNumbers.add(user.nationalNumber);
        uniqueUsers.push(user);
      }
    });
    
    console.log(`Unique users after deduplication: ${uniqueUsers.length}`);
    
    // Write to users.json
    fs.writeFileSync(usersPath, JSON.stringify(uniqueUsers, null, 2));
    console.log(`Users migrated successfully to ${usersPath}`);
    
    // Summary
    console.log('\nMigration Summary:');
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Valid users: ${validUsers.length}`);
    console.log(`Invalid users: ${invalidUsers.length}`);
    console.log(`Unique users: ${uniqueUsers.length}`);
    console.log(`Parents: ${uniqueUsers.filter(u => u.role === 'parent').length}`);
    console.log(`Teachers: ${uniqueUsers.filter(u => u.role === 'teacher').length}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateUsers();
}

module.exports = migrateUsers;
