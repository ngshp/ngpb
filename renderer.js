// renderer.js - FULL UI LOGIC + DRAGGABLE + SECURITY INDICATOR

const bannerEl = document.getElementById('banner-rotator');
const secIndicator = document.getElementById('sec-indicator');
const playBtn = document.getElementById('play-btn');

let banners = [];
let bannerIdx = 0;

// Window controls
document.getElementById('min-btn').onclick = () => window.ngpb.minimize();
document.getElementById('max-btn').onclick = () => window.ngpb.maximize();
document.getElementById('close-btn').onclick = () => window.ngpb.close();

// Load version.json banners
async function loadBanners() {
  try {
    const res = await fetch('https://ngpb.id/version.json');
    const data = await res.json();
    banners = data.banners || [
      { image: 'assets/banner1.png', title: 'NGPB Season 3 Launch' },
      { image: 'assets/banner2.png', title: 'Enterprise Security Active' }
    ];
    renderBanner();
    setInterval(() => { bannerIdx = (bannerIdx+1)%banners.length; renderBanner(); }, 5000);
  } catch {
    bannerEl.innerHTML = '<div style="display:grid;place-items:center;height:100%;opacity:0.6">NGPB • Welcome Back, Soldier</div>';
  }
}

function renderBanner() {
  if(!banners.length) return;
  const b = banners[bannerIdx];
  bannerEl.innerHTML = `<img src="${b.image}" style="width:100%;height:100%;object-fit:cover"><div style="position:absolute;bottom:12px;left:16px;font-weight:700">${b.title}</div>`;
  bannerEl.style.position='relative';
}

// Security status - turns green when active
async function initSecurity() {
  const scan = await window.ngpb.securityScan();
  if(scan.status === 'clean' && scan.enterprise) {
    secIndicator.classList.add('active');
    document.querySelectorAll('.dot.green').forEach(d=>d.style.background='#22c55e');
  }
}

// Play sequence: security -> manifest -> launch
playBtn.onclick = async () => {
  playBtn.textContent = 'SCANNING...';
  playBtn.disabled = true;
  
  const scan = await window.ngpb.securityScan();
  if(scan.status !== 'clean') {
    alert('Security scan failed: threat detected');
    playBtn.textContent = 'PLAY NGPB';
    playBtn.disabled = false;
    return;
  }
  
  playBtn.textContent = 'VERIFYING FILES...';
  const sig = await window.ngpb.checkSignature('./PointBlank.exe');
  
  if(!sig.valid) {
    alert('File integrity check failed');
    playBtn.textContent = 'PLAY NGPB';
    playBtn.disabled = false;
    return;
  }
  
  playBtn.textContent = 'LAUNCHING...';
  // Launch game exe via main process (handled in main.js)
  setTimeout(() => {
    playBtn.textContent = 'PLAY NGPB';
    playBtn.disabled = false;
  }, 2000);
};

// Init
loadBanners();
initSecurity();
window.ngpb.getVersion().then(v => {
  document.querySelector('.version-text').textContent = `v${v} • Single Instance • Draggable OK • Enterprise`;
});
