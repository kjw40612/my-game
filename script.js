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
  front: "images/front.png",           // 성벽, 병사, 화면 테두리 어둠
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

// =====================================================
// 사령관 설정 — 이동·대시·베기 (개발 버전과 같은 값)
// 속도는 "1초에 움직이는 픽셀 수"다. 프레임이 아니라 실제 시간으로 움직여서 기기마다 같다
// =====================================================
const PLAYER = {
  r: 18,            // 몸 반지름 (충돌 판정용 원)
  speed: 250,       // 이동 속도 (픽셀/초)
  atkDmg: 22,       // 베기 피해
  atkRange: 96,     // 베기가 닿는 거리
  atkHalf: 0.95,    // 베기 부채꼴의 절반 각도 (라디안, 약 54도 → 전체 약 108도)
  atkCd: 0.38,      // 베기 간격(초). 마우스를 누르고 있으면 이 간격으로 계속 벤다
  dashCd: 1.3,      // 대시 재사용 대기(초)
  dashTime: 0.16,   // 대시가 이어지는 시간(초)
  dashSpeed: 950,   // 대시 속도 (픽셀/초)
  dashInvuln: 0.22, // 대시 중 무적 시간(초). 괴수 사이를 뚫고 지나갈 수 있다
  magnet: 110,      // 정수를 끌어당기는 거리
};

// 사령관과 괴수가 움직일 수 있는 범위 (양옆 절벽 안쪽)
const FIELD = { left: 96, right: 624 };

// =====================================================
// 규칙 설정 (6장) — 난이도 튜닝은 대부분 여기 숫자만 바꾸면 된다
// =====================================================
const START_MONSTERS = 5;        // 게임을 시작할 때 화면에 있는 괴수 수
const SPAWN_START = 1600;        // 새 괴수가 나오는 간격(밀리초). 1600 = 1.6초
const SPAWN_MIN = 600;           // 웨이브가 올라도 이보다 짧아지지는 않는다
const WAVE_SECONDS = 30;         // 이만큼 버틸 때마다 웨이브가 하나 오른다
const BRUTE_CHANCE = 0.15;       // 새 괴수가 갑각 짐승일 확률 (15%)

// 괴수 종류별 값 (r·hp·mass·drop은 개발 버전과 같다)
// r = 몸 반지름, hp = 체력, mass = 무게(무거울수록 덜 밀린다), wallDmg = 성벽에 닿으면 깎는 체력
const MONSTER_TYPES = {
  grunt: { r: 16, hp: 30,  mass: 1, speedMin: 0.8, speedMax: 1.3, wallDmg: 50,  drop: 1 },
  brute: { r: 36, hp: 150, mass: 4, speed: 1.4,                   wallDmg: 150, drop: 4 },
};

const showHitbox = false;    // true로 바꾸면 충돌 판정에 쓰는 원과 베기 범위가 빨간 선으로 보인다

// 갑각 짐승의 묵직한 걸음 (4장)
const STEP_FRAMES = 80;
const STEP_MOVE = 28;

const WAVE_TITLES = [
  "굶주린 무리가 협곡을 내려온다", "발 빠른 것들이 섞여 있다", "바람에 산성 냄새가 실려 온다",
  "갑각이 협곡 벽을 긁는다", "협곡이 울린다", "버려진 무리가 다시 몰려온다",
  "떠밀린 것들이 성벽을 노린다", "협곡 입구가 검게 물든다", "살아남은 강자들이 움직인다",
  "배고픈 울음이 가까워진다", "왕의 그림자 아래 무리가 모인다", "협곡 전체가 숨을 죽인다",
  "버림받은 것들의 마지막 돌격", "대지가 왕의 발걸음에 떨린다", "괴수왕",
];

// =====================================================
// 게임 상태 (계속 바뀌는 값들). 처음 값은 resetGame()에서 넣는다
// =====================================================
let gameState = "playing";   // "playing"(플레이 중) 또는 "gameover"(게임 오버)

