// --- 게임 초기 상태 ---
const defaultState = {
  cookies: 0,
  cps: 0,
  baseClickPower: 1,
  feverClicks: 0,
  currentSkin: 'classic',
  items: {
    grandma: { count: 0, cost: 10, cps: 1 },
    factory: { count: 0, cost: 100, cps: 10 },
    spaceship: { count: 0, cost: 500, cps: 50 },
    alien: { count: 0, cost: 2500, cps: 250 },
    alchemy: { count: 0, cost: 10000, cps: 1200 }
  },
  skills: {
    clickUpgrade: { count: 0, cost: 50, power: 1 }
  },
  skins: {
    choco: { unlocked: false, cost: 300, mult: 1.2, emoji: '🍫', name: '🍫 초코칩 쿠키' },
    strawberry: { unlocked: false, cost: 2000, mult: 1.5, emoji: '🍓', name: '🍓 딸기 마카롱' },
    rainbow: { unlocked: false, cost: 15000, mult: 2.0, emoji: '🌈', name: '🌈 무지개 도넛' }
  },
  achievements: {
    cookie1000: false,
    item10: false
  }
};

let state = JSON.parse(JSON.stringify(defaultState));
let isFever = false;
const FEVER_THRESHOLD = 50;

// --- DOM 가져오기 ---
const cookieCountEl = document.getElementById('cookie-count');
const cpsCountEl = document.getElementById('cps-count');
const cookieBtn = document.getElementById('cookie-btn');
const cookieSkinName = document.getElementById('cookie-skin-name');
const feverBar = document.getElementById('fever-bar');
const feverIndicator = document.getElementById('fever-indicator');
const goldenCookie = document.getElementById('golden-cookie');
const achievementBanner = document.getElementById('achievement-banner');

// --- 사운드 효과 (안전장치 포함) ---
let audioCtx = null;
function playSound(freq, duration = 0.1) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Audio Context 비활성화 환경 예외 처리
  }
}

// --- 클릭 배율 계산 ---
function getClickMultiplier() {
  if (state.currentSkin === 'rainbow') return 2.0;
  if (state.currentSkin === 'strawberry') return 1.5;
  if (state.currentSkin === 'choco') return 1.2;
  return 1.0;
}

// --- 업적 체크 ---
function checkAchievements() {
  if (!state.achievements.cookie1000 && state.cookies >= 1000) {
    state.achievements.cookie1000 = true;
    showAchievement("🏆 첫번째 천국: 쿠키 1,000개 달성!");
  }
  
  const totalItems = Object.values(state.items).reduce((acc, cur) => acc + cur.count, 0);
  if (!state.achievements.item10 && totalItems >= 10) {
    state.achievements.item10 = true;
    showAchievement("🏭 기업가: 시설 10개 이상 보유!");
  }
}

function showAchievement(text) {
  achievementBanner.textContent = text;
  achievementBanner.classList.remove('hidden');
  playSound(880, 0.3);
  setTimeout(() => achievementBanner.classList.add('hidden'), 3000);
}

// --- UI 업데이트 ---
function updateUI() {
  cookieCountEl.textContent = `쿠키: ${Math.floor(state.cookies).toLocaleString()}개`;
  cpsCountEl.textContent = `초당 생산량(CPS): ${state.cps.toLocaleString()}`;
  
  // 피버 바
  const feverPercent = isFever ? 100 : (state.feverClicks / FEVER_THRESHOLD) * 100;
  feverBar.style.width = `${feverPercent}%`;

  // 시설 구매 버튼
  for (const key in state.items) {
    const item = state.items[key];
    document.getElementById(`cost-${key}`).textContent = item.cost.toLocaleString();
    document.getElementById(`count-${key}`).textContent = item.count;
    document.getElementById(`buy-${key}`).disabled = state.cookies < item.cost;
  }

  // 스킬 버튼
  for (const key in state.skills) {
    const skill = state.skills[key];
    document.getElementById(`cost-${key}`).textContent = skill.cost.toLocaleString();
    document.getElementById(`count-${key}`).textContent = skill.count;
    document.getElementById(`buy-${key}`).disabled = state.cookies < skill.cost;
  }

  // 쿠키 외형 업그레이드 버튼
  for (const key in state.skins) {
    const skin = state.skins[key];
    const btn = document.getElementById(`buy-skin-${key}`);
    if (skin.unlocked) {
      btn.textContent = state.currentSkin === key ? '장착 중' : '장착';
      btn.disabled = state.currentSkin === key;
    } else {
      btn.textContent = '개발';
      btn.disabled = state.cookies < skin.cost;
    }
  }

  checkAchievements();
}

