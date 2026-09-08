const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const AntiCheat = require('./anticheat/anti-cheat');

let win;
let ac;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile(path.join(__dirname, '../launcher.html'));
  
  // Init Anti-Cheat Enterprise
  ac = new AntiCheat();
  ac.startMonitoring();
  console.log('[NGPB] Enterprise Security Active');
}

app.whenReady().then(createWindow);

ipcMain.on('play-game', () => {
  // Check anti-cheat before play
  if (ac && ac.detectedCheats.length > 0) {
    win.webContents.send('cheat-detected', ac.detectedCheats);
    return;
  }
  exec('start "" "C:\\NGPB\\Game\\NGPB.exe"', (err) => {
    if (err) console.error(err);
  });
});

// Fetch version.json + banners
async function fetchVersion() {
  try {
    const res = await fetch('https://ngpb.id/version.json');
    const data = await res.json();
    win.webContents.send('version-data', data);
  } catch(e) { console.log('Offline mode'); }
}
setInterval(fetchVersion, 30000);