let player;                  // 사령관: { x, y, aim, atkTimer, dashTimer, dashTime, dashX, dashY, invuln }
let monsters = [];           // 괴수들: { type, x, y, r, mass, speed, hp, maxHp, kvx, kvy, flash }
let pickups = [];            // 바닥에 떨어진 정수들: { x, y, vx, vy, t, life }
let effects = [];            // 베기 궤적, 대시 잔상 같은 연출

let wallHp;                  // 성벽 체력. 0이 되면 게임 오버
const WALL_MAX = 1000;
let essenceCount;            // 모은 정수
let kills;                   // 처치한 괴수 수 = 점수
let wave;                    // 지금 웨이브

let startTime;               // 게임을 시작한 시각 (Date.now)
let lastSpawn;               // 마지막으로 괴수를 내보낸 시각
let survived = 0;            // 버틴 시간(초)

let frame = 0;               // 지나간 프레임 수 (갑각 짐승 걸음용)
let shake = 0;               // 화면 흔들림 세기
let hitstop = 0;             // 0보다 크면 그 시간 동안 화면이 멈춘다 (타격감)

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
    x: W / 2, y: WALL_Y - 140, aim: -Math.PI / 2,
    atkTimer: 0, dashTimer: 0, dashTime: 0, dashX: 0, dashY: -1, invuln: 0,
  };
  wave = 1;                        // 괴수를 만들 때 웨이브를 쓰므로 먼저 되돌린다
  monsters = [];
  for (let i = 0; i < START_MONSTERS; i++) {
    spawnMonster(100 + i * 110);   // 처음 괴수들은 서로 다른 높이에서 출발
  }
  pickups = [];
  effects = [];
  wallHp = WALL_MAX;
  essenceCount = 0;
  kills = 0;
  startTime = Date.now();          // 빠뜨리면 재시작해도 시간이 이어진다
  lastSpawn = Date.now();
  survived = 0;
  shake = 0;
  hitstop = 0;
  dashRequested = false;
  gameState = "playing";
}

// 괴수 하나를 화면 위쪽의 랜덤한 x 위치에 만든다
function spawnMonster(startY = -40) {   // startY: 처음 나타나는 높이. 기본은 화면 위쪽 바깥
  const type = Math.random() < BRUTE_CHANCE ? "brute" : "grunt";
  const t = MONSTER_TYPES[type];
  const waveBoost = 1 + (wave - 1) * 0.08;   // 웨이브가 오를수록 조금씩 빨라진다
  const speed = type === "brute" ? t.speed : rand(t.speedMin, t.speedMax);
  monsters.push({
    type: type,
    x: rand(FIELD.left + 30, FIELD.right - 30),
    y: startY,
    r: t.r, mass: t.mass,
    speed: speed * waveBoost,
    hp: t.hp, maxHp: t.hp,
    kvx: 0, kvy: 0,      // 넉백(밀려나는) 속도
    flash: 0,            // 맞은 순간 번쩍이는 시간
  });
}

// =====================================================
// 입력 (5장) — 이벤트는 "기록만" 하고, 움직이는 건 게임 루프가 한다 (방식 B)
// =====================================================
const keys = {};               // 지금 눌려 있는 키를 적어 두는 메모장
let dashRequested = false;     // 대시 키를 눌렀다는 기록
let mouseDown = false;         // 마우스를 누르고 있는가 (누르고 있으면 계속 벤다)
let mouseX = 400, mouseY = 400;

document.addEventListener("keydown", function (e) {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();   // 방향키와 스페이스바로 페이지가 스크롤되지 않게
  }
  keys[e.key] = true;

  // 대시: 스페이스바 또는 Shift. 꾹 누를 때 반복되는 이벤트는 무시한다
  if ((e.key === " " || e.key === "Shift") && !e.repeat) dashRequested = true;

  // 게임 오버 상태에서 R 키를 누르면 다시 시작 (대문자 R도 받는다)
  if (gameState === "gameover" && (e.key === "r" || e.key === "R")) {
    resetGame();
  }
});

