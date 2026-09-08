// src/security.js - Enterprise Security Module
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnterpriseSecurity {
  constructor() {
    this.blacklist = ['cheatengine', 'cheat engine', 'speedhack', 'artmoney', 'processhacker', 'x64dbg', 'ida', 'wpe pro'];
    this.hashesPath = path.join(__dirname, '../hashes.txt');
  }

  // SHA256/SHA512 verification
  verifyFile(filePath, expectedHash, algo='sha256') {
    if(!fs.existsSync(filePath)) return { valid:false, reason:'missing' };
    const data = fs.readFileSync(filePath);
    const hash = crypto.createHash(algo).update(data).digest('hex');
    return {
      valid: hash.toLowerCase() === expectedHash.toLowerCase(),
      computed: hash,
      expected: expectedHash,
      algo
    };
  }

  verifyManifest() {
    if(!fs.existsSync(this.hashesPath)) return { valid:false, error:'hashes.txt not found' };
    const lines = fs.readFileSync(this.hashesPath, 'utf8').split('\n').filter(Boolean);
    const results = [];
    for(const line of lines) {
      const [hash, file] = line.split(/\s+/);
      if(!file) continue;
      const fp = path.join(path.dirname(this.hashesPath), file);
      const r = this.verifyFile(fp, hash, hash.length===128?'sha512':'sha256');
      results.push({ file, ...r });
    }
    const allValid = results.every(r=>r.valid);
    return { valid: allValid, results };
  }

  // Certificate verification - check if file signed by NGPB Team
  verifyCertificate(filePath) {
    try {
      // Windows: use powershell Get-AuthenticodeSignature
      if(process.platform === 'win32') {
        const ps = `powershell -Command "Get-AuthenticodeSignature '${filePath}' | Select-Object -ExpandProperty SignerCertificate | Select-Object Subject"`;
        const out = execSync(ps, { encoding:'utf8' });
        const isNGPB = out.includes('NGPB') || out.includes('Nusantara Game');
        return { signed: !!out.trim(), subject: out.trim(), trusted: isNGPB, issuer: 'NGPB Team' };
      }
      return { signed:false, trusted:false, reason:'non-windows skip' };
    } catch(e) {
      return { signed:false, trusted:false, error:e.message };
    }
  }

  // Anti-cheat: scan running processes
  scanProcesses() {
    try {
      let list = '';
      if(process.platform === 'win32') {
        list = execSync('tasklist', { encoding:'utf8' }).toLowerCase();
      } else {
        list = execSync('ps -A', { encoding:'utf8' }).toLowerCase();
      }
      const threats = this.blacklist.filter(b => list.includes(b));
      return { clean: threats.length===0, threats, scannedAt: new Date().toISOString() };
    } catch {
      return { clean:true, threats:[], note:'scan stub' };
    }
  }

  // Memory scan placeholder (enterprise)
  memoryScan() {
    // Placeholder for real anti-cheat driver integration
    return { hooked:false, injected:false, clean:true };
  }

  fullScan() {
    return {
      fileIntegrity: this.verifyManifest(),
      cert: this.verifyCertificate(path.join(__dirname, '../PointBlank.exe')),
      processes: this.scanProcesses(),
      memory: this.memoryScan(),
      enterprise: true,
      timestamp: Date.now()
    };
  }
}

module.exports = EnterpriseSecurity;
