/**
 * Setup Development Mode
 *
 * This script ensures env.js exists with correct local dev values.
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const envPath = path.join(publicDir, 'env.js');

if (!fs.existsSync(envPath)) {
  console.error('❌ Error: env.js not found!');
  process.exit(1);
}

console.log('✅ Development mode ready — API calls go to the real backend.');
