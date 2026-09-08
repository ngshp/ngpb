const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// SINGLE INSTANCE - Fix 4 proses!
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) { win.show(); win.focus(); }
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'assets/icon.ico'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  // ===== ANTI CHEAT - JALAN SELALU, BUKAN CUMA PACKAGED! =====
  // Untuk test, kita force jalanin biar kayak di Screenshot #15 ketauan!
  try {
    const securityPath = path.join(__dirname, 'src/security.js');
    console.log('Loading security from:', securityPath, 'Exists:', fs.existsSync(securityPath));

    if (fs.existsSync(securityPath)) {
      const { startAntiProcessHacker, startAntiRDP } = require('./src/security');

      // FORCE RUN - Hapus pengecekan isPackaged buat test!
      // Nanti kalau udah work, baru balikin ke app.isPackaged
      console.log('🛡️ Starting Anti Cheat - FORCE MODE');
      startAntiProcessHacker();

      if (typeof startAntiRDP === 'function') {
        startAntiRDP(mainWindow);
      }

      console.log('✅ Anti Cheat Started - Check %APPDATA%/NGPB Launcher/security.log');
    } else {
      console.log('❌ security.js NOT FOUND!');
      dialog.showErrorBox('Security Missing', `File tidak ketemu: ${securityPath}\n\nBuild salah, src tidak ke-bundle!`);
    }
  } catch (e) {
    console.error('Anti Cheat error:', e);
    dialog.showErrorBox('Anti Cheat Error', e.message + '\n\n' + e.stack);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform!== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-close', () => app.quit());
ipcMain.on('window-drag', (e, { x, y }) => {
  if (mainWindow) mainWindow.setPosition(x, y);
});
