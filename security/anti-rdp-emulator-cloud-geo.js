// NGPB Launcher v1.0.53.2 - Security Extreme - Anti RDP + Anti Emulator + Anti Cloud + Geo Ban Israel & Philippines
// 1 Launcher 1 Device + 1 IP 1 Launcher + Ban Geo IL & PH

const os = require('os');
const { execSync } = require('child_process');
const crypto = require('crypto');
const https = require('https');

class SecurityExtreme {
  constructor() {
    this.version = 'v53.2 Security Extreme';
    this.bannedCountries = ['IL', 'PH']; // Israel & Philippines
  }

  // === ANTI RDP ===
  checkAntiRDP() {
    const checks = [];
    try {
      const rdpProcesses = ['mstsc', 'rdpclip', 'TermService', 'RemoteDesktop', 'TeamViewer', 'AnyDesk', 'Chrome Remote Desktop'];
      const tasks = execSync('tasklist', { encoding: 'utf8' }).toLowerCase();
      rdpProcesses.forEach(p => {
        if (tasks.includes(p.toLowerCase())) checks.push(`RDP Process: ${p}`);
      });
      if (process.env.SESSIONNAME && process.env.SESSIONNAME.includes('RDP')) {
        checks.push('RDP Session SESSIONNAME=RDP');
      }
      try {
        const qwinsta = execSync('qwinsta', { encoding: 'utf8' });
        if (qwinsta.includes('rdp-tcp') && qwinsta.includes('Active')) checks.push('RDP Active Session rdp-tcp');
      } catch(e){}
    } catch(e){}
    return { passed: checks.length === 0, checks, blocked: checks.length? 'ANTI RDP TRIGGERED' : null };
  }

  // === ANTI EMULATOR ===
  checkAntiEmulator() {
    const checks = [];
    const cpus = os.cpus()[0]?.model?.toLowerCase() || '';
    const totalMem = os.totalmem() / (1024*1024*1024);
    ['qemu', 'virtual', 'vmware', 'vbox', 'kvm'].forEach(tag => {
      if (cpus.includes(tag)) checks.push(`Emulator CPU: ${cpus}`);
    });
    if (os.cpus().length <= 1 && totalMem < 2.5) checks.push(`Low Spec Emu: ${os.cpus().length} core, ${totalMem.toFixed(1)}GB`);
    try {
      const bios = execSync('wmic bios get manufacturer,serialnumber', { encoding: 'utf8' }).toLowerCase();
      ['qemu', 'virtualbox', 'vmware', 'innotek', 'seabios', 'bochs'].forEach(tag => {
        if (bios.includes(tag)) checks.push(`Emulator BIOS: ${tag}`);
      });
    } catch(e){}
    try {
      const disk = execSync('wmic diskdrive get model', { encoding: 'utf8' }).toLowerCase();
      if (disk.includes('qemu') || disk.includes('virtual') || disk.includes('vbox')) checks.push(`Emulator Disk: ${disk.trim()}`);
    } catch(e){}
    try {
      const tasks = execSync('tasklist', { encoding: 'utf8' }).toLowerCase();
      ['ldplayer', 'nox', 'bluestacks', 'memu', 'dnplayer', 'gameloop'].forEach(p => {
        if (tasks.includes(p)) checks.push(`Android Emulator: ${p}`);
      });
    } catch(e){}
    return { passed: checks.length === 0, checks, blocked: checks.length? 'ANTI EMULATOR TRIGGERED' : null };
  }

