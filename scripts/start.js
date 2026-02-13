const { spawn } = require('child_process');
const path = require('path');

console.log('');
console.log('=====================================');
console.log('  Starting CodeCollab');
console.log('=====================================');
console.log('');

console.log('Starting server...');
const serverPath = path.join(__dirname, '..', 'server', 'server.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('');
  console.log('Starting Electron...');
  const electron = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true
  });

  electron.on('error', (err) => {
    console.error('Failed to start Electron:', err);
  });

  electron.on('close', (code) => {
    console.log('Electron closed, shutting down server...');
    server.kill();
    process.exit(code);
  });
}, 3000);

process.on('SIGINT', () => {
  console.log('');
  console.log('Shutting down...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill();
  process.exit(0);
});