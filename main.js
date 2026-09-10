// NGPB Launcher Enterprise v1.53.6 FIX - Valid Semver + Cache Fix + Draggable Rapi - FINAL
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');
const https = require('https');
const http = require('http');

app.disableHardwareAcceleration();

const APP_VERSION = '1.53.6'; // FIX: VALID SEMVER 3 ANGKA! BUKAN 1.0.53.6!

let autoUpdater = null;
try {
  const updater = require('electron-updater');
  autoUpdater = updater.autoUpdater;
  const log = require('electron-log');
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
} catch(e) { console.log('Updater disabled', e.message); }

let mainWindow;
let hwidCache = null;

async function fetchRemoteHTML() {
  const userDataPath = app.getPath('userData');
  try { if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true }); } catch{}
  const localRemotePath = path.join(userDataPath, 'remote-index.html');
  const localVersionPath = path.join(userDataPath, 'remote-version.json');
  let fallbackPath = path.join(__dirname, 'Launcher', 'index.html');
  if (!fs.existsSync(fallbackPath)) fallbackPath = path.join(__dirname, 'launcher', 'index.html');
  if (!fs.existsSync(fallbackPath)) fallbackPath = path.join(__dirname, 'index.html');

  try {
    const verData = await new Promise((res, rej) => {
      const req = https.get('https://raw.githubusercontent.com/ngshp/ngpb/main/version.json?t=' + Date.now(), r => {
        let d = ''; r.on('data', c => d += c);
        r.on('end', () => { try { res(JSON.parse(d)); } catch(e){ rej(e); } });
      });
      req.on('error', rej);
      req.setTimeout(4000, () => { req.destroy(); rej(new Error('timeout')); });
    });
    try { fs.writeFileSync(localVersionPath, JSON.stringify(verData), 'utf8'); } catch{}
    if (verData.patches && mainWindow) {
      try { mainWindow.webContents.send('apply-patches', verData.patches); } catch{}
    }
    console.log('✅ Remote version.json loaded - patches:', verData.patches? 'YES' : 'NO');
  } catch(e) { console.log('Version fetch offline', e.message); }

  return new Promise((resolve) => {
    const req = https.get('https://raw.githubusercontent.com/ngshp/ngpb/main/Launcher/index.html?t=' + Date.now(), res => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        if (data.includes('launcher-root') && data.length > 5000) {
          try { fs.writeFileSync(localRemotePath, data, 'utf8'); console.log('✅ v53.7 Remote UI loaded - Size:', data.length); resolve(localRemotePath); } catch { resolve(fallbackPath); }
        } else resolve(fallbackPath);
      });
    });
    req.on('error', () => { if (fs.existsSync(localRemotePath)) resolve(localRemotePath); else resolve(fallbackPath); });
    req.setTimeout(4000, () => { req.destroy(); if (fs.existsSync(localRemotePath)) resolve(localRemotePath); else resolve(fallbackPath); });
  });
}