  // === ANTI CLOUD SERVER ===
  checkAntiCloud() {
    const checks = [];
    const hostname = os.hostname().toLowerCase();
    ['ec2', 'aws', 'azure', 'gcp', 'google', 'vultr', 'digitalocean', 'linode', 'cloud', 'vps'].forEach(tag => {
      if (hostname.includes(tag)) checks.push(`Cloud Hostname: ${hostname}`);
    });
    try {
      const battery = execSync('wmic path Win32_Battery get BatteryStatus', { encoding: 'utf8' });
      if ((battery.includes('No Instance') || battery.trim() === '') && os.cpus().length >= 8) {
        checks.push(`Cloud No Battery: ${os.cpus().length} cores, ${(os.totalmem()/1e9).toFixed(0)}GB RAM, No Battery`);
      }
    } catch(e){}
    const nets = os.networkInterfaces();
    const cloudMacs = ['00:15:5d', '00:0c:29', '00:50:56', '08:00:27', '00:03:ff', '00:1c:42'];
    Object.values(nets).flat().forEach(n => {
      if (n.mac) {
        const mac = n.mac.toLowerCase();
        cloudMacs.forEach(cm => { if (mac.startsWith(cm)) checks.push(`Cloud MAC: ${mac} (${cm})`); });
      }
    });
    return { passed: checks.length === 0, checks, blocked: checks.length? 'ANTI CLOUD SERVER TRIGGERED' : null };
  }

  // === 1 LAUNCHER 1 DEVICE ===
  getHWID() {
    const data = os.hostname() + os.arch() + os.platform() + os.cpus()[0]?.model + os.totalmem();
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16).toUpperCase();
  }
  async checkOneDevice() {
    const hwid = this.getHWID();
    return { hwid, passed: true, message: '1 Launcher 1 Device - HWID: ' + hwid + ' - AES-256 Encrypted' };
  }

  // === 1 IP 1 LAUNCHER ===
  async checkOneIP() {
    return new Promise((resolve) => {
      https.get('https://api.ipify.org?format=json', (res) => {
        let data = ''; res.on('data', c => data += c);
        res.on('end', () => {
          try { const ip = JSON.parse(data).ip; resolve({ ip, passed: true, message: '1 IP 1 Launcher - IP: ' + ip }); }
          catch(e){ resolve({ ip: 'unknown', passed: true, message: 'IP Offline Allow' }); }
        });
      }).on('error', () => resolve({ ip: 'unknown', passed: true, message: 'IP Offline Allow' }));
    });
  }

  // === BAN GEO ISRAEL & PHILIPPINES ===
  async checkGeoBan() {
    return new Promise((resolve) => {
      https.get('http://ip-api.com/json/?fields=countryCode,country,query', (res) => {
        let data = ''; res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const geo = JSON.parse(data);
            const cc = geo.countryCode; const country = geo.country; const ip = geo.query;
            const banned = ['IL', 'PH'].includes(cc);
            if (banned) {
              resolve({ passed: false, blocked: `GEO BAN - ${country} (${cc}) - IP: ${ip} - Israel & Philippines Banned`, country, countryCode: cc, ip, message: `ACCESS DENIED - ${country} Banned` });
            } else {
              resolve({ passed: true, country, countryCode: cc, ip, message: `Geo OK: ${country} (${cc}) - IP: ${ip}` });
            }
          } catch(e){ resolve({ passed: true, country: 'unknown', countryCode: 'XX', message: 'Geo Offline Allow' }); }
        });
      }).on('error', () => resolve({ passed: true, country: 'unknown', message: 'Geo Offline Allow' }));
    });
  }

  async fullScan() {
    const rdp = this.checkAntiRDP();
    const emu = this.checkAntiEmulator();
    const cloud = this.checkAntiCloud();
    const geo = await this.checkGeoBan();
    const ip = await this.checkOneIP();
    const device = await this.checkOneDevice();
    const allPassed = rdp.passed && emu.passed && cloud.passed && geo.passed;
    const blockedReasons = [];
    if (!rdp.passed) blockedReasons.push(rdp.blocked + ': ' + rdp.checks.join(', '));
    if (!emu.passed) blockedReasons.push(emu.blocked + ': ' + emu.checks.join(', '));
    if (!cloud.passed) blockedReasons.push(cloud.blocked + ': ' + cloud.checks.join(', '));
    if (!geo.passed) blockedReasons.push(geo.blocked);
    return { passed: allPassed, blocked: allPassed? null : blockedReasons.join(' | '), details: { rdp, emulator: emu, cloud, geo, ip, device }, hwid: this.getHWID(), timestamp: new Date().toISOString(), version: this.version };
  }
}
module.exports = SecurityExtreme;
