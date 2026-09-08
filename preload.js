const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ngpb', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  drag: (x,y) => ipcRenderer.send('window-drag', {x,y}),
  platform: process.platform,
  onSecurityViolation: (cb) => ipcRenderer.on('security-violation', (e,d) => cb(d))
});
