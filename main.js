const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// Start the server
function startServer() {
  const serverPath = path.join(__dirname, 'server', 'server.js');
  
  serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, ELECTRON_RUN: 'true' }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#181825'
  });

  // Wait for server then load
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3001');
  }, 3000);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // If it fails to load, show error
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadURL(`data:text/html,
      <html>
        <body style="background: #181825; color: #fff; font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>⚠️ Server Failed to Start</h1>
          <p>Please make sure PostgreSQL is running and configured correctly.</p>
          <p>Check your .env file and try running: <code>npm run dev</code></p>
        </body>
      </html>
    `);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startServer();
  setTimeout(createWindow, 2000);
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
