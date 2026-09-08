const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { exec, execSync } = require('child_process');
const crypto = require('crypto');

// SECURITY MODULE
const securityPath = path.join(__dirname, 'src', 'security.js');
let Security = {};
if(fs.existsSync(securityPath)) {
  Security = require(securityPath);
}

// HWID GENERATOR - 1 PC = 1 LICENSE
async function getHWID() {
  try {
    const cpu = execSync('wmic cpu get ProcessorId', {timeout:5000}).toString().split('\n')[1].trim();
    const disk = execSync('wmic diskdrive get SerialNumber', {timeout:5000}).toString().split('\n')[1].trim();
    const board = execSync('wmic baseboard get SerialNumber', {timeout:5000}).toString().split('\n')[1].trim();
    const raw = `${cpu}-${disk}-${board}-NGPB-2026`;
    const hwid = crypto.createHash('sha256').update(raw).digest('hex').substring(0,16).toUpperCase();
    console.log(`[NGPB HWID] ${hwid} | CPU:${cpu} DISK:${disk} BOARD:${board}`);
    return hwid;
  } catch(e) {
    console.log('[NGPB HWID] FAILED, using fallback', e.message);
    return 'UNKNOWN-HWID-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }
}

async function validateHWID() {
  const hwid = await getHWID();
  const hwidFile = path.join(app.getPath('userData'), 'hwid.lock');
  try {
    if(!fs.existsSync(hwidFile)) {
      fs.writeFileSync(hwidFile, hwid);
      console.log('[NGPB HWID] First bind:', hwid);
      return null;
    } else {
      const locked = fs.readFileSync(hwidFile, 'utf8').trim();
      if(locked !== hwid && locked !== '' && !locked.includes('UNKNOWN')) {
        return `HWID MISMATCH!\n\nLauncher ini ter-lock di PC: ${locked}\nPC Sekarang: ${hwid}\n\n1 License = 1 PC! Hubungi admin@ngshp.com untuk reset.`;
      }
    }
  } catch(e){}
  return null;
}

// ANTI RDP / VM DETECTION - ANTI VPS BAJAKAN
async function detectVM_RDP() {
  const bannedVM = ['VMware', 'VirtualBox', 'QEMU', 'Virtual Machine', 'Hyper-V', 'KVM', 'Xen', 'Virtual'];
  const vmProcesses = ['vmtoolsd.exe', 'vboxservice.exe', 'vboxtray.exe', 'vmwaretray.exe', 'vmwareuser.exe', 'vmsrvc.exe'];
  const rdpProcesses = ['rdpclip.exe', 'mstsc.exe', 'LogonUI.exe'];

  return new Promise((resolve) => {
    // 1. Cek SESSIONNAME env = RDP
    if(process.env.SESSIONNAME && process.env.SESSIONNAME.toLowerCase().includes('rdp')) {
      return resolve(`RDP SESSION DETECTED: ${process.env.SESSIONNAME}`);
    }

    // 2. Cek wmic manufacturer/model
    exec('wmic computersystem get manufacturer,model', {timeout:4000}, (err, stdout) => {
      if(stdout) {
        const out = stdout.toLowerCase();
        for(let vm of bannedVM) {
          if(out.includes(vm.toLowerCase())) {
            // Kecuali Hyper-V di Windows Server yang valid? Kita block semua VM untuk NGPB!
            return resolve(`VM DETECTED: ${vm} (${stdout.trim().substring(0,80)})`);
          }
        }
      }

      // 3. Cek tasklist untuk VM Tools & RDP
      exec('tasklist /FO CSV /NH', {timeout:4000}, (err2, stdout2) => {
        if(stdout2) {
          const lower = stdout2.toLowerCase();
          for(let proc of [...vmProcesses, ...rdpProcesses]) {
            if(lower.includes(proc.toLowerCase())) {
              // rdpclip.exe wajar di RDP, tapi kita block untuk NGPB biar gak bot VPS!
              return resolve(`RDP/VM TOOL DETECTED: ${proc}`);
            }
          }
        }
        resolve(null);
      });
    });
  });
}

// ANTI DEBUG / SANDBOX - ANTI CHEAT ENGINE DEBUG
function detectDebugger() {
  // 1. Check --inspect flag
  if(process.execArgv.join().toLowerCase().includes('--inspect')) {
    return 'DEBUGGER FLAG DETECTED: --inspect';
  }
  // 2. Timing anti-debug (debugger slow down loop)
  const start = Date.now();
  for(let i=0;i<500000;i++){} // busy loop
  const elapsed = Date.now() - start;
  if(elapsed > 150) { // Normal <50ms, debugger >150ms
    return `SANDBOX/DEBUGGER SLOWDOWN DETECTED: ${elapsed}ms`;
  }
  // 3. Check electron isDevTools opened?
  return null;
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    title: 'NGPB Launcher Enterprise v45 - ULTIMATE'
  });

  mainWindow.loadFile('index.html');

  // ANTI DEBUG: Block DevTools
  mainWindow.webContents.on('devtools-opened', () => {
    console.log('[NGPB] DevTools detected! Closing...');
    mainWindow.webContents.closeDevTools();
    dialog.showErrorBox('SECURITY VIOLATION', 'DevTools dilarang di NGPB Enterprise!');
    app.quit();
  });
}

