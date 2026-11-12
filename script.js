// ===== 도화지와 붓 가져오기 =====
const canvas = document.getElementById("game"); // 이름이 "game"인 도화지를 찾는다
const ctx = canvas.getContext("2d");            // 그 도화지에 그릴 "붓"을 가져온다

const W = canvas.width;   // 720
const H = canvas.height;  // 1280
const WALL_Y = 1060;      // 성벽 앞쪽 가장자리 y. 괴수가 여기까지 내려온다

// =====================================================
// 이미지 불러오기
// =====================================================
const images = {
  background: "images/background.png", // 협곡 바닥, 햇빛, 절벽
  wall: "images/wall.png",             // 성벽 (병사는 코드로 그린다)
  vignette: "images/vignette.png",     // 화면 테두리와 협곡 입구의 어둠
  commander: "images/commander.png",   // 사령관 + 주변의 성물 빛
  grunt: "images/grunt.png",           // 굶주린 무리
  brute: "images/brute.png",           // 갑각 짐승
  essence: "images/essence.png",       // 정수
};

// 이미지마다 "발밑(기준점)이 그림 안의 어디에 있는지". 그릴 때 이만큼 빼서 놓는다
const FOOT = {
  commander: { x: 170, y: 200 },
  grunt: { x: 40, y: 66 },
  brute: { x: 70, y: 114 },
  essence: { x: 24, y: 24 },
};

