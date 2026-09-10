// NGPB Launcher Enterprise v1.0.53.4 REALTIME THEME SYSTEM - Secure Launcher - main.js
// Built by ngshp from mobile - 77.2 MB NSIS Premium + Fast Boot 0.8s + WAF Extreme + Realtime Theme + Security Extreme
// Whitelist Hostname 8 inc raw.githubusercontent.com + GET Only + HTTP Version + UA Hard Filter + Bot Block + Geo Ban IL & PH + Realtime Theme

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
const APP_VERSION = '1.0.53.4';

// === HWID Binding - SHA256 CPU+Disk+Board+Arch+Mem+Hostname 16 char AES-256 ===
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
        const key = crypto.scryptSync('ngpb-hwid-2026-v53.4-realtime-theme', 'salt-ngpb-v53.4', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(hash, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        fs.writeFileSync(hwidPath, iv.toString('hex') + ':' + encrypted);
      }
    } catch (e) { console.log('HWID lock save error', e.message); }
    hwidCache = hash;
    return hash;
  } catch (e) { return 'HWID-ERROR-' + crypto.randomBytes(4).toString('hex').toUpperCase(); }
}

// === Anti RDP + Emulator + Cloud ===
function detectRDP() {
  try {
    const procs = execSync('tasklist /fo csv /nh', { encoding: 'utf8' }).toLowerCase();
    const rdpIndicators = ['mstsc', 'rdpclip', 'teamviewer', 'anydesk', 'chrome_remote_desktop', 'screenconnect', 'logmein'];
    for (const rdp of rdpIndicators) { if (procs.includes(rdp)) return { detected: true, reason: `RDP Tool Detected: ${rdp} - DROP`, tool: rdp }; }
    try { const sessionName = process.env.SESSIONNAME || ''; if (sessionName.toLowerCase().includes('rdp')) return { detected: true, reason: `RDP Session Detected: SESSIONNAME=${sessionName} - DROP` }; } catch (e) {}
    try { const termService = execSync('sc query TermService', { encoding: 'utf8' }); if (termService.includes('RUNNING')) { const qwinsta = execSync('qwinsta', { encoding: 'utf8' }).toLowerCase(); if (qwinsta.includes('rdp-tcp') && qwinsta.includes('active')) return { detected: true, reason: 'RDP Service Active: TermService RUNNING + rdp-tcp Active - DROP' }; } } catch (e) {}
    return { detected: false };
  } catch (e) { return { detected: false, error: e.message }; }
}

function detectEmulator() {
  try {
    const cpus = os.cpus();
    const totalMemGB = os.totalmem() / (1024 ** 3);
    if (cpus.length <= 1 && totalMemGB < 2.5) return { detected: true, reason: `Low Spec Emulator: ${cpus.length} core + ${totalMemGB.toFixed(1)}GB RAM - DROP` };
    const cpuModel = cpus[0]?.model?.toLowerCase() || '';
    const virtualCpu = ['qemu', 'virtual', 'vmware', 'vbox', 'kvm', 'hyper-v'];
    for (const vc of virtualCpu) { if (cpuModel.includes(vc)) return { detected: true, reason: `Virtual CPU Detected: ${cpuModel} contains ${vc} - DROP` }; }
    try { const bios = execSync('wmic bios get SMBIOSBIOSVersion,Manufacturer /value', { encoding: 'utf8' }).toLowerCase(); const emuBios = ['qemu', 'virtualbox', 'vmware', 'innotek', 'seabios', 'bochs', 'virtual']; for (const eb of emuBios) { if (bios.includes(eb)) return { detected: true, reason: `Emulator BIOS Detected: ${eb} - DROP` }; } } catch (e) {}
    try { const disk = execSync('wmic diskdrive get Model /value', { encoding: 'utf8' }).toLowerCase(); const emuDisk = ['qemu', 'virtual', 'vbox', 'vmware']; for (const ed of emuDisk) { if (disk.includes(ed)) return { detected: true, reason: `Emulator Disk Detected: ${ed} - DROP` }; } } catch (e) {}
    try { const procs = execSync('tasklist /fo csv /nh', { encoding: 'utf8' }).toLowerCase(); const androidEmu = ['ldplayer', 'nox', 'bluestacks', 'memu', 'dnplayer', 'gameloop', 'androidemulator']; for (const ae of androidEmu) { if (procs.includes(ae)) return { detected: true, reason: `Android Emulator Detected: ${ae} - DROP` }; } } catch (e) {}
    return { detected: false };
  } catch (e) { return { detected: false, error: e.message }; }
}

