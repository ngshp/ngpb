const { execSync, spawn } = require('child_process');
const { app, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const LOG_FILE = path.join(app.getPath('userData'), 'security.log');
function log(msg) {
  try { fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`); console.log(msg); } catch {}
}

// ===== CONFIG =====
const CHEAT_PROCESSES = [
  'SystemInformer.exe', 'ProcessHacker.exe', 
  'System Informer.exe', 'procexp.exe', 'procexp64.exe',
  'x64dbg.exe', 'x32dbg.exe', 'Cheat Engine.exe', 'cheatengine'
];
const CHEAT_WINDOWS = ['System Informer', 'Process Hacker', 'Cheat Engine', 'x64dbg'];

function killProcess(processName) {
  try {
    // Coba 3 cara kill - user, admin, force
    execSync(`taskkill /F /IM "${processName}" /T 2>nul`, { windowsHide: true });
    log(`✅ Killed ${processName} via taskkill`);
    return true;
  } catch {}
  try {
    execSync(`powershell -Command "Get-Process -Name '${processName.replace('.exe','')}' -ErrorAction SilentlyContinue | Stop-Process -Force"`, { windowsHide: true });
    log(`✅ Killed ${processName} via PowerShell`);
    return true;
  } catch {}
  return false;
}

function isCheatRunning() {
  // Cara 1: tasklist (case insensitive)
  try {
    const list = execSync('tasklist /FO CSV /NH', { encoding: 'utf8', windowsHide: true }).toLowerCase();
    for (const cheat of CHEAT_PROCESSES) {
      if (list.includes(cheat.toLowerCase())) {
        log(`🚨 Cheat process found in tasklist: ${cheat}`);
        return { found: true, name: cheat, method: 'tasklist' };
      }
    }
  } catch (e) { log('tasklist error: ' + e.message); }

  // Cara 2: wmic (bypass admin hide)
  try {
    const wmic = execSync('wmic process get name /FORMAT:CSV', { encoding: 'utf8', windowsHide: true }).toLowerCase();
    for (const cheat of CHEAT_PROCESSES) {
      if (wmic.includes(cheat.toLowerCase())) {
        log(`🚨 Cheat found in wmic: ${cheat}`);
        return { found: true, name: cheat, method: 'wmic' };
      }
    }
  } catch {}

  // Cara 3: Cek Window Title (System Informer selalu ada window)
  try {
    const tasklistV = execSync('tasklist /V /FO CSV /NH', { encoding: 'utf8', windowsHide: true });
    for (const winTitle of CHEAT_WINDOWS) {
      if (tasklistV.toLowerCase().includes(winTitle.toLowerCase())) {
        log(`🚨 Cheat window title found: ${winTitle}`);
        return { found: true, name: winTitle, method: 'window' };
      }
    }
  } catch {}

  return { found: false };
}

function startAntiProcessHacker() {
  // JANGAN SKIP DI PACKAGED - INI YANG BIKIN GAK JALAN KEMARIN!
  const isPackaged = app.isPackaged;
  log(`🛡️ Anti Cheat Start - isPackaged: ${isPackaged} - CI: ${process.env.CI}`);
  
  // Force run kalau di AppData (kayak di Screenshot #15 lu)
  const exePath = app.getPath('exe').toLowerCase();
  const isInProgramFiles = exePath.includes('appdata') || exePath.includes('program files') || isPackaged;
  if (!isInProgramFiles && process.env.CI) {
    log('Skipping anti-cheat - dev mode');
    return;
  }

  log('🛡️ ANTI PROCESS HACKER ACTIVE - Monitoring every 2s');

  const blockAction = (cheatName) => {
    const allWindows = BrowserWindow.getAllWindows();
    const mainWin = allWindows[0];
    
    log(`🚫 BLOCKING - Cheat detected: ${cheatName}`);

    // Kill dulu
    killProcess(cheatName);
    // Coba kill semua varian
    CHEAT_PROCESSES.forEach(p => killProcess(p));

    if (mainWin && !mainWin.isDestroyed()) {
      try {
        mainWin.webContents.send('security-violation', { cheat: cheatName });
        mainWin.setAlwaysOnTop(true);
      } catch {}
    }

    dialog.showErrorBox(
      'SECURITY VIOLATION - NGPB ANTI CHEAT',
      `CHEAT TOOL DETECTED: ${cheatName}\n\nTool ini dilarang di NGPB untuk mencegah hack & botting.\n\nLauncher akan CLOSE dalam 3 detik.\nTutup ${cheatName} dulu baru buka lagi.\n\nLog: ${LOG_FILE}`
    );
    
    setTimeout(() => {
      app.quit();
      process.exit(1);
    }, 3000);
  };

  // Check instant pas start
  const firstCheck = isCheatRunning();
  if (firstCheck.found) {
    blockAction(firstCheck.name);
    return;
  }

  // Monitor loop tiap 2 detik - AGRESIF!
  setInterval(() => {
    const check = isCheatRunning();
    if (check.found) {
      blockAction(check.name);
    }
  }, 2000);
}

function startAntiRDP(mainWindow) {
  // (Anti RDP code kemarin tetep pake yang ini Bos)
  log('🛡️ Anti RDP check');
  // ... (paste anti RDP kemarin kalau mau)
}

module.exports = { startAntiProcessHacker, startAntiRDP };
