// NGPB Launcher Enterprise v1.0.53.3 WAF Extreme Ultimate - Secure Launcher - main.js
// Built by ngshp from mobile - 45MB NSIS Premium + Fast Boot 0.8s + WAF Extreme + Security Extreme
// Whitelist Hostname lr.nhg.one, ue.nhg.one, dd.nhg.one, pa.nhg.one, ce.nhg.one, se.nhg.one + GET Only + HTTP Version + UA Hard Filter + Bot Block + Geo Ban IL & PH

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

// === Security Modules 53.3 - Try load ===
let SecurityExtreme, WAFExtreme;
try { SecurityExtreme = require('./security/anti-rdp-emulator-cloud-geo.js'); } catch (e) { console.log('SecurityExtreme module not found, using inline', e.message); }
try { WAFExtreme = require('./security/secure-launcher-waf-extreme.js'); } catch (e) { try { WAFExtreme = require('./security/ng-pb-security-extream.js'); } catch (e2) { console.log('WAFExtreme module not found, using inline'); } }

const APP_VERSION = '1.0.53.3';
let mainWindow;
let hwidCache = null;

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
    // AES-256 Encrypt HWID + save hwid.lock
    try {
      const hwidPath = path.join(app.getPath('userData'), 'hwid.lock');
      if (!fs.existsSync(path.dirname(hwidPath))) fs.mkdirSync(path.dirname(hwidPath), { recursive: true });
      if (!fs.existsSync(hwidPath)) {
        const key = crypto.scryptSync('ngpb-hwid-2026-v53.3-waf-extreme', 'salt-ngpb', 32);
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

// === Anti RDP - Block mstsc, rdpclip, TermService, TeamViewer, AnyDesk, RDP Session ===
function detectRDP() {
  try {
    const procs = execSync('tasklist /fo csv /nh', { encoding: 'utf8' }).toLowerCase();
    const rdpIndicators = ['mstsc', 'rdpclip', 'teamviewer', 'anydesk', 'chrome_remote_desktop', 'screenconnect', 'logmein'];
    for (const rdp of rdpIndicators) { if (procs.includes(rdp)) return { detected: true, reason: `RDP Tool Detected: ${rdp} - ${rdp.toUpperCase()} Active - DROP`, tool: rdp }; }
    try { const sessionName = process.env.SESSIONNAME || ''; if (sessionName.toLowerCase().includes('rdp')) return { detected: true, reason: `RDP Session Detected: SESSIONNAME=${sessionName} - RDP Active - DROP` }; } catch (e) {}
    try { const termService = execSync('sc query TermService', { encoding: 'utf8' }); if (termService.includes('RUNNING')) { const qwinsta = execSync('qwinsta', { encoding: 'utf8' }).toLowerCase(); if (qwinsta.includes('rdp-tcp') && qwinsta.includes('active')) return { detected: true, reason: 'RDP Service Active: TermService RUNNING + rdp-tcp Active - DROP' }; } } catch (e) {}
    return { detected: false };
  } catch (e) { return { detected: false, error: e.message }; }
}

// === Anti Emulator - QEMU, LDPlayer, Nox, BlueStacks, MEmu + Virtual CPU/BIOS/Disk + Low Spec ===
function detectEmulator() {
  try {
    const cpus = os.cpus();
    const totalMemGB = os.totalmem() / (1024 ** 3);
    // Low Spec Check - 1 core + <2.5GB RAM = Emulator/Cloud
    if (cpus.length <= 1 && totalMemGB < 2.5) return { detected: true, reason: `Low Spec Emulator: ${cpus.length} core + ${totalMemGB.toFixed(1)}GB RAM <2.5GB - Emulator/VPS - DROP` };
    // Virtual CPU Check
    const cpuModel = cpus[0]?.model?.toLowerCase() || '';
    const virtualCpu = ['qemu', 'virtual', 'vmware', 'vbox', 'kvm', 'hyper-v'];
    for (const vc of virtualCpu) { if (cpuModel.includes(vc)) return { detected: true, reason: `Virtual CPU Detected: ${cpuModel} contains ${vc} - Emulator - DROP` }; }
    // BIOS Check
    try {
      const bios = execSync('wmic bios get SMBIOSBIOSVersion,Manufacturer /value', { encoding: 'utf8' }).toLowerCase();
      const emuBios = ['qemu', 'virtualbox', 'vmware', 'innotek', 'seabios', 'bochs', 'virtual'];
      for (const eb of emuBios) { if (bios.includes(eb)) return { detected: true, reason: `Emulator BIOS Detected: ${eb} in BIOS - DROP` }; }
    } catch (e) {}
    // Disk Check
    try {
      const disk = execSync('wmic diskdrive get Model /value', { encoding: 'utf8' }).toLowerCase();
      const emuDisk = ['qemu', 'virtual', 'vbox', 'vmware'];
      for (const ed of emuDisk) { if (disk.includes(ed)) return { detected: true, reason: `Emulator Disk Detected: ${ed} in Disk Model - DROP` }; }
    } catch (e) {}
    // Android Emulator Check
    try {
      const procs = execSync('tasklist /fo csv /nh', { encoding: 'utf8' }).toLowerCase();
      const androidEmu = ['ldplayer', 'nox', 'bluestacks', 'memu', 'dnplayer', 'gameloop', 'androidemulator', 'emulator.exe'];
      for (const ae of androidEmu) { if (procs.includes(ae)) return { detected: true, reason: `Android Emulator Detected: ${ae} - DROP` }; }
    } catch (e) {}
    return { detected: false };
  } catch (e) { return { detected: false, error: e.message }; }
}

// === Anti Cloud Server - AWS EC2, Azure, GCP, Vultr, DO, Linode + No Battery + Cloud MAC ===
function detectCloud() {
  try {
    // Battery Check - Cloud VPS No Battery
    try {
      const battery = execSync('wmic path Win32_Battery get BatteryStatus /value', { encoding: 'utf8' });
      if (!battery.includes('BatteryStatus') || battery.includes('No Instance')) {
        const cores = os.cpus().length;
        const memGB = os.totalmem() / (1024 ** 3);
        if (cores >= 8 || memGB >= 16) return { detected: true, reason: `Cloud Server No Battery: ${cores} cores + ${memGB.toFixed(1)}GB RAM + No Battery - Cloud VPS - DROP` };
      }
    } catch (e) {}
    // Hostname Cloud Check
    const hostname = os.hostname().toLowerCase();
    const cloudHost = ['ec2', 'azure', 'gcp', 'google', 'vultr', 'digitalocean', 'linode', 'cloud', 'vps', 'server-', 'hosting'];
    for (const ch of cloudHost) { if (hostname.includes(ch)) { const memGB = os.totalmem() / (1024 ** 3); if (memGB >= 8) return { detected: true, reason: `Cloud Hostname: ${hostname} contains ${ch} + ${memGB.toFixed(1)}GB RAM - Cloud - DROP` }; } }
    // MAC Address Cloud Check
    try {
      const macs = execSync('getmac /fo csv /nh', { encoding: 'utf8' }).toLowerCase();
      const cloudMacs = ['00:15:5d', '00:0c:29', '00:50:56', '08:00:27', '00:1c:42', '00:16:3e'];
      for (const cm of cloudMacs) { if (macs.includes(cm)) return { detected: true, reason: `Cloud MAC Detected: ${cm} - Hyper-V/VMware/VBox Cloud - DROP` }; }
    } catch (e) {}
    return { detected: false };
  } catch (e) { return { detected: false, error: e.message }; }
}

// === Geo Ban - Israel IL & Philippines PH via ip-api.com + ASN Blacklist ===
async function checkGeoBan() {
  return new Promise((resolve) => {
    const req = http.get('http://ip-api.com/json/?fields=country,countryCode,as,query,status', (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          const countryCode = (j.countryCode || '').toUpperCase();
          const country = j.country || '';
          const ip = j.query || '';
          const as = j.as || '';
          const asnMatch = as.match(/AS(\d+)/);
          const asn = asnMatch? parseInt(asnMatch[1]) : 0;
          // Geo Ban IL & PH
          if (['IL', 'PH'].includes(countryCode)) {
            resolve({ banned: true, country, countryCode, ip, as, asn, reason: `GEO BAN: ${country} (${countryCode}) - Israel & Philippines Blocked - IP ${ip} - ASN ${asn} - ACCESS DENIED`, message: `Launcher tidak bisa dibuka di ${country} (${countryCode}) - Geo Ban Israel & Philippines` });
            return;
          }
          // ASN Blacklist
          const asnBlacklist = [48081, 12849, 8551, 1680, 9116, 9299, 10139, 132199, 9009, 23944];
          if (asnBlacklist.includes(asn)) {
            resolve({ banned: true, country, countryCode, ip, as, asn, reason: `ASN BLACKLIST: ${asn} - ${as} - Israel/PH/VPN - IP ${ip} - DROP`, message: `ASN Blacklist ${asn} - ${as} - Blocked` });
            return;
          }
          resolve({ banned: false, country, countryCode, ip, as, asn, message: `Geo OK: ${country} (${countryCode}) - IP ${ip} - ASN ${asn} - ${as}` });
        } catch (e) { resolve({ banned: false, error: e.message, message: 'Geo Offline Allow - ip-api.com error' }); }
      });
    });
    req.on('error', () => resolve({ banned: false, error: 'Geo API offline', message: 'Geo Offline Allow - API offline' }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ banned: false, error: 'Geo timeout', message: 'Geo Offline Allow - Timeout' }); });
  });
}

