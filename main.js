// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load your main HTML file
  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Optional: open DevTools during development
  // win.webContents.openDevTools();
}

// Called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // macOS: recreate window when dock icon is clicked and there are no open windows
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
