/**
 * Setup Development Mode
 *
 * This script disables mock mode by setting MOCK_MODE=false in env.js
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const envPath = path.join(publicDir, 'env.js');

console.log('🔧 Setting up development mode...\n');

// Read env.js and disable MOCK_MODE
if (fs.existsSync(envPath)) {
  let content = fs.readFileSync(envPath, 'utf8');
  // Handle both commented and uncommented MOCK_MODE lines
  content = content.replace(
    /\/\/\s*window\.MOCK_MODE\s*=\s*(true|false);?/,
    'window.MOCK_MODE = false;',
  );
  content = content.replace(/window\.MOCK_MODE\s*=\s*true/, 'window.MOCK_MODE = false');
  content = content.replace(/window\.ENVIRONMENT\s*=\s*'mock'/, "window.ENVIRONMENT = 'dev'");
  fs.writeFileSync(envPath, content);
  console.log('✅ Disabled MOCK_MODE in env.js');
  console.log('✅ Set ENVIRONMENT to dev');
} else {
  console.error('❌ Error: env.js not found!');
  process.exit(1);
}

console.log('\n🚀 Development mode ready!');
console.log('   API calls will go to the real backend.\n');
