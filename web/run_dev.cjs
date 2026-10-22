const { spawn } = require('child_process');
const path = require('path');

const srv = spawn('npx.cmd', ['vite', 'preview', '--port', '3000', '--host'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

srv.on('error', (err) => {
  console.error('Failed to start server:', err);
});
