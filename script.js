// ===== 도화지와 붓 가져오기 =====
const canvas = document.getElementById("game"); // 이름이 "game"인 도화지를 찾는다
const ctx = canvas.getContext("2d");            // 그 도화지에 그릴 "붓"을 가져온다

// ===== 위치와 크기 설정 (여기 숫자만 바꾸면 화면이 바뀐다) =====
const W = canvas.width;   // 도화지 가로 720
const H = canvas.height;  // 도화지 세로 1280

// 양옆 절벽: 이 두 선 사이가 전장이다
const CLIFF_LEFT = 60;    // 왼쪽 절벽이 끝나는 x
const CLIFF_RIGHT = 660;  // 오른쪽 절벽이 시작하는 x

// 성벽
const WALL_Y = 1080;      // 성벽 윗면의 y (화면 아래쪽)
const WALL_H = 70;        // 성벽 두께

// 사령관 (원의 x, y는 중심이다)
const COMMANDER_X = 360;
const COMMANDER_Y = 900;
const COMMANDER_R = 20;

// 괴수들: [중심 x, 중심 y, 반지름]
const MONSTERS = [
  [200, 260, 18],   // 굶주린 무리
  [300, 330, 18],   // 굶주린 무리
  [470, 290, 18],   // 굶주린 무리
  [380, 470, 34],   // 갑각 짐승 (대형)
];

// 성벽 위 병사 자리 (x 위치)
const SOLDIER_SLOTS = [210, 310, 410, 510];

// 바닥에 떨어진 정수: [중심 x, 중심 y]
const ESSENCES = [
  [250, 560], [270, 585], [520, 700], [150, 820],
];
const ESSENCE_SIZE = 10;  // 마름모 반쪽 크기

// ===== 색 설정 =====
const GROUND = "#1b2330";                         // 협곡 바닥: 푸르스름한 어둠
const CLIFF = "#0d121a";                          // 절벽: 거의 검은 남색
const LIGHT = "rgba(255, 244, 200, 0.10)";        // 햇빛·성물의 빛: 연한 레몬 크림
const MONSTER_BODY = "#10151d";                   // 괴수 몸: 어둠에 녹는 색
const MONSTER_EYE = "#9fe3d6";                    // 괴수 눈: 차가운 청록
const STEEL = "#4b5563";                          // 사령관 갑옷: 강철
const GOLD = "#d4a03a";                           // 사령관 장식: 진한 금
const ESSENCE_CORE = "#eef9ff";                   // 정수 중심: 아주 연한 하늘색
const ESSENCE_EDGE = "#5cc4f2";                   // 정수 테두리: 채도 높은 하늘색
const ESSENCE_GLOW = "rgba(240, 250, 255, 0.35)"; // 정수 광채: 반투명 흰색
const STONE = "#5a5f66";                          // 성벽 돌
const STONE_TOP = "#7c8188";                      // 성벽 톱니
const TEXT = "#e9e4d6";                           // 글자

// ===== 1. 배경: 협곡 바닥 =====
ctx.fillStyle = GROUND;
ctx.fillRect(0, 0, W, H);   // 도화지 전체를 칠한다

// ===== 2. 중앙 길로 떨어지는 햇빛 (반투명 띠 두 겹) =====
ctx.fillStyle = LIGHT;
ctx.fillRect(200, 0, 320, WALL_Y);  // 넓은 띠
ctx.fillRect(260, 0, 200, WALL_Y);  // 좁은 띠를 겹쳐 가운데를 더 밝게

// ===== 3. 협곡 입구의 어둠 (그라데이션) =====
// 위쪽은 검고, 아래로 갈수록 투명해지는 색을 만든다
const dark = ctx.createLinearGradient(0, 0, 0, 400);
dark.addColorStop(0, "rgba(4, 6, 10, 0.9)"); // y=0: 거의 검정
dark.addColorStop(1, "rgba(4, 6, 10, 0)");   // y=400: 완전히 투명
ctx.fillStyle = dark;
ctx.fillRect(0, 0, W, 400);

// ===== 4. 양옆 절벽 =====
ctx.fillStyle = CLIFF;
ctx.fillRect(0, 0, CLIFF_LEFT, H);                // 왼쪽 절벽
ctx.fillRect(CLIFF_RIGHT, 0, W - CLIFF_RIGHT, H); // 오른쪽 절벽

// ===== 5. 정수 (연한 하늘색 마름모 + 흰 광채) =====
for (const e of ESSENCES) {
  const x = e[0], y = e[1], s = ESSENCE_SIZE;

  // 둘레의 반투명 흰 광채 (원)
  ctx.fillStyle = ESSENCE_GLOW;
  ctx.beginPath();
  ctx.arc(x, y, s * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 바깥 마름모: 채도 높은 하늘색
  ctx.fillStyle = ESSENCE_EDGE;
  ctx.beginPath();
  ctx.moveTo(x, y - s);       // 위 꼭짓점
  ctx.lineTo(x + s * 0.7, y); // 오른쪽 꼭짓점
  ctx.lineTo(x, y + s);       // 아래 꼭짓점
  ctx.lineTo(x - s * 0.7, y); // 왼쪽 꼭짓점
  ctx.closePath();            // 처음 점으로 돌아가 닫는다
  ctx.fill();

  // 안쪽 작은 마름모: 아주 연한 하늘색 중심
  ctx.fillStyle = ESSENCE_CORE;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.5);
  ctx.lineTo(x + s * 0.35, y);
  ctx.lineTo(x, y + s * 0.5);
  ctx.lineTo(x - s * 0.35, y);
  ctx.closePath();
  ctx.fill();
}

