// NGPB Launcher v1.0.53.3 - secure-launcher-waf-extreme.js - WAF Extreme Secure Launcher
// Whitelist IP, Blacklist IP, Whitelist ASN, Blacklist ASN, GET Allow, Hostname Whitelist, HTTP Version, UA Hard Filter, Bot Block, Web Assets Filter

const CONFIG = {
  // === WHITELIST HOSTNAME ===
  HOSTNAMES: ['lr.nhg.one', 'ue.nhg.one', 'dd.nhg.one', 'pa.nhg.one', 'ce.nhg.one', 'se.nhg.one'],
  PANEL_ADMIN: 'panel-admin.nhg.one',

  // === WHITELIST / BLACKLIST IP ===
  IP_WHITELIST: ['127.0.0.1', '::1'], // Add your server IPs: '103.127.132.10'
  IP_BLACKLIST: [], // Auto Geo Ban Israel & PH + manual

  // === WHITELIST / BLACKLIST ASN ===
  ASN_WHITELIST: [13335], // Cloudflare
  ASN_BLACKLIST: [48081, 12849, 8551, 1680, 9116, 9299, 10139, 132199, 9009, 23944], // IL & PH & VPN M247 OVH

  // === METHOD FILTER: GET allow mode filter, Deny semua kecuali whitelist ===
  ALLOWED_METHODS: ['GET'],

  // === HTTP VERSION FILTER MODE: http/1.0, http/1.1, http/2 else drop ===
  ALLOWED_HTTP: ['1.0', '1.1', '2', '2.0', 'h2', '3'],

  // === USER AGENT MODE FILTER HARD ===
  ALLOWED_UA: ['NGPB-Launcher', 'ngpb.exe', 'NG PB Launcher', 'Electron', 'ngpb'],
  BLOCKED_UA: ['curl', 'wget', 'python', 'go-http', 'java', 'libwww', 'perl', 'headless', 'phantomjs', 'selenium', 'puppeteer'],

  // === BOT TRAFFIC: KNOW BOTS BLOKIR / DROP ===
  KNOWN_BOTS: ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'YandexBot', 'Sogou', 'Exabot', 'facebot', 'SemrushBot', 'AhrefsBot', 'MJ12bot', 'DotBot']
};

class SecureLauncherWAF {
  constructor(){
    this.version='v53.3 WAF Extreme - secure-launcher-waf-extreme.js';
    this.config=CONFIG;
  }

  // 1. Whitelist IP Address, Blacklist IP Address
  checkIP(ip){
    if(CONFIG.IP_BLACKLIST.includes(ip)) return {passed:false,reason:`BLACKLIST IP: ${ip} - DROP`};
    return {passed:true,ip};
  }

  // 2. Whitelist ASN, Blacklist ASN
  async checkASN(ip){
    return new Promise((resolve)=>{
      const https=require('https');
      https.get(`http://ip-api.com/json/${ip}?fields=as,status`,(res)=>{
        let d=''; res.on('data',c=>d+=c);
        res.on('end',()=>{
          try{
            const j=JSON.parse(d);
            const asn=parseInt((j.as?.match(/AS(\d+)/)||[])[1]||0);
            if(CONFIG.ASN_BLACKLIST.includes(asn)){
              resolve({passed:false,asn,reason:`BLACKLIST ASN: ${asn} - ${j.as} - Israel/PH/VPN DROP - IP ${ip}`});
            }else{
              resolve({passed:true,asn,as:j.as});
            }
          }catch(e){ resolve({passed:true,note:'ASN offline allow'}); }
        });
      }).on('error',()=>resolve({passed:true,note:'ASN offline'}));
    });
  }

