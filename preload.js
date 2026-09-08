// preload.js - Secure bridge for draggable + security
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ngpb', {
  // Window controls - FIX DRAG
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // Security
  getVersion: () => ipcRenderer.invoke('get-version'),
  checkSignature: (file) => ipcRenderer.invoke('check-signature', file),
  securityScan: () => ipcRenderer.invoke('security-scan'),
  
  // Updater
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', cb),
  onUpdateReady: (cb) => ipcRenderer.on('update-ready', cb),

  // Platform
  platform: process.platform
});