// =====================================================
// 작은 계산 도우미
// =====================================================
const rand = (a, b) => a + Math.random() * (b - a);              // a~b 사이 아무 수
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);          // v를 a~b 안으로 가둔다
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);   // 두 점 사이 거리 (피타고라스)
function angleDiff(a, b) {                                       // 두 각도가 얼마나 벌어졌는가 (0 ~ π)
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}
function shuffle(arr) {                                          // 배열 순서를 무작위로 섞은 복사본
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// =====================================================
// 사령관 기본값. 특전으로 강해지는 값들이라 게임이 시작될 때 player에 복사해서 쓴다
// 속도는 "1초에 움직이는 픽셀 수"다
// =====================================================
const PLAYER = {
  r: 18,            // 몸 반지름 (충돌 판정용 원)
  speed: 250,       // 이동 속도 (픽셀/초)
  atkDmg: 22,       // 베기 피해
  atkRange: 96,     // 베기가 닿는 거리
  atkHalf: 0.95,    // 베기 부채꼴의 절반 각도 (라디안)
  atkCd: 0.38,      // 베기 간격(초). 마우스를 누르고 있으면 이 간격으로 계속 벤다
  dashCd: 1.3,      // 대시 재사용 대기(초)
  dashTime: 0.16,   // 대시가 이어지는 시간(초)
  dashSpeed: 950,   // 대시 속도 (픽셀/초)
  dashInvuln: 0.22, // 대시 중 무적 시간(초)
  magnet: 110,      // 정수를 끌어당기는 거리
  maxHp: 100,       // 체력. 0이 되면 쓰러졌다가 downTime초 뒤 성벽 앞에서 다시 일어난다
  downTime: 4,
};

// 사령관과 괴수가 움직일 수 있는 범위 (양옆 절벽 안쪽)
const FIELD = { left: 96, right: 624 };

// =====================================================
// 웨이브와 휴식 (6장 + 이번 주)
// 웨이브마다 나올 괴수가 정해져 있고, 다 잡으면 휴식 시간에 병사를 배치한다
// =====================================================
const LAST_WAVE = 15;
const FIRST_BREAK = 12;     // 1웨이브 전 전열 정비 시간(초)
const BREAK_TIME = 8;       // 웨이브 사이 숨 고르기(초)
const PREP_TIME = 30;       // 5·10웨이브 뒤 정비 시간(초). 상점이 열린다
const START_ESSENCE = 30;   // 처음 가진 정수
const EATER_FROM_WAVE = 6;  // 정수 포식자는 이 웨이브부터 나온다
const REAPER_FROM_WAVE = 3; // 포식수는 이 웨이브부터 나온다

const WAVE_TITLES = [
  "굶주린 무리가 협곡을 내려온다", "발 빠른 것들이 섞여 있다", "바람에 산성 냄새가 실려 온다",
  "갑각이 협곡 벽을 긁는다", "협곡이 울린다", "버려진 무리가 다시 몰려온다",
  "떠밀린 것들이 성벽을 노린다", "협곡 입구가 검게 물든다", "살아남은 강자들이 움직인다",
  "배고픈 울음이 가까워진다", "왕의 그림자 아래 무리가 모인다", "협곡 전체가 숨을 죽인다",
  "버림받은 것들의 마지막 돌격", "대지가 왕의 발걸음에 떨린다", "괴수왕",
];

// 괴수 종류별 값
// r = 몸 반지름, hp = 체력, mass = 무게(무거울수록 덜 밀린다), wallDmg = 성벽에 닿으면 깎는 체력, xp = 경험치
// aggro = 사령관이 이 거리 안에 들어오면 성벽 대신 사령관을 쫓아가 공격한다. dmg = 사령관에게 주는 피해, atkCd = 공격 간격(초)
// shield = 보호막. 남아 있는 동안 원거리 공격(병사)에 면역이고, 근접 공격은 보호막부터 깎는다
// 굶주린 무리와 갑각 짐승의 speed는 "한 프레임에 내려가는 픽셀", 정수 포식자 계열은 "1초에 움직이는 픽셀"
const MONSTER_TYPES = {
  grunt:   { r: 16, hp: 30,  mass: 1,  speedMin: 0.8, speedMax: 1.3, wallDmg: 50,  drop: 1, xp: 1, aggro: 130, dmg: 6,  atkCd: 1.0 },
  brute:   { r: 36, hp: 120, shield: 30, mass: 4, speed: 1.4,      wallDmg: 150, drop: 4, xp: 5, aggro: 110, dmg: 18, atkCd: 1.6 },
  eater:   { r: 15, hp: 40,  mass: 0.8, speed: 90,                 wallDmg: 50,  drop: 2, xp: 3 },
  reaper:  { r: 18, hp: 60,  mass: 1.5, speed: 120,                wallDmg: 0,   drop: 3, xp: 6, dmg: 20, atkCd: 3 },
  crystal: { r: 46, hp: 280, shield: 90, mass: 12, speed: 40, dmg: 24, atkCd: 1.4, wallDmg: 250, drop: 10, xp: 20 },
};

// 정수 포식자와 진화형(결정 포식수)
const EAT = {
  evolveAt: 5,          // 정수를 이만큼 먹으면 진화한다
  evolveTime: 1.5,      // 진화하는 동안 웅크린 채 무방비로 멈춰 있는 시간(초)
  shieldPerEssence: 30, // 결정 포식수가 정수 하나를 먹으면 회복하는 보호막
  beamCd: 6, beamCharge: 1.5, beamLock: 0.45,
  beamDmg: 40,          // 사령관이 맞았을 때 피해
  beamWallRatio: 1 / 3, // 빗나가서 성벽에 닿으면 성벽 최대 체력의 1/3
};

// 포식수 — 붉은 괴수. 성벽에는 관심이 없고, 체력이 낮아진 일반 괴수(굶주린 무리, 갑각 짐승)를 찾아가
// "수확"으로 마무리해 잡아먹는다. 먹을 때마다 수확 피해, 몸집, 체력이 오른다.
// 수확 3스택부터는 사령관도 공격한다. 단, 수확으로 마무리할 대상이 있으면 그쪽이 먼저다
const REAPER = {
  targetHp: 20,     // 체력이 이 값 이하인 일반 괴수를 노린다
  reach: 22,        // 수확이 닿는 거리 (몸끼리 닿은 뒤 이만큼 더)
  growDmg: 4,       // 먹을 때마다 수확 피해 증가
  growR: 3,         // 먹을 때마다 몸집(반지름) 증가
  growHp: 15,       // 먹을 때마다 최대 체력 증가 (그만큼 회복도 한다)
  angerStacks: 3,   // 이만큼 쌓이면 사령관을 공격하기 시작한다
  hoverY: 420,      // 할 일이 없을 때 머무는 높이
};

// 갑각 짐승의 묵직한 걸음 (4장)
const STEP_FRAMES = 80;
const STEP_MOVE = 28;

// =====================================================
// 병사 (이번 주) — 성벽 위 빈자리에 정수를 내고 배치한다. 같은 자리를 다시 누르면 강화 (최대 3단계)
// 병사의 공격은 원거리라 보호막이 있는 괴수에게는 막힌다
// =====================================================
const SOLDIERS = {
  archer:   { name: "궁수", cost: 15, range: 430, dmg: 9,  cd: 0.8, speed: 760, pierce: 1 },  // 빠르게 쏘는 한 발
  ballista: { name: "노포", cost: 35, range: 540, dmg: 32, cd: 2.3, speed: 980, pierce: 4 },  // 느리지만 강하고 4마리 관통
};
const SLOT_X = [138, 234, 330, 426, 522, 618];  // 흉벽 톱니 사이 빈자리
const SLOT_UNLOCK_ORDER = [2, 3, 1, 4, 0, 5];   // 가운데 자리부터 열린다
const START_SLOTS = 2;                          // 처음 열려 있는 자리 수
const SOLDIER_SCALE = 2;                        // 병사 그림 크기 배율 (사령관 키의 75% 정도)
const SOLDIER_FOOT_Y = 1112;                    // 병사 발밑 y. 성벽 윗면 통로(1060~1100)를 밟고 선다

// 정비 시간 상점
const SHOP = [
  { name: "성벽 수리", desc: "성벽 +250", cost: () => 20,
    can: () => wallHp < WALL_MAX, buy: () => { wallHp = Math.min(WALL_MAX, wallHp + 250); } },
  { name: "사령관 회복", desc: "체력 전부 회복", cost: () => 10,
    can: () => player.downed <= 0 && player.hp < player.maxHp, buy: () => { player.hp = player.maxHp; } },
  { name: "병사 훈련", desc: "병사 피해 +20%", cost: () => 35 + trainCount * 15,
    can: () => true, buy: () => { soldierDmgMul *= 1.2; trainCount++; } },
  { name: "자리 확장", desc: "병사 자리 +1", cost: () => 40,
    can: () => !!nextLockedSlot(), buy: () => { nextLockedSlot().unlocked = true; } },
];

// =====================================================
// 스킬과 레벨업 특전 (이번 주) — 괴수를 쓰러뜨려 경험치를 모으면 레벨업, 특전 셋 중 하나를 고른다
// =====================================================
const SKILLS = {
  harvest: { name: "수확",   cd: 5, dmg: 30, radius: 170, desc: "괴수 하나를 크게 벤다. 이 스킬로 처치하면 피해 +4" },
  roar:    { name: "포효",   cd: 4, dmg: 25, radius: 210, desc: "파동으로 피해를 주고 맞은 적을 둔화시킨다" },
  frenzy:  { name: "광폭화", cd: 5, duration: 5,          desc: "5초간 기본 공격의 피해, 속도, 범위 +15%" },
};
function hasSkill(p, id) { return p.skills.some(sk => sk && sk.id === id); }
function freeSlot(p) { return p.skills.indexOf(null); }
function hasAnySkill(p) { return p.skills.some(Boolean); }

// available이 있는 특전은 조건을 만족할 때만 선택지에 나온다
const PERKS = [
  { name: "중검식", desc: "기본 공격 피해 +15%", apply: p => { p.atkDmg *= 1.15; } },
  { name: "쾌검식", desc: "기본 공격 속도 +15%", apply: p => { p.atkCd /= 1.15; } },
  { name: "유검식", desc: "기본 공격 범위와 각도 증가", apply: p => { p.atkRange *= 1.12; p.atkHalf = Math.min(p.atkHalf + 0.12, 1.6); } },
  { name: "스킬 숙련", desc: "모든 스킬 재사용 대기 -15%", available: hasAnySkill, apply: p => { p.skillCdMul *= 0.85; } },
  { name: "스킬 위력", desc: "모든 스킬 피해 +20%", available: hasAnySkill, apply: p => { p.skillDmgMul *= 1.2; } },
  { name: "질풍", desc: "이동 속도 +12%", apply: p => { p.speed *= 1.12; } },
  { name: "강철 피부", desc: "최대 체력 +25, 체력 전부 회복", apply: p => { p.maxHp += 25; p.hp = p.maxHp; } },
  { name: "포식자의 피", desc: "괴수를 쓰러뜨릴 때마다 체력 2 회복", apply: p => { p.healOnKill += 2; } },
  { name: "수집가", desc: "정수 끌어당기는 범위 +40%", apply: p => { p.magnet *= 1.4; } },
  { name: "돌파", desc: "대시 재사용 -25%", apply: p => { p.dashCd *= 0.75; } },
];
for (const id of Object.keys(SKILLS)) {   // 스킬 습득도 특전 중 하나로 나온다 (빈 슬롯이 있을 때만)
  PERKS.push({
    name: `스킬 습득: ${SKILLS[id].name}`, desc: SKILLS[id].desc, skill: true,
    available: p => freeSlot(p) >= 0 && !hasSkill(p, id),
    apply: p => { p.skills[freeSlot(p)] = { id, timer: 0 }; },
  });
}

const COLOR = { beast: "#10151d", essence: "#8fd8ff", shield: "#c9d6e6", blood: "#b8483e", gold: "#d4a03a", ink: "#e9e4d6" };
const FONT = '"Gowun Batang", serif';

const showHitbox = false;    // true로 바꾸면 충돌 판정에 쓰는 원과 베기 범위가 빨간 선으로 보인다

// =====================================================
// 게임 상태 (계속 바뀌는 값들). 처음 값은 resetGame()에서 넣는다
// gameState: "break"(휴식) / "prep"(정비 시간) / "playing"(웨이브 진행) / "levelup"(특전 고르기)
//            / "gameover"(성벽 붕괴) / "victory"(15웨이브 돌파)
// =====================================================
let gameState = "break";
let resumeState = "playing";  // 특전을 고른 뒤 돌아갈 상태

let player;                   // 사령관 (위치, 체력, 특전으로 바뀐 능력치, 스킬 슬롯)
let monsters = [];            // 괴수들
let pickups = [];             // 바닥에 떨어진 정수들
let projectiles = [];         // 병사가 쏜 화살과 노포
let effects = [];             // 베기 궤적, 대시 잔상, 떠오르는 글자 같은 연출
let slots = [];               // 성벽 위 병사 자리: { x, unlocked, soldier }

let wallHp;
const WALL_MAX = 1000;
let essenceCount;             // 모은 정수
let kills;                    // 처치한 괴수 수 = 점수
let wave;                     // 지금(또는 다음) 웨이브
let waveQueue = [];           // 이번 웨이브에 남은 등장 예정 괴수: { type, t, x }
let waveTime = 0;             // 이번 웨이브가 시작된 뒤 흐른 시간(초)
let breakTimer = 0;           // 휴식이 끝나기까지 남은 시간(초)
let banner = null;            // 화면 위에 잠깐 뜨는 웨이브 제목

let level, xp, xpNext, pendingLevelUps;  // 레벨과 경험치
let perkChoices = null;                  // 지금 고를 수 있는 특전 셋
let selectedSoldier = "archer";          // 휴식 중 배치할 병사 종류
let soldierDmgMul, trainCount;           // 병사 훈련 상태

let startTime, survived = 0;  // 버틴 시간(초)
let frame = 0;                // 지나간 프레임 수 (갑각 짐승 걸음용)
let shake = 0;                // 화면 흔들림 세기
let hitstop = 0;              // 0보다 크면 그 시간 동안 화면이 멈춘다 (타격감)

// 햇빛 속을 천천히 떠다니는 먼지 (장식이라 재시작해도 그대로 둔다)
let dust = [];
for (let i = 0; i < 30; i++) {
  dust.push({ x: 240 + Math.random() * 280, y: Math.random() * WALL_Y, speed: 0.15 + Math.random() * 0.3 });
}

// =====================================================
// 처음 상태로 되돌리기 — 게임 시작과 재시작에 쓴다
// =====================================================
function resetGame() {
  player = {
    x: W / 2, y: WALL_Y - 140, aim: -Math.PI / 2, r: PLAYER.r,
    speed: PLAYER.speed, atkDmg: PLAYER.atkDmg, atkRange: PLAYER.atkRange, atkHalf: PLAYER.atkHalf,
    atkCd: PLAYER.atkCd, dashCd: PLAYER.dashCd, magnet: PLAYER.magnet,
    hp: PLAYER.maxHp, maxHp: PLAYER.maxHp, healOnKill: 0,
    skills: [null, null], skillCdMul: 1, skillDmgMul: 1, harvestBonus: 0, frenzy: 0,
    atkTimer: 0, dashTimer: 0, dashTime: 0, dashX: 0, dashY: -1, invuln: 0, downed: 0, flash: 0,
  };
  monsters = [];
  pickups = [];
  projectiles = [];
  effects = [];
  slots = SLOT_X.map(x => ({ x: x, unlocked: false, soldier: null }));
  for (let i = 0; i < START_SLOTS; i++) slots[SLOT_UNLOCK_ORDER[i]].unlocked = true;

  wallHp = WALL_MAX;
  essenceCount = START_ESSENCE;
  kills = 0;
  wave = 0;
  waveQueue = [];
  level = 1; xp = 0; xpNext = 12; pendingLevelUps = 0; perkChoices = null;
  selectedSoldier = "archer";
  soldierDmgMul = 1; trainCount = 0;
  startTime = Date.now();
  survived = 0;
  shake = 0; hitstop = 0;
  dashRequested = false; skillRequested = [false, false];

  gameState = "break";
  breakTimer = FIRST_BREAK;
  banner = { title: "전열을 갖춰라", text: "성벽 위 빈자리를 눌러 병사를 배치한다", t: 0, dur: 3.5 };
}

// =====================================================
// 웨이브 구성: 웨이브마다 "예산"만큼 괴수를 무리 지어 내보낸다
// =====================================================
function buildWave(n) {
  const queue = [];
  let budget = Math.round(12 + n * 6);
  const duration = 22 + n * 1.5;
  const pool = [{ type: "grunt", cost: 1, w: 5 }];
  if (n >= 2) pool.push({ type: "brute", cost: 4, w: 1 + n * 0.1 });
  if (n >= EATER_FROM_WAVE) pool.push({ type: "eater", cost: 3, w: 0.9 });
  if (n >= REAPER_FROM_WAVE) pool.push({ type: "reaper", cost: 4, w: 0.5 });
  const totalW = pool.reduce((s, p) => s + p.w, 0);

  let t = 1.5;
  while (budget > 0) {
    const groupSize = Math.floor(rand(2, 6));
    const gx = rand(FIELD.left + 60, FIELD.right - 60);
    for (let i = 0; i < groupSize && budget > 0; i++) {
      let r = Math.random() * totalW, choice = pool[0];
      for (const p of pool) { r -= p.w; if (r <= 0) { choice = p; break; } }
      budget -= choice.cost;
      queue.push({ type: choice.type, t: t + i * 0.25, x: clamp(gx + rand(-50, 50), FIELD.left + 20, FIELD.right - 20) });
    }
    t += rand(0.6, 1.4) * duration * 4 / (12 + n * 6);
  }
  return queue.sort((a, b) => a.t - b.t);
}

function startNextWave() {
  wave = wave + 1;
  waveQueue = buildWave(wave);
  waveTime = 0;
  gameState = "playing";
  banner = { title: wave === LAST_WAVE ? "최후의 웨이브" : `웨이브 ${wave}`, text: WAVE_TITLES[wave - 1], t: 0, dur: 2.8 };
}

function spawnMonster(type, x, y) {
  const t = MONSTER_TYPES[type];
  const hpMul = 1 + (wave - 1) * 0.09;          // 웨이브가 오를수록 단단해진다
  const speedMul = 1 + (wave - 1) * 0.04;       // 조금씩 빨라진다
  const speed = t.speedMin ? rand(t.speedMin, t.speedMax) : t.speed;
  monsters.push({
    type: type, x: x, y: y, r: t.r, mass: t.mass,
    speed: speed * (t.speedMin || type === "brute" ? speedMul : 1),
    hp: t.hp * hpMul, maxHp: t.hp * hpMul,
    shield: (t.shield || 0) * hpMul, maxShield: (t.shield || 0) * hpMul,
    kvx: 0, kvy: 0, flash: 0, slow: 0, deflectT: 0, dead: false,
    eaten: 0, stacks: 0, harvestDmg: t.dmg || 0, evolving: 0, beamCd: EAT.beamCd, charge: 0, stagger: 0, aimX: 0, aimY: 1, atkTimer: rand(0, t.atkCd || 1),
  });
}

// =====================================================
// 입력 — 이벤트는 "기록만" 하고, 움직이는 건 게임 루프가 한다 (5장 방식 B)
// =====================================================
const keys = {};
let dashRequested = false;
let skillRequested = [false, false];
let mouseDown = false;
let mouseX = 400, mouseY = 400;
let buttons = [];     // 이번 프레임에 그려진 버튼들 (클릭 판정용)

document.addEventListener("keydown", function (e) {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
  if (e.repeat) return;
  if (e.key === " " || e.key === "Shift") dashRequested = true;
  if (e.key === "q" || e.key === "Q") skillRequested[0] = true;
  if (e.key === "e" || e.key === "E") skillRequested[1] = true;

  // 특전 고르기: 1, 2, 3 키로도 고를 수 있다
  if (gameState === "levelup" && ["1", "2", "3"].includes(e.key)) choosePerk(perkChoices[Number(e.key) - 1]);

  // 게임이 끝났으면 R 키로 다시 시작
  if ((gameState === "gameover" || gameState === "victory") && (e.key === "r" || e.key === "R")) resetGame();
});
document.addEventListener("keyup", function (e) { keys[e.key] = false; });

function toCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}
canvas.addEventListener("mousemove", function (e) {
  const pos = toCanvasPos(e);
  mouseX = pos.x; mouseY = pos.y;
});
canvas.addEventListener("mousedown", function (e) {
  const pos = toCanvasPos(e);
  mouseX = pos.x; mouseY = pos.y;
  // 버튼 위를 눌렀으면 버튼만 누르고 베지 않는다
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
      if (b.enabled !== false) b.onClick();
      return;
    }
  }
  mouseDown = true;
});
window.addEventListener("mouseup", function () { mouseDown = false; });
window.addEventListener("blur", function () {
  for (const k in keys) keys[k] = false;
  mouseDown = false;
});

