const { execSync } = require('child_process');
console.log('Installing tailwindcss postcss autoprefixer...');
try {
  execSync('npm.cmd install -D tailwindcss@3.4.17 postcss autoprefixer', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log('Tailwind installed successfully!');
} catch (err) {
  console.error('Failed to install tailwind:', err);
  process.exit(1);
}