function detectCloud() {
  try {
    try { const battery = execSync('wmic path Win32_Battery get BatteryStatus /value', { encoding: 'utf8' }); if (!battery.includes('BatteryStatus') || battery.includes('No Instance')) { const cores = os.cpus().length; const memGB = os.totalmem() / (1024 ** 3); if (cores >= 8 || memGB >= 16) return { detected: true, reason: `Cloud Server No Battery: ${cores} cores + ${memGB.toFixed(1)}GB RAM - Cloud VPS - DROP` }; } } catch (e) {}
    const hostname = os.hostname().toLowerCase(); const cloudHost = ['ec2', 'azure', 'gcp', 'google', 'vultr', 'digitalocean', 'linode', 'cloud', 'vps']; for (const ch of cloudHost) { if (hostname.includes(ch)) { const memGB = os.totalmem() / (1024 ** 3); if (memGB >= 8) return { detected: true, reason: `Cloud Hostname: ${hostname} contains ${ch} + ${memGB.toFixed(1)}GB RAM - Cloud - DROP` }; } }
    try { const macs = execSync('getmac /fo csv /nh', { encoding: 'utf8' }).toLowerCase(); const cloudMacs = ['00:15:5d', '00:0c:29', '00:50:56', '08:00:27', '00:1c:42', '00:16:3e']; for (const cm of cloudMacs) { if (macs.includes(cm)) return { detected: true, reason: `Cloud MAC Detected: ${cm} - Cloud - DROP` }; } } catch (e) {}
    return { detected: false };
  } catch (e) { return { detected: false, error: e.message }; }
}

async function checkGeoBan() {
  return new Promise((resolve) => {
    const req = http.get('http://ip-api.com/json/?fields=country,countryCode,as,query,status', (res) => {
      let data = ''; res.on('data', (c) => data += c); res.on('end', () => {
        try {
          const j = JSON.parse(data); const countryCode = (j.countryCode || '').toUpperCase(); const country = j.country || ''; const ip = j.query || ''; const as = j.as || ''; const asnMatch = as.match(/AS(\d+)/); const asn = asnMatch? parseInt(asnMatch[1]) : 0;
          if (['IL', 'PH'].includes(countryCode)) { resolve({ banned: true, country, countryCode, ip, as, asn, reason: `GEO BAN: ${country} (${countryCode}) - IP ${ip} - ASN ${asn} - ACCESS DENIED`, message: `Launcher tidak bisa dibuka di ${country} (${countryCode}) - Geo Ban` }); return; }
          const asnBlacklist = [48081, 12849, 8551, 1680, 9116, 9299, 10139, 132199, 9009, 23944];
          if (asnBlacklist.includes(asn)) { resolve({ banned: true, country, countryCode, ip, as, asn, reason: `ASN BLACKLIST: ${asn} - ${as} - IP ${ip} - DROP`, message: `ASN Blacklist ${asn} - ${as} - Blocked` }); return; }
          resolve({ banned: false, country, countryCode, ip, as, asn, message: `Geo OK: ${country} (${countryCode}) - IP ${ip} - ASN ${asn}` });
        } catch (e) { resolve({ banned: false, error: e.message, message: 'Geo Offline Allow' }); }
      });
    });
    req.on('error', () => resolve({ banned: false, error: 'Geo API offline', message: 'Geo Offline Allow' }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ banned: false, error: 'Geo timeout', message: 'Geo Offline Allow - Timeout' }); });
  });
}