  // 3. Whitelist Hostname: lr.nhg.one core launcher, ue.nhg.one update patch, dd.nhg.one download internal, pa.nhg.one ngpb.exe, ce.nhg.one security internal, se.nhg.one
  checkHostname(hostname){
    const clean=hostname.replace(/^https?:\/\//,'').split('/')[0].split(':')[0].toLowerCase();
    if(clean===CONFIG.PANEL_ADMIN) return {passed:true,hostname:clean,note:'Panel Admin Allow'};
    if(CONFIG.HOSTNAMES.includes(clean)) return {passed:true,hostname:clean};
    return {passed:false,reason:`HOSTNAME NOT WHITELISTED: ${clean} - Only Allow: ${CONFIG.HOSTNAMES.join(', ')} - DROP`,hostname:clean};
  }

  // 4. Request Metode: GET allow mode filter, Deny semua kecuali whitelist
  checkMethod(method){
    const m=method.toUpperCase();
    if(CONFIG.ALLOWED_METHODS.includes(m)) return {passed:true,method:m};
    return {passed:false,reason:`METHOD DENIED: ${m} - Only Allow: ${CONFIG.ALLOWED_METHODS.join(', ')} - DROP all except GET`};
  }

  // 5. HTTP Version Filter Mode: http/1.0, http/1.1, http/2 else drop
  checkHttpVersion(version){
    const v=version.replace('HTTP/','').toLowerCase();
    if(CONFIG.ALLOWED_HTTP.includes(v) || CONFIG.ALLOWED_HTTP.includes(v.replace('h2','2'))){
      return {passed:true,version};
    }
    return {passed:false,reason:`HTTP VERSION DROP: ${version} - Only Allow HTTP/1.0, HTTP/1.1, HTTP/2 - DROP ${version}`};
  }

  // 6. User Agent Mode Filter Hard, Bot Traffic: Know Bots Blokir, Verif Bot Category Mode Filter
  checkUA(ua){
    const l=(ua||'').toLowerCase();
    for(const bot of CONFIG.KNOWN_BOTS){
      if(l.includes(bot.toLowerCase())){
        return {passed:false,reason:`BOT TRAFFIC BLOCKED: Known Bot ${bot} - UA: ${ua} - DROP`,bot};
      }
    }
    for(const bad of CONFIG.BLOCKED_UA){
      if(l.includes(bad)){
        const isAllowed=CONFIG.ALLOWED_UA.some(a=>l.includes(a.toLowerCase()));
        if(!isAllowed) return {passed:false,reason:`UA TOOL BLOCKED: ${bad} in UA ${ua} - Hard Filter DROP`};
      }
    }
    const hasAllowed=CONFIG.ALLOWED_UA.some(a=>l.includes(a.toLowerCase()));
    if(!hasAllowed) return {passed:false,reason:`UA HARD FILTER: Must contain ${CONFIG.ALLOWED_UA.join(' or ')} - Got: ${ua} - DROP`};
    return {passed:true,ua};
  }

  // 7. Web Assets Mode Filter
  checkWebAssets(url,hostCheck){
    const isAsset=url.match(/\.(js|css|png|jpg|jpeg|webp|ico|woff2?|ttf|svg|json)(\?|$)/) || url.includes('/assets/');
    if(isAsset &&!hostCheck.passed){
      return {passed:false,reason:`WEB ASSETS FILTER: Asset ${url} from non-whitelisted host ${hostCheck.hostname} - DROP`};
    }
    return {passed:true};
  }

  // Verif Bot Category Mode Filter
  verifyBotCategory(ua){
    const l=(ua||'').toLowerCase();
    if(l.includes('googlebot')) return {category:'Search Engine',action:'DROP - Known Bot'};
    if(l.includes('semrush')||l.includes('ahrefs')) return {category:'SEO Bot',action:'DROP - Bot Traffic'};
    if(l.includes('ngpb')) return {category:'NGPB Launcher',action:'ALLOW - Whitelist UA'};
    return {category:'Unknown',action:'Check UA Hard Filter'};
  }

  // Full WAF Scan - Secure Launcher
  async fullScan({ip,hostname,method,httpVersion,userAgent,url}){
    const ipC=this.checkIP(ip);
    const asnC=await this.checkASN(ip);
    const hostC=this.checkHostname(hostname);
    const methC=this.checkMethod(method);
    const httpC=this.checkHttpVersion(httpVersion);
    const uaC=this.checkUA(userAgent);
    const assetC=this.checkWebAssets(url||hostname,hostC);
    const all=ipC.passed&&asnC.passed&&hostC.passed&&methC.passed&&httpC.passed&&uaC.passed&&assetC.passed;
    const rs=[];
    if(!ipC.passed) rs.push(ipC.reason);
    if(!asnC.passed) rs.push(asnC.reason);
    if(!hostC.passed) rs.push(hostC.reason);
    if(!methC.passed) rs.push(methC.reason);
    if(!httpC.passed) rs.push(httpC.reason);
    if(!uaC.passed) rs.push(uaC.reason);
    if(!assetC.passed) rs.push(assetC.reason);
    return {passed:all,blocked:all?null:rs.join(' | '),details:{ip:ipC,asn:asnC,hostname:hostC,method:methC,httpVersion:httpC,userAgent:uaC,webAssets:assetC},ip,hostname,method,httpVersion,userAgent,url,timestamp:new Date().toISOString(),version:this.version};
  }
}

module.exports=SecureLauncherWAF;