// =====================================================
// 게임 루프: 지우기 → 계산 → 그리기 → 다음 프레임 예약
// =====================================================
let lastTime = performance.now();

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;

  // ① 지우기
  ctx.clearRect(0, 0, W, H);

  frame = frame + 1;
  const step = frame % STEP_FRAMES;

  // ② 계산하기
  const active = gameState === "playing" || gameState === "break" || gameState === "prep";
  if (active) {
    if (hitstop > 0) hitstop -= dt;
    else update(dt, step);
  }
  for (const d of dust) { d.y = d.y + d.speed; if (d.y > WALL_Y) d.y = 0; }
  if (gameState !== "levelup") {
    for (const e of effects) {
      e.t += dt;
      if (e.kind === "spark") { e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 0.9; e.vy *= 0.9; }
    }
    effects = effects.filter(e => e.t < e.dur);
    if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
  }
  shake = shake * 0.85;

  // ③ 그리기
  buttons = [];
  drawWorld(step);
  drawHUD();
  if (gameState === "break" || gameState === "prep") drawBreakPanel();
  if (gameState === "levelup") drawLevelUp();
  if (gameState === "gameover") drawEnd(false);
  if (gameState === "victory") drawEnd(true);

  // ④ 다음 프레임 예약. 게임이 끝나도 루프는 멈추지 않는다
  requestAnimationFrame(gameLoop);
}

// ---------- 계산 ----------
function update(dt, step) {
  survived = Math.floor((Date.now() - startTime) / 1000);
  updatePlayer(dt);

  // 웨이브 진행: 정해진 시각이 된 괴수를 내보낸다
  if (gameState === "playing") {
    waveTime += dt;
    while (waveQueue.length && waveQueue[0].t <= waveTime) {
      const s = waveQueue.shift();
      spawnMonster(s.type, s.x, -30);
    }
  }

  // 괴수 이동
  for (const m of monsters) {
    m.flash = Math.max(0, m.flash - dt);
    m.slow = Math.max(0, m.slow - dt);
    m.deflectT = Math.max(0, m.deflectT - dt);
    m.x += m.kvx * dt; m.y += m.kvy * dt;          // 넉백
    const decay = Math.exp(-9 * dt);
    m.kvx *= decay; m.kvy *= decay;
    if (m.type === "eater") { updateEater(m, dt); continue; }
    if (m.type === "crystal") { updateCrystal(m, dt); continue; }
    if (m.type === "reaper") { updateReaper(m, dt); continue; }
    updateMelee(m, step, dt);
  }

  separate();
  updateSoldiers(dt);
  updateProjectiles(dt);

  // 괴수가 성벽에 닿으면: 성벽 체력을 깎고 그 괴수는 사라진다
  for (const m of monsters) {
    if (!m.dead && m.type !== "reaper" && m.y >= WALL_Y - 10) {   // 포식수는 성벽을 노리지 않는다
      wallHp = Math.max(0, wallHp - MONSTER_TYPES[m.type].wallDmg);
      shake = Math.max(shake, 8);
      m.dead = true;
    }
  }
  monsters = monsters.filter(m => !m.dead);

  updatePickups(dt);

  // 상태 바꾸기
  if (wallHp <= 0) { gameState = "gameover"; return; }
  if (gameState === "playing" && waveQueue.length === 0 && monsters.length === 0) {
    if (wave >= LAST_WAVE) { gameState = "victory"; return; }
    const prep = wave % 5 === 0;               // 5·10웨이브 뒤에는 정비 시간
    gameState = prep ? "prep" : "break";
    breakTimer = prep ? PREP_TIME : BREAK_TIME;
    if (prep) banner = { title: "정비 시간", text: "정수로 성벽과 병력을 정비하라", t: 0, dur: 2.8 };
  }
  if (gameState === "break" || gameState === "prep") {
    breakTimer -= dt;
    if (breakTimer <= 0) startNextWave();
  }
  if (pendingLevelUps > 0) openLevelUp();
}

// ---------- 굶주린 무리, 갑각 짐승 ----------
// 사령관이 aggro 거리 안에 있으면 쫓아가고, 몸이 닿으면 atkCd초마다 공격한다. 아니면 성벽으로 내려간다
function updateMelee(m, step, dt) {
  const t = MONSTER_TYPES[m.type], p = player;
  const slowMul = m.slow > 0 ? 0.55 : 1;          // 포효에 맞으면 느려진다

  // 이번 프레임에 움직일 거리 (한 프레임에 몇 픽셀)
  let move = m.speed * slowMul;
  if (m.type === "brute") {                       // 갑각 짐승은 한 걸음 내딛는 동안만 움직인다
    if (step >= STEP_MOVE) move = 0;
    if (step === STEP_MOVE && m.y > 0) shake = Math.max(shake, 6);
  }

  m.atkTimer -= dt;
  const d = dist(m.x, m.y, p.x, p.y);
  const chase = p.downed <= 0 && d < t.aggro;

  if (chase) {
    if (d <= m.r + p.r + 6) {                     // 닿았다: 멈춰서 공격
      if (m.atkTimer <= 0) { hurtPlayer(t.dmg, m.x, m.y, 6); m.atkTimer = t.atkCd; }
    } else {                                      // 사령관 쪽으로 다가간다
      m.x += (p.x - m.x) / d * move;
      m.y += (p.y - m.y) / d * move;
    }
  } else {
    m.y += move;                                  // 성벽으로 내려간다
  }
}

// ---------- 사령관 ----------
function updatePlayer(dt) {
  const p = player;
  p.invuln = Math.max(0, p.invuln - dt);
  p.flash = Math.max(0, p.flash - dt);

  if (p.downed > 0) {   // 쓰러져 있으면 아무것도 못 한다
    p.downed -= dt;
    if (p.downed <= 0) {
      p.downed = 0; p.x = W / 2; p.y = WALL_Y - 60;
      p.hp = Math.round(p.maxHp * 0.6); p.invuln = 1.5;
    }
    dashRequested = false; skillRequested = [false, false];
    return;
  }

  p.atkTimer -= dt;
  p.dashTimer -= dt;
  for (const sk of p.skills) if (sk) sk.timer -= dt;
  p.frenzy = Math.max(0, p.frenzy - dt);

  // 이동 방향 (대각선이 빨라지지 않게 길이를 1로 맞춘다)
  const mx = (keys["d"] || keys["D"] || keys["ArrowRight"] ? 1 : 0) - (keys["a"] || keys["A"] || keys["ArrowLeft"] ? 1 : 0);
  const my = (keys["s"] || keys["S"] || keys["ArrowDown"] ? 1 : 0) - (keys["w"] || keys["W"] || keys["ArrowUp"] ? 1 : 0);
  const len = Math.hypot(mx, my) || 1;
  const moveX = mx / len, moveY = my / len;

  p.aim = Math.atan2(mouseY - (p.y - 22), mouseX - p.x);

  // 대시
  if (dashRequested && p.dashTimer <= 0) {
    const moving = moveX || moveY;
    p.dashX = moving ? moveX : Math.cos(p.aim);
    p.dashY = moving ? moveY : Math.sin(p.aim);
    p.dashTime = PLAYER.dashTime;
    p.dashTimer = p.dashCd;
    p.invuln = Math.max(p.invuln, PLAYER.dashInvuln);
  }
  dashRequested = false;

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.x += p.dashX * PLAYER.dashSpeed * dt;
    p.y += p.dashY * PLAYER.dashSpeed * dt;
    if (Math.random() < 0.6) effects.push({ kind: "ghost", x: p.x, y: p.y, t: 0, dur: 0.18 });
  } else {
    p.x += moveX * p.speed * dt;
    p.y += moveY * p.speed * dt;
  }
  clampPlayer();

  // 베기와 스킬
  if (mouseDown && p.atkTimer <= 0) { slash(); p.atkTimer = atkStats(p).cd; }
  if (skillRequested[0]) useSkill(0);
  if (skillRequested[1]) useSkill(1);
  skillRequested = [false, false];
}

function clampPlayer() {
  player.x = clamp(player.x, FIELD.left + player.r, FIELD.right - player.r);
  player.y = clamp(player.y, 60, WALL_Y - player.r);
}

// 광폭화 중에는 기본 공격의 피해, 속도, 범위가 15% 오른다
function atkStats(p) {
  const f = p.frenzy > 0 ? 1.15 : 1;
  return { dmg: p.atkDmg * f, cd: p.atkCd / f, range: p.atkRange * f, half: Math.min(p.atkHalf * f, 1.7) };
}

// 베기: 부채꼴 안의 괴수를 모두 벤다 (거리 조건 + 각도 조건)
function slash() {
  const p = player, a = atkStats(p);
  let hit = false;
  for (const m of monsters) {
    if (m.dead) continue;
    const d = dist(p.x, p.y, m.x, m.y);
    const ang = Math.atan2(m.y - p.y, m.x - p.x);
    if (d <= a.range + m.r && (angleDiff(ang, p.aim) <= a.half || d < m.r + p.r + 6)) {
      damageMonster(m, a.dmg, p.x, p.y, 260);
      hit = true;
    }
  }
  effects.push({ kind: "slash", x: p.x, y: p.y - 18, a: p.aim, r: a.range, half: a.half, t: 0, dur: 0.16,
                 color: p.frenzy > 0 ? "255, 150, 120" : "255, 244, 200" });
  if (hit) { hitstop = Math.max(hitstop, 0.045); shake = Math.max(shake, 3); }
}

// 스킬 재사용 대기. 광폭화는 효과가 끝난 뒤부터 대기가 흐른다
function skillCd(p, id) {
  const cd = SKILLS[id].cd * p.skillCdMul;
  return id === "frenzy" ? SKILLS.frenzy.duration + cd : cd;
}