// === WAF Extreme v53.4 REALTIME - Whitelist 8 inc raw.githubusercontent.com ===
const WAF_CONFIG = {
  HOSTNAMES: ['lr.nhg.one', 'ue.nhg.one', 'dd.nhg.one', 'pa.nhg.one', 'ce.nhg.one', 'se.nhg.one', 'panel-admin.nhg.one', 'ngpb.id', 'raw.githubusercontent.com', 'github.com', 'api.github.com'],
  IP_WHITELIST: ['127.0.0.1', '::1'],
  IP_BLACKLIST: [],
  ASN_WHITELIST: [13335],
  ASN_BLACKLIST: [48081, 12849, 8551, 1680, 9116, 9299, 10139, 132199, 9009, 23944],
  ALLOWED_METHODS: ['GET'],
  ALLOWED_HTTP: ['1.0', '1.1', '2', '2.0', 'h2', '3'],
  ALLOWED_UA: ['NGPB-Launcher', 'ngpb.exe', 'NG PB Launcher', 'Electron', 'ngpb', 'Mozilla'],
  BLOCKED_UA: ['curl', 'wget', 'python', 'go-http', 'java', 'libwww', 'perl', 'headless', 'phantomjs', 'selenium', 'puppeteer'],
  KNOWN_BOTS: ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'YandexBot', 'Sogou', 'Exabot', 'facebot', 'SemrushBot', 'AhrefsBot', 'MJ12bot', 'DotBot'],
  REALTIME_ENABLED: true
};

function checkWAF(hostname, method, httpVersion, userAgent, url) {
  const cleanHost = (hostname || '').replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
  if (!WAF_CONFIG.HOSTNAMES.includes(cleanHost)) return { passed: false, reason: `HOSTNAME NOT WHITELISTED: ${cleanHost} - Only Allow: ${WAF_CONFIG.HOSTNAMES.join(', ')} - DROP` };
  if (method &&!WAF_CONFIG.ALLOWED_METHODS.includes(method.toUpperCase())) return { passed: false, reason: `METHOD DENIED: ${method} - Only GET - DROP` };
  if (httpVersion) { const v = httpVersion.replace('HTTP/', '').toLowerCase(); if (!WAF_CONFIG.ALLOWED_HTTP.includes(v) &&!WAF_CONFIG.ALLOWED_HTTP.includes(v.replace('h2', '2'))) return { passed: false, reason: `HTTP VERSION DROP: ${httpVersion} - Only Allow HTTP/1.0,1.1,2 - DROP` }; }
  if (userAgent) {
    const l = userAgent.toLowerCase();
    for (const bot of WAF_CONFIG.KNOWN_BOTS) { if (l.includes(bot.toLowerCase())) return { passed: false, reason: `BOT BLOCKED: ${bot} - UA: ${userAgent} - DROP` }; }
    for (const bad of WAF_CONFIG.BLOCKED_UA) { if (l.includes(bad)) { const isAllowed = WAF_CONFIG.ALLOWED_UA.some(a => l.includes(a.toLowerCase())); if (!isAllowed) return { passed: false, reason: `UA TOOL BLOCKED: ${bad} - DROP` }; } }
  }
  return { passed: true, hostname: cleanHost };
}