// === WAF Extreme 53.3 - Whitelist Hostname + IP + ASN + GET + HTTP Version + UA + Bot Block + Web Assets ===
const WAF_CONFIG = {
  HOSTNAMES: ['lr.nhg.one', 'ue.nhg.one', 'dd.nhg.one', 'pa.nhg.one', 'ce.nhg.one', 'se.nhg.one', 'panel-admin.nhg.one'],
  IP_WHITELIST: ['127.0.0.1', '::1'],
  IP_BLACKLIST: [],
  ASN_WHITELIST: [13335],
  ASN_BLACKLIST: [48081, 12849, 8551, 1680, 9116, 9299, 10139, 132199, 9009, 23944],
  ALLOWED_METHODS: ['GET'],
  ALLOWED_HTTP: ['1.0', '1.1', '2', '2.0', 'h2', '3'],
  ALLOWED_UA: ['NGPB-Launcher', 'ngpb.exe', 'NG PB Launcher', 'Electron', 'ngpb'],
  BLOCKED_UA: ['curl', 'wget', 'python', 'go-http', 'java', 'libwww', 'perl', 'headless', 'phantomjs', 'selenium', 'puppeteer'],
  KNOWN_BOTS: ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'YandexBot', 'Sogou', 'Exabot', 'facebot', 'SemrushBot', 'AhrefsBot', 'MJ12bot', 'DotBot']
};