document.addEventListener("keyup", function (e) {
  keys[e.key] = false;
});

// 마우스 좌표를 캔버스 기준 좌표로 바꾼다 (캔버스가 화면에 맞게 줄어 있어서 비율도 곱한다)
function toCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

canvas.addEventListener("mousemove", function (e) {
  const pos = toCanvasPos(e);
  mouseX = pos.x;
  mouseY = pos.y;
});
canvas.addEventListener("mousedown", function (e) {
  const pos = toCanvasPos(e);
  mouseX = pos.x;
  mouseY = pos.y;
  mouseDown = true;
});
window.addEventListener("mouseup", function () { mouseDown = false; });
window.addEventListener("blur", function () {   // 창을 벗어나면 눌린 키를 모두 뗀 것으로
  for (const k in keys) keys[k] = false;
  mouseDown = false;
});

// =====================================================
// 게임 루프: 지우기 → 계산 → 그리기 → 다음 프레임 예약
// =====================================================
let lastTime = performance.now();

function gameLoop(now) {
  // 지난 프레임에서 몇 초가 흘렀는가 (너무 길면 1/30초로 자른다: 탭을 오래 떠났다 돌아와도 튀지 않게)
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;

  // ① 지우기
  ctx.clearRect(0, 0, W, H);

  frame = frame + 1;
  const step = frame % STEP_FRAMES;

  // ② 계산하기 — 플레이 중일 때만. 히트스톱 중에는 잠깐 멈춘다
  if (gameState === "playing") {
    if (hitstop > 0) hitstop -= dt;
    else update(dt, step);
  }

  for (const d of dust) {             // 먼지는 장식이라 게임 오버 중에도 떠다닌다
    d.y = d.y + d.speed;
    if (d.y > WALL_Y) d.y = 0;
  }
  for (const e of effects) e.t += dt;
  effects = effects.filter(e => e.t < e.dur);
  shake = shake * 0.85;

  // ③ 그리기
  drawWorld(step);
  drawText();
  if (gameState === "gameover") drawGameOver();

  // ④ 다음 프레임 예약. 게임 오버가 되어도 루프는 멈추지 않는다
  requestAnimationFrame(gameLoop);
}

// ---------- 계산 ----------
function update(dt, step) {
  updatePlayer(dt);

  // 시간과 웨이브: 실제로 흐른 시간을 쓴다
  survived = Math.floor((Date.now() - startTime) / 1000);
  wave = Math.min(15, 1 + Math.floor(survived / WAVE_SECONDS));

  // 새 괴수 내보내기: 웨이브가 오를수록 간격이 짧아진다
  const spawnEvery = Math.max(SPAWN_MIN, SPAWN_START - (wave - 1) * 80);
  if (Date.now() - lastSpawn > spawnEvery) {
    spawnMonster();
    lastSpawn = Date.now();
  }

  // 괴수 이동
  for (const m of monsters) {
    m.flash = Math.max(0, m.flash - dt);
    // 넉백: 맞으면 밀려났다가 점점 멈춘다
    m.x += m.kvx * dt; m.y += m.kvy * dt;
    const decay = Math.exp(-9 * dt);
    m.kvx *= decay; m.kvy *= decay;
    // 앞으로 걷기 (4장의 갑각 짐승 걸음 포함)
    if (m.type === "brute") {
      if (step < STEP_MOVE) m.y = m.y + m.speed;
      if (step === STEP_MOVE && m.y > 0) shake = Math.max(shake, 6);
    } else {
      m.y = m.y + m.speed;
    }
  }

  separate();   // 괴수끼리, 사령관과 괴수끼리 겹치지 않게 밀어낸다

  // 괴수가 성벽에 닿으면: 성벽 체력을 깎고 그 괴수는 사라진다 (뒤에서 앞으로 반복)
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    if (m.y >= WALL_Y - 10) {
      wallHp = Math.max(0, wallHp - MONSTER_TYPES[m.type].wallDmg);
      shake = Math.max(shake, 8);
      monsters.splice(i, 1);
    }
  }

  updatePickups(dt);

  // 성벽이 무너지면 게임 오버
  if (wallHp <= 0) gameState = "gameover";
}

