const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

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

// Wait for server to be actually ready
function checkServer(retries = 30) {
  http.get('http://localhost:3001/api/health', (res) => {
    if (res.statusCode === 200) {
      console.log('');
      console.log('✓ Server is ready!');
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
    }
  }).on('error', (err) => {
    if (retries > 0) {
      console.log(`Waiting for server... (${31 - retries}/30)`);
      setTimeout(() => checkServer(retries - 1), 1000);
    } else {
      console.error('Server failed to start after 30 seconds');
      server.kill();
      process.exit(1);
    }
  });
}

// Start checking after 2 seconds
setTimeout(() => checkServer(), 2000);

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
