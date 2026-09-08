/**
 * NGPB ENTERPRISE SECURITY v45 ULTIMATE
 * Anti Cheat + Anti RDP/VM + Anti Debug + HWID + WPE PRO Killer
 * Built from HP, Secured like Enterprise
 */

const { exec, execSync } = require('child_process');
const path = require('path');

const CHEAT_PROCESSES = [
  // WPE PRO FAMILY - Build #44 FIXED
  'WPE PRO.exe', 'WPEPRO.exe', 'WPE.exe', 'WPE PRO - modified.exe',
  'wpe pro.exe', 'wpe.exe',
  // CHEAT ENGINE FAMILY - Build #45 ULTIMATE
  'cheatengine-x86_64.exe', 'cheatengine-i386.exe', 'cheatengine.exe',
  'Cheat Engine.exe', 'cheatengine-x86_64-SSE4-AVX2.exe',
  // DEBUGGER FAMILY
  'x64dbg.exe', 'x32dbg.exe', 'x64dbg.dll',
  'ollydbg.exe', 'OllyDbg.exe',
  'ida.exe', 'ida64.exe', 'idaq.exe', 'idaq64.exe',
  'windbg.exe', 'WinDbg.exe',
  'httpdebugger.exe', 'HTTPDebuggerPro.exe',
  'fiddler.exe', 'Fiddler.exe',
  'wireshark.exe', 'Wireshark.exe',
  'artmoney.exe', 'ArtMoney.exe',
  'processhacker.exe', 'ProcessHacker.exe',
  'systeminformer.exe', 'SystemInformer.exe', 'System Informer.exe',
  // VM / RDP TOOLS (Detected via VM module too, double layer)
  'vmtoolsd.exe', 'vboxservice.exe', 'vboxtray.exe'
];

const CHEAT_WINDOWS = [
  'WPE PRO', 'WPE', 'Trace Console', 'WPE PRO - modified',
  'Cheat Engine', 'Cheat Engine 7.',
  'x64dbg', 'x32dbg',
  'OllyDbg',
  'IDA',
  'Process Hacker', 'System Informer',
  'Wireshark', 'Fiddler', 'HTTP Debugger',
  'ArtMoney'
];

let securityInterval = null;
let violationCount = 0;

function showViolation(processName, source) {
  const { dialog, app } = require('electron');
  violationCount++;
  console.log(`[NGPB SECURITY] BLOCKING - Cheat detected: ${processName} | Source: ${source} | Count: ${violationCount}`);

  const { BrowserWindow } = require('electron');
  const wins = BrowserWindow.getAllWindows();
  
  // Kill process via taskkill
  try {
    execSync(`taskkill /F /IM "${processName}" /T`, {timeout:3000});
    console.log(`[NGPB SECURITY] Killed ${processName} via taskkill`);
  } catch(e) {
    // ignore
  }

  // Log to file
  try {
    const fs = require('fs');
    const logPath = path.join(require('electron').app.getPath('userData'), 'security.log');
    fs.appendFileSync(logPath, `${new Date().toISOString()} | BLOCKED | ${processName} | ${source} | Count:${violationCount}\n`);
  } catch(e){}

  // Show popup (only first window)
  if(wins.length > 0) {
    dialog.showMessageBox(wins[0], {
      type: 'error',
      title: 'SECURITY VIOLATION - NGPB ANTI CHEAT',
      message: `CHEAT TOOL DETECTED: ${processName}\n\nSource: ${source}\n\nTool ini dilarang di NGPB untuk mencegah hack & botting.\nViolation: ${violationCount}/3\n\nLauncher akan CLOSE dalam 3 detik.`,
      buttons: ['OK']
    }).then(() => {
      setTimeout(() => {
        require('electron').app.quit();
      }, 1000);
    });
  } else {
    setTimeout(() => {
      require('electron').app.quit();
    }, 3000);
  }

  // Auto quit after 3 sec
  setTimeout(() => {
    require('electron').app.quit();
  }, 3000);
}

function scanProcesses() {
  exec('tasklist /FO CSV /NH', {timeout:4000}, (err, stdout) => {
    if(err || !stdout) return;
    const lower = stdout.toLowerCase();
    for(let cheat of CHEAT_PROCESSES) {
      if(lower.includes(cheat.toLowerCase())) {
        console.log(`Cheat process found in tasklist - ${cheat}`);
        showViolation(cheat, 'tasklist scan');
        return;
      }
    }
  });
}

function scanWindows() {
  // Use powershell to get window titles (more reliable)
  const psCmd = `powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object ProcessName,MainWindowTitle | Format-List"`;
  exec(psCmd, {timeout:5000}, (err, stdout) => {
    if(err || !stdout) return;
    const lower = stdout.toLowerCase();
    for(let winTitle of CHEAT_WINDOWS) {
      if(lower.includes(winTitle.toLowerCase())) {
        // Find actual process name from stdout
        const lines = stdout.split('\n');
        for(let i=0;i<lines.length;i++) {
          if(lines[i].toLowerCase().includes(winTitle.toLowerCase())) {
            // previous line is ProcessName
            const procLine = lines[i-1] || '';
            const match = procLine.match(/ProcessName\s*:\s*(.+)/i);
            const procName = match ? match[1].trim()+'.exe' : winTitle+'.exe';
            console.log(`Cheat window found: ${winTitle} -> ${procName}`);
            showViolation(procName, `Window: ${winTitle}`);
            return;
          }
        }
      }
    }
  });
}

function init() {
  console.log('✅ NodeJS Portable Siap! - Security Module Loaded');
  console.log(`[NGPB SECURITY] Loaded ${CHEAT_PROCESSES.length} banned processes, ${CHEAT_WINDOWS.length} banned windows`);
  console.log('FORCE START Anti Cheat - Build #45 ULTIMATE');
  console.log('ANTI PROCESS HACKER ACTIVE - Monitoring every 2s');

  // Initial scan
  scanProcesses();
  scanWindows();

  // Interval scan every 2 seconds
  if(securityInterval) clearInterval(securityInterval);
  securityInterval = setInterval(() => {
    scanProcesses();
  }, 2000);

  // Window scan every 4 seconds (heavier)
  setInterval(() => {
    scanWindows();
  }, 4000);

  console.log('Security exists: true');
}

function stop() {
  if(securityInterval) {
    clearInterval(securityInterval);
    securityInterval = null;
  }
}

module.exports = { init, stop, CHEAT_PROCESSES, CHEAT_WINDOWS };
