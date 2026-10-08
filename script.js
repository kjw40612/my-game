var io = new IntersectionObserver(function(es){
  es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); } });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(function(el,i){
  el.style.transitionDelay = (i%4)*60 + 'ms';
  io.observe(el);
});

document.querySelectorAll('.tilt').forEach(function(card){
  card.addEventListener('mousemove', function(e){
    var r = card.getBoundingClientRect();
    var x = (e.clientX - r.left)/r.width - .5;
    var y = (e.clientY - r.top)/r.height - .5;
    card.style.transform = 'perspective(1000px) rotateX(' + (-y*3) + 'deg) rotateY(' + (x*3.5) + 'deg) translateY(-4px)';
  });
  card.addEventListener('mouseleave', function(){ card.style.transform = ''; });
});

function toast(msg){
  var z = document.getElementById('toast-zone');
  var t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  z.appendChild(t);
  setTimeout(function(){ t.remove(); }, 1850);
}

// ── T-REX RUNNER (픽셀 스프라이트 · 크롬 다이노 참고) ──
(function(){
  var canvas = document.getElementById('dino-canvas');
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  var overlay = document.getElementById('dino-overlay');
  var overlayTitle = document.getElementById('dino-overlay-title');
  var overlaySub = document.getElementById('dino-overlay-sub');
  var scoreEl = document.getElementById('dino-score');
  var hiEl = document.getElementById('dino-hi');

  var W = canvas.width, H = canvas.height;
  var groundY = H - 40;
  var PX = 3; // 픽셀 스프라이트 확대 배수

  var SPR_DINO_A = [
    '0000000000011111111100',
    '0000000000011001111100',
    '0000000000011111111100',
    '0000000000011111111100',
    '0000000000011111000000',
    '0000000000011111110000',
    '0010000001111110000000',
    '0011000011111111000000',
    '0011101111111111100000',
    '0011111111111110000000',
    '0011111111111110000000',
    '0000111111111100000000',
    '0000011111111000000000',
    '0000001111110000000000',
    '0000001100000000000000',
    '0000001100000000000000',
    '0000001100011000000000',
    '0000001100011000000000'
  ];
  var SPR_DINO_B = [
    '0000000000011111111100',
    '0000000000011001111100',
    '0000000000011111111100',
    '0000000000011111111100',
    '0000000000011111000000',
    '0000000000011111110000',
    '0010000001111110000000',
    '0011000011111111000000',
    '0011101111111111100000',
    '0011111111111110000000',
    '0011111111111110000000',
    '0000111111111100000000',
    '0000011111111000000000',
    '0000001111110000000000',
    '0000000000001100000000',
    '0000000000001100000000',
    '0001100000001100000000',
    '0001100000001100000000'
  ];
  var SPR_DUCK_A = [
    '0000000000000011111111000000',
    '0000000000000011111001000000',
    '0000000000000011111111000000',
    '0011111111111111111111111100',
    '1111111111111111111111111100',
    '1111111111111111111111111100',
    '1111111111111111111100000000',
    '0011111111111111111100000000',
    '0000001111000011110000000000',
    '0000001111000011110000000000',
    '0000001111000011110000000000',
    '0000000000000000000000000000'
  ];
  var SPR_DUCK_B = [
    '0000000000000011111111000000',
    '0000000000000011111001000000',
    '0000000000000011111111000000',
    '0011111111111111111111111100',
    '1111111111111111111111111100',
    '1111111111111111111111111100',
    '1111111111111111111100000000',
    '0011111111111111111100000000',
    '0000000011110000111100000000',
    '0000000011110000111100000000',
    '0000000011110000111100000000',
    '0000000000000000000000000000'
  ];
  var SPR_BIRD_UP = [
    '00000011000000000000',
    '00000011100000000000',
    '00000001110000000000',
    '00001101111000000000',
    '00011101111000000000',
    '00111111111110000000',
    '01111111111110000000',
    '11111111111111000000',
    '11111111111111000000',
    '00000011111111100000',
    '00000001111111111111',
    '00000001111111111100',
    '00000000111111111110',
    '00000000011111110000'
  ];
  var SPR_BIRD_DOWN = [
    '00000000000000000000',
    '00000000000000000000',
    '00000000000000000000',
    '00001101111000000000',
    '00011101111000000000',
    '00111111111110000000',
    '01111111111110000000',
    '11111111111111000000',
    '11111111111111000000',
    '00000011111111100000',
    '00000001111111111111',
    '00000001111111111100',
    '00000000111111111110',
    '00000000011111110000'
  ];
  var SPR_CACTUS_S = [
    '000000000',
    '000000000',
    '000111000',
    '110111000',
    '110111000',
    '110111011',
    '111111011',
    '111111011',
    '111111111',
    '000111111',
    '000111111',
    '000111000',
    '000111000',
    '000111000',
    '000111000',
    '000111000'
  ];
  var SPR_CACTUS_L = [
    '000000111000000',
    '000000111000000',
    '000000111000000',
    '000000111000000',
    '000000111000111',
    '000000111000111',
    '011100111000111',
    '011100111000111',
    '011100111001111',
    '111100111001110',
    '111100111001110',
    '111100111001110',
    '111100111001110',
    '011100111001110',
    '011100111001110',
    '011100111001110',
    '011100111001110',
    '011100111001110',
    '011100111001110',
    '011100111001110'
  ];
  var SPR_CLOUD = [
    '0000000000000000',
    '0000011111100000',
    '0000011111100000',
    '0001111111111000',
    '0111111111111110',
    '0111111111111110',
    '0111111111111110'
  ];

  function blit(rows, x, y, scale, color){
    ctx.fillStyle = color;
    x = Math.round(x); y = Math.round(y);
    for(var r=0;r<rows.length;r++){
      var row = rows[r];
      for(var c=0;c<row.length;c++){
        if(row[c] === '1'){
          ctx.fillRect(x + c*scale, y + r*scale, scale, scale);
        }
      }
    }
  }
  function spriteSize(rows, scale){
    return { w: rows[0].length*scale, h: rows.length*scale };
  }

  var isDark = matchMedia('(prefers-color-scheme: dark)').matches;
  function ink(){
    var root = document.documentElement;
    if(root.getAttribute('data-theme') === 'dark') return true;
    if(root.getAttribute('data-theme') === 'light') return false;
    return isDark;
  }
  function colors(){
    var dark = ink();
    var day = {
      fg: dark ? '#d8d4e0' : '#3a3640',
      ground: dark ? '#3a3646' : '#c9c5cf',
      accent: dark ? '#a79ed0' : '#8d84b3',
      cloud: dark ? '#3a3750' : '#c7c4d0',
      pebble: dark ? '#4a4560' : '#b8b4c0',
      bg: dark ? '#1d1c22' : '#fffefc'
    };
    var night = {
      fg: '#e9e5f5',
      ground: '#4d4778',
      accent: '#c9b8f5',
      cloud: '#3e3a66',
      pebble: '#5a5488',
      bg: '#211c3d'
    };
    var t = nightAmount;
    function mix(a,b,t){ return lerpColor(a,b,t); }
    return {
      fg: mix(day.fg, night.fg, t),
      ground: mix(day.ground, night.ground, t),
      accent: mix(day.accent, night.accent, t),
      cloud: mix(day.cloud, night.cloud, t),
      pebble: mix(day.pebble, night.pebble, t),
      bg: mix(day.bg, night.bg, t),
      moonStar: t
    };
  }
  function hexToRgb(hex){
    hex = hex.replace('#','');
    return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
  }
  function lerpColor(a,b,t){
    var ca=hexToRgb(a), cb=hexToRgb(b);
    var r = Math.round(ca[0]+(cb[0]-ca[0])*t);
    var g = Math.round(ca[1]+(cb[1]-ca[1])*t);
    var bl = Math.round(ca[2]+(cb[2]-ca[2])*t);
    return 'rgb('+r+','+g+','+bl+')';
  }

  // ── 낮/밤 사이클 ──
  var DAY_LENGTH = 650;      // 점수 기준 한 주기 길이
  var nightAmount = 0;       // 0=낮 1=밤, 부드럽게 보간
  var nightTarget = 0;

  // ── 바닥 조약돌(장식용, 충돌 없음) ──
  var PEBBLE_TILE = 260;
  var pebbles = (function(){
    var arr = [];
    for(var i=0;i<11;i++){
      arr.push({ x: Math.random()*PEBBLE_TILE, y: 3+Math.random()*7, s: 1+Math.floor(Math.random()*2) });
    }
    return arr;
  })();

  // ── 바닥 요철(지형 굴곡, 충돌 없음) ──
  var GROUND_TILE = 320;
  var bumps = (function(){
    var arr = [];
    var x = 16;
    while(x < GROUND_TILE - 20){
      if(Math.random() < 0.7){
        var w = 12 + Math.random()*20;
        var h = 3 + Math.random()*5;
        arr.push({ x: x, w: w, h: h });
        x += w + 30 + Math.random()*70;
      } else {
        x += 40 + Math.random()*60;
      }
    }
    return arr;
  })();

  var runSize = spriteSize(SPR_DINO_A, PX);
  var duckSize = spriteSize(SPR_DUCK_A, PX);
  var state = 'idle';
  var dino, obstacles, clouds, speed, score, hi, tick, spawnTimer, cloudTimer;
  var MAX_SPEED = 13.5;
  hi = 0;

  function reset(){
    dino = {
      x: 36, y: groundY - runSize.h, w: runSize.w, h: runSize.h,
      vy: 0, frame: 0, frameTick: 0, ducking: false
    };
    obstacles = [];
    clouds = [];
    speed = 5.6;
    score = 0;
    tick = 0;
    spawnTimer = 60;
    cloudTimer = 30;
    nightAmount = 0;
    nightTarget = 0;
  }
  reset();

  function setDuck(on){
    if(dino.ducking === on) return;
    dino.ducking = on;
    var groundContact = groundY; // feet stay on the ground line
    if(on){
      dino.w = duckSize.w; dino.h = duckSize.h;
    } else {
      dino.w = runSize.w; dino.h = runSize.h;
    }
    dino.y = groundContact - dino.h;
  }

  function spawnObstacle(){
    var r = Math.random();
    if(r < 0.34){
      var s = spriteSize(SPR_CACTUS_S, PX);
      obstacles.push({ type:'cactusS', x: W+10, y: groundY - s.h, w:s.w, h:s.h });
    } else if(r < 0.62){
      var l = spriteSize(SPR_CACTUS_L, PX);
      obstacles.push({ type:'cactusL', x: W+10, y: groundY - l.h, w:l.w, h:l.h });
    } else {
      var b = spriteSize(SPR_BIRD_UP, PX);
      var m = 5; // rectHit과 동일한 여유값
      var standingTop = groundY - runSize.h;
      var duckTop = groundY - duckSize.h;
      var by;
      if(Math.random() < 0.68){
        // 낮은 익룡: 서 있으면 맞고, 슬라이드하면 통과하는 높이 밴드
        var lowMin = standingTop + 2*m - b.h + 2;
        var lowMax = duckTop + 2*m - b.h - 2;
        by = lowMin + Math.random()*Math.max(lowMax-lowMin, 1);
      } else {
        // 높은 익룡: 그냥 지나가도 되는 높이 (연출용)
        var highMax = standingTop - b.h - m - 4;
        by = 24 + Math.random()*Math.max(highMax-24, 20);
      }
      obstacles.push({ type:'bird', x: W+10, y: by, w:b.w, h:b.h, wingTick:0, wingUp:false });
    }
  }
  function spawnCloud(){
    var c = spriteSize(SPR_CLOUD, PX*1.2);
    clouds.push({ x: W+20, y: 16 + Math.random()*60, w:c.w, h:c.h });
  }

  function jump(){
    if(state === 'idle' || state === 'over'){ startGame(); return; }
    if(state === 'running' && !dino.ducking && dino.y >= groundY - dino.h - 0.5){
      dino.vy = -12;
    }
  }
  function startGame(){
    reset();
    state = 'running';
    overlay.classList.remove('show');
  }
  function gameOver(){
    state = 'over';
    hi = Math.max(hi, Math.floor(score));
    overlayTitle.textContent = '게임 오버';
    overlaySub.textContent = '점수 ' + pad(Math.floor(score)) + ' · 다시 클릭하거나 W를 눌러 재시작';
    overlay.classList.add('show');
  }
  function pad(n){ var s=String(n); while(s.length<5) s='0'+s; return s; }
  function rectHit(a,b){
    var m = 5;
    return a.x+m < b.x+b.w-m && a.x+a.w-m > b.x+m && a.y+m < b.y+b.h-m && a.y+a.h-m > b.y+m;
  }

  function update(){
    tick++;
    if(state !== 'running'){ draw(); requestAnimationFrame(update); return; }

    score += speed * 0.045;
    // 점점 빨라지다가 MAX_SPEED에서 유지 (지수적으로 상한에 수렴)
    speed += (MAX_SPEED - speed) * 0.0028;

    // 낮/밤 사이클: 점수 기준으로 목표를 바꾸고 부드럽게 보간
    var phase = Math.floor(score / DAY_LENGTH) % 2;
    nightTarget = phase === 1 ? 1 : 0;
    nightAmount += (nightTarget - nightAmount) * 0.02;

    if(!dino.ducking){
      dino.vy += 0.6;
      dino.y += dino.vy;
      if(dino.y > groundY - dino.h){ dino.y = groundY - dino.h; dino.vy = 0; }
    }
    var grounded = dino.y >= groundY - dino.h - 1;
    if(grounded){
      dino.frameTick++;
      var threshold = dino.ducking ? 5 : 6;
      if(dino.frameTick > threshold){ dino.frame = dino.frame ? 0 : 1; dino.frameTick = 0; }
    }

    spawnTimer--;
    if(spawnTimer <= 0){
      spawnObstacle();
      spawnTimer = Math.max(48 - speed*2.2, 30) + Math.random()*38;
    }
    cloudTimer--;
    if(cloudTimer <= 0){ spawnCloud(); cloudTimer = 90 + Math.random()*90; }

    for(var i=obstacles.length-1;i>=0;i--){
      var o = obstacles[i];
      o.x -= speed;
      if(o.type === 'bird'){
        o.wingTick++;
        if(o.wingTick > 10){ o.wingUp = !o.wingUp; o.wingTick = 0; }
      }
      if(o.x < -60) obstacles.splice(i,1);
      else if(rectHit(dino,o)) gameOver();
    }
    for(var j=clouds.length-1;j>=0;j--){
      clouds[j].x -= speed*0.35;
      if(clouds[j].x < -60) clouds.splice(j,1);
    }

    scoreEl.textContent = pad(Math.floor(score));
    hiEl.textContent = pad(hi);

    draw();
    requestAnimationFrame(update);
  }

  var stars = (function(){
    var arr = [];
    for(var i=0;i<16;i++){
      arr.push({ x: Math.random()*W, y: 10+Math.random()*(groundY-60), r: Math.random()<0.8?1:1.6, tw: Math.random()*Math.PI*2 });
    }
    return arr;
  })();

  function draw(){
    var c = colors();

    // 배경 (낮 → 밤)
    ctx.fillStyle = c.bg;
    ctx.fillRect(0,0,W,H);

    // 밤: 별 + 달
    if(c.moonStar > 0.03){
      ctx.save();
      ctx.globalAlpha = c.moonStar;
      stars.forEach(function(s){
        var tw = 0.6 + 0.4*Math.sin(tick*0.04 + s.tw);
        ctx.globalAlpha = c.moonStar * tw;
        ctx.fillStyle = '#f3efe0';
        ctx.fillRect(s.x, s.y, s.r*PX*0.6, s.r*PX*0.6);
      });
      ctx.globalAlpha = c.moonStar;
      ctx.fillStyle = '#f3efc9';
      var mx = W-90, my = 46, mr = 20;
      ctx.beginPath(); ctx.arc(mx,my,mr,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = c.bg;
      ctx.beginPath(); ctx.arc(mx-8,my-6,mr*0.85,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    clouds.forEach(function(cl){ blit(SPR_CLOUD, cl.x, cl.y, PX*1.2, c.cloud); });

    ctx.strokeStyle = c.ground;
    ctx.lineWidth = 2;
    var goff = (tick*speed*0.6) % GROUND_TILE;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for(var tgx=-goff-GROUND_TILE; tgx<W+GROUND_TILE; tgx+=GROUND_TILE){
      bumps.forEach(function(bp){
        var bx = tgx + bp.x;
        if(bx < -40 || bx > W+40) return;
        ctx.lineTo(bx, groundY);
        ctx.lineTo(bx + bp.w*0.5, groundY - bp.h);
        ctx.lineTo(bx + bp.w, groundY);
      });
    }
    ctx.lineTo(W, groundY);
    ctx.stroke();
    ctx.fillStyle = c.ground;
    var off = (tick*speed*0.6) % 24;
    for(var gx=-off; gx<W; gx+=24){ ctx.fillRect(gx, groundY+4, 10, 3); }

    // 조약돌 텍스처 (충돌 없음, 장식용)
    ctx.fillStyle = c.pebble;
    var poff = (tick*speed*0.6) % PEBBLE_TILE;
    for(var tx=-poff-PEBBLE_TILE; tx<W+PEBBLE_TILE; tx+=PEBBLE_TILE){
      pebbles.forEach(function(p){
        ctx.fillRect(tx+p.x, groundY+p.y, p.s*2, p.s);
      });
    }

    var grounded = dino.y >= groundY - dino.h - 1;
    var dinoRows;
    if(dino.ducking) dinoRows = dino.frame ? SPR_DUCK_B : SPR_DUCK_A;
    else if(!grounded) dinoRows = SPR_DINO_A;
    else dinoRows = dino.frame ? SPR_DINO_B : SPR_DINO_A;
    blit(dinoRows, dino.x, dino.y, PX, c.fg);

    obstacles.forEach(function(o){
      if(o.type === 'cactusS') blit(SPR_CACTUS_S, o.x, o.y, PX, c.accent);
      else if(o.type === 'cactusL') blit(SPR_CACTUS_L, o.x, o.y, PX, c.accent);
      else blit(o.wingUp ? SPR_BIRD_UP : SPR_BIRD_DOWN, o.x, o.y, PX, c.fg);
    });
  }

  // ── 입력: W 점프 · S 슬라이드 ──
  canvas.addEventListener('click', jump);
  overlay.addEventListener('click', jump);

  window.addEventListener('keydown', function(e){
    var k = e.key.toLowerCase();
    if(k === 'w'){
      var r = canvas.getBoundingClientRect();
      var inView = r.top < innerHeight && r.bottom > 0;
      if(inView || state !== 'idle'){ e.preventDefault(); jump(); }
    } else if(k === 's'){
      if(state === 'running'){ e.preventDefault(); setDuck(true); }
    }
  });
  window.addEventListener('keyup', function(e){
    var k = e.key.toLowerCase();
    if(k === 's'){ setDuck(false); }
  });

  overlay.classList.add('show');
  requestAnimationFrame(update);
})();


// ── 프로젝트 상세 모달 ──
var PROJECT_DETAILS = {
  'across-frontline': {
    eyebrow: 'MY PROJECT · 기획 단계',
    title: '어크로스 더 프론트라인',
    sub: 'Across the Frontline · 횡스크롤 전선 돌파 — 프리마 아키에스와 같은 세계, 반대편 시점',
    html:
      '<h4>코어 컨셉</h4>' +
      '<p>괴수왕의 진군에 휩쓸린 약하지만 영리한 괴물이, 동족의 죽음을 발판 삼아 강해지며 인간의 전선을 넘는 횡스크롤 게임입니다. 아군(동족)이 죽을수록 자원이 생기는 뒤집힌 경제가 이 게임의 정체성입니다.</p>' +
      '<h4>프리마 아키에스와의 관계</h4>' +
      '<p>같은 총력전을 괴수 쪽에서 보는 거울상 구조입니다. 저쪽은 사령관이 직접 싸우고 성벽 위 병력이 엄호하지만, 이쪽은 인간 사령관이 뒤에서 병사와 포화로 싸웁니다. 성장 구조도 반대로 짰습니다 — 저쪽은 방어선에 정수·사령관에 특전, 이쪽은 무리에 자원·주인공에 특전이 쌓입니다. 팔라독과 달리 병사를 직접 소환하지 않고, 왕의 진군으로 저절로 밀려드는 무리의 흐름을 이용할 뿐입니다.</p>' +
      '<h4>주인공</h4>' +
      '<p>괴수왕 밑의 약한 개체이지만 이지가 있습니다. "격이 높을수록 이지가 강해진다"는 이 세계의 규칙에서 벗어난 예외이며, "왜 이 개체만 다른가"가 이야기의 첫 질문입니다. 본능대로 돌진하는 동족 사이에서 머리를 써, 힘세고 멍청한 무리를 도구 삼아 살아남고 강해집니다.</p>' +
      '<h4>핵심 루프</h4>' +
      '<p>성벽에 도달해 전선을 넘으면 승리, 주인공이 쓰러지면 패배입니다. 무리는 자원으로, 주인공은 특전으로 — 성장이 두 갈래로 나뉩니다. 동족의 사체를 먹으면 자원이 쌓여 다음 웨이브의 몬스터를 늘릴 수 있지만, 인간 사령관의 소각 포격이 쿨타임마다 사체를 태워 없애기 때문에 그 전에 먹어야 하는 긴장이 생깁니다.</p>' +
      '<h4>인간 측</h4>' +
      '<ul><li>출격 병사 — 강해서 잘 죽지 않지만, 쓰러뜨리면 주인공이 레벨업</li><li>일반 포화 — 무리를 대량으로 죽여 사체(=자원)를 만드는 배경 위협</li><li>소각 포격(정화 포격) — 쿨타임마다 쌓인 사체를 태워 없애는 사령관 스킬</li></ul>' +
      '<p>포탄 낙하 지점을 미리 표식으로 예고하고, 소각 포격은 가장 크게 쌓인 사체 더미를 노리게 해 "사령관이 판을 읽고 있다"는 긴장을 주는 방향을 제안으로 적어뒀습니다.</p>' +
      '<h4>스테이지 구성</h4>' +
      '<p>한 화면 좌우 전선을 유지하고 스테이지마다 적 구성과 인간 사령관의 스킬만 바꾸는 방식을 제안했습니다. 맵을 새로 만들지 않아도 돼 10주 개발 범위에 맞습니다. 협곡 입구의 전초기지들을 차례로 넘고, 마지막에 프리마 아키에스의 성벽에 도달합니다.</p>' +
      '<h4>아직 정하지 않은 것</h4>' +
      '<ul><li>이야기의 끝 — 요새 돌파에서 끝낼지, 자신을 버린 괴수왕에게 맞서는 데까지 갈지</li><li>무리를 이용하는 핵심 방식(방패로 숨기 / 공격 방향 조종 등)과 조작 키</li><li>레벨업을 "인간을 먹어 격이 오른다"로 설명할지, 격과 별개로 둘지</li><li>특전 목록, 다음 웨이브 증강 방식(수 대 강한 개체)</li></ul>' +
      '<ul class="detail-tags"><li>기획 단계</li><li>프리마 아키에스 세계관 연계</li><li>횡스크롤</li></ul>'
  },
  'prima-acies': {
    eyebrow: 'MY PROJECT · 개발 중',
    title: '프리마 아키에스',
    sub: 'Prima Acies · 탑다운 핵앤슬래시 디펜스 — 기획 총괄, 바이브 코딩으로 직접 구현',
    html:
      '<h4>코어 컨셉</h4>' +
      '<p>괴수가 몰려오는 대협곡의 요새를 사령관이 직접 싸우며 지키는 탑다운 웨이브 방어 게임입니다. 핵앤슬래시의 손맛과 디펜스의 운영을 한 판(15웨이브, 15~20분) 안에 묶었고, 자원(정수)을 사령관이 직접 주우러 나가야 한다는 점이 차별점입니다 — 앞으로 나갈수록 자원은 많아지지만 성벽은 그만큼 위험해집니다.</p>' +
      '<h4>세계관</h4>' +
      '<p>괴수의 땅과 인간의 땅을 가르는 유일한 통로, 대협곡 발리스 마그나(Vallis Magna)를 요새 프리마 아키에스(Prima Acies, "첫 번째 전열")가 지킵니다. 괴수는 잡아먹을수록 격이 커지고 격이 높을수록 이지(지성)가 강해진다는 규칙 위에서, 세력이 비대해져 서로 잡아먹기 시작한 괴수 무리가 쌓인 힘을 방출하는 총력전을 감행합니다 — 그 처음부터 끝까지가 게임의 15웨이브입니다.</p>' +
      '<h4>핵심 루프</h4>' +
      '<p>성벽이 무너지면 패배, 15웨이브의 괴수왕을 쓰러뜨리면 승리입니다. 사령관이 쓰러져도 게임은 끝나지 않고 4초 후 체력 60%로 부활하지만, 그동안 성벽은 무방비가 됩니다. "직접 나가 싸우며 정수를 주울지, 병력을 믿고 성벽 가까이 있을지"를 매 순간 저울질하는 것이 게임의 핵심 재미입니다.</p>' +
      '<h4>성장 &amp; 방어선</h4>' +
      '<ul><li>레벨업 특전 — 기본 공격·스킬·생존·기동·수집 다섯 갈래 중 매번 3개 제시, 선택 성장</li><li>스킬 — 수확 / 포효 / 광폭화, 두 슬롯</li><li>방어선 — 성벽(체력 1000) · 정수(처치 시 드랍, 자동 회수 범위 제한) · 병사(궁수·노포, 3단계 강화)</li></ul>' +
      '<h4>웨이브 &amp; 보스</h4>' +
      '<p>5웨이브 협곡 돌진수, 10웨이브 포식 짐승, 15웨이브 최종보스 괴수왕까지 이어집니다. 중간보스에서 "잡몹을 정리해야 보스가 회복하지 못한다"를 먼저 가르치고, 괴수왕에서 같은 행동을 이성과 통제력으로 해내는 존재로 시험하는 구조입니다.</p>' +
      '<h4>개발 현황</h4>' +
      '<p>이번 학기 AI 활용 수업 과제로, 바이브 코딩(HTML Canvas + JavaScript)으로 직접 구현해 GitHub Pages로 배포할 계획입니다. 전체 기획을 담은 기본 틀 프로토타입을 먼저 만들었고, 이제 6주차까지 최소 플레이 가능 버전을 목표로 병사·정수·보스·사운드 순서로 기능을 쌓아가는 단계입니다.</p>' +
      '<ul class="detail-tags"><li>기획 총괄</li><li>HTML Canvas · JS</li><li>GitHub Pages 배포</li></ul>'
  },
  mimicry: {
    eyebrow: 'MY PROJECT · 진행 중',
    title: 'MIMICRY',
    sub: '은신·탐지 기반 6역할 전술 슈터 — 팀 프로젝트, 기획 총괄',
    html:
      '<h4>코어 컨셉</h4>' +
      '<p>서로 다른 정보와 능력을 쥔 여섯 역할이 은신·탐지 시스템 위에서 교전하는 전술 슈터입니다. "보이지 않는 것"이 곧 전략 자원이 되도록, 존재감(Presence)과 탐지(Detection)를 별도 수치로 분리해 설계했습니다.</p>' +
      '<h4>여섯 역할</h4>' +
      '<ul><li>VANGUARD · RECON · MEDIC</li><li>SAPPER · OPERATOR · LANCER</li></ul>' +
      '<h4>빌드 시스템</h4>' +
      '<p>다섯 개 스탯에 공유 10포인트를 나눠 배분하는 빌드 구조로, 역할 간 갈아타기와 팀 조합 실험을 유도합니다.</p>' +
      '<h4>적 티어 &amp; 경제</h4>' +
      '<p>일반 개체부터 최상위 개체인 OMEGA까지 이어지는 적 티어 구조를 설계했고, 게임 내 자원 순환이 특정 전략에 쏠리지 않도록 자가조정형 경제 모델을 함께 짰습니다.</p>' +
      '<h4>진행 상황</h4>' +
      '<p>1차 GDD를 완성했고, 게임 기획 수업의 MDA 프레임워크와 코어·메타 루프 이론을 적용해 설계를 다듬는 중입니다. 이후 Unity(C#)로 직접 구현에 들어갈 계획입니다.</p>' +
      '<ul class="detail-tags"><li>기획 총괄</li><li>시스템 밸런싱</li><li>Unity · C# 예정</li></ul>'
  },
  'mythic-run': {
    eyebrow: 'MY PROJECT · 기획 단계',
    title: 'MYTHIC RUN',
    sub: '라마야나 기반 러너 — 태그 메커닉 설계',
    html:
      '<h4>코어 컨셉</h4>' +
      '<p>라마와 하누만을 번갈아 태그하며 달려, 시타를 구하러 랑카로 가는 라마야나 러너입니다. 원래 모바일로 기획했고, 현재는 웹과 모바일 모두 대응하는 방향으로 다듬고 있습니다. 두 캐릭터를 전략적으로 바꿔가며 달리는 태그 메커닉이 중심입니다.</p>' +
      '<h4>소재와 톤</h4>' +
      '<p>마왕 라바나에게 납치된 시타를 구하러 랑카로 향하는 라마의 여정을 다룹니다. 활의 명수 라마와, 바다를 건너 랑카까지 도약한 일화로 유명한 원숭이 신 하누만이 함께 달립니다. 두 인물 모두 오늘날에도 섬기는 사람이 많은 신앙의 대상이라, 희화화나 우스꽝스러운 패배 연출은 피하고 존중하는 톤을 지키는 것을 원칙으로 두고 있습니다.</p>' +
      '<h4>태그 메커닉</h4>' +
      '<p>한 번에 한 캐릭터만 달리고, 태그 키로 다른 캐릭터와 교대합니다. 앞에 오는 장애물을 보고 누가 달려야 할지 판단하는 것이 핵심 재미입니다. 역할 구분(예: 라마는 활로 적을 쏘아 돌파, 하누만은 도약과 힘으로 돌파)과 교대 게이지, 태그 순간 무적 같은 세부 규칙은 원래 기획서를 기준으로 확정하는 중입니다.</p>' +
      '<h4>조작</h4>' +
      '<p>점프·슬라이드·태그 세 가지 입력으로 구성해 과제의 조작 범위 조건에 맞췄습니다. 장애물에 세 번 부딪히면 실패, 랑카에 도착하면 승리하는 구조를 기본으로 하고 있습니다.</p>' +
      '<h4>MDA 설계</h4>' +
      '<ul><li>메커닉 — 두 캐릭터 태그, 캐릭터별 돌파 능력, 점프·슬라이드</li><li>다이내믹스 — 다가오는 장애물을 읽고 미리 교대 타이밍을 조절</li><li>에스테틱스 — 순간 판단이 맞아떨어지는 쾌감, 두 영웅이 함께 달리는 신화적 판타지</li></ul>' +
      '<h4>진행 상황</h4>' +
      '<p>라마야나 소재, 태그 메커닉, MDA 기반 코어·메타 루프까지는 확정했고, 역할별 세부 규칙과 구간 구성, 엔딩 구조(랑카 도착 종료 vs 거리 경쟁형 무한 러너)는 기획서를 다시 검토하며 맞춰가는 단계입니다.</p>' +
      '<ul class="detail-tags"><li>태그 메커닉 설계</li><li>MDA 프레임워크</li><li>러너</li></ul>'
  }
};

function openModal(id){
  var data = PROJECT_DETAILS[id];
  if(!data) return;
  document.getElementById('detail-eyebrow').textContent = data.eyebrow;
  document.getElementById('detail-title').textContent = data.title;
  document.getElementById('detail-sub').textContent = data.sub;
  document.getElementById('detail-body').innerHTML = data.html;
  var modal = document.getElementById('detail-modal');
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
}
function closeModal(){
  var modal = document.getElementById('detail-modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}
document.querySelectorAll('[data-close]').forEach(function(el){
  el.addEventListener('click', closeModal);
});
window.addEventListener('keydown', function(e){
  if(e.key === 'Escape') closeModal();
});

function easeInOutCubic(t){
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}
function smoothScrollTo(targetEl){
  var startY = window.pageYOffset;
  var targetY = targetEl.getBoundingClientRect().top + startY;
  var distance = targetY - startY;
  var duration = Math.min(Math.max(Math.abs(distance) * 0.6, 500), 1100);
  var startTime = null;
  function step(ts){
    if(startTime === null) startTime = ts;
    var elapsed = ts - startTime;
    var t = Math.min(elapsed / duration, 1);
    var eased = easeInOutCubic(t);
    window.scrollTo(0, startY + distance * eased);
    if(t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

document.querySelectorAll('.btn').forEach(function(btn){
  btn.addEventListener('click', function(e){
    var r = btn.getBoundingClientRect();
    var s = Math.max(r.width, r.height);
    var rip = document.createElement('span');
    rip.className = 'ripple';
    rip.style.width = rip.style.height = s + 'px';
    rip.style.left = (e.clientX - r.left - s/2) + 'px';
    rip.style.top  = (e.clientY - r.top  - s/2) + 'px';
    btn.appendChild(rip);
    setTimeout(function(){ rip.remove(); }, 560);
    if(btn.dataset.project){
      openModal(btn.dataset.project);
    } else if(btn.dataset.scroll){
      var target = document.querySelector(btn.dataset.scroll);
      if(target) smoothScrollTo(target);
    } else {
      toast(btn.dataset.msg || '클릭!');
    }
  });
});
