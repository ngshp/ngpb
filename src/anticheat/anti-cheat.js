const { exec } = require('child_process');

class AntiCheat {
  constructor() {
    this.blacklist = [
      'WPE PRO.exe', 'cheatengine', 'Process Hacker',
      'x64dbg', 'IDA', 'Wireshark', 'Fiddler'
    ];
    this.detectedCheats = [];
  }

  startMonitoring() {
    setInterval(() => this.scan(), 3000);
    console.log('[AC] XTRAP v3 Enterprise Monitoring Started');
  }

  scan() {
    exec('tasklist', (err, stdout) => {
      if (!stdout) return;
      this.detectedCheats = [];
      this.blacklist.forEach(proc => {
        if (stdout.toLowerCase().includes(proc.toLowerCase())) {
          this.detectedCheats.push(proc);
          console.log(`[AC] BLOCKED: ${proc}`);
          // Log to API
          fetch('https://ngpb.id/api/anticheat/log', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              category: proc,
              process: proc,
              reason: 'Blacklisted process detected'
            })
          }).catch(()=>{});
          // Kill process
          exec(`taskkill /F /IM "${proc}"`);
        }
      });
    });
  }
}

module.exports = AntiCheat;
