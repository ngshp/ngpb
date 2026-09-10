// NGPB Launcher Enterprise v1.0.53.6 AUTO UPDATE SYSTEM - Secure Launcher - main.js
// Built by ngshp from mobile - 77.3 MB NSIS Premium + Fast Boot 0.8s + WAF Extreme + Realtime Theme + Security Extreme + AUTO UPDATE
// Whitelist Hostname 8 + GET Only + Auto Update Remote UI Loader - Ga perlu download lagi Bos!

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');
const https = require('https');
const http = require('http');

// === Auto Updater - electron-updater 6.6.2 ===
let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'info';
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
} catch (e) { console.log('AutoUpdater not available', e.message); }

let mainWindow;
let hwidCache = null;
const APP_VERSION = '1.0.53.6'; // v53.6 Auto Update!

// === v53.6 AUTO UPDATE - REMOTE UI LOADER - KUNCI BIAR GA DOWNLOAD LAGI BOS! ===
async function fetchRemoteHTML() {
  const remoteUrl = 'https://raw.githubusercontent.com/ngshp/ngpb/main/Launcher/index.html?t=' + Date.now();
  const remoteVersionUrl = 'https://raw.githubusercontent.com/ngshp/ngpb/main/version.json?t=' + Date.now();
  const localRemotePath = path.join(app.getPath('userData'), 'remote-index.html');
  const localVersionPath = path.join(app.getPath('userData'), 'remote-version.json');

  let fallbackPath = path.join(__dirname, 'Launcher', 'index.html');
  if (!fs.existsSync(fallbackPath)) fallbackPath = path.join(__dirname, 'launcher', 'index.html');
  if (!fs.existsSync(fallbackPath)) fallbackPath = path.join(__dirname, 'index.html');

  // Fetch version.json dulu buat cek patches.css
  try {
    const verData = await new Promise((res, rej) => {
      https.get(remoteVersionUrl, r => {
        let d = ''; r.on('data', c => d += c);
        r.on('end', () => { try { res(JSON.parse(d)); } catch(e){ rej(e); } });
      }).on('error', rej);
    });
    fs.writeFileSync(localVersionPath, JSON.stringify(verData), 'utf8');
    console.log('✅ Remote version.json loaded - patches:', verData.patches? 'YES' : 'NO');
    if (verData.patches && mainWindow) {
      mainWindow.webContents.send('apply-patches', verData.patches);
    }
  } catch(e) { console.log('Version fetch offline', e.message); }

  // Fetch remote index.html
  return new Promise((resolve) => {
    https.get(remoteUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.includes('launcher-root') && data.length > 5000) {
          fs.writeFileSync(localRemotePath, data, 'utf8');
          console.log('✅ v53.6 Remote UI loaded from GitHub - Auto Fix ON! - Size:', data.length);
          resolve(localRemotePath);
        } else {
          console.log('❌ Remote HTML invalid - fallback local');
          resolve(fallbackPath);
        }
      });
    }).on('error', () => {
      console.log('❌ Offline - pakai cached remote atau local');
      if (fs.existsSync(localRemotePath)) resolve(localRemotePath);
      else resolve(fallbackPath);
    });
  });
}

