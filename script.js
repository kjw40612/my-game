// ===== 도화지와 붓 가져오기 =====
const canvas = document.getElementById("game"); // 이름이 "game"인 도화지를 찾는다
const ctx = canvas.getContext("2d");            // 그 도화지에 그릴 "붓"을 가져온다

const W = canvas.width;   // 720
const H = canvas.height;  // 1280
const WALL_Y = 1060;      // 성벽 앞쪽 가장자리 y. 괴수가 여기까지 내려온다

// =====================================================
// 이미지 불러오기
// 3장에서 그린 연출 화면을 이미지 여러 장으로 나눠 두었다.
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
// 게임 상태 (계속 바뀌는 숫자들 → let)
// =====================================================

// 사령관 발밑 위치. 이번 주에는 움직이지 않는다 (조작은 5장)
let commanderX = 400;
let commanderY = 760;

// 괴수들: 위치(x, y)와 속도(speed). speed = 한 프레임에 아래로 내려가는 픽셀 수
let monsters = [
  { type: "grunt", x: 250, y: 300, speed: 1.0 },
  { type: "grunt", x: 330, y: 160, speed: 1.2 },
  { type: "grunt", x: 420, y: 340, speed: 0.9 },
  { type: "grunt", x: 180, y: 520, speed: 1.1 },
  { type: "grunt", x: 480, y: 60,  speed: 1.0 },
  { type: "grunt", x: 300, y: 700, speed: 1.3 },
  { type: "grunt", x: 540, y: 430, speed: 0.8 },
  { type: "grunt", x: 210, y: -80, speed: 1.0 },
  { type: "brute", x: 380, y: 470, speed: 0.5 }, // 갑각 짐승은 느리다
];

// 바닥에 떨어진 정수 (이번 주에는 가만히 있다)
let essences = [
  { x: 300, y: 560 }, { x: 330, y: 590 }, { x: 270, y: 600 },
  { x: 470, y: 545 }, { x: 520, y: 820 },
];

// 햇빛 속을 천천히 떠다니는 먼지
let dust = [];
for (let i = 0; i < 30; i++) {
  dust.push({
    x: 240 + Math.random() * 280,   // 중앙 빛 띠 안쪽
    y: Math.random() * WALL_Y,
    speed: 0.15 + Math.random() * 0.3,
  });
}

// 화면 글자에 쓰는 값
let wave = 1;
let wallHp = 1000;
let essenceCount = 30;

// =====================================================
// 그리기 도우미: 이미지를 "발밑" 기준으로 놓는다
// =====================================================
function drawSprite(name, x, y) {
  ctx.drawImage(images[name], x - FOOT[name].x, y - FOOT[name].y);
}

// =====================================================
// 게임 루프: 지우기 → 계산 → 그리기 → 다음 프레임 예약
// =====================================================
function gameLoop() {
  // ① 지우기
  ctx.clearRect(0, 0, W, H);

  // ② 계산하기 (상태를 바꾼다)
  for (const m of monsters) {
    m.y = m.y + m.speed;             // 아래로 speed만큼 내려간다
    if (m.y > WALL_Y - 10) {         // 성벽에 닿으면
      m.y = -40;                     // 화면 위에서 다시 나타난다
    }
  }
  for (const d of dust) {
    d.y = d.y + d.speed;             // 먼지는 아주 천천히 내려간다
    if (d.y > WALL_Y) {
      d.y = 0;
    }
  }

  // ③ 그리기 (뒤에 있는 것부터)
  ctx.drawImage(images.background, 0, 0);

  ctx.fillStyle = "rgba(255, 244, 200, 0.35)";   // 레몬 크림색 먼지
  for (const d of dust) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of essences) {
    drawSprite("essence", e.x, e.y);
  }

  // 화면 위쪽에 있는 괴수부터 그려야 겹칠 때 앞뒤가 맞는다
  monsters.sort((a, b) => a.y - b.y);
  for (const m of monsters) {
    if (m.y < commanderY) drawSprite(m.type, m.x, m.y);  // 사령관보다 뒤(위)에 있는 괴수
  }
  drawSprite("commander", commanderX, commanderY);
  for (const m of monsters) {
    if (m.y >= commanderY) drawSprite(m.type, m.x, m.y); // 사령관보다 앞(아래)에 있는 괴수
  }

  ctx.drawImage(images.front, 0, 0);   // 성벽과 테두리 어둠은 맨 앞에
  drawText();

  // ④ 다음 프레임에 나를 또 불러 달라고 부탁한다
  requestAnimationFrame(gameLoop);
}

// =====================================================
// 글자 (웨이브, 성벽 체력, 정수)
// =====================================================
function drawText() {
  const font = '"Gowun Batang", serif';

  // 위쪽: 웨이브와 제목
  ctx.textAlign = "center";
  ctx.fillStyle = "#e9e4d6";
  ctx.font = `700 34px ${font}`;
  ctx.fillText(`웨이브 ${wave} / 15`, W / 2, 64);
  ctx.fillStyle = "rgba(233, 228, 214, 0.65)";
  ctx.font = `400 20px ${font}`;
  ctx.fillText("굶주린 무리가 협곡을 내려온다", W / 2, 98);

  // 아래쪽 패널: 성벽 체력 막대
  const panelY = WALL_Y + 80;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(233, 228, 214, 0.7)";
  ctx.font = `400 18px ${font}`;
  ctx.fillText("성벽", 40, panelY + 50);
  ctx.fillStyle = "#1c2028";
  ctx.fillRect(96, panelY + 34, 300, 20);                 // 막대 바탕
  ctx.fillStyle = "#7c8188";
  ctx.fillRect(96, panelY + 34, 300 * (wallHp / 1000), 20); // 남은 체력만큼 채운다
  ctx.fillStyle = "#e9e4d6";
  ctx.font = `700 18px ${font}`;
  ctx.fillText(wallHp, 410, panelY + 50);

  // 정수 아이콘과 개수
  drawSprite("essence", W - 120, panelY + 44);
  ctx.font = `700 26px ${font}`;
  ctx.fillText(essenceCount, W - 98, panelY + 54);
}

// =====================================================
// 시동: 이미지를 모두 불러온 뒤에 루프를 시작한다
// (이미지를 다 불러오기 전에 그리면 아무것도 안 나온다 — 3장 2.4)
// =====================================================
let loaded = 0;
const names = Object.keys(images);
for (const name of names) {
  const img = new Image();
  img.src = images[name];
  img.onload = function () {
    loaded = loaded + 1;
    if (loaded === names.length) gameLoop(); // 마지막 이미지까지 불러왔으면 첫 시동
  };
  images[name] = img;  // 파일 경로 대신 불러온 이미지를 담아 둔다
}