// 사령관: 이동, 대시, 베기 (개발 버전과 같은 방식)
function updatePlayer(dt) {
  const p = player;
  p.invuln = Math.max(0, p.invuln - dt);
  p.atkTimer -= dt;
  p.dashTimer -= dt;

  // 이동 방향: 눌린 키로 -1, 0, 1을 만들고, 대각선이 빨라지지 않게 길이를 1로 맞춘다
  const mx = (keys["d"] || keys["D"] || keys["ArrowRight"] ? 1 : 0) - (keys["a"] || keys["A"] || keys["ArrowLeft"] ? 1 : 0);
  const my = (keys["s"] || keys["S"] || keys["ArrowDown"] ? 1 : 0) - (keys["w"] || keys["W"] || keys["ArrowUp"] ? 1 : 0);
  const len = Math.hypot(mx, my) || 1;
  const moveX = mx / len, moveY = my / len;

  // 조준: 사령관 가슴에서 마우스 쪽으로
  p.aim = Math.atan2(mouseY - (p.y - 22), mouseX - p.x);

  // 대시: 움직이는 방향으로, 멈춰 있으면 조준 방향으로 짧고 빠르게 튀어 나간다
  if (dashRequested && p.dashTimer <= 0) {
    const moving = moveX || moveY;
    p.dashX = moving ? moveX : Math.cos(p.aim);
    p.dashY = moving ? moveY : Math.sin(p.aim);
    p.dashTime = PLAYER.dashTime;
    p.dashTimer = PLAYER.dashCd;
    p.invuln = Math.max(p.invuln, PLAYER.dashInvuln);
  }
  dashRequested = false;

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.x += p.dashX * PLAYER.dashSpeed * dt;
    p.y += p.dashY * PLAYER.dashSpeed * dt;
    if (Math.random() < 0.6) effects.push({ kind: "ghost", x: p.x, y: p.y, t: 0, dur: 0.18 });
  } else {
    p.x += moveX * PLAYER.speed * dt;
    p.y += moveY * PLAYER.speed * dt;
  }
  clampPlayer();

  // 베기: 마우스를 누르고 있으면 atkCd초마다 벤다
  if (mouseDown && p.atkTimer <= 0) {
    slash();
    p.atkTimer = PLAYER.atkCd;
  }
}

function clampPlayer() {
  player.x = clamp(player.x, FIELD.left + PLAYER.r, FIELD.right - PLAYER.r);
  player.y = clamp(player.y, 60, WALL_Y - PLAYER.r);
}

// 베기 판정: 부채꼴 안에 있는 괴수를 모두 벤다
// ① 거리: 사령관과 괴수 중심 사이 거리가 (베기 거리 + 괴수 반지름) 안이고
// ② 각도: 괴수 쪽 방향이 조준 방향에서 atkHalf 이내이면 맞는다 (몸에 붙어 있으면 각도와 상관없이 맞는다)
function slash() {
  const p = player;
  let hit = false;
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    const d = dist(p.x, p.y, m.x, m.y);
    const ang = Math.atan2(m.y - p.y, m.x - p.x);
    if (d <= PLAYER.atkRange + m.r && (angleDiff(ang, p.aim) <= PLAYER.atkHalf || d < m.r + PLAYER.r + 6)) {
      damageMonster(m, i, PLAYER.atkDmg, p.x, p.y, 260);
      hit = true;
    }
  }
  effects.push({ kind: "slash", x: p.x, y: p.y - 18, a: p.aim, r: PLAYER.atkRange, half: PLAYER.atkHalf, t: 0, dur: 0.16 });
  if (hit) { hitstop = Math.max(hitstop, 0.045); shake = Math.max(shake, 3); }
}