function getHWID() {
  if (hwidCache) return hwidCache;
  try {
    let cpuId = 'UNKNOWN-CPU', diskSerial = 'UNKNOWN-DISK', boardSerial = 'UNKNOWN-BOARD';
    try { cpuId = execSync('wmic cpu get ProcessorId /value', {encoding:'utf8'}).split('=')[1]?.trim() || cpuId; } catch { cpuId = os.cpus()[0]?.model || 'CPU-FALLBACK'; }
    try { diskSerial = execSync('wmic diskdrive get SerialNumber /value', {encoding:'utf8'}).split('=')[1]?.trim() || diskSerial; } catch { diskSerial = 'DISK-FALLBACK'; }
    try { boardSerial = execSync('wmic baseboard get SerialNumber /value', {encoding:'utf8'}).split('=')[1]?.trim() || boardSerial; } catch { boardSerial = 'BOARD-FALLBACK'; }
    const raw = `${cpuId}-${diskSerial}-${boardSerial}-${os.arch()}-${os.totalmem()}-${os.hostname()}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase().substring(0,16);
    hwidCache = hash; return hash;
  } catch { return 'HWID-ERROR-' + crypto.randomBytes(4).toString('hex').toUpperCase(); }
}

function detectRDP() {
  try {
    const procs = execSync('tasklist /fo csv /nh', {encoding:'utf8'}).toLowerCase();
    const rdpIndicators = ['mstsc','rdpclip','teamviewer','anydesk','chrome_remote_desktop'];
    for (const r of rdpIndicators) if (procs.includes(r)) return { detected:true, reason:`RDP Tool Detected: ${r} - DROP`, tool:r };
    return { detected:false };
  } catch { return { detected:false }; }
}
function detectEmulator() {
  try {
    const cpus = os.cpus(); const totalMemGB = os.totalmem() / (1024**3);
    if (cpus.length <=1 && totalMemGB <2.5) return { detected:true, reason:`Low Spec Emulator: ${cpus.length} core + ${totalMemGB.toFixed(1)}GB - DROP` };
    return { detected:false };
  } catch { return { detected:false }; }
}
function detectCloud() {
  try {
    const hostname = os.hostname().toLowerCase();
    if (['ec2','azure','vultr','digitalocean'].some(c=>hostname.includes(c))) return { detected:true, reason:`Cloud Hostname: ${hostname} - DROP` };
    return { detected:false };
  } catch { return { detected:false }; }
}
async function checkGeoBan() {
  return new Promise((resolve) => {
    const req = http.get('http://ip-api.com/json/?fields=country,countryCode,as,query,status', (res) => {
      let data=''; res.on('data', c=>data+=c); res.on('end', () => {
        try {
          const j=JSON.parse(data); const cc=(j.countryCode||'').toUpperCase(); const ip=j.query||''; const as=j.as||''; const m=as.match(/AS(\d+)/); const asn=m?parseInt(m[1]):0;
          if (['IL','PH'].includes(cc)) { resolve({ banned:true, country:j.country, countryCode:cc, ip, as, asn, reason:`GEO BAN: ${j.country} (${cc}) - IP ${ip} - DROP` }); return; }
          if ([48081,12849,8551].includes(asn)) { resolve({ banned:true, country:j.country, countryCode:cc, ip, as, asn, reason:`ASN BLACKLIST: ${asn} - DROP` }); return; }
          resolve({ banned:false, country:j.country, countryCode:cc, ip, as, asn });
        } catch { resolve({ banned:false }); }
      });
    });
    req.on('error', ()=> resolve({ banned:false })); req.setTimeout(5000, ()=>{ req.destroy(); resolve({ banned:false }); });
  });
}
async function fullSecurityScan() {
  const hwid=getHWID();
  const rdp=detectRDP(); if(rdp.detected) return { passed:false, blocked:rdp.reason, hwid };
  const emu=detectEmulator(); if(emu.detected) return { passed:false, blocked:emu.reason, hwid };
  const cloud=detectCloud(); if(cloud.detected) return { passed:false, blocked:cloud.reason, hwid };
  const geo=await checkGeoBan(); if(geo.banned) return { passed:false, blocked:geo.reason, hwid, details:{ geo } };
  return { passed:true, hwid, details:{ geo } };
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 700,
    minWidth: 1000, minHeight: 600,
    frame: false,
    backgroundColor: '#080a0f',
    icon: path.join(__dirname, 'assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    show: true
  });

  try {
    const htmlPath = await fetchRemoteHTML();
    console.log('Loading UI from:', htmlPath);
    if (fs.existsSync(htmlPath)) {
      await mainWindow.loadFile(htmlPath).catch(async (e) => {
        console.log('loadFile remote failed', e.message);
        let fb = path.join(__dirname, 'Launcher', 'index.html');
        if (!fs.existsSync(fb)) fb = path.join(__dirname, 'launcher', 'index.html');
        if (fs.existsSync(fb)) await mainWindow.loadFile(fb);
      });
    }
  } catch(e) {
    console.log('createWindow error', e.message);
    try {
      let fb = path.join(__dirname, 'Launcher', 'index.html');
      if (fs.existsSync(fb)) await mainWindow.loadFile(fb);
    } catch{}
  }

  mainWindow.once('ready-to-show', () => { try { mainWindow.show(); } catch{} });
  setTimeout(() => { if (mainWindow &&!mainWindow.isVisible()) { try { mainWindow.show(); } catch{} } }, 800);

  mainWindow.webContents.on('devtools-opened', () => { try { mainWindow.webContents.closeDevTools(); } catch{} });
  mainWindow.on('closed', () => { mainWindow=null; });

  if (autoUpdater) { try { setTimeout(()=>autoUpdater.checkForUpdatesAndNotify(), 2500); } catch{} }
  setInterval(async () => { try { await fetchRemoteHTML(); } catch{} }, 60000);
}

app.whenReady().then(async () => {
  await createWindow();
  setTimeout(async () => {
    const sec=await fullSecurityScan();
    if(!sec.passed){
      dialog.showErrorBox('🚫 SECURITY BLOCKED - v53.7 FIX', `${sec.blocked}\n\nHWID: ${sec.hwid}\n\n© 2026 NGPB Team - v53.7 FIX - Valid Semver`);
      app.quit();
    }
  }, 800);
  app.on('activate', () => { if(BrowserWindow.getAllWindows().length===0) createWindow(); });
});
app.on('window-all-closed', ()=>{ if(process.platform!=='darwin') app.quit(); });

ipcMain.on('window-minimize', ()=>{ if(mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', ()=>{ if(mainWindow){ if(mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); }});
ipcMain.on('window-close', ()=>{ if(mainWindow) mainWindow.close(); });
ipcMain.on('minimize', ()=>{ if(mainWindow) mainWindow.minimize(); });
ipcMain.on('maximize', ()=>{ if(mainWindow){ if(mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); }});
ipcMain.on('close', ()=>{ if(mainWindow) mainWindow.close(); });
ipcMain.handle('get-security-extreme', async ()=> await fullSecurityScan());
ipcMain.handle('get-hwid', ()=> getHWID());
ipcMain.handle('get-version', ()=> APP_VERSION);
ipcMain.handle('get-app-info', ()=> ({ version:APP_VERSION, name:'NG PB Launcher', hwid:getHWID(), realtime:true, autoUpdate:true, draggable:true, rapi:true }));
ipcMain.handle('secure-launch', async ()=>{
  const sec=await fullSecurityScan(); if(!sec.passed) throw new Error(sec.blocked);
  const gamePath=path.join(path.dirname(app.getPath('exe')), 'ngpb.exe'); const altPath=path.join(__dirname,'ngpb.exe'); const execPath=fs.existsSync(gamePath)?gamePath:altPath;
  if(!fs.existsSync(execPath)) throw new Error('ngpb.exe not found');
  spawn(execPath, [], { detached:true, stdio:'ignore' });
  return { success:true, message:'NGPB Launched - v53.7 FIX', hwid:sec.hwid };
});
ipcMain.on('check-for-update', ()=>{ if(autoUpdater) try { autoUpdater.checkForUpdatesAndNotify(); } catch{} });
if(autoUpdater){
  autoUpdater.on('update-available', ()=>{ if(mainWindow) try { mainWindow.webContents.send('update-status','Update available - v53.7 FIX'); } catch{} });
  autoUpdater.on('update-downloaded', ()=>{ if(mainWindow) try { mainWindow.webContents.send('update-status','Update downloaded - Will install on quit'); } catch{} });
}