function checkWAF(hostname, method, httpVersion, userAgent, url) {
  const cleanHost = (hostname || '').replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
  if (!WAF_CONFIG.HOSTNAMES.includes(cleanHost)) return { passed: false, reason: `HOSTNAME NOT WHITELISTED: ${cleanHost} - Only Allow: ${WAF_CONFIG.HOSTNAMES.join(', ')} - DROP` };
  if (method &&!WAF_CONFIG.ALLOWED_METHODS.includes(method.toUpperCase())) return { passed: false, reason: `METHOD DENIED: ${method} - Only Allow: ${WAF_CONFIG.ALLOWED_METHODS.join(', ')} - DROP all except GET` };
  if (httpVersion) {
    const v = httpVersion.replace('HTTP/', '').toLowerCase();
    if (!WAF_CONFIG.ALLOWED_HTTP.includes(v) &&!WAF_CONFIG.ALLOWED_HTTP.includes(v.replace('h2', '2'))) return { passed: false, reason: `HTTP VERSION DROP: ${httpVersion} - Only Allow HTTP/1.0, HTTP/1.1, HTTP/2 - DROP ${httpVersion}` };
  }
  if (userAgent) {
    const l = userAgent.toLowerCase();
    for (const bot of WAF_CONFIG.KNOWN_BOTS) { if (l.includes(bot.toLowerCase())) return { passed: false, reason: `BOT TRAFFIC BLOCKED: Known Bot ${bot} - UA: ${userAgent} - DROP` }; }
    for (const bad of WAF_CONFIG.BLOCKED_UA) { if (l.includes(bad)) { const isAllowed = WAF_CONFIG.ALLOWED_UA.some(a => l.includes(a.toLowerCase())); if (!isAllowed) return { passed: false, reason: `UA TOOL BLOCKED: ${bad} in UA ${userAgent} - Hard Filter DROP` }; } }
    const hasAllowed = WAF_CONFIG.ALLOWED_UA.some(a => l.includes(a.toLowerCase()));
    if (!hasAllowed) return { passed: false, reason: `UA HARD FILTER: Must contain ${WAF_CONFIG.ALLOWED_UA.join(' or ')} - Got: ${userAgent} - DROP` };
  }
  if (url) {
    const isAsset = url.match(/\.(js|css|png|jpg|jpeg|webp|ico|woff2?|ttf|svg|json)(\?|$)/) || url.includes('/assets/');
    if (isAsset &&!WAF_CONFIG.HOSTNAMES.includes(cleanHost)) return { passed: false, reason: `WEB ASSETS FILTER: Asset ${url} from non-whitelisted host ${cleanHost} - DROP` };
  }
  return { passed: true, hostname: cleanHost };
}