// 괴수가 맞았을 때: 체력을 깎고, 무게에 반비례해 밀려나고, 0이 되면 쓰러진다
function damageMonster(m, index, dmg, fromX, fromY, force) {
  m.hp -= dmg;
  m.flash = 0.09;
  const d = dist(fromX, fromY, m.x, m.y) || 1;
  const k = force / Math.sqrt(m.mass);
  m.kvx += (m.x - fromX) / d * k;
  m.kvy += (m.y - fromY) / d * k;
  if (m.hp <= 0) {
    // 쓰러진 자리에 정수를 흩뿌린다
    for (let n = 0; n < MONSTER_TYPES[m.type].drop; n++) {
      pickups.push({ x: m.x, y: m.y - 4, vx: rand(-140, 140), vy: rand(-140, 60), t: 0, life: 14 });
    }
    monsters.splice(index, 1);
    kills = kills + 1;
  }
}

// 겹침 판정과 밀어내기: 두 원의 중심 거리가 반지름 합보다 작으면 겹친 것이다
function separate() {
  // 괴수끼리: 겹친 만큼 서로 밀어낸다. 무거운 쪽이 덜 밀린다
  for (let i = 0; i < monsters.length; i++) {
    const a = monsters[i];
    for (let j = i + 1; j < monsters.length; j++) {
      const b = monsters[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      const minD = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minD * minD) continue;   // 안 겹쳤으면 넘어간다
      let d = Math.sqrt(d2);
      if (d < 0.01) { dx = rand(-1, 1); dy = rand(-1, 1); d = Math.hypot(dx, dy); }
      const push = (minD - d) * 0.5;
      const nx = dx / d, ny = dy / d, total = a.mass + b.mass;
      a.x -= nx * push * (b.mass / total); a.y -= ny * push * (b.mass / total);
      b.x += nx * push * (a.mass / total); b.y += ny * push * (a.mass / total);
    }
  }
  // 사령관과 괴수: 사령관은 괴수에게 막힌다. 대시 중에는 통과한다
  const p = player;
  if (p.dashTime <= 0) {
    const pm = 2;   // 사령관의 무게
    for (const m of monsters) {
      const dx = p.x - m.x, dy = p.y - m.y, minD = PLAYER.r + m.r;
      const d = Math.hypot(dx, dy);
      if (d >= minD || d < 0.01) continue;
      const push = (minD - d) * 0.8, total = pm + m.mass;
      p.x += dx / d * push * (m.mass / total); p.y += dy / d * push * (m.mass / total);
      m.x -= dx / d * push * (pm / total); m.y -= dy / d * push * (pm / total);
    }
    clampPlayer();
  }
  // 괴수도 절벽 밖으로 밀려나지 않게
  for (const m of monsters) {
    m.x = clamp(m.x, FIELD.left + m.r * 0.6, FIELD.right - m.r * 0.6);
    m.y = clamp(m.y, -120, WALL_Y - 6);
  }
}

// 정수: 흩어졌다가 멈추고, 사령관이 가까이 오면 끌려와서 주워진다. 성벽 근처 정수는 저절로 회수된다
function updatePickups(dt) {
  const p = player;
  for (const k of pickups) {
    k.t += dt;
    const fr = Math.exp(-5 * dt);
    k.vx *= fr; k.vy *= fr;
    const d = dist(k.x, k.y, p.x, p.y);
    const nearWall = k.y > WALL_Y - 150;
    if (d < PLAYER.magnet && k.t > 0.25) {
      const sp = 380 + (PLAYER.magnet - d) * 6;
      k.vx = (p.x - k.x) / (d || 1) * sp; k.vy = (p.y - 10 - k.y) / (d || 1) * sp;
      if (d < 24) k.collected = true;
    } else if (nearWall && k.t > 0.4) {
      k.vy = 420; k.vx *= 0.5;
      if (k.y > WALL_Y + 20) k.collected = true;
    }
    k.x += k.vx * dt; k.y += k.vy * dt;
    if (k.collected) essenceCount = essenceCount + 1;
  }
  pickups = pickups.filter(k => !k.collected && k.t < k.life);   // 주웠거나 14초가 지난 정수는 사라진다
}

