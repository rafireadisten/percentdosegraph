#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Starting auto-build watcher...');

const watchPaths = [
  'frontend-react/app.js',
  'frontend-react/styles.css',
  'artifacts/api-server/src',
  'lib'
];

let buildInProgress = false;

function runAutoBuild() {
  if (buildInProgress) return;

  buildInProgress = true;
  console.log('📦 Auto-building...');

  try {
    execSync('npm run auto-build', { stdio: 'inherit' });
    console.log('✅ Auto-build completed successfully');
  } catch (error) {
    console.error('❌ Auto-build failed:', error.message);
  } finally {
    buildInProgress = false;
  }
}

// Initial build
runAutoBuild();

// Watch for changes
watchPaths.forEach(watchPath => {
  if (fs.existsSync(watchPath)) {
    fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.js') || filename.endsWith('.ts') || filename.endsWith('.css'))) {
        console.log(`📝 Change detected in ${filename}`);
        runAutoBuild();
      }
    });
  }
});

console.log('👀 Auto-build watcher active. Press Ctrl+C to stop.');
console.log('Watching:', watchPaths.join(', '));