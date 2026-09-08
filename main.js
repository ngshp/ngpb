const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); } else {
  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { w.show(); w.focus(); } });
}
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    icon: path.join(__dirname, 'assets/icon.ico'),
    frame: false,
    backgroundColor: '#0f172a',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true }
  });
  mainWindow.loadFile('index.html');
  try {
    const secPath = path.join(__dirname, 'src/security.js');
    console.log('Security exists:', fs.existsSync(secPath));
    const { startAntiProcessHacker, startAntiRDP } = require('./src/security');
    console.log('🛡️ FORCE START Anti Cheat - Build #44 WPE PRO');
    startAntiProcessHacker();
    if (typeof startAntiRDP === 'function') startAntiRDP(mainWindow);
    console.log('✅ Anti Cheat Started');
  } catch (e) {
    console.error(e);
    dialog.showErrorBox('Anti Cheat Error', e.message);
  }
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform!== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); });
ipcMain.on('window-close', () => app.quit());
ipcMain.on('window-drag', (e, {x,y}) => { if (mainWindow) mainWindow.setPosition(x,y); });