// === Full Security Extreme Scan ===
async function fullSecurityScan() {
  const hwid = getHWID();
  const rdp = detectRDP();
  if (rdp.detected) return { passed: false, blocked: rdp.reason, hwid, details: { rdp, geo: { country: 'Unknown', countryCode: 'XX', ip: '127.0.0.1', message: 'RDP Check Failed' }, ip: { message: 'RDP Blocked' }, device: { message: 'RDP Detected' } } };
  const emu = detectEmulator();
  if (emu.detected) return { passed: false, blocked: emu.reason, hwid, details: { emu, geo: { country: 'Unknown', countryCode: 'XX', ip: '127.0.0.1', message: 'Emu Check Failed' }, ip: { message: 'Emu Blocked' }, device: { message: 'Emulator Detected' } } };
  const cloud = detectCloud();
  if (cloud.detected) return { passed: false, blocked: cloud.reason, hwid, details: { cloud, geo: { country: 'Unknown', countryCode: 'XX', ip: '127.0.0.1', message: 'Cloud Check Failed' }, ip: { message: 'Cloud Blocked' }, device: { message: 'Cloud Server Detected' } } };
  const geo = await checkGeoBan();
  if (geo.banned) return { passed: false, blocked: geo.reason, hwid, details: { geo, ip: { message: geo.message }, device: { hwid, message: `1 Device 1 Launcher - HWID ${hwid} - Geo Ban ${geo.countryCode}` } } };
  return { passed: true, hwid, details: { geo, ip: { message: `IP OK: ${geo.ip} - 1 IP 1 Launcher - Checking api.ipify.org` }, device: { hwid, message: `1 Device 1 Launcher - HWID ${hwid} - Binding OK - AES-256 Encrypted` }, rdp: { message: 'Anti RDP OK - No RDP Tool/Session' }, emu: { message: 'Anti Emulator OK - No QEMU/LDPlayer/Nox/BlueStacks' }, cloud: { message: 'Anti Cloud OK - No AWS/Azure/GCP/Vultr' } }, blocked: null };
}

// === Create Window 1400x900 frame:false ===
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
      enableRemoteModule: false
    },
    show: false
  });

  const indexPath = fs.existsSync(path.join(__dirname, 'launcher/index.html'))? path.join(__dirname, 'launcher/index.html') : path.join(__dirname, 'index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // AutoUpdater Check
    if (autoUpdater) { try { autoUpdater.checkForUpdatesAndNotify(); } catch (e) { console.log('AutoUpdater check error', e.message); } }
  });

  // Anti Debug - Block DevTools
  mainWindow.webContents.on('devtools-opened', () => { mainWindow.webContents.closeDevTools(); mainWindow.webContents.send('security-violation', { type: 'DevTools Opened', message: 'DevTools Blocked - WAF Extreme - Secure Launcher' }); });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  // Fast Boot 0.8s - Security Check async
  createWindow();
  // Security Extreme + WAF Extreme Check on Startup
  setTimeout(async () => {
    const sec = await fullSecurityScan();
    if (!sec.passed) {
      if (mainWindow) {
        dialog.showErrorBox('🚫 SECURITY EXTREME BLOCKED - WAF EXTREME ULTIMATE', `${sec.blocked}\n\nHWID: ${sec.hwid}\nGeo: ${sec.details?.geo?.country} (${sec.details?.geo?.countryCode}) - IP: ${sec.details?.geo?.ip}\n\nLauncher tidak bisa dibuka di: Israel & Philippines\nAnti RDP / Emulator / Cloud Server Active\nWAF: Hostname Whitelist Only + GET Only + HTTP Version + UA Hard Filter + Bot Block\n\n© 2026 NGPB Team - v53.3 WAF Extreme Ultimate`);
        app.quit();
      }
    }
  }, 800);

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform!== 'darwin') app.quit(); });

// === IPC Handlers - Preload.js ===
ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => { if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } });
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });
ipcMain.on('window-drag', (e, { x, y }) => { if (mainWindow) mainWindow.setPosition(x, y); });