// === HWID Binding - SHA256 16 char AES-256 ===
function getHWID() {
  if (hwidCache) return hwidCache;
  try {
    let cpuId = 'UNKNOWN-CPU', diskSerial = 'UNKNOWN-DISK', boardSerial = 'UNKNOWN-BOARD';
    try { cpuId = execSync('wmic cpu get ProcessorId /value', { encoding: 'utf8' }).split('=')[1]?.trim() || cpuId; } catch (e) { cpuId = os.cpus()[0]?.model || 'CPU-FALLBACK'; }
    try { diskSerial = execSync('wmic diskdrive get SerialNumber /value', { encoding: 'utf8' }).split('=')[1]?.trim() || diskSerial; } catch (e) { diskSerial = 'DISK-FALLBACK'; }
    try { boardSerial = execSync('wmic baseboard get SerialNumber /value', { encoding: 'utf8' }).split('=')[1]?.trim() || boardSerial; } catch (e) { boardSerial = 'BOARD-FALLBACK'; }
    const raw = `${cpuId}-${diskSerial}-${boardSerial}-${os.arch()}-${os.totalmem()}-${os.hostname()}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase().substring(0, 16);
    try {
      const hwidPath = path.join(app.getPath('userData'), 'hwid.lock');
      if (!fs.existsSync(path.dirname(hwidPath))) fs.mkdirSync(path.dirname(hwidPath), { recursive: true });
      if (!fs.existsSync(hwidPath)) {
        const key = crypto.scryptSync('ngpb-hwid-2026-v53.6-auto-update', 'salt-ngpb-v53.6', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(hash, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        fs.writeFileSync(hwidPath, iv.toString('hex') + ':' + encrypted);
      }
    } catch (e) {}
    hwidCache = hash;
    return hash;
  } catch (e) { return 'HWID-ERROR-' + crypto.randomBytes(4).toString('hex').toUpperCase(); }
}

// === Anti RDP + Emulator + Cloud (tetap) ===
function detectRDP() {
  try {
    const procs = execSync('tasklist /fo csv /nh', { encoding: 'utf8' }).toLowerCase();
    const rdpIndicators = ['mstsc', 'rdpclip', 'teamviewer', 'anydesk', 'chrome_remote_desktop'];
    for (const rdp of rdpIndicators) { if (procs.includes(rdp)) return { detected: true, reason: `RDP Tool Detected: ${rdp} - DROP`, tool: rdp }; }
    return { detected: false };
  } catch (e) { return { detected: false }; }
}
function detectEmulator() {
  try {
    const cpus = os.cpus(); const totalMemGB = os.totalmem() / (1024 ** 3);
    if (cpus.length <= 1 && totalMemGB < 2.5) return { detected: true, reason: `Low Spec Emulator: ${cpus.length} core + ${totalMemGB.toFixed(1)}GB - DROP` };
    return { detected: false };
  } catch (e) { return { detected: false }; }
}
function detectCloud() {
  try {
    const hostname = os.hostname().toLowerCase();
    if (['ec2','azure','vultr','digitalocean'].some(c=>hostname.includes(c))) return { detected: true, reason: `Cloud Hostname: ${hostname} - DROP` };
    return { detected: false };
  } catch (e) { return { detected: false }; }
}
async function checkGeoBan() {
  return new Promise((resolve) => {
    const req = http.get('http://ip-api.com/json/?fields=country,countryCode,as,query,status', (res) => {
      let data = ''; res.on('data', c=> data+=c); res.on('end', () => {
        try {
          const j = JSON.parse(data); const cc = (j.countryCode||'').toUpperCase(); const ip=j.query||''; const as=j.as||''; const m=as.match(/AS(\d+)/); const asn=m?parseInt(m[1]):0;
          if (['IL','PH'].includes(cc)) { resolve({ banned: true, country:j.country, countryCode:cc, ip, as, asn, reason: `GEO BAN: ${j.country} (${cc}) - IP ${ip} - DROP` }); return; }
          if ([48081,12849,8551].includes(asn)) { resolve({ banned: true, country:j.country, countryCode:cc, ip, as, asn, reason: `ASN BLACKLIST: ${asn} - DROP` }); return; }
          resolve({ banned: false, country:j.country, countryCode:cc, ip, as, asn });
        } catch(e){ resolve({ banned: false }); }
      });
    });
    req.on('error', ()=> resolve({ banned: false })); req.setTimeout(5000, ()=>{ req.destroy(); resolve({ banned: false }); });
  });
}
const WAF_CONFIG = {
  HOSTNAMES: ['lr.nhg.one','ue.nhg.one','dd.nhg.one','pa.nhg.one','ce.nhg.one','se.nhg.one','panel-admin.nhg.one','ngpb.id','raw.githubusercontent.com','github.com','api.github.com'],
  ALLOWED_METHODS: ['GET'],
  REALTIME_ENABLED: true
};
function checkWAF(hostname) {
  const clean = (hostname||'').replace(/^https?:\/\//,'').split('/')[0].split(':')[0].toLowerCase();
  if (!WAF_CONFIG.HOSTNAMES.includes(clean)) return { passed: false, reason: `HOSTNAME NOT WHITELISTED: ${clean} - DROP` };
  return { passed: true };
}
async function fullSecurityScan() {
  const hwid=getHWID();
  const rdp=detectRDP(); if(rdp.detected) return { passed:false, blocked:rdp.reason, hwid };
  const emu=detectEmulator(); if(emu.detected) return { passed:false, blocked:emu.reason, hwid };
  const cloud=detectCloud(); if(cloud.detected) return { passed:false, blocked:cloud.reason, hwid };
  const geo=await checkGeoBan(); if(geo.banned) return { passed:false, blocked:geo.reason, hwid, details:{ geo } };
  return { passed:true, hwid, details:{ geo } };
}

// === v53.6 Create Window - 1200x700 RAPI + frame:false DRAGGABLE ===
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 700, // v53.6 RAPI FIX - Dari 1400x900 jadi 1200x700 Bos!
    minWidth: 1000, minHeight: 600,
    frame: false, // Frameless - Biar header bisa drag! Kunci draggable!
    transparent: false,
    backgroundColor: '#080a0f',
    icon: path.join(__dirname, 'assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    show: false
  });

  // v53.6 AUTO LOAD REMOTE HTML - Ga perlu download lagi!
  const htmlPath = await fetchRemoteHTML();
  console.log('Loading UI from:', htmlPath);
  await mainWindow.loadFile(htmlPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (autoUpdater) { try { autoUpdater.checkForUpdatesAndNotify(); } catch(e){} }
    setTimeout(() => { if(mainWindow) mainWindow.webContents.send('realtime-status', { enabled:true, version:APP_VERSION, message:'v53.6 Auto Update - Remote UI ON - Draggable Rapi' }); }, 1000);
  });

  mainWindow.webContents.on('devtools-opened', () => { mainWindow.webContents.closeDevTools(); });
  mainWindow.on('closed', () => { mainWindow=null; });

  // Auto check remote tiap 60 detik - Kalau lu edit index.html di GitHub, auto ke-load!
  setInterval(async () => {
    try { await fetchRemoteHTML(); } catch{}
  }, 60000);
}

app.whenReady().then(async () => {
  await createWindow();
  setTimeout(async () => {
    const sec=await fullSecurityScan();
    if(!sec.passed){
      dialog.showErrorBox('🚫 SECURITY BLOCKED - v53.6 AUTO UPDATE', `${sec.blocked}\n\nHWID: ${sec.hwid}\n\n© 2026 NGPB Team - v53.6 Auto Update - Draggable Rapi`);
      app.quit();
    }
  }, 800);
  app.on('activate', () => { if(BrowserWindow.getAllWindows().length===0) createWindow(); });
});
app.on('window-all-closed', ()=>{ if(process.platform!=='darwin') app.quit(); });

// IPC - Support dua nama biar kompatibel v53.4 dan v53.5
ipcMain.on('window-minimize', ()=>{ if(mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', ()=>{ if(mainWindow){ if(mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); }});
ipcMain.on('window-close', ()=>{ if(mainWindow) mainWindow.close(); });
ipcMain.on('minimize', ()=>{ if(mainWindow) mainWindow.minimize(); });
ipcMain.on('maximize', ()=>{ if(mainWindow){ if(mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); }});
ipcMain.on('close', ()=>{ if(mainWindow) mainWindow.close(); });
ipcMain.handle('get-security-extreme', async ()=> await fullSecurityScan());
ipcMain.handle('get-hwid', ()=> getHWID());
ipcMain.handle('get-waf-config', ()=> WAF_CONFIG);
ipcMain.handle('get-version', ()=> APP_VERSION);
ipcMain.handle('get-app-info', ()=> ({ version:APP_VERSION, name:'NG PB Launcher', hwid:getHWID(), realtime:true, autoUpdate:true, draggable:true, rapi:true }));
ipcMain.handle('secure-launch', async ()=>{
  const sec=await fullSecurityScan(); if(!sec.passed) throw new Error(sec.blocked);
  try {
    const gamePath=path.join(path.dirname(app.getPath('exe')), 'ngpb.exe'); const altPath=path.join(__dirname,'ngpb.exe'); const execPath=fs.existsSync(gamePath)?gamePath:altPath;
    if(!fs.existsSync(execPath)) throw new Error('ngpb.exe not found');
    spawn(execPath, [], { detached:true, stdio:'ignore' });
    return { success:true, message:'NGPB Launched - v53.6 Auto Update', hwid:sec.hwid };
  } catch(e){ throw new Error('Launch failed: '+e.message); }
});
ipcMain.on('check-for-update', ()=>{ if(autoUpdater) autoUpdater.checkForUpdatesAndNotify(); });
if(autoUpdater){
  autoUpdater.on('update-available', ()=>{ if(mainWindow) mainWindow.webContents.send('update-status','Update available - Downloading delta 2-3 MB - v53.6 Auto Update'); });
  autoUpdater.on('update-downloaded', ()=>{ if(mainWindow) mainWindow.webContents.send('update-status','Update downloaded - Will install on quit - v53.6'); });
}
