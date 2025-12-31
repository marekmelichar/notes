/**
 * Setup Mock Mode
 *
 * This script enables mock mode by setting MOCK_MODE=true in env.js
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const envPath = path.join(publicDir, 'env.js');

console.log('🔧 Setting up mock mode...\n');

// Read env.js and enable MOCK_MODE
if (fs.existsSync(envPath)) {
  let content = fs.readFileSync(envPath, 'utf8');
  // Handle both commented and uncommented MOCK_MODE lines
  content = content.replace(
    /\/\/\s*window\.MOCK_MODE\s*=\s*(true|false);?/,
    'window.MOCK_MODE = true;',
  );
  content = content.replace(/window\.MOCK_MODE\s*=\s*false/, 'window.MOCK_MODE = true');
  content = content.replace(
    /window\.ENVIRONMENT\s*=\s*'(dev|development)'/,
    "window.ENVIRONMENT = 'mock'",
  );
  fs.writeFileSync(envPath, content);
  console.log('✅ Enabled MOCK_MODE in env.js');
} else {
  console.error('❌ Error: env.js not found!');
  process.exit(1);
}

// Check if MSW service worker exists
const mswPath = path.join(publicDir, 'mockServiceWorker.js');
if (!fs.existsSync(mswPath)) {
  console.log('\n⚠️  MSW service worker not found!');
  console.log('   Run: npm run msw:init\n');
}

console.log('\n🎭 Mock mode ready!');
console.log('   All API calls will be intercepted by MSW.\n');
