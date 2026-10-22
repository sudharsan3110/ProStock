const { execSync } = require('child_process');
console.log('Building ProStock web application...');
try {
  const out = execSync('npx.cmd tsc --noEmit && npx.cmd vite build', {
    cwd: __dirname,
    encoding: 'utf-8'
  });
  console.log('BUILD SUCCESS:\n', out);
} catch (err) {
  console.error('BUILD FAILED:');
  if (err.stdout) console.log(err.stdout.toString());
  if (err.stderr) console.error(err.stderr.toString());
  process.exit(1);
}
