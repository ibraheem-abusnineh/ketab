const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Default admin credentials
const username = 'admin';
const password = 'admin123';

// Hash the password
const saltRounds = 10;
const passwordHash = bcrypt.hashSync(password, saltRounds);

// Create admin data
const adminData = {
  username: username,
  passwordHash: passwordHash
};

// Write to admin.json
const adminPath = path.join(__dirname, 'data', 'admin.json');
fs.writeFileSync(adminPath, JSON.stringify(adminData, null, 2));

console.log('Admin credentials set up:');
console.log('Username:', username);
console.log('Password:', password);
console.log('Admin data saved to:', adminPath);
