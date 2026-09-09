const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { exec, execSync } = require('child_process');
const crypto = require('crypto');
const https = require('https');

let Security = {};
try {
  const sp = path.join(__dirname, 'src', 'security.js');
  if(fs.existsSync(sp)) Security = require(sp);
} catch(e){}

let SecurityExtreme, WAFExtreme;
try {
  if(fs.existsSync(path.join(__dirname, 'security', 'anti-rdp-emulator-cloud-geo.js'))) SecurityExtreme = require('./security/anti-rdp-emulator-cloud-geo');
  if(fs.existsSync(path.join(__dirname, 'security', 'ng-pb-security-extream.js'))) WAFExtreme = require('./security/ng-pb-security-extream');
} catch(e){}

const WAF_CONFIG = {
  HOSTNAMES: ['lr.nhg.one','ue.nhg.one','dd.nhg.one','pa.nhg.one','ce.nhg.one','se.nhg.one','panel-admin.nhg.one'],
  ASN_BLACKLIST: [48081,12849,8551,1680,9116,9299,10139,132199,9009,23944],
  ALLOWED_METHODS: ['GET'],
  ALLOWED_HTTP: ['1.0','1.1','2','2.0','h2','3'],
  ALLOWED_UA: ['NGPB-Launcher','ngpb.exe','NG PB Launcher','Electron','ngpb'],
  KNOWN_BOTS: ['Googlebot','Bingbot','SemrushBot','AhrefsBot','curl','wget','python','bot','crawler','spider','headless','phantomjs','selenium']
};

async function getHWID() {
  try {
    const cpu = execSync('wmic cpu get ProcessorId',{timeout:5000}).toString().split('\n')[1].trim();
    const disk = execSync('wmic diskdrive get SerialNumber',{timeout:5000}).toString().split('\n')[1].trim();
    const board = execSync('wmic baseboard get SerialNumber',{timeout:5000}).toString().split('\n')[1].trim();
    const raw = `${cpu}-${disk}-${board}-${require('os').arch()}-${require('os').totalmem()}-${require('os').hostname()}-NGPB-2026-53.3`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0,16).toUpperCase();
  } catch(e){
    try {
      const raw2 = require('os').hostname()+require('os').arch()+require('os').platform()+require('os').cpus()[0]?.model+require('os').totalmem();
      return crypto.createHash('sha256').update(raw2).digest('hex').substring(0,16).toUpperCase();
    } catch(e2){ return 'UNKNOWN-'+crypto.randomBytes(4).toString('hex').toUpperCase(); }
  }
}

async function validateHWID() {
  const hwid = await getHWID();
  const hwidFile = path.join(app.getPath('userData'),'hwid.lock');
  try {
    if(!fs.existsSync(hwidFile)){ fs.writeFileSync(hwidFile,hwid); return null; }
    const locked = fs.readFileSync(hwidFile,'utf8').trim();
    if(locked!==hwid && locked!=='' &&!locked.includes('UNKNOWN') && locked.length>=8){
      return `HWID MISMATCH!\nPC Lock: ${locked}\nPC Now: ${hwid}\n1 License = 1 PC!\nContact admin@ngshp.com`;
    }
  } catch(e){}
  return null;
}

async function detectVM_RDP() {
  const bannedVM = ['VMware','VirtualBox','QEMU','Virtual Machine','Hyper-V','KVM','Xen','innotek','Bochs'];
  const vmProcs = ['vmtoolsd.exe','vboxservice.exe','vboxtray.exe','vmwaretray.exe','vmwareuser.exe','qemu-ga.exe'];
  const rdpProcs = ['rdpclip.exe','mstsc.exe','LogonUI.exe','TeamViewer.exe','AnyDesk.exe'];
  return new Promise((resolve)=>{
    if(process.env.SESSIONNAME && process.env.SESSIONNAME.toLowerCase().includes('rdp')) return resolve(`RDP SESSION: ${process.env.SESSIONNAME}`);
    exec('wmic computersystem get manufacturer,model',{timeout:4000},(err,stdout)=>{
      if(stdout){ const out=stdout.toLowerCase(); for(let vm of bannedVM){ if(out.includes(vm.toLowerCase())) return resolve(`VM DETECTED: ${vm}`); } }
      exec('tasklist /FO CSV /NH',{timeout:4000},(err2,stdout2)=>{
        if(stdout2){ const lower=stdout2.toLowerCase(); for(let proc of [...vmProcs,...rdpProcs]){ if(lower.includes(proc.toLowerCase())) return resolve(`RDP/VM TOOL: ${proc}`); } }
        resolve(null);
      });
    });
  });
}

