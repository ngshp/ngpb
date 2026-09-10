// NGPB Launcher Enterprise v1.0.53.6 AUTO UPDATE SYSTEM - preload.js - Secure Launcher + Draggable Rapi + Remote Patch
// Built by ngshp from mobile - 77.3 MB NSIS Premium + Fast Boot 0.8s + WAF Extreme + Security Extreme + Auto Update
// Ga perlu download lagi Bos! Fix dari version.json + Remote UI Loader!

const { contextBridge, ipcRenderer } = require('electron');

// === v53.6 NEW API - electronAPI - Buat tombol ─ □ ✕ + Draggable Rapi ===
contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  launchGame: () => ipcRenderer.invoke('secure-launch'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  getHWID: () => ipcRenderer.invoke('get-hwid'),
  getSecurity: () => ipcRenderer.invoke('get-security-extreme'),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (e, msg) => cb(msg)),
  onRealtimeStatus: (cb) => ipcRenderer.on('realtime-status', (e, data) => cb(data)),
  onApplyPatches: (cb) => ipcRenderer.on('apply-patches', (e, data) => cb(data)),
  platform: process.platform
});

// === v53.3 LEGACY API - ngpb - Tetap support biar ga break launcher lama ===
contextBridge.exposeInMainWorld('ngpb', {
  // === Window Controls - Frame:false 1200x700 Rapi - v53.6 Fix ===
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  drag: (x, y) => ipcRenderer.send('window-drag', { x, y }),
  platform: process.platform,

  // === Security v45 Legacy - Tetap support ===
  onSecurityViolation: (cb) => ipcRenderer.on('security-violation', (e, d) => cb(d)),

  // === Security Extreme 53.6 - Anti RDP/Emu/Cloud + Geo Ban + 1 Device 1 IP + HWID + Auto Update ===
  getSecurityExtreme: () => ipcRenderer.invoke('get-security-extreme'),
  getHWID: () => ipcRenderer.invoke('get-hwid'),
  checkGeoBan: () => ipcRenderer.invoke('check-geo-ban'),
  checkDeviceIP: () => ipcRenderer.invoke('check-device-ip'),

  // === WAF Extreme 53.6 - Auto Update + Whitelist 11 ===
  getWAFConfig: () => ipcRenderer.invoke('get-waf-config'),
  checkWAFRequest: (req) => ipcRenderer.invoke('check-waf-request', req),
  getWAFStatus: () => ipcRenderer.invoke('get-waf-status'),

  // === Secure Launch - PLAY 380x80 DRAGGABLE RAPI - Auto Update ===
  secureLaunch: () => ipcRenderer.invoke('secure-launch'),
  launchGame: () => ipcRenderer.invoke('secure-launch'),
  startGame: () => ipcRenderer.invoke('secure-launch'),

  // === Auto Updater v53.6 - Delta 2-3 MB doang - Bukan 77.3 MB full! ===
  checkForUpdate: () => ipcRenderer.send('check-for-update'),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (e, msg) => cb(msg)),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (e, percent) => cb(percent)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (e, info) => cb(info)),

  // === Version + Info + Auto Update ===
  getVersion: () => ipcRenderer.invoke('get-version'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getRealtimeConfig: () => ipcRenderer.invoke('get-realtime-config'),

  // === Banner Dynamic + Realtime ===
  getBannerConfig: () => ipcRenderer.invoke('get-banner-config'),
  getVersionJson: () => ipcRenderer.invoke('get-version-json'),

  // === Logs ===
  onLog: (cb) => ipcRenderer.on('log', (e, msg) => cb(msg)),
  sendLog: (msg) => ipcRenderer.send('log', msg),

  // === v53.6 Auto Update Events ===
  onRealtimeStatus: (cb) => ipcRenderer.on('realtime-status', (e, data) => cb(data)),
  onApplyPatches: (cb) => ipcRenderer.on('apply-patches', (e, data) => cb(data))
});

// === v53.6 AUTO PATCH SYSTEM - Apply CSS/JS dari version.json tanpa download! ===
ipcRenderer.on('apply-patches', (e, patches) => {
  try {
    if (patches.css) {
      let style = document.getElementById('auto-patches-v53-6');
      if (!style) {
        style = document.createElement('style');
        style.id = 'auto-patches-v53-6';
        document.head.appendChild(style);
      }
      style.textContent = patches.css;
      console.log('✅ v53.6 Auto patches.css applied - Draggable Rapi - No download! Length:', patches.css.length);
    }
    if (patches.draggable) {
      setTimeout(() => {
        const header = document.querySelector('.header');
        if (header) {
          header.style.webkitAppRegion = 'drag';
          header.style.cursor = 'move';
          console.log('✅ v53.6 Draggable ON - Header bisa drag kiri kanan!');
        }
        document.querySelectorAll('.logo,.header-nav,.header-right,.nav-item,button,.play-btn,.banner-cta,.card,.hero-card,.window-controls,.win-btn,.footer,.sidebar,.content,.main').forEach(el => {
          el.style.webkitAppRegion = 'no-drag';
        });
      }, 500);
    }
    if (patches.js) {
      try { eval(patches.js); console.log('✅ v53.6 Auto patches.js applied'); } catch(err){ console.log('Patch JS error', err.message); }
    }
  } catch(err) { console.log('Apply patches error', err.message); }
});

// === Security Extreme - Block DevTools + Anti Debug - Tetap ON ===
window.addEventListener('keydown', (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
    (e.ctrlKey && e.key === 'U')
  ) {
    e.preventDefault();
    ipcRenderer.send('security-violation', { type: 'DevTools Attempt', key: e.key });
    console.log('🚫 WAF EXTREME - DevTools Blocked - v53.6 Auto Update');
  }
});

// === WAF Extreme + Auto Update Log ===
window.addEventListener('DOMContentLoaded', () => {
  console.log('🟢 NGPB Launcher v53.6 AUTO UPDATE SYSTEM - Secure Launcher + Draggable Rapi - Preload Loaded');
  console.log('🛡 WAF: Whitelist 11 inc raw.githubusercontent.com - Auto Update Remote UI Loader ON');
  console.log('🎯 Draggable: header -webkit-app-region: drag + no-drag buttons + window controls ─ □ ✕');
  console.log('📦 Auto Update: Remote UI from raw.githubusercontent.com + patches.css from version.json - No 77.3 MB download!');
  console.log('🔒 Security: Anti RDP + Emu + Cloud + Geo Ban IL & PH + ASN Blacklist + 1D1IP + HWID AES-256 - Auto Update ON');
});
