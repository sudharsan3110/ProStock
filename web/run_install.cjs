const { execSync } = require('child_process');
console.log('Starting npm install...');
try {
  execSync('npm.cmd install', { cwd: __dirname, stdio: 'inherit' });
  console.log('npm install finished successfully!');
} catch (err) {
  console.error('npm install failed:', err);
  process.exit(1);
}
