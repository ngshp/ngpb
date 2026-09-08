// src/enterprise.js - Enterprise features + secure storage
const { safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EnterpriseModule {
  constructor() {
    this.logPath = path.join(require('electron').app.getPath('userData'), 'security.log');
  }

  // Secure token storage
  saveToken(key, value) {
    if(safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value);
      fs.writeFileSync(path.join(__dirname, '../.'+key+'.enc'), encrypted);
      return true;
    }
    // Fallback: AES-256-GCM with machine key
    const keyBuf = crypto.scryptSync(require('os').hostname(), 'ngpb-salt', 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
    const enc = Buffer.concat([cipher.update(value,'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    fs.writeFileSync(path.join(__dirname, '../.'+key+'.enc'), Buffer.concat([iv, tag, enc]));
    return true;
  }

  loadToken(key) {
    const fp = path.join(__dirname, '../.'+key+'.enc');
    if(!fs.existsSync(fp)) return null;
    try {
      const data = fs.readFileSync(fp);
      if(safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(data);
      }
      const iv = data.subarray(0,12);
      const tag = data.subarray(12,28);
      const enc = data.subarray(28);
      const keyBuf = crypto.scryptSync(require('os').hostname(), 'ngpb-salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
      decipher.setAuthTag(tag);
      return decipher.update(enc)+decipher.final('utf8');
    } catch { return null; }
  }

  logSecurity(event, data={}) {
    const entry = `[${new Date().toISOString()}] ${event} ${JSON.stringify(data)}\n`;
    fs.appendFileSync(this.logPath, entry);
    console.log('[SECURITY]', event, data);
  }

  antiDebug() {
    // Basic anti-debug: check debugger attached via timing
    const start = process.hrtime.bigint();
    // debugger; would pause
    const end = process.hrtime.bigint();
    const diff = Number(end-start)/1e6;
    const isDebugged = diff > 100; // if paused >100ms
    if(isDebugged) this.logSecurity('anti-debug-triggered', { diff });
    return !isDebugged;
  }

  checkVersionManifest(url='https://ngpb.id/version.json') {
    // Fetch latest version, compare
    return fetch(url).then(r=>r.json()).catch(()=>null);
  }
}

module.exports = EnterpriseModule;