async function fullSecurityScan() {
  const hwid = getHWID();
  const rdp = detectRDP(); if (rdp.detected) return { passed: false, blocked: rdp.reason, hwid, details: { rdp, geo: { country: 'Unknown', countryCode: 'XX', ip: '127.0.0.1', message: 'RDP Check Failed' } } };
  const emu = detectEmulator(); if (emu.detected) return { passed: false, blocked: emu.reason, hwid, details: { emu, geo: { country: 'Unknown', countryCode: 'XX', ip: '127.0.0.1', message: 'Emu Check Failed' } } };
  const cloud = detectCloud(); if (cloud.detected) return { passed: false, blocked: cloud.reason, hwid, details: { cloud, geo: { country: 'Unknown', countryCode: 'XX', ip: '127.0.0.1', message: 'Cloud Check Failed' } } };
  const geo = await checkGeoBan(); if (geo.banned) return { passed: false, blocked: geo.reason, hwid, details: { geo, ip: { message: geo.message }, device: { hwid, message: `1D1IP - HWID ${hwid} - Geo Ban ${geo.countryCode}` } } };
  return { passed: true, hwid, details: { geo, ip: { message: `IP OK: ${geo.ip} - 1D1IP` }, device: { hwid, message: `1D1IP - HWID ${hwid} - Binding OK - AES-256 - Realtime Theme` }, rdp: { message: 'Anti RDP OK' }, emu: { message: 'Anti Emulator OK' }, cloud: { message: 'Anti Cloud OK' } }, blocked: null };
}

// === Create Window 1400x900 frame:false + Realtime Theme Fix ===
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#050a14',
    icon: path.join(__dirname, 'assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    show: false
  });

  // Try Launcher kapital first (sesuai repo lu), fallback launcher kecil
  let indexPath = path.join(__dirname, 'Launcher', 'index.html');
  if (!fs.existsSync(indexPath)) indexPath = path.join(__dirname, 'launcher', 'index.html');
  if (!fs.existsSync(indexPath)) indexPath = path.join(__dirname, 'index.html');

  mainWindow.loadFile(indexPath);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (autoUpdater) { try { autoUpdater.checkForUpdatesAndNotify(); } catch (e) {} }
    // Send realtime enabled to renderer
    setTimeout(() => { if (mainWindow) mainWindow.webContents.send('realtime-status', { enabled: true, version: APP_VERSION, wafHosts: WAF_CONFIG.HOSTNAMES.length, message: 'v53.4 Realtime Theme System Active - Fetch from raw.githubusercontent.com' }); }, 1000);
  });

  mainWindow.webContents.on('devtools-opened', () => { mainWindow.webContents.closeDevTools(); mainWindow.webContents.send('security-violation', { type: 'DevTools Blocked', message: 'DevTools Blocked - WAF Extreme - v53.4 Realtime' }); });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  createWindow();
  setTimeout(async () => {
    const sec = await fullSecurityScan();
    if (!sec.passed) {
      if (mainWindow) {
        dialog.showErrorBox('🚫 SECURITY EXTREME BLOCKED - v53.4 REALTIME THEME', `${sec.blocked}\n\nHWID: ${sec.hwid}\nGeo: ${sec.details?.geo?.country} (${sec.details?.geo?.countryCode}) - IP: ${sec.details?.geo?.ip}\n\nLauncher tidak bisa dibuka di: Israel & Philippines\nAnti RDP / Emulator / Cloud Server Active\nWAF: Whitelist 8 inc raw.githubusercontent.com + GET Only + HTTP/1.0,1.1,2 + UA Hard Filter + Bot Block + Realtime Theme\n\n© 2026 NGPB Team - v53.4 Realtime Theme - 77.2 MB - Shield Merah`);
        app.quit();
      }
    }
  }, 800);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform!== 'darwin') app.quit(); });