// --- 쿠키 클릭 이벤트 ---
cookieBtn.addEventListener('click', (e) => {
  const skinMult = getClickMultiplier();
  const feverMult = isFever ? 5 : 1;
  const earned = Math.round(state.baseClickPower * skinMult * feverMult);

  state.cookies += earned;
  playSound(350 + earned * 3);

  // Floating text
  const el = document.createElement('div');
  el.className = 'floating-text';
  el.textContent = `+${earned}`;
  el.style.left = `${e.clientX - cookieBtn.getBoundingClientRect().left - 10}px`;
  el.style.top = `${e.clientY - cookieBtn.getBoundingClientRect().top - 10}px`;
  cookieBtn.parentElement.appendChild(el);
  setTimeout(() => el.remove(), 800);

  if (!isFever) {
    state.feverClicks += (state.currentSkin === 'rainbow') ? 2 : 1;
    if (state.feverClicks >= FEVER_THRESHOLD) triggerFever();
  }

  updateUI();
});

// --- 쿠키 외형 장착/구매 ---
function handleSkin(key) {
  const skin = state.skins[key];
  if (!skin.unlocked && state.cookies >= skin.cost) {
    state.cookies -= skin.cost;
    skin.unlocked = true;
  }
  if (skin.unlocked) {
    state.currentSkin = key;
    cookieBtn.textContent = skin.emoji;
    cookieSkinName.textContent = skin.name;
    playSound(700, 0.2);
  }
  updateUI();
}

document.getElementById('buy-skin-choco').onclick = () => handleSkin('choco');
document.getElementById('buy-skin-strawberry').onclick = () => handleSkin('strawberry');
document.getElementById('buy-skin-rainbow').onclick = () => handleSkin('rainbow');

// --- 피버 및 상점 ---
function triggerFever() {
  isFever = true;
  feverIndicator.classList.remove('hidden');
  setTimeout(() => {
    isFever = false;
    state.feverClicks = 0;
    feverIndicator.classList.add('hidden');
    updateUI();
  }, 5000);
}

function buyItem(key) {
  const item = state.items[key];
  if (state.cookies >= item.cost) {
    state.cookies -= item.cost;
    item.count++;
    state.cps += item.cps;
    item.cost = Math.floor(item.cost * 1.25);
    updateUI();
  }
}

document.getElementById('buy-grandma').onclick = () => buyItem('grandma');
document.getElementById('buy-factory').onclick = () => buyItem('factory');
document.getElementById('buy-spaceship').onclick = () => buyItem('spaceship');
document.getElementById('buy-alien').onclick = () => buyItem('alien');
document.getElementById('buy-alchemy').onclick = () => buyItem('alchemy');

document.getElementById('buy-clickUpgrade').onclick = () => {
  const sk = state.skills.clickUpgrade;
  if (state.cookies >= sk.cost) {
    state.cookies -= sk.cost;
    sk.count++;
    state.baseClickPower += sk.power;
    sk.cost = Math.floor(sk.cost * 1.5);
    updateUI();
  }
};

// 황금 쿠키 미니게임
setInterval(() => {
  if (Math.random() < 0.3 && goldenCookie.classList.contains('hidden')) {
    goldenCookie.style.left = `${Math.random() * (window.innerWidth - 80)}px`;
    goldenCookie.style.top = `${Math.random() * (window.innerHeight - 80)}px`;
    goldenCookie.classList.remove('hidden');
    setTimeout(() => goldenCookie.classList.add('hidden'), 4000);
  }
}, 12000);

goldenCookie.onclick = () => {
  const bonus = Math.max(50, state.cps * 20);
  state.cookies += bonus;
  goldenCookie.classList.add('hidden');
  playSound(1000, 0.3);
  updateUI();
};

// 초당 쿠키 생산 루프
setInterval(() => {
  state.cookies += state.cps;
  updateUI();
}, 1000);

// 데이터 저장 / 불러오기
const SAVE_KEY = 'cookie_v3_save';

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

document.getElementById('save-btn').onclick = () => { saveGame(); alert('저장되었습니다!'); };
document.getElementById('reset-btn').onclick = () => { 
  if (confirm('게임을 완전 초기화할까요?')) {
    localStorage.removeItem(SAVE_KEY); 
    location.reload(); 
  }
};

// 10초 주기 자동 저장
setInterval(saveGame, 10000);

// 안정적인 로드 로직
const saved = localStorage.getItem(SAVE_KEY);
if (saved) {
  try {
    const parsed = JSON.parse(saved);
    state = { ...defaultState, ...parsed };
    if (state.currentSkin !== 'classic' && state.skins[state.currentSkin]) {
      cookieBtn.textContent = state.skins[state.currentSkin].emoji;
      cookieSkinName.textContent = state.skins[state.currentSkin].name;
    }
  } catch (e) {
    console.error('Save load error:', e);
  }
}
updateUI();