// ===== 6. 괴수들 =====
for (const m of MONSTERS) {
  const x = m[0], y = m[1], r = m[2];

  // 발밑 그림자 (반투명 타원)
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.beginPath();
  ctx.ellipse(x, y + r, r * 1.1, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 몸통 (원)
  ctx.fillStyle = MONSTER_BODY;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // 차가운 청록색 눈 두 개
  ctx.fillStyle = MONSTER_EYE;
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.2, r * 0.13, 0, Math.PI * 2);
  ctx.arc(x + r * 0.35, y - r * 0.2, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
}

// ===== 7. 플레이어 (사령관) =====
// 사령관을 감싼 성물의 빛 (연한 레몬 크림 원)
ctx.fillStyle = LIGHT;
ctx.beginPath();
ctx.arc(COMMANDER_X, COMMANDER_Y, 110, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.arc(COMMANDER_X, COMMANDER_Y, 60, 0, Math.PI * 2); // 한 겹 더 겹쳐 가운데를 밝게
ctx.fill();

// 발밑 그림자
ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
ctx.beginPath();
ctx.ellipse(COMMANDER_X, COMMANDER_Y + COMMANDER_R, 22, 8, 0, 0, Math.PI * 2);
ctx.fill();

// 몸 (강철색 원)
ctx.fillStyle = STEEL;
ctx.beginPath();
ctx.arc(COMMANDER_X, COMMANDER_Y, COMMANDER_R, 0, Math.PI * 2);
ctx.fill();

// 금 테두리
ctx.strokeStyle = GOLD;
ctx.lineWidth = 3;
ctx.stroke();

// 검 (위쪽 괴수를 향한 선)
ctx.strokeStyle = "#d9dee5";
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(COMMANDER_X, COMMANDER_Y);       // 선 시작점: 사령관 중심
ctx.lineTo(COMMANDER_X, COMMANDER_Y - 50);  // 선 끝점: 위쪽으로 50 (y를 줄이면 위)
ctx.stroke();

// ===== 8. 성벽 =====
ctx.fillStyle = STONE;
ctx.fillRect(0, WALL_Y, W, WALL_H);       // 성벽 본체
ctx.fillStyle = STONE_TOP;
for (let x = 0; x < W; x += 44) {
  ctx.fillRect(x, WALL_Y - 12, 26, 14);   // 성벽 위 톱니 모양(흉벽)
}

// 요새 쪽 성물의 빛: 성벽에서 위로 갈수록 옅어지는 레몬 크림 빛 (그라데이션)
const holy = ctx.createLinearGradient(0, WALL_Y + WALL_H, 0, WALL_Y - 220);
holy.addColorStop(0, "rgba(255, 244, 200, 0.18)"); // 성벽 쪽: 가장 밝다
holy.addColorStop(1, "rgba(255, 244, 200, 0)");    // 위쪽: 완전히 투명
ctx.fillStyle = holy;
ctx.fillRect(0, WALL_Y - 220, W, 220 + WALL_H);

// ===== 9. 성벽 위 병사 =====
ctx.fillStyle = "#3a4250";
for (const x of SOLDIER_SLOTS) {
  ctx.fillRect(x - 10, WALL_Y + 10, 20, 26); // 병사 하나 = 작은 사각형
}

// 병사가 쏜 화살 두 발 (괴수를 향해 날아가는 짧은 선)
ctx.strokeStyle = TEXT;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(318, 760); ctx.lineTo(330, 735);  // 화살 1
ctx.moveTo(402, 640); ctx.lineTo(396, 615);  // 화살 2
ctx.stroke();

// ===== 10. 요새 안쪽 =====
ctx.fillStyle = "#0b0e13";
ctx.fillRect(0, WALL_Y + WALL_H, W, H - WALL_Y - WALL_H);

// ===== 11. 글자 =====
// 왼쪽 위: 웨이브 표시
ctx.fillStyle = TEXT;
ctx.font = "bold 32px serif";
ctx.fillText("웨이브 1 / 15", 80, 60);

// 가운데: 웨이브 제목 (반투명 띠 위에)
ctx.fillStyle = "rgba(4, 6, 10, 0.7)";
ctx.fillRect(0, 580, W, 100);
ctx.fillStyle = "#fff4c8";
ctx.font = "bold 30px serif";
ctx.textAlign = "center";                  // 글자를 가운데 정렬
ctx.fillText("굶주린 무리가 협곡을 내려온다", W / 2, 640);

// 요새 안쪽: 성벽 체력
ctx.fillStyle = TEXT;
ctx.font = "24px serif";
ctx.textAlign = "left";
ctx.fillText("성벽 1000 / 1000", 40, 1200);

// 요새 안쪽 오른쪽: 모은 정수
ctx.fillStyle = ESSENCE_EDGE;
ctx.textAlign = "right";
ctx.fillText("정수 30", W - 40, 1200);