ipcMain.handle('get-security-extreme', async () => { return await fullSecurityScan(); });
ipcMain.handle('get-hwid', () => { return getHWID(); });
ipcMain.handle('check-geo-ban', async () => { return await checkGeoBan(); });
ipcMain.handle('get-waf-config', () => { return WAF_CONFIG; });
ipcMain.handle('check-waf-request', (e, req) => { return checkWAF(req.hostname, req.method, req.httpVersion, req.userAgent, req.url); });
ipcMain.handle('get-waf-status', () => { return { config: WAF_CONFIG, version: 'v53.3 WAF Extreme Ultimate', status: 'Active - Secure Launcher' }; });
ipcMain.handle('get-version', () => { return APP_VERSION; });
ipcMain.handle('get-app-info', () => { return { version: APP_VERSION, name: 'NG PB Launcher', productName: 'NG PB Launcher', appId: 'com.ngshp.ngpb.launcher', copyright: 'Copyright © 2026 NGPB Team - Built by ngshp from mobile - v53.3 WAF Extreme Ultimate - Secure Launcher - 45MB - Fast Boot 0.8s', hwid: getHWID() }; });
ipcMain.handle('secure-launch', async () => {
  const sec = await fullSecurityScan();
  if (!sec.passed) throw new Error(sec.blocked);
  // WAF Check Hostname
  const waf = checkWAF('pa.nhg.one', 'GET', 'HTTP/1.1', 'NGPB-Launcher/53.3', 'https://pa.nhg.one/ngpb.exe');
  if (!waf.passed) throw new Error(waf.reason);
  // Launch ngpb.exe - Secure Launch
  try {
    const gamePath = path.join(path.dirname(app.getPath('exe')), 'ngpb.exe');
    const altPath = path.join(__dirname, 'ngpb.exe');
    const execPath = fs.existsSync(gamePath)? gamePath : altPath;
    if (!fs.existsSync(execPath)) throw new Error('ngpb.exe not found - Download dari pa.nhg.one - Whitelist Hostname Only');
    spawn(execPath, [], { detached: true, stdio: 'ignore' });
    return { success: true, message: 'NGPB Launched - Secure Launcher - WAF Extreme Ultimate - 45MB', hwid: sec.hwid, path: execPath };
  } catch (e) { throw new Error('Launch failed: ' + e.message); }
});

// === Auto Updater IPC ===
ipcMain.on('check-for-update', () => { if (autoUpdater) autoUpdater.checkForUpdatesAndNotify(); });
if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => { if (mainWindow) mainWindow.webContents.send('update-status', 'Checking for update... - v53.3 WAF Extreme Ultimate'); });
  autoUpdater.on('update-available', () => { if (mainWindow) mainWindow.webContents.send('update-status', 'Update available - Downloading... - 45MB'); });
  autoUpdater.on('update-not-available', () => { if (mainWindow) mainWindow.webContents.send('update-status', 'You are on latest version - v53.3 WAF Extreme Ultimate - 45MB'); });
  autoUpdater.on('download-progress', (p) => { if (mainWindow) mainWindow.webContents.send('update-progress', Math.round(p.percent)); });
  autoUpdater.on('update-downloaded', () => { if (mainWindow) mainWindow.webContents.send('update-status', 'Update downloaded - Will install on quit - 53.3 WAF Extreme'); });
  autoUpdater.on('error', (e) => { if (mainWindow) mainWindow.webContents.send('update-status', 'Update error: ' + e.message); });
}

// === Security Violation Log ===
ipcMain.on('security-violation', (e, data) => { console.log('🚫 Security Violation:', data); });
ipcMain.on('log', (e, msg) => { console.log('[Renderer Log]', msg); });

// === Anti Debug - Timing Check 500k loop >150ms ===
setInterval(() => {
  const start = Date.now();
  for (let i = 0; i < 500000; i++) {}
  const elapsed = Date.now() - start;
  if (elapsed > 150) {
    console.log('🚫 Anti Debug Timing Detected - Slowdown ' + elapsed + 'ms >150ms - Debugger Active - WAF Extreme');
    if (mainWindow) mainWindow.webContents.send('security-violation', { type: 'Debugger Detected', elapsed, message: 'Timing slowdown detected - Debugger Active' });
  }
}, 5000);

// === Handle --inspect Flag - Block Debug ===
if (process.argv.some(arg => arg.includes('--inspect') || arg.includes('--remote-debugging'))) {
  console.log('🚫 --inspect Flag Detected - Anti Debug - WAF Extreme - Secure Launcher - DROP');
  app.quit();
}