// =====================================================
// 그리기
// =====================================================
function drawSprite(name, x, y) {
  ctx.drawImage(images[name], x - FOOT[name].x, y - FOOT[name].y);
}

// 충돌 판정용 원을 빨간 선으로 그린다 (showHitbox가 true일 때만)
function drawCircle(x, y, r) {
  if (!showHitbox) return;
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawWorld(step) {
  ctx.save();
  ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  ctx.drawImage(images.background, 0, 0);

  ctx.fillStyle = "rgba(255, 244, 200, 0.35)";   // 레몬 크림색 먼지
  for (const d of dust) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 정수 (사라지기 3초 전부터 깜빡인다)
  for (const k of pickups) {
    if (k.life - k.t < 3 && Math.floor(k.t * 8) % 2 === 0) continue;
    const bob = Math.sin(k.t * 6 + k.x) * 3;
    drawSprite("essence", k.x, k.y + bob);
  }

  // 대시 잔상
  for (const e of effects) {
    if (e.kind !== "ghost") continue;
    ctx.fillStyle = `rgba(255, 244, 200, ${0.3 * (1 - e.t / e.dur)})`;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y - 36, 14, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 화면 위쪽에 있는 것부터 그려야 겹칠 때 앞뒤가 맞는다
  monsters.sort((a, b) => a.y - b.y);
  for (const m of monsters) if (m.y < player.y) drawMonster(m, step);
  drawCommander();
  for (const m of monsters) if (m.y >= player.y) drawMonster(m, step);

  // 베기 궤적
  for (const e of effects) {
    if (e.kind !== "slash") continue;
    const k = e.t / e.dur;
    ctx.strokeStyle = `rgba(255, 244, 200, ${1 - k})`;
    ctx.lineWidth = 10 * (1 - k) + 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * (0.7 + 0.3 * k), e.a - e.half, e.a + e.half);
    ctx.stroke();
  }

  if (showHitbox) {   // 베기 범위(부채꼴)와 정수 끌어당김 범위
    const p = player;
    ctx.strokeStyle = "red"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, PLAYER.atkRange, p.aim - PLAYER.atkHalf, p.aim + PLAYER.atkHalf);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER.magnet, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.drawImage(images.front, 0, 0);   // 성벽과 테두리 어둠은 맨 앞에
  ctx.restore();
}

// 괴수: 맞으면 하얗게 번쩍이고, 체력이 깎였으면 머리 위에 체력 막대가 보인다
function drawMonster(m, step) {
  let lift = 0;
  if (m.type === "brute" && step < STEP_MOVE) lift = Math.sin((step / STEP_MOVE) * Math.PI) * 6;
  if (m.flash > 0) ctx.filter = "brightness(3)";
  drawSprite(m.type, m.x, m.y - lift);
  ctx.filter = "none";
  if (m.hp < m.maxHp) {
    const bw = m.r * 2, bx = m.x - m.r, by = m.y - m.r * 2 - 22;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; ctx.fillRect(bx, by, bw, 4);
    ctx.fillStyle = "#b8483e"; ctx.fillRect(bx, by, bw * Math.max(0, m.hp / m.maxHp), 4);
  }
  drawCircle(m.x, m.y, m.r);
}

function drawCommander() {
  const p = player;
  const blink = p.invuln > 0 && Math.floor(frame / 3) % 2 === 0;   // 무적 중에는 깜빡인다
  ctx.globalAlpha = blink ? 0.5 : 1;
  if (Math.cos(p.aim) < 0) {
    // 왼쪽을 조준할 때는 그림을 좌우로 뒤집어서 그린다
    ctx.save();
    ctx.translate(p.x, 0);
    ctx.scale(-1, 1);
    drawSprite("commander", 0, p.y);
    ctx.restore();
  } else {
    drawSprite("commander", p.x, p.y);
  }
  ctx.globalAlpha = 1;
  drawCircle(p.x, p.y, PLAYER.r);
}

// 글자 (웨이브, 성벽 체력, 정수, 점수, 대시)
function drawText() {
  const font = '"Gowun Batang", serif';

  ctx.textAlign = "center";
  ctx.fillStyle = "#e9e4d6";
  ctx.font = `700 34px ${font}`;
  ctx.fillText(`웨이브 ${wave} / 15`, W / 2, 64);
  ctx.fillStyle = "rgba(233, 228, 214, 0.65)";
  ctx.font = `400 20px ${font}`;
  ctx.fillText(WAVE_TITLES[wave - 1], W / 2, 98);
  ctx.textAlign = "left";
  ctx.fillStyle = "#e9e4d6";
  ctx.font = `700 22px ${font}`;
  ctx.fillText(`처치 ${kills}`, 30, 40);
  ctx.textAlign = "right";
  ctx.font = `400 20px ${font}`;
  ctx.fillText(`${survived}초`, W - 30, 40);

  // 아래쪽 패널: 성벽 체력 막대
  const panelY = WALL_Y + 80;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(233, 228, 214, 0.7)";
  ctx.font = `400 18px ${font}`;
  ctx.fillText("성벽", 40, panelY + 50);
  ctx.fillStyle = "#1c2028";
  ctx.fillRect(96, panelY + 34, 300, 20);
  ctx.fillStyle = wallHp > WALL_MAX * 0.3 ? "#7c8188" : "#b8483e";   // 30% 아래면 붉게
  ctx.fillRect(96, panelY + 34, 300 * (wallHp / WALL_MAX), 20);
  ctx.fillStyle = "#e9e4d6";
  ctx.font = `700 18px ${font}`;
  ctx.fillText(wallHp, 410, panelY + 50);

  // 정수 아이콘과 개수
  drawSprite("essence", W - 120, panelY + 44);
  ctx.font = `700 26px ${font}`;
  ctx.fillText(essenceCount, W - 98, panelY + 54);

  // 대시 재사용 대기 (원이 다 차면 다시 쓸 수 있다)
  const ready = player.dashTimer <= 0;
  const ratio = ready ? 1 : 1 - player.dashTimer / PLAYER.dashCd;
  ctx.strokeStyle = ready ? "#d4a03a" : "rgba(233, 228, 214, 0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W - 210, panelY + 44, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = ready ? "#e9e4d6" : "rgba(233, 228, 214, 0.5)";
  ctx.font = `400 13px ${font}`;
  ctx.fillText("대시", W - 210, panelY + 49);

  // 조작 안내
  ctx.fillStyle = "rgba(233, 228, 214, 0.45)";
  ctx.font = `400 16px ${font}`;
  ctx.fillText("이동 WASD / 방향키   조준 마우스   베기 클릭(누르고 있기)   대시 Space", W / 2, panelY + 100);
}

// 게임 오버 화면
function drawGameOver() {
  const font = '"Gowun Batang", serif';
  ctx.fillStyle = "rgba(4, 6, 10, 0.75)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#b8483e";
  ctx.font = `700 56px ${font}`;
  ctx.fillText("성벽이 무너졌다", W / 2, 540);
  ctx.fillStyle = "#e9e4d6";
  ctx.font = `400 26px ${font}`;
  ctx.fillText(`최종 점수: 처치 ${kills}`, W / 2, 610);
  ctx.fillText(`웨이브 ${wave}까지 ${survived}초 버텼다`, W / 2, 650);
  ctx.fillStyle = "rgba(233, 228, 214, 0.6)";
  ctx.font = `400 20px ${font}`;
  ctx.fillText("R 키를 눌러 다시 시작", W / 2, 720);
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
      resetGame();                         // 처음 상태를 만들고
      lastTime = performance.now();
      requestAnimationFrame(gameLoop);     // 첫 시동 (루프는 이 한 번만 시작한다)
    }
  };
  images[name] = img;
}
