/**
 * Run this ONCE to set your login password:
 *   node setup-password.js
 */
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA_DIR = path.join(__dirname, 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Set your School Hub password: ', async (password) => {
  if (!password || password.length < 4) {
    console.log('❌ Password must be at least 4 characters.');
    rl.close();
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ passwordHash }, null, 2));
  console.log('✅ Password saved! You can now start the server with: node server.js');
  rl.close();
});
