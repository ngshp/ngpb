// NGPB Launcher v1.0.53.3 WAF Extreme Ultimate - preload.js - Secure Launcher
// Built by ngshp from mobile - 45MB NSIS Premium + Fast Boot 0.8s + WAF Extreme + Security Extreme

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ngpb', {
  // === Window Controls - Frame:false 1400x900 ===
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  drag: (x, y) => ipcRenderer.send('window-drag', { x, y }),
  platform: process.platform,

  // === Security v45 Legacy - Tetap support ===
  onSecurityViolation: (cb) => ipcRenderer.on('security-violation', (e, d) => cb(d)),

  // === Security Extreme 53.2 - Anti RDP/Emu/Cloud + Geo Ban + 1 Device 1 IP + HWID ===
  getSecurityExtreme: () => ipcRenderer.invoke('get-security-extreme'),
  getHWID: () => ipcRenderer.invoke('get-hwid'),
  checkGeoBan: () => ipcRenderer.invoke('check-geo-ban'),
  checkDeviceIP: () => ipcRenderer.invoke('check-device-ip'),

  // === WAF Extreme 53.3 - Secure Launcher - Whitelist Hostname + IP + ASN + GET + HTTP Version + UA + Bot Block + Web Assets ===
  getWAFConfig: () => ipcRenderer.invoke('get-waf-config'),
  checkWAFRequest: (req) => ipcRenderer.invoke('check-waf-request', req),
  getWAFStatus: () => ipcRenderer.invoke('get-waf-status'),

  // === Secure Launch - PLAY 450x100 SECURE LAUNCH - Anti RDP/VM/Cloud + WAF Check ===
  secureLaunch: () => ipcRenderer.invoke('secure-launch'),
  launchGame: () => ipcRenderer.invoke('secure-launch'),
  startGame: () => ipcRenderer.invoke('secure-launch'),

  // === Auto Updater - electron-updater 6.6.2 - Auto Download + Auto Install ===
  checkForUpdate: () => ipcRenderer.send('check-for-update'),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (e, msg) => cb(e, msg)),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (e, percent) => cb(e, percent)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (e, info) => cb(e, info)),

  // === Version + Info ===
  getVersion: () => ipcRenderer.invoke('get-version'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // === Banner Dynamic - 3 tipe event,maintenance,info ===
  getBannerConfig: () => ipcRenderer.invoke('get-banner-config'),
  getVersionJson: () => ipcRenderer.invoke('get-version-json'),

  // === Logs - For UI log panel ===
  onLog: (cb) => ipcRenderer.on('log', (e, msg) => cb(e, msg)),
  sendLog: (msg) => ipcRenderer.send('log', msg)
});

// === Security Extreme - Block DevTools + Anti Debug ===
window.addEventListener('keydown', (e) => {
  // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
    (e.ctrlKey && e.key === 'U')
  ) {
    e.preventDefault();
    ipcRenderer.send('security-violation', { type: 'DevTools Attempt', key: e.key });
    console.log('🚫 WAF EXTREME - DevTools Blocked - Secure Launcher');
  }
});

// === WAF Extreme - Log WAF Status on Load ===
window.addEventListener('DOMContentLoaded', () => {
  console.log('🔵 NGPB Launcher v53.3 WAF Extreme Ultimate - Secure Launcher - Preload Loaded');
  console.log('🛡️ WAF: Hostname Whitelist lr.nhg.one, ue.nhg.one, dd.nhg.one, pa.nhg.one, ce.nhg.one, se.nhg.one, panel-admin.nhg.one - ONLY ALLOW');
  console.log('🛡️ Method: GET Only - POST,PUT,DELETE DROP - HTTP/1.0,1.1,2 Allow - UA Hard Filter NGPB-Launcher - Bot Block');
  console.log('🔒 Security: Anti RDP + Emu + Cloud + Geo Ban IL & PH + ASN Blacklist + 1 Device 1 IP + HWID AES-256 - 45MB NSIS Premium');
});