async function detectCloud_Geo_WAF() {
  return new Promise((resolve)=>{
    https.get('http://ip-api.com/json/?fields=countryCode,country,query,as',{timeout:4000},(res)=>{
      let data=''; res.on('data',c=>data+=c);
      res.on('end',()=>{
        try{
          const geo=JSON.parse(data);
          const cc=geo.countryCode; const country=geo.country; const ip=geo.query; const as=geo.as||''; const asn=parseInt((as.match(/AS(\d+)/)||[])[1]||0);
          if(['IL','PH'].includes(cc)) return resolve(`GEO BAN - ${country} (${cc}) - IP: ${ip} - Israel & Philippines Banned`);
          if(WAF_CONFIG.ASN_BLACKLIST.includes(asn)) return resolve(`BLACKLIST ASN: ${asn} - ${as} - IP: ${ip} - Israel/PH/VPN DROP`);
          console.log(`[WAF] Geo OK: ${country} (${cc}) IP:${ip} ASN:${asn} Hosts:${WAF_CONFIG.HOSTNAMES.join(',')}`);
          resolve(null);
        }catch(e){ resolve(null); }
      });
    }).on('error',()=>resolve(null));
  });
}

function detectDebugger(){
  if(process.execArgv.join().toLowerCase().includes('--inspect')) return 'DEBUGGER FLAG: --inspect';
  const start=Date.now(); for(let i=0;i<500000;i++){} const elapsed=Date.now()-start;
  if(elapsed>150) return `SANDBOX/DEBUGGER SLOWDOWN: ${elapsed}ms`;
  return null;
}

let mainWindow;
function createWindow(){
  mainWindow = new BrowserWindow({
    width:1100,height:700,
    icon:path.join(__dirname,'assets','icon.ico'),
    webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true},
    autoHideMenuBar:true,
    title:'NGPB Launcher Enterprise v53.3 - WAF EXTREME ULTIMATE'
  });
  mainWindow.loadFile('index.html');
  mainWindow.webContents.on('devtools-opened',()=>{
    mainWindow.webContents.closeDevTools();
    dialog.showErrorBox('SECURITY VIOLATION - WAF EXTREME','DevTools dilarang!');
    app.quit();
  });
}

app.whenReady().then(async()=>{
  console.log('FORCE START Anti Cheat - Build #53.3 WAF EXTREME ULTIMATE');
  const hwidError = await validateHWID();
  if(hwidError){ dialog.showErrorBox('HWID LOCK - 1 Launcher 1 Device',hwidError); app.quit(); return; }
  const vmError = await detectVM_RDP();
  if(vmError){ dialog.showErrorBox('SECURITY VIOLATION - Anti RDP/VM',`VPS/RDP/VM DETECTED: ${vmError}\nNGPB tidak bisa jalan di VPS/RDP/VM!`); app.quit(); return; }
  const cloudGeoError = await detectCloud_Geo_WAF();
  if(cloudGeoError){ dialog.showErrorBox('SECURITY VIOLATION - Geo Ban + ASN Blacklist',`${cloudGeoError}\nBanned: Israel & Philippines\nWhitelist Host: ${WAF_CONFIG.HOSTNAMES.join(', ')}`); app.quit(); return; }
  const dbgError = detectDebugger();
  if(dbgError){ dialog.showErrorBox('SECURITY VIOLATION - Anti Debug',`DEBUGGER/SANDBOX: ${dbgError}\nCheat Engine dilarang!`); app.quit(); return; }
  if(Security && Security.init) Security.init();
  if(SecurityExtreme){
    try{ const secExt=new SecurityExtreme(); const scan=await secExt.fullScan(); console.log('[SecurityExtreme]',scan.passed?'PASSED':'BLOCKED '+scan.blocked); if(!scan.passed){ dialog.showErrorBox('SECURITY EXTREME BLOCKED',scan.blocked+`\nHWID: ${scan.hwid}`); app.quit(); return; } }catch(e){}
  }
  createWindow();
  console.log('[NGPB] Init AutoUpdater v53.3');
  autoUpdater.autoDownload=true; autoUpdater.autoInstallOnAppQuit=true;
  setTimeout(()=>{ autoUpdater.checkForUpdatesAndNotify().catch(e=>console.log('[AutoUpdate]',e.message)); },5000);
  autoUpdater.on('checking-for-update',()=>{ if(mainWindow) mainWindow.webContents.send('update-status','Checking update...'); });
  autoUpdater.on('update-available',(info)=>{ if(mainWindow) mainWindow.webContents.send('update-status',`Update v${info.version} tersedia`); });
  autoUpdater.on('download-progress',(p)=>{ if(mainWindow) mainWindow.webContents.send('update-progress',Math.round(p.percent)); });
  autoUpdater.on('update-downloaded',(info)=>{
    dialog.showMessageBox(mainWindow,{
      type:'info',
      title:`NGPB Update Ready! - Build #53.3 WAF Extreme`,
      message:`Build baru v${info.version} didownload!\nRestart untuk update?\nSecure: ${WAF_CONFIG.HOSTNAMES.join(', ')}`,
      buttons:['Update Sekarang','Nanti'],
      defaultId:0
    }).then(r=>{ if(r.response===0) autoUpdater.quitAndInstall(false,true); });
  });
  app.on('activate',()=>{ if(BrowserWindow.getAllWindows().length===0) createWindow(); });
});

app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });
ipcMain.on('check-for-update',()=>{ autoUpdater.checkForUpdatesAndNotify(); });
ipcMain.handle('get-waf-config',()=>WAF_CONFIG);
ipcMain.handle('get-security-extreme',async()=>{
  if(SecurityExtreme){ const sec=new SecurityExtreme(); return await sec.fullScan(); }
  return {passed:true,hwid:await getHWID()};
});