function useSkill(i) {
  const p = player, sk = p.skills[i];
  if (!sk || sk.timer > 0) return;
  const def = SKILLS[sk.id];

  if (sk.id === "harvest") {
    // 사거리 안에서 조준점에 가장 가까운 괴수 하나를 벤다
    let target = null, best = Infinity;
    for (const m of monsters) {
      if (m.dead || dist(p.x, p.y, m.x, m.y) > def.radius + m.r) continue;
      const d = dist(mouseX, mouseY, m.x, m.y - m.r);
      if (d < best) { best = d; target = m; }
    }
    if (!target) return;                 // 대상이 없으면 재사용 대기를 쓰지 않는다
    sk.timer = skillCd(p, sk.id);
    const ang = Math.atan2(target.y - p.y, target.x - p.x);
    effects.push({ kind: "slash", x: target.x, y: target.y - target.r, a: ang + Math.PI, r: target.r + 26, half: 1.2, t: 0, dur: 0.25, color: "212, 160, 58" });
    damageMonster(target, (def.dmg + p.harvestBonus) * p.skillDmgMul, p.x, p.y, 320, "harvest");
    hitstop = Math.max(hitstop, 0.06); shake = Math.max(shake, 5);
  } else if (sk.id === "roar") {
    sk.timer = skillCd(p, sk.id);
    for (const m of monsters) {
      if (m.dead || dist(p.x, p.y, m.x, m.y) > def.radius + m.r) continue;
      m.slow = 2.5;
      damageMonster(m, def.dmg * p.skillDmgMul, p.x, p.y, 200);
    }
    effects.push({ kind: "ring", x: p.x, y: p.y - 10, r0: 20, r1: def.radius, t: 0, dur: 0.4 });
    shake = Math.max(shake, 7);
  } else if (sk.id === "frenzy") {
    sk.timer = skillCd(p, sk.id);
    p.frenzy = def.duration;
    addText(p.x, p.y - 110, "광폭화", "#ff8a6a", 1.0, 24);
  }
}

// 사령관이 맞았을 때: 잠깐 하얗게 번쩍이고(flash), 0.35초 무적(깜빡임), 화면 흔들림, 피해 숫자, 핏빛 파편
// knock만큼 공격한 쪽 반대로 밀려난다
function hurtPlayer(dmg, fromX, fromY, knock = 0) {
  const p = player;
  if (p.downed > 0 || p.invuln > 0) return false;
  p.hp -= dmg; p.invuln = 0.35; p.flash = 0.12;
  shake = Math.max(shake, 6);
  addText(p.x, p.y - 100, "-" + Math.round(dmg), "#ff8a7a", 0.7, 20);
  burst(p.x, p.y - 36, COLOR.blood, 6);
  if (knock) {
    const d = dist(fromX, fromY, p.x, p.y) || 1;
    p.x += (p.x - fromX) / d * knock; p.y += (p.y - fromY) / d * knock;
    clampPlayer();
  }
  if (p.hp <= 0) {
    p.hp = 0; p.downed = PLAYER.downTime;
    addText(p.x, p.y - 120, "사령관이 쓰러졌다", COLOR.blood, 1.8, 24);
  }
  return true;
}

// 작은 파편이 사방으로 튄다
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(60, 260);
    effects.push({ kind: "spark", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, dur: rand(0.25, 0.5), color, size: rand(2, 5) });
  }
}

function addText(x, y, text, color, dur, size) {
  effects.push({ kind: "text", x, y, text: String(text), color, t: 0, dur, size });
}

// 괴수가 맞았을 때: 보호막부터 깎고, 밀려나고, 체력이 0이 되면 쓰러진다
// ranged = 원거리 공격(병사)인가. 보호막이 남아 있으면 원거리 공격은 막힌다 (false를 돌려준다)
function damageMonster(m, dmg, fromX, fromY, force, source, ranged = false) {
  if (m.dead) return true;
  if (m.shield > 0 && ranged) {
    if (m.deflectT <= 0) { addText(m.x, m.y - m.r * 2 - 10, "막힘", COLOR.shield, 0.6, 16); m.deflectT = 0.5; }
    return false;
  }
  if (m.shield > 0) {
    const absorbed = Math.min(m.shield, dmg);
    m.shield -= absorbed;
    dmg -= absorbed;
    if (m.shield <= 0) {
      addText(m.x, m.y - m.r * 2 - 22, "보호막 파괴", COLOR.shield, 1.0, 20);
      shake = Math.max(shake, 4);
    }
  }
  m.hp -= dmg;
  m.flash = 0.09;
  const d = dist(fromX, fromY, m.x, m.y) || 1;
  const k = force / Math.sqrt(m.mass);
  m.kvx += (m.x - fromX) / d * k;
  m.kvy += (m.y - fromY) / d * k;
  if (m.hp <= 0) killMonster(m, source);
  return true;
}

function killMonster(m, source) {
  m.dead = true;
  kills = kills + 1;
  const p = player;
  if (source === "harvest") { p.harvestBonus += 4; addText(p.x, p.y - 110, "수확 +4", COLOR.gold, 0.8, 20); }
  if (p.downed <= 0 && p.healOnKill) p.hp = Math.min(p.maxHp, p.hp + p.healOnKill);
  const drops = MONSTER_TYPES[m.type].drop + m.eaten + m.stacks;   // 정수 포식자 계열은 먹었던 정수도, 포식수는 먹은 만큼 더 돌려준다
  const sp = drops > 8 ? 220 : 140;
  for (let n = 0; n < drops; n++) {
    pickups.push({ x: m.x, y: m.y - 4, vx: rand(-sp, sp), vy: rand(-sp, 60), t: 0, life: 14 });
  }
  if (m.eaten >= 3) addText(m.x, m.y - m.r * 2 - 20, `정수 ${drops}`, COLOR.essence, 1.0, 20);
  addXp(MONSTER_TYPES[m.type].xp);
}

// ---------- 경험치와 레벨업 ----------
function addXp(n) {
  xp += n;
  while (xp >= xpNext) {
    xp -= xpNext;
    level++;
    xpNext = Math.round(xpNext * 1.3 + 4);
    pendingLevelUps++;
  }
}

function openLevelUp() {
  pendingLevelUps--;
  resumeState = gameState;
  gameState = "levelup";
  mouseDown = false;
  const p = player;
  const avail = PERKS.filter(k => !k.available || k.available(p));
  const choices = shuffle(avail).slice(0, 3);
  // 스킬이 하나도 없으면 스킬 습득을 최소 하나 보여 준다
  if (!hasAnySkill(p) && !choices.some(c => c.skill)) {
    const sk = shuffle(avail.filter(c => c.skill))[0];
    if (sk) choices[2] = sk;
  }
  perkChoices = choices;
}

function choosePerk(perk) {
  if (!perk) return;
  perk.apply(player);
  addText(player.x, player.y - 120, perk.name, COLOR.gold, 1.2, 22);
  perkChoices = null;
  gameState = resumeState;
}

// ---------- 겹침 판정과 밀어내기 (원: 중심 거리 < 반지름 합) ----------
function separate() {
  for (let i = 0; i < monsters.length; i++) {
    const a = monsters[i];
    for (let j = i + 1; j < monsters.length; j++) {
      const b = monsters[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      const minD = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minD * minD) continue;
      let d = Math.sqrt(d2);
      if (d < 0.01) { dx = rand(-1, 1); dy = rand(-1, 1); d = Math.hypot(dx, dy); }
      const push = (minD - d) * 0.5;
      const nx = dx / d, ny = dy / d, total = a.mass + b.mass;
      a.x -= nx * push * (b.mass / total); a.y -= ny * push * (b.mass / total);
      b.x += nx * push * (a.mass / total); b.y += ny * push * (a.mass / total);
    }
  }
  const p = player;
  if (p.dashTime <= 0 && p.downed <= 0) {   // 사령관은 괴수에게 막힌다. 대시 중에는 통과
    const pm = 2;
    for (const m of monsters) {
      const dx = p.x - m.x, dy = p.y - m.y, minD = p.r + m.r;
      const d = Math.hypot(dx, dy);
      if (d >= minD || d < 0.01) continue;
      const push = (minD - d) * 0.8, total = pm + m.mass;
      p.x += dx / d * push * (m.mass / total); p.y += dy / d * push * (m.mass / total);
      m.x -= dx / d * push * (pm / total); m.y -= dy / d * push * (pm / total);
    }
    clampPlayer();
  }
  for (const m of monsters) {
    m.x = clamp(m.x, FIELD.left + m.r * 0.6, FIELD.right - m.r * 0.6);
    m.y = clamp(m.y, -120, WALL_Y - 6);
  }
}

// ---------- 병사와 화살 ----------
function updateSoldiers(dt) {
  for (const slot of slots) {
    const s = slot.soldier;
    if (!s) continue;
    s.recoil = Math.max(0, s.recoil - dt);
    const def = SOLDIERS[s.type];
    s.timer -= dt;
    if (s.timer > 0) continue;
    const sx = slot.x, sy = SOLDIER_FOOT_Y - 20 * SOLDIER_SCALE;
    let target = null;
    for (const m of monsters) {                    // 사거리 안에서 성벽에 가장 가까운 괴수
      if (m.dead || m.y < 0 || dist(sx, sy, m.x, m.y) > def.range) continue;
      if (!target || m.y > target.y) target = m;
    }
    if (!target) continue;
    const tx = target.x, ty = target.y - target.r;
    const d = dist(sx, sy, tx, ty) || 1;
    projectiles.push({
      kind: s.type, x: sx, y: sy, vx: (tx - sx) / d * def.speed, vy: (ty - sy) / d * def.speed,
      dmg: def.dmg * (1 + 0.45 * (s.level - 1)) * soldierDmgMul, r: 6,
      life: def.range / def.speed + 0.1, pierce: def.pierce, hit: new Set(),
    });
    s.timer = def.cd * Math.pow(0.9, s.level - 1);   // 강화할수록 빨리 쏜다
    s.recoil = 0.12;
  }
}

function updateProjectiles(dt) {
  for (const pr of projectiles) {
    pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
    for (const m of monsters) {
      if (m.dead || pr.hit.has(m)) continue;
      if (dist(pr.x, pr.y, m.x, m.y - m.r) < m.r + pr.r) {
        pr.hit.add(m);
        const ok = damageMonster(m, pr.dmg, pr.x - pr.vx * 0.05, pr.y - pr.vy * 0.05, pr.kind === "ballista" ? 220 : 60, null, true);
        if (!ok) { pr.life = 0; break; }            // 보호막에 막혔다
        pr.pierce--;
        if (pr.pierce <= 0) { pr.life = 0; break; }
      }
    }
  }
  projectiles = projectiles.filter(pr => pr.life > 0 && pr.y > -200);
}