app.whenReady().then(async () => {
  console.log('FORCE START Anti Cheat - Build #45 ULTIMATE - AutoUpdate + AntiVM/RDP + AntiDebug + HWID');

  // 1. HWID LOCK CHECK
  const hwidError = await validateHWID();
  if(hwidError) {
    dialog.showErrorBox('HWID LOCK - NGPB ANTI CHEAT', hwidError);
    app.quit();
    return;
  }

  // 2. ANTI VM/RDP CHECK
  const vmError = await detectVM_RDP();
  if(vmError) {
    console.log('[NGPB SECURITY] BLOCKING -', vmError);
    dialog.showErrorBox('SECURITY VIOLATION - NGPB ANTI CHEAT', `VPS / RDP / VM DETECTED: ${vmError}\n\nNGPB tidak bisa jalan di VPS / RDP / Virtual Machine untuk mencegah botting!\n\nJika ini PC asli, hubungi admin@ngshp.com`);
    app.quit();
    return;
  }

  // 3. ANTI DEBUG CHECK
  const dbgError = detectDebugger();
  if(dbgError) {
    console.log('[NGPB SECURITY] BLOCKING -', dbgError);
    dialog.showErrorBox('SECURITY VIOLATION - NGPB ANTI CHEAT', `DEBUGGER/SANDBOX DETECTED: ${dbgError}\n\nCheat Engine / Debugger dilarang!`);
    app.quit();
    return;
  }

  // 4. ORIGINAL SECURITY MODULE (WPE PRO + System Informer dll)
  if(Security && Security.init) {
    Security.init();
  }

  createWindow();

  // 5. AUTO UPDATER - ULTIMATE FEATURE
  console.log('[NGPB] Init AutoUpdater...');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Cek update 5 detik setelah start
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(e => console.log('[AutoUpdate] Check failed:', e.message));
  }, 5000);

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdate] Checking for update...');
    if(mainWindow) mainWindow.webContents.send('update-status', 'Checking update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[AutoUpdate] Update available! v${info.version}`);
    if(mainWindow) mainWindow.webContents.send('update-status', `Update v${info.version} tersedia, downloading...`);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdate] Up to date!');
  });

  autoUpdater.on('download-progress', (p) => {
    const percent = Math.round(p.percent);
    console.log(`[AutoUpdate] Download ${percent}% - ${Math.round(p.bytesPerSecond/1024)} KB/s`);
    if(mainWindow) mainWindow.webContents.send('update-progress', percent);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[AutoUpdate] Downloaded v${info.version}, ready to install!`);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'NGPB Update Ready! - Build #45+',
      message: `Build baru v${info.version} sudah didownload!\n\nRestart launcher untuk update otomatis?\n\nPlayer gak perlu download manual lagi!`,
      buttons: ['Update Sekarang', 'Nanti Saat Close'],
      defaultId: 0
    }).then(r => {
      if(r.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.log('[AutoUpdate] Error:', err.message);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC for renderer to trigger update check manually
ipcMain.on('check-for-update', () => {
  autoUpdater.checkForUpdatesAndNotify();
});