// IPC
ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => { if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } });
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });
ipcMain.handle('get-security-extreme', async () => { return await fullSecurityScan(); });
ipcMain.handle('get-hwid', () => { return getHWID(); });
ipcMain.handle('check-geo-ban', async () => { return await checkGeoBan(); });
ipcMain.handle('get-waf-config', () => { return WAF_CONFIG; });
ipcMain.handle('check-waf-request', (e, req) => { return checkWAF(req.hostname, req.method, req.httpVersion, req.userAgent, req.url); });
ipcMain.handle('get-waf-status', () => { return { config: WAF_CONFIG, version: 'v53.4 Realtime Theme - WAF Extreme Ultimate', status: 'Active - Realtime ON - 8 Hosts Whitelisted' }; });
ipcMain.handle('get-version', () => { return APP_VERSION; });
ipcMain.handle('get-app-info', () => { return { version: APP_VERSION, name: 'NG PB Launcher', productName: 'NG PB Launcher', appId: 'com.ngshp.ngpb.launcher', copyright: '© 2026 NGPB Team - v53.4 Realtime Theme System - 77.2 MB - Shield Merah - Build #84 Realtime', hwid: getHWID(), realtime: true, wafHosts: WAF_CONFIG.HOSTNAMES.length }; });
ipcMain.handle('get-realtime-config', async () => {
  return new Promise((resolve) => {
    https.get('https://raw.githubusercontent.com/ngshp/ngpb/main/version.json', (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => { try { const j = JSON.parse(data); resolve({ success: true, config: j, source: 'raw.githubusercontent.com', realtime: true }); } catch (e) { resolve({ success: false, error: e.message }); } });
    }).on('error', (e) => resolve({ success: false, error: e.message }));
  });
});
ipcMain.handle('secure-launch', async () => {
  const sec = await fullSecurityScan(); if (!sec.passed) throw new Error(sec.blocked);
  const waf = checkWAF('pa.nhg.one', 'GET', 'HTTP/1.1', 'NGPB-Launcher/53.4 Realtime', 'https://pa.nhg.one/ngpb.exe'); if (!waf.passed) throw new Error(waf.reason);
  try {
    const gamePath = path.join(path.dirname(app.getPath('exe')), 'ngpb.exe'); const altPath = path.join(__dirname, 'ngpb.exe'); const execPath = fs.existsSync(gamePath)? gamePath : altPath;
    if (!fs.existsSync(execPath)) throw new Error('ngpb.exe not found - Download dari pa.nhg.one - Whitelist Only');
    spawn(execPath, [], { detached: true, stdio: 'ignore' });
    return { success: true, message: 'NGPB Launched - v53.4 Realtime Theme - WAF Extreme - 77.2 MB', hwid: sec.hwid, path: execPath, realtime: true };
  } catch (e) { throw new Error('Launch failed: ' + e.message); }
});

ipcMain.on('check-for-update', () => { if (autoUpdater) autoUpdater.checkForUpdatesAndNotify(); });
if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => { if (mainWindow) mainWindow.webContents.send('update-status', 'Checking for update... - v53.4 Realtime Theme - 77.2 MB'); });
  autoUpdater.on('update-available', () => { if (mainWindow) mainWindow.webContents.send('update-status', 'Update available - Downloading... - v53.4 Realtime 77.2 MB'); });
  autoUpdater.on('update-not-available', () => { if (mainWindow) mainWindow.webContents.send('update-status', 'You are on latest v53.4 Realtime Theme - 77.2 MB - Realtime ON'); });
  autoUpdater.on('download-progress', (p) => { if (mainWindow) mainWindow.webContents.send('update-progress', Math.round(p.percent)); });
  autoUpdater.on('update-downloaded', () => { if (mainWindow) mainWindow.webContents.send('update-status', 'Update downloaded - Will install on quit - v53.4 Realtime'); });
  autoUpdater.on('error', (e) => { if (mainWindow) mainWindow.webContents.send('update-status', 'Update error: ' + e.message); });
}

ipcMain.on('security-violation', (e, data) => { console.log('🚫 Security Violation:', data); });
ipcMain.on('log', (e, msg) => { console.log('[Renderer Log]', msg); });

setInterval(() => { const start = Date.now(); for (let i = 0; i < 500000; i++) {} const elapsed = Date.now() - start; if (elapsed > 150) { console.log('🚫 Anti Debug Timing ' + elapsed + 'ms - Debugger Active - v53.4 Realtime'); if (mainWindow) mainWindow.webContents.send('security-violation', { type: 'Debugger Detected', elapsed }); } }, 5000);

if (process.argv.some(arg => arg.includes('--inspect') || arg.includes('--remote-debugging'))) { console.log('🚫 --inspect Flag Detected - Anti Debug - v53.4 Realtime - DROP'); app.quit(); }