// ---------- 휴식 중 병사 배치와 상점 ----------
function nextLockedSlot() { return SLOT_UNLOCK_ORDER.map(i => slots[i]).find(s => !s.unlocked); }
function upgradeCost(s) { return Math.round(SOLDIERS[s.type].cost * 0.9 * s.level); }

function clickSlot(slot) {
  if (!slot.unlocked) return;
  if (!slot.soldier) {
    const def = SOLDIERS[selectedSoldier];
    if (essenceCount < def.cost) return notEnough();
    essenceCount -= def.cost;
    slot.soldier = { type: selectedSoldier, level: 1, timer: 0, recoil: 0 };
  } else if (slot.soldier.level < 3) {
    const cost = upgradeCost(slot.soldier);
    if (essenceCount < cost) return notEnough();
    essenceCount -= cost;
    slot.soldier.level++;
    addText(slot.x, WALL_Y - 30, "강화", COLOR.gold, 0.9, 20);
  }
}
function notEnough() { addText(W / 2, WALL_Y - 60, "정수가 부족하다", COLOR.blood, 1.0, 20); }

// ---------- 정수 ----------
function updatePickups(dt) {
  const p = player;
  for (const k of pickups) {
    k.t += dt;
    const fr = Math.exp(-5 * dt);
    k.vx *= fr; k.vy *= fr;
    const d = dist(k.x, k.y, p.x, p.y);
    const nearWall = k.y > WALL_Y - 150;
    if (p.downed <= 0 && d < p.magnet && k.t > 0.25) {
      const sp = 380 + (p.magnet - d) * 6;
      k.vx = (p.x - k.x) / (d || 1) * sp; k.vy = (p.y - 10 - k.y) / (d || 1) * sp;
      if (d < 24) k.collected = true;
    } else if (nearWall && k.t > 0.4) {           // 성벽 근처 정수는 저절로 회수된다
      k.vy = 420; k.vx *= 0.5;
      if (k.y > WALL_Y + 20) k.collected = true;
    }
    k.x += k.vx * dt; k.y += k.vy * dt;
    if (k.collected) essenceCount = essenceCount + 1;
  }
  pickups = pickups.filter(k => !k.collected && !k.eaten && k.t < k.life);
}

/* ---------- 포식수 ----------
   우선순위: ① 체력 20 이하인 일반 괴수에게 가서 수확 ② (3스택 이상이면) 사령관을 쫓아가 수확
   ③ 할 일이 없으면 전장 가운데쯤에서 어슬렁거린다. 성벽으로는 가지 않는다 */
function reaperTarget(m) {
  let best = null, bestD = Infinity;
  for (const o of monsters) {
    if (o === m || o.dead || o.y < 0) continue;
    if (o.type !== "grunt" && o.type !== "brute") continue;   // 일반 괴수만
    if (o.hp > REAPER.targetHp) continue;
    const d = dist(m.x, m.y, o.x, o.y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function updateReaper(m, dt) {
  const p = player;
  const slowMul = m.slow > 0 ? 0.55 : 1;
  m.atkTimer -= dt;

  // ① 수확으로 마무리할 일반 괴수
  const prey = reaperTarget(m);
  if (prey) {
    const d = dist(m.x, m.y, prey.x, prey.y);
    if (d > m.r + prey.r + REAPER.reach) moveToward(m, prey.x, prey.y, m.speed * slowMul, dt);
    else if (m.atkTimer <= 0) reaperHarvest(m, prey);
    m.y = Math.min(m.y, WALL_Y - 120);
    return;
  }

  // ② 3스택부터는 사령관을 노린다
  if (m.stacks >= REAPER.angerStacks && p.downed <= 0) {
    const d = dist(m.x, m.y, p.x, p.y);
    if (d > m.r + p.r + REAPER.reach) moveToward(m, p.x, p.y, m.speed * slowMul, dt);
    else if (m.atkTimer <= 0) {
      effects.push({ kind: "slash", x: p.x, y: p.y - 30, a: Math.atan2(p.y - m.y, p.x - m.x) + Math.PI, r: 40, half: 1.2, t: 0, dur: 0.25, color: "220, 60, 50" });
      hurtPlayer(m.harvestDmg, m.x, m.y, 30);
      m.atkTimer = MONSTER_TYPES.reaper.atkCd;
    }
    m.y = Math.min(m.y, WALL_Y - 120);
    return;
  }

  // ③ 할 일이 없으면 가운데 높이에서 좌우로 어슬렁거린다
  const wanderX = W / 2 + Math.sin(frame * 0.01 + m.x * 0.01) * 180;
  if (dist(m.x, m.y, wanderX, REAPER.hoverY) > 10) moveToward(m, wanderX, REAPER.hoverY, m.speed * 0.4 * slowMul, dt);
}

// 포식수의 수확: 대상을 베고, 그 일격으로 쓰러뜨리면 잡아먹고 강해진다.
// 잡아먹힌 괴수는 정수를 떨어뜨리지 않고, 처치 수와 경험치도 오르지 않는다
function reaperHarvest(m, prey) {
  m.atkTimer = MONSTER_TYPES.reaper.atkCd;
  const ang = Math.atan2(prey.y - m.y, prey.x - m.x);
  effects.push({ kind: "slash", x: prey.x, y: prey.y - prey.r, a: ang + Math.PI, r: prey.r + 24, half: 1.2, t: 0, dur: 0.25, color: "220, 60, 50" });
  let dmg = m.harvestDmg;
  if (prey.shield > 0) { const a = Math.min(prey.shield, dmg); prey.shield -= a; dmg -= a; }
  prey.hp -= dmg;
  prey.flash = 0.09;
  if (prey.hp > 0) return;

  prey.dead = true;
  m.stacks++;
  m.harvestDmg += REAPER.growDmg;
  m.r += REAPER.growR;
  m.maxHp += REAPER.growHp;
  m.hp = Math.min(m.maxHp, m.hp + REAPER.growHp);
  burst(prey.x, prey.y - prey.r, COLOR.blood, 8);
  addText(m.x, m.y - m.r * 2 - 14, m.stacks === REAPER.angerStacks ? "포식수가 사령관을 노린다" : `수확 ${m.stacks}`, "#ff6a5a", 1.2, m.stacks === REAPER.angerStacks ? 22 : 18);
}

/* ---------- 정수 포식자 ----------
   사령관과 성벽을 무시하고 전장의 정수를 쫓아가 먹는다. 먹을수록 커지고 단단해진다.
   EAT.evolveAt개를 먹으면 잠시 웅크렸다가 결정 포식수로 진화한다 (화면에 한 마리까지) */
function nearestEssence(m, maxDist) {
  let best = null, bestD = maxDist;
  for (const k of pickups) {
    if (k.eaten || k.collected || k.t < 0.3 || k.y > WALL_Y - 150) continue;
    const d = dist(m.x, m.y, k.x, k.y);
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
}

function moveToward(m, tx, ty, speed, dt) {
  const d = dist(m.x, m.y, tx, ty) || 1;
  m.x += (tx - m.x) / d * speed * dt;
  m.y += (ty - m.y) / d * speed * dt;
}

function updateEater(m, dt) {
  if (m.evolving > 0) {
    m.evolving -= dt;
    if (m.evolving <= 0) evolve(m);
    return;
  }
  const slowMul = m.slow > 0 ? 0.55 : 1;
  const k = nearestEssence(m, 2000);
  if (!k) { m.y += m.speed * 0.5 * slowMul * dt; return; }   // 먹을 정수가 없으면 성벽으로
  moveToward(m, k.x, k.y, m.speed * slowMul, dt);
  if (dist(m.x, m.y, k.x, k.y) < m.r + 10) {
    k.eaten = true;
    m.eaten++;
    m.r += 1;
    m.hp += 6; m.maxHp += 6;
    const crystalAlive = monsters.some(o => o !== m && !o.dead && (o.type === "crystal" || o.evolving > 0));
    if (m.eaten >= EAT.evolveAt && !crystalAlive) {
      m.evolving = EAT.evolveTime;
      addText(m.x, m.y - m.r * 2 - 10, "진화한다!", COLOR.essence, 1.2, 22);
    }
  }
}

function evolve(m) {
  const t = MONSTER_TYPES.crystal;
  const hpMul = 1 + (wave - 1) * 0.09;
  m.type = "crystal";
  m.r = t.r; m.mass = t.mass; m.speed = t.speed;
  m.hp = m.maxHp = t.hp * hpMul;
  m.shield = m.maxShield = t.shield * hpMul;
  m.beamCd = 2.5;
  addText(m.x, m.y - m.r * 2 - 20, "결정 포식수", COLOR.essence, 1.6, 26);
  shake = Math.max(shake, 8);
}

/* ---------- 결정 포식수 ----------
   보호막이 깨지면 근처 정수를 먹어 회복한다. 보호막이 있을 때만 사령관을 노리는 빔을 차징하고,
   차징 중 보호막이 깨지면 빔이 취소된다. 그 밖에는 성벽으로 걸어가며 붙은 사령관을 공격한다 */
function updateCrystal(m, dt) {
  const p = player;
  if (m.stagger > 0) { m.stagger -= dt; return; }

  if (m.charge > 0) {
    if (m.shield <= 0) {
      m.charge = 0; m.stagger = 0.8; m.beamCd = EAT.beamCd;
      addText(m.x, m.y - m.r * 2 - 20, "빔 차단", COLOR.essence, 1.0, 22);
      return;
    }
    m.charge -= dt;
    if (m.charge > EAT.beamLock && p.downed <= 0) {
      const d = dist(m.x, m.y - m.r, p.x, p.y - 30) || 1;
      m.aimX = (p.x - m.x) / d; m.aimY = (p.y - 30 - (m.y - m.r)) / d;
    }
    if (m.charge <= 0) fireBeam(m);
    return;
  }

  if (m.shield < m.maxShield) {
    const k = nearestEssence(m, 260);
    if (k) {
      moveToward(m, k.x, k.y, m.speed * 1.4, dt);
      if (dist(m.x, m.y, k.x, k.y) < m.r + 12) {
        k.eaten = true;
        m.eaten++;
        m.shield = Math.min(m.maxShield, m.shield + EAT.shieldPerEssence);
        addText(m.x, m.y - m.r * 2 - 10, "보호막 회복", COLOR.shield, 0.8, 18);
      }
      return;
    }
  }

  m.beamCd -= dt;
  if (m.beamCd <= 0 && m.shield > 0 && p.downed <= 0 && m.y > 60) {
    m.charge = EAT.beamCharge;
    m.beamCd = EAT.beamCd;
    return;
  }

  m.atkTimer -= dt;
  if (p.downed <= 0 && dist(m.x, m.y, p.x, p.y) <= m.r + p.r + 6) {
    if (m.atkTimer <= 0) { hurtPlayer(MONSTER_TYPES.crystal.dmg, m.x, m.y, 20); m.atkTimer = MONSTER_TYPES.crystal.atkCd; }
    return;
  }
  m.y += m.speed * (m.slow > 0 ? 0.55 : 1) * dt;
}

function fireBeam(m) {
  const p = player;
  const sx = m.x, sy = m.y - m.r;
  let ex, ey;
  const px = p.x - sx, py = (p.y - 30) - sy;
  const along = px * m.aimX + py * m.aimY;            // 빔 방향으로 얼마나 앞에 있는가
  const side = Math.abs(px * m.aimY - py * m.aimX);   // 빔 직선에서 옆으로 얼마나 떨어져 있는가
  if (p.downed <= 0 && p.invuln <= 0 && along > 0 && side < p.r + 14) {
    ex = sx + m.aimX * along; ey = sy + m.aimY * along;
    hurtPlayer(EAT.beamDmg, sx, sy, 50);
  } else {
    const tWall = m.aimY > 0 ? (WALL_Y - sy) / m.aimY : Infinity;
    const wx = sx + m.aimX * tWall;
    if (tWall < Infinity && wx > 0 && wx < W) {
      ex = wx; ey = WALL_Y;
      const lost = Math.round(WALL_MAX * EAT.beamWallRatio);
      wallHp = Math.max(0, wallHp - lost);
      addText(wx, WALL_Y - 30, `성벽 -${lost}`, COLOR.blood, 1.4, 26);
    } else {
      ex = sx + m.aimX * 1500; ey = sy + m.aimY * 1500;
    }
  }
  effects.push({ kind: "beam", x1: sx, y1: sy, x2: ex, y2: ey, t: 0, dur: 0.4 });
  shake = Math.max(shake, 10);
  hitstop = Math.max(hitstop, 0.06);
}

// =====================================================
// 그리기
// =====================================================
function drawSprite(name, x, y) {
  ctx.drawImage(images[name], x - FOOT[name].x, y - FOOT[name].y);
}

function drawCircle(x, y, r) {   // 충돌 판정용 원 (showHitbox가 true일 때만)
  if (!showHitbox) return;
  ctx.strokeStyle = "red"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
}

function drawWorld(step) {
  ctx.save();
  ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  ctx.drawImage(images.background, 0, 0);

  ctx.fillStyle = "rgba(255, 244, 200, 0.35)";
  for (const d of dust) { ctx.beginPath(); ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2); ctx.fill(); }

  for (const k of pickups) {   // 정수 (사라지기 3초 전부터 깜빡인다)
    if (k.life - k.t < 3 && Math.floor(k.t * 8) % 2 === 0) continue;
    drawSprite("essence", k.x, k.y + Math.sin(k.t * 6 + k.x) * 3);
  }

  for (const e of effects) {   // 대시 잔상
    if (e.kind !== "ghost") continue;
    ctx.fillStyle = `rgba(255, 244, 200, ${0.3 * (1 - e.t / e.dur)})`;
    ctx.beginPath(); ctx.ellipse(e.x, e.y - 36, 14, 30, 0, 0, Math.PI * 2); ctx.fill();
  }

  monsters.sort((a, b) => a.y - b.y);
  for (const m of monsters) if (m.y < player.y) drawMonster(m, step);
  drawCommander();
  for (const m of monsters) if (m.y >= player.y) drawMonster(m, step);

  // 병사의 화살과 노포
  for (const pr of projectiles) {
    const len = pr.kind === "ballista" ? 30 : 16, sp = Math.hypot(pr.vx, pr.vy) || 1;
    ctx.strokeStyle = pr.kind === "ballista" ? "#c7a26a" : "#e9e4d6";
    ctx.lineWidth = pr.kind === "ballista" ? 4 : 2;
    ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x - pr.vx / sp * len, pr.y - pr.vy / sp * len); ctx.stroke();
  }

  for (const e of effects) {
    const k = e.t / e.dur;
    if (e.kind === "slash") {
      ctx.strokeStyle = `rgba(${e.color}, ${1 - k})`;
      ctx.lineWidth = 10 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.7 + 0.3 * k), e.a - e.half, e.a + e.half); ctx.stroke();
    } else if (e.kind === "spark") {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = e.color; ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
      ctx.globalAlpha = 1;
    } else if (e.kind === "ring") {   // 포효 파동
      ctx.strokeStyle = `rgba(140, 190, 230, ${1 - k})`; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r0 + (e.r1 - e.r0) * k, 0, Math.PI * 2); ctx.stroke();
    } else if (e.kind === "beam") {
      ctx.save();
      ctx.lineCap = "round"; ctx.shadowColor = COLOR.essence; ctx.shadowBlur = 24;
      ctx.strokeStyle = `rgba(143, 216, 255, ${0.8 * (1 - k)})`; ctx.lineWidth = 22 * (1 - k) + 4;
      ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - k})`; ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
      ctx.restore();
    }
  }

  if (showHitbox) {
    const p = player, a = atkStats(p);
    ctx.strokeStyle = "red"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, a.range, p.aim - a.half, p.aim + a.half); ctx.closePath(); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(p.x, p.y, p.magnet, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }

  // 성벽 → 통로 바닥 → 병사(통로 위) → 병사 자리 표시 → 테두리 어둠 순서
  ctx.drawImage(images.wall, 0, 0);
  drawWallBase();
  drawWalkway();
  if (wallHp < WALL_MAX) {   // 깎인 만큼 균열
    ctx.strokeStyle = "rgba(15, 17, 22, 0.75)"; ctx.lineWidth = 2;
    const cracks = Math.floor((1 - wallHp / WALL_MAX) * 10);
    for (let i = 0; i < cracks; i++) {
      const cx = 40 + i * 67;
      ctx.beginPath(); ctx.moveTo(cx, WALL_Y + 2); ctx.lineTo(cx + 8, WALL_Y + 20); ctx.lineTo(cx - 4, WALL_Y + 40); ctx.lineTo(cx + 6, WALL_Y + 72); ctx.stroke();
    }
  }
  drawSoldierBodies();
  drawSoldiers();

  for (const e of effects) {   // 떠오르는 글자
    if (e.kind !== "text") continue;
    ctx.globalAlpha = 1 - e.t / e.dur;
    ctx.font = `600 ${e.size}px ${FONT}`; ctx.textAlign = "center";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(10, 12, 16, 0.8)";
    ctx.strokeText(e.text, e.x, e.y - e.t * 40);
    ctx.fillStyle = e.color; ctx.fillText(e.text, e.x, e.y - e.t * 40);
    ctx.globalAlpha = 1;
  }

  ctx.drawImage(images.vignette, 0, 0);
  ctx.restore();
}

// 성벽 그림(wall.png)은 y=1140에서 끝난다. 그 아래를 같은 벽돌로 화면 끝까지 이어서
// 아래쪽 인터페이스 뒤로 협곡이 비치지 않게 한다. 아래로 갈수록 어두워져 글자가 잘 보인다
const WALL_IMG_BOTTOM = 1140;
function drawWallBase() {
  const top = WALL_IMG_BOTTOM, bottom = H + 20;   // 화면이 흔들려도 틈이 안 보이게 조금 더 그린다
  ctx.fillStyle = "#6e7172";
  ctx.fillRect(-20, top, W + 40, bottom - top);
  ctx.strokeStyle = "rgba(40, 44, 50, 0.6)"; ctx.lineWidth = 2;   // 벽돌 이음새
  ctx.beginPath();
  for (let y = top, row = 0; y < bottom; y += 20, row++) {
    ctx.moveTo(-20, y); ctx.lineTo(W + 20, y);
    for (let x = (row % 2) * 24 - 24; x < W + 20; x += 48) { ctx.moveTo(x, y); ctx.lineTo(x, y + 20); }
  }
  ctx.stroke();
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, "rgba(8, 10, 14, 0.15)");
  g.addColorStop(1, "rgba(8, 10, 14, 0.8)");
  ctx.fillStyle = g;
  ctx.fillRect(-20, top, W + 40, bottom - top);
}

// 성벽 윗면 통로 바닥. 흉벽(톱니) 아래 띠를 "위에서 내려다본 바닥"으로 보이게 칠한다
const WALK_TOP = 1064, WALK_BOTTOM = 1124;
function drawWalkway() {
  const g = ctx.createLinearGradient(0, WALK_TOP, 0, WALK_BOTTOM);   // 흉벽 쪽은 그늘, 앞쪽은 밝게
  g.addColorStop(0, "#5f646b");
  g.addColorStop(0.35, "#868b90");
  g.addColorStop(1, "#a3a6a7");
  ctx.fillStyle = g;
  ctx.fillRect(0, WALK_TOP, W, WALK_BOTTOM - WALK_TOP);

  ctx.fillStyle = "rgba(10, 12, 16, 0.55)";                          // 흉벽 밑동에 진 그림자
  ctx.fillRect(0, WALK_TOP, W, 3);

  ctx.strokeStyle = "rgba(40, 44, 50, 0.35)"; ctx.lineWidth = 1;     // 바닥 돌판 이음새
  ctx.beginPath();
  ctx.moveTo(0, 1090); ctx.lineTo(W, 1090);
  for (let x = 0; x < W; x += 56) {
    ctx.moveTo(x, WALK_TOP + 3); ctx.lineTo(x, 1090);
    ctx.moveTo(x + 28, 1090); ctx.lineTo(x + 28, WALK_BOTTOM);
  }
  ctx.stroke();

  ctx.fillStyle = "#c2c4c2"; ctx.fillRect(0, WALK_BOTTOM - 2, W, 2); // 통로 앞 모서리 (빛 받는 턱)
  ctx.fillStyle = "rgba(10, 12, 16, 0.5)"; ctx.fillRect(0, WALK_BOTTOM, W, 2);
}

// 병사 몸: 성벽 윗면 통로를 밟고 서 있다
function drawSoldierBodies() {
  for (const slot of slots) {
    const s = slot.soldier;
    if (!s) continue;
    const ry = s.recoil * 10;   // 쏠 때 살짝 뒤로 밀린다
    ctx.fillStyle = "rgba(10, 12, 16, 0.45)";   // 발밑 그림자
    ctx.beginPath(); ctx.ellipse(slot.x, SOLDIER_FOOT_Y, 14 * SOLDIER_SCALE, 4 * SOLDIER_SCALE, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(slot.x, SOLDIER_FOOT_Y);
    ctx.scale(SOLDIER_SCALE, SOLDIER_SCALE);   // 아래 그림은 발밑(0, 0) 기준이라 통째로 키운다
    if (s.type === "ballista") {
      ctx.fillStyle = "#3e2f22"; ctx.fillRect(-13, -12, 4, 12); ctx.fillRect(9, -12, 4, 12);   // 받침 다리
      ctx.fillStyle = "#5a4430"; ctx.fillRect(-18, -20 + ry, 36, 10);
      ctx.fillStyle = "#8a7354"; ctx.fillRect(-3, -36 + ry, 6, 22);
    } else {
      ctx.fillStyle = "#3a4250"; ctx.fillRect(-6, -22 + ry, 12, 22);
      ctx.fillStyle = "#4b5563"; ctx.beginPath(); ctx.arc(0, -27 + ry, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#8a7354"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-9, -16 + ry, 10, -1.2, 1.2); ctx.stroke();
    }
    ctx.restore();
  }
}

// 성벽 위 병사 자리 표시 (강화 단계, 빈자리, 휴식 중 누를 칸). 성벽 위에 그린다
function drawSoldiers() {
  const interactive = gameState === "break" || gameState === "prep";
  for (const slot of slots) {
    const x = slot.x, y = SOLDIER_FOOT_Y;
    if (interactive && slot.unlocked) {
      const bx = x - 34, by = y - 80, bw = 68, bh = 112;
      ctx.strokeStyle = slot.soldier ? "rgba(212, 160, 58, 0.5)" : "rgba(233, 228, 214, 0.7)";
      ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh); ctx.setLineDash([]);
      buttons.push({ x: bx, y: by, w: bw, h: bh, onClick: () => clickSlot(slot) });
    }
    if (!slot.unlocked) {   // 아직 열리지 않은 자리: 휴식 중에만 "잠김"이라고 흐리게 보여 준다
      if (interactive) { ctx.fillStyle = "rgba(233, 228, 214, 0.35)"; ctx.font = `400 14px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("잠김", x, y - 20); }
      continue;
    }
    const s = slot.soldier;
    if (!s) {
      if (interactive) { ctx.fillStyle = COLOR.ink; ctx.font = `600 30px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("+", x, y - 20); }
      continue;
    }
    for (let i = 0; i < s.level; i++) { ctx.fillStyle = COLOR.gold; ctx.fillRect(x - 10 + i * 8, y + 8, 5, 5); }
    if (interactive && s.level < 3) {
      ctx.fillStyle = "rgba(233, 228, 214, 0.7)"; ctx.font = `400 14px ${FONT}`; ctx.textAlign = "center";
      ctx.fillText(`강화 ${upgradeCost(s)}`, x, y + 28);
    }
  }
}

// 맞은 순간 번쩍임. 그림 파일(drawImage 한 번)은 brightness 필터로 하얗게 만들지만,
// 코드로 그린 괴수는 도형 수십 개 + 빛 번짐이라 필터를 켜면 도형마다 계산돼 화면이 버벅인다.
// 그래서 코드로 그린 괴수는 필터 대신 몸 색만 밝은 색으로 바꿔 그린다
let flashing = false;
const FLASH_BODY = "#dfe6ee";

// 웅크린 짐승 실루엣 (그림 파일이 없는 정수 포식자, 결정 포식수용)
function beastShape(s, eye, plates, body) {
  ctx.fillStyle = flashing ? FLASH_BODY : (body || COLOR.beast);
  ctx.fillRect(-17 * s, -14 * s, 7 * s, 14 * s);
  ctx.fillRect(10 * s, -14 * s, 7 * s, 14 * s);
  ctx.beginPath();
  ctx.moveTo(-26 * s, -8 * s);
  ctx.quadraticCurveTo(-24 * s, -40 * s, 0, -42 * s);
  ctx.quadraticCurveTo(24 * s, -40 * s, 26 * s, -8 * s);
  ctx.closePath(); ctx.fill();
  for (let i = -2; i <= 2; i++) {
    const bx = i * 8 * s, by = -38 * s + Math.abs(i) * 4 * s;
    ctx.beginPath(); ctx.moveTo(bx - 4 * s, by + 2 * s); ctx.lineTo(bx, by - 10 * s); ctx.lineTo(bx + 4 * s, by + 2 * s); ctx.fill();
  }
  if (plates) {
    ctx.strokeStyle = "rgba(90, 105, 125, 0.45)"; ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(0, -6 * s, 9 * s * i, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  }
  ctx.strokeStyle = "rgba(170, 190, 215, 0.22)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-22 * s, -24 * s); ctx.quadraticCurveTo(0, -46 * s, 22 * s, -24 * s); ctx.stroke();
  ctx.fillStyle = flashing ? FLASH_BODY : (body || COLOR.beast);
  ctx.beginPath(); ctx.ellipse(0, -14 * s, 11 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.shadowColor = eye; ctx.shadowBlur = 8; ctx.fillStyle = eye;
  ctx.beginPath(); ctx.arc(-4 * s, -16 * s, 1.8 * s, 0, Math.PI * 2); ctx.arc(4 * s, -16 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function crystals(s, count, glow) {   // 등에 솟은 하늘색 결정
  ctx.save();
  ctx.shadowColor = COLOR.essence; ctx.shadowBlur = 6 + glow * 14;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    const bx = t * 30 * s, by = -36 * s - (0.5 - Math.abs(t)) * 8 * s, h = (10 + (0.5 - Math.abs(t)) * 12) * s;
    ctx.fillStyle = `rgba(143, 216, 255, ${0.75 + glow * 0.25})`;
    ctx.beginPath(); ctx.moveTo(bx - 3.5 * s, by); ctx.lineTo(bx + t * 4 * s, by - h); ctx.lineTo(bx + 3.5 * s, by); ctx.fill();
    ctx.fillStyle = "rgba(238, 249, 255, 0.85)";
    ctx.beginPath(); ctx.moveTo(bx - 1 * s, by); ctx.lineTo(bx + t * 4 * s, by - h * 0.85); ctx.lineTo(bx + 1 * s, by); ctx.fill();
  }
  ctx.restore();
}

function drawMonster(m, step) {
  let lift = 0;
  if (m.type === "brute" && step < STEP_MOVE) lift = Math.sin((step / STEP_MOVE) * Math.PI) * 6;

  ctx.save();
  ctx.translate(m.x, m.y - lift);

  if (m.type === "crystal" && m.charge > 0) {   // 빔 조준선. 마지막 순간엔 빨갛게 깜빡이며 고정
    const locked = m.charge <= EAT.beamLock;
    const k = 1 - m.charge / EAT.beamCharge;
    ctx.strokeStyle = locked ? `rgba(255, 120, 110, ${0.5 + 0.4 * Math.sin(frame * 0.7)})` : `rgba(143, 216, 255, ${0.25 + 0.4 * k})`;
    ctx.lineWidth = locked ? 3 : 1.5;
    ctx.beginPath(); ctx.moveTo(0, -m.r); ctx.lineTo(m.aimX * 1500, -m.r + m.aimY * 1500); ctx.stroke();
  }

  const coded = m.type === "eater" || m.type === "crystal" || m.type === "reaper";   // 코드로 그린 괴수인가
  if (m.flash > 0) { if (coded) flashing = true; else ctx.filter = "brightness(3)"; }
  if (m.type === "eater") {
    const s = m.r / 18;
    if (m.evolving > 0) {
      const k = 1 - m.evolving / EAT.evolveTime;
      ctx.scale(1 + k * 0.3, 1 - k * 0.15);
      const g = ctx.createRadialGradient(0, -m.r, 0, 0, -m.r, m.r * 3);
      g.addColorStop(0, `rgba(143, 216, 255, ${0.25 + k * 0.4})`); g.addColorStop(1, "rgba(143, 216, 255, 0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -m.r, m.r * 3, 0, Math.PI * 2); ctx.fill();
      beastShape(s, COLOR.essence, false);
      crystals(s, Math.max(1, m.eaten), k);
    } else {
      beastShape(s, "#bfe8ff", false);
      if (m.eaten > 0) crystals(s, Math.min(m.eaten, 5), 0);
    }
  } else if (m.type === "reaper") {   // 붉은 몸, 쌓은 스택만큼 등에 붉은 가시
    const s = m.r / 18;
    beastShape(s, "#ffb08a", false, "#6e1c20");
    if (!flashing) {
      ctx.fillStyle = "#c8443a";
      for (let i = 0; i < Math.min(m.stacks, 6); i++) {
        const bx = (i - (Math.min(m.stacks, 6) - 1) / 2) * 7 * s;
        ctx.beginPath(); ctx.moveTo(bx - 3 * s, -38 * s); ctx.lineTo(bx, -50 * s); ctx.lineTo(bx + 3 * s, -38 * s); ctx.fill();
      }
    }
  } else if (m.type === "crystal") {
    const s = m.r / 18;
    const glow = m.charge > 0 ? 1 - m.charge / EAT.beamCharge : 0;
    beastShape(s, glow > 0 ? "#eef9ff" : COLOR.essence, true);
    crystals(s, 5, glow);
  } else {
    drawSprite(m.type, 0, 0);
  }
  ctx.filter = "none";
  flashing = false;

  if (m.shield > 0) {   // 보호막: 몸을 덮은 회청색 금속 막
    const pulse = 0.5 + 0.2 * Math.sin(frame * 0.07 + m.x);
    ctx.fillStyle = `rgba(150, 170, 195, ${0.12 * pulse + 0.06})`;
    ctx.strokeStyle = `rgba(201, 214, 230, ${0.45 * pulse + 0.15})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -m.r * 0.95, m.r * 1.45, m.r * 1.15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (m.slow > 0) {     // 둔화
    ctx.fillStyle = "rgba(140, 190, 230, 0.25)";
    ctx.beginPath(); ctx.ellipse(0, -m.r * 0.9, m.r * 1.15, m.r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  const elite = m.type === "crystal";
  const bw = m.r * 2, bx = m.x - m.r;
  const by = elite ? m.y - m.r * 3.6 : m.y - m.r * 2 - 22;
  if (m.hp < m.maxHp || elite) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; ctx.fillRect(bx, by, bw, 4);
    ctx.fillStyle = COLOR.blood; ctx.fillRect(bx, by, bw * Math.max(0, m.hp / m.maxHp), 4);
  }
  if (m.shield > 0) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; ctx.fillRect(bx, by - 6, bw, 4);
    ctx.fillStyle = COLOR.shield; ctx.fillRect(bx, by - 6, bw * (m.shield / m.maxShield), 4);
  }
  if (elite) {
    ctx.fillStyle = COLOR.essence; ctx.font = `600 14px ${FONT}`; ctx.textAlign = "center";
    ctx.fillText("결정 포식수", m.x, by - 12);
  }
  drawCircle(m.x, m.y, m.r);
}

function drawCommander() {
  const p = player;
  if (p.downed > 0) {
    ctx.globalAlpha = 0.35; drawSprite("commander", p.x, p.y); ctx.globalAlpha = 1;
    ctx.fillStyle = COLOR.ink; ctx.font = `600 18px ${FONT}`; ctx.textAlign = "center";
    ctx.fillText(`재정비 ${Math.ceil(p.downed)}`, p.x, p.y - 100);
    return;
  }
  if (p.frenzy > 0) {   // 광폭화 중 붉은 기운
    ctx.fillStyle = `rgba(230, 90, 70, ${0.22 + 0.1 * Math.sin(frame * 0.3)})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 36, p.r * 1.6, p.r * 2.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  const blink = p.invuln > 0 && Math.floor(frame / 3) % 2 === 0;
  ctx.globalAlpha = blink ? 0.5 : 1;
  if (p.flash > 0) ctx.filter = "brightness(2.5)";
  if (Math.cos(p.aim) < 0) {
    ctx.save(); ctx.translate(p.x, 0); ctx.scale(-1, 1); drawSprite("commander", 0, p.y); ctx.restore();
  } else {
    drawSprite("commander", p.x, p.y);
  }
  ctx.filter = "none";
  ctx.strokeStyle = "rgba(217, 222, 229, 0.5)"; ctx.lineWidth = 2;   // 조준 방향 표시
  ctx.beginPath(); ctx.arc(p.x, p.y - 36, 30, p.aim - 0.25, p.aim + 0.25); ctx.stroke();
  ctx.globalAlpha = 1;
  if (p.hp < p.maxHp) {
    const bw = 44, bx = p.x - bw / 2, by = p.y - 100;
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)"; ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = "#7fc28a"; ctx.fillRect(bx, by, bw * (p.hp / p.maxHp), 5);
  }
  drawCircle(p.x, p.y, p.r);
}

// 재사용 대기 원 (대시, 스킬)
function drawCooldown(x, y, key, label, ratio, empty) {
  ratio = clamp(ratio, 0, 1);
  const R = 24;
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  if (empty) {
    ctx.strokeStyle = "rgba(233, 228, 214, 0.3)"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = ratio > 0 ? "rgba(233, 228, 214, 0.4)" : COLOR.gold; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - ratio)); ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.fillStyle = empty || ratio > 0 ? "rgba(233, 228, 214, 0.5)" : COLOR.ink;
  ctx.font = `600 ${key.length > 1 ? 12 : 16}px ${FONT}`; ctx.fillText(key, x, y + 5);
  ctx.fillStyle = "rgba(233, 228, 214, 0.6)"; ctx.font = `400 12px ${FONT}`; ctx.fillText(label, x, y + R + 15);
}

function drawHUD() {
  // 위쪽: 경험치 막대, 웨이브, 처치 수, 레벨
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; ctx.fillRect(0, 0, W, 5);
  ctx.fillStyle = COLOR.gold; ctx.fillRect(0, 0, W * (xp / xpNext), 5);
  ctx.textAlign = "center"; ctx.fillStyle = COLOR.ink; ctx.font = `700 34px ${FONT}`;
  ctx.fillText(wave ? `웨이브 ${wave} / ${LAST_WAVE}` : "전투 준비", W / 2, 64);
  if (wave) {
    ctx.fillStyle = "rgba(233, 228, 214, 0.65)"; ctx.font = `400 20px ${FONT}`;
    ctx.fillText(WAVE_TITLES[wave - 1], W / 2, 98);
  }
  ctx.textAlign = "left"; ctx.fillStyle = COLOR.ink; ctx.font = `700 22px ${FONT}`;
  ctx.fillText(`처치 ${kills}`, 30, 42);
  ctx.textAlign = "right"; ctx.font = `700 22px ${FONT}`;
  ctx.fillText(`Lv ${level}`, W - 30, 42);

  // 아래쪽 패널
  const panelY = WALL_Y + 80;
  ctx.textAlign = "left"; ctx.fillStyle = "rgba(233, 228, 214, 0.7)"; ctx.font = `400 18px ${FONT}`;
  ctx.fillText("성벽", 30, panelY + 42);
  ctx.fillStyle = "#1c2028"; ctx.fillRect(80, panelY + 27, 220, 18);
  ctx.fillStyle = wallHp > WALL_MAX * 0.3 ? "#7c8188" : COLOR.blood;
  ctx.fillRect(80, panelY + 27, 220 * (wallHp / WALL_MAX), 18);
  ctx.fillStyle = COLOR.ink; ctx.font = `700 16px ${FONT}`;
  ctx.fillText(wallHp, 310, panelY + 42);
  drawSprite("essence", 44, panelY + 78);
  ctx.font = `700 24px ${FONT}`; ctx.fillText(essenceCount, 66, panelY + 87);

  const p = player;
  drawCooldown(W - 230, panelY + 52, "Space", "대시", p.dashTimer / p.dashCd, false);
  ["Q", "E"].forEach((key, i) => {
    const sk = p.skills[i];
    if (!sk) { drawCooldown(W - 150 + i * 80, panelY + 52, key, "비어 있음", 0, true); return; }
    const label = sk.id === "harvest" ? `수확 +${p.harvestBonus}` : SKILLS[sk.id].name;
    drawCooldown(W - 150 + i * 80, panelY + 52, key, label, sk.timer / skillCd(p, sk.id), false);
  });

  // 웨이브 시작 배너
  if (banner) {
    const k = banner.t / banner.dur;
    ctx.globalAlpha = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.fillStyle = "rgba(6, 8, 12, 0.7)"; ctx.fillRect(0, 200, W, 120);
    ctx.textAlign = "center"; ctx.fillStyle = COLOR.gold; ctx.font = `700 40px ${FONT}`;
    ctx.fillText(banner.title, W / 2, 255);
    ctx.fillStyle = COLOR.ink; ctx.font = `400 22px ${FONT}`;
    ctx.fillText(banner.text, W / 2, 295);
    ctx.globalAlpha = 1;
  }
}

// 버튼 하나를 그리고, 클릭할 수 있게 등록한다
function button(x, y, w, h, label, sub, onClick, enabled = true, primary = false) {
  ctx.fillStyle = primary ? "rgba(212, 160, 58, 0.92)" : enabled ? "rgba(28, 36, 48, 0.95)" : "rgba(18, 22, 30, 0.7)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = enabled ? "rgba(212, 160, 58, 0.7)" : "rgba(120, 110, 95, 0.4)"; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = "center";
  ctx.fillStyle = primary ? "#1a140a" : enabled ? COLOR.ink : "#6b6a63";
  ctx.font = `700 ${sub ? 18 : 20}px ${FONT}`;
  ctx.fillText(label, x + w / 2, y + (sub ? h / 2 - 2 : h / 2 + 7));
  if (sub) { ctx.font = `400 14px ${FONT}`; ctx.fillStyle = primary ? "#3d3020" : "rgba(233, 228, 214, 0.7)"; ctx.fillText(sub, x + w / 2, y + h / 2 + 20); }
  buttons.push({ x, y, w, h, onClick, enabled });
}

// 휴식·정비 시간 패널
function drawBreakPanel() {
  const prep = gameState === "prep";
  const px = 60, py = 120, pw = W - 120, ph = prep ? 420 : 270;
  ctx.fillStyle = "rgba(11, 15, 22, 0.92)"; ctx.fillRect(px, py, pw, ph);
  ctx.textAlign = "center"; ctx.fillStyle = COLOR.gold; ctx.font = `700 30px ${FONT}`;
  ctx.fillText(prep ? "정비 시간" : wave === 0 ? "전열 정비" : "숨 고르기", W / 2, py + 44);
  ctx.fillStyle = COLOR.ink; ctx.font = `400 18px ${FONT}`;
  ctx.fillText(`다음 웨이브까지 ${Math.ceil(breakTimer)}초`, W / 2, py + 76);
  ctx.fillStyle = "rgba(233, 228, 214, 0.6)"; ctx.font = `400 15px ${FONT}`;
  ctx.fillText("배치할 병사를 고르고 성벽 위 빈자리를 누른다 (다시 누르면 강화)", W / 2, py + 108);

  let bx = px + 30;
  for (const key of Object.keys(SOLDIERS)) {
    const def = SOLDIERS[key], sel = selectedSoldier === key;
    button(bx, py + 122, (pw - 80) / 2, 58, `${def.name}  ${def.cost}`, sel ? "선택됨" : "고르기", () => { selectedSoldier = key; }, true, sel);
    bx += (pw - 80) / 2 + 20;
  }
  if (prep) {
    const bw = (pw - 80) / 2;
    SHOP.forEach((item, i) => {
      const cost = item.cost();
      const ok = item.can() && essenceCount >= cost;
      const x = px + 30 + (i % 2) * (bw + 20), y = py + 200 + Math.floor(i / 2) * 76;
      button(x, y, bw, 62, `${item.name}  ${cost}`, item.desc, () => { if (ok) { essenceCount -= cost; item.buy(); } }, ok);
    });
  }
  button(W / 2 - 130, py + ph - 70, 260, 52, "웨이브 시작", null, () => { breakTimer = 0; }, true, true);
}

// 특전 고르기
function drawLevelUp() {
  ctx.fillStyle = "rgba(6, 8, 12, 0.6)"; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center"; ctx.fillStyle = COLOR.gold; ctx.font = `700 40px ${FONT}`;
  ctx.fillText("사령관이 성장했다", W / 2, 360);
  ctx.fillStyle = "rgba(233, 228, 214, 0.7)"; ctx.font = `400 18px ${FONT}`;
  ctx.fillText("특전 하나를 고른다 (클릭 또는 1·2·3)", W / 2, 396);
  perkChoices.forEach((perk, i) => {
    button(110, 440 + i * 120, W - 220, 100, `${i + 1}. ${perk.name}`, perk.desc, () => choosePerk(perk));
  });
}

// 게임 오버와 승리
function drawEnd(victory) {
  ctx.fillStyle = "rgba(4, 6, 10, 0.75)"; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = victory ? COLOR.gold : COLOR.blood; ctx.font = `700 52px ${FONT}`;
  ctx.fillText(victory ? "협곡을 지켜 냈다" : "성벽이 무너졌다", W / 2, 540);
  ctx.fillStyle = COLOR.ink; ctx.font = `400 26px ${FONT}`;
  ctx.fillText(`최종 점수: 처치 ${kills}`, W / 2, 610);
  ctx.fillText(victory ? `${survived}초 동안 15웨이브를 버텼다` : `웨이브 ${wave}에서 ${survived}초 버텼다`, W / 2, 650);
  ctx.fillText(`사령관 레벨 ${level}`, W / 2, 690);
  ctx.fillStyle = "rgba(233, 228, 214, 0.6)"; ctx.font = `400 20px ${FONT}`;
  ctx.fillText("R 키를 눌러 다시 시작", W / 2, 760);
}

// =====================================================
// 시동: 이미지를 모두 불러온 뒤에 루프를 시작한다
// =====================================================
let loaded = 0;
const names = Object.keys(images);
for (const name of names) {
  const img = new Image();
  img.src = images[name];
  img.onload = function () {
    loaded = loaded + 1;
    if (loaded === names.length) {
      resetGame();
      lastTime = performance.now();
      requestAnimationFrame(gameLoop);
    }
  };
  images[name] = img;
}
