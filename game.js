// ===== 定数 =====
const SHOOT_COOLDOWN = 30;
const BOSS_SCORE = 20;
const MAX_WEAPON_LEVEL = 4;
const FINAL_BOSS_SCORE = 150;
const BOSS_DEFEAT_SCORE = 50;
const ENEMY_SPAWN_INTERVAL = 100;
const CHEST_SPAWN_INTERVAL = 8000;
const PLAYER_DAMAGE = 10;
const HERB_HEAL = 20;
const MAX_HP = 100;
const SLIDE_DURATION = 15;
const SLIDE_SPEED = 10;
const CHEST_PICKUP_RANGE = 30;

// ===== Canvas =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

// ===== ユーティリティ =====
function isOffScreen(obj, margin = 50){
  return obj.x < -margin
      || obj.x > canvas.width + margin
      || obj.y < -margin
      || obj.y > canvas.height + margin;
}

// ===== 音源 =====
const SOUND = {
  bgm: "resources/sounds/bgm.mp3",
  getItem: "resources/sounds/get_item.mp3",
  shot: "resources/sounds/shot.mp3",
  shotDamage: "resources/sounds/shot_damage.mp3",
};

const bgm = new Audio(SOUND.bgm);
bgm.loop = true;
bgm.volume = 0.35;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sfxBuffers = {};

async function preloadSfx(){
  const names = ["getItem", "shot", "shotDamage"];
  await Promise.all(names.map(async name => {
    try {
      const res = await fetch(SOUND[name]);
      const arr = await res.arrayBuffer();
      sfxBuffers[name] = await audioCtx.decodeAudioData(arr);
    } catch(e){
      console.warn(`SFXロード失敗 (${name}): ${e.message}. ローカルサーバー経由で開いてください`);
    }
  }));
}

function setupAudio(){
  preloadSfx();

  const start = () => {
    if(audioCtx.state === "suspended") audioCtx.resume();
    bgm.play().catch(() => {});
    removeEventListener("keydown", start);
    removeEventListener("pointerdown", start);
    removeEventListener("touchstart", start);
  };
  addEventListener("keydown", start, { once: true });
  addEventListener("pointerdown", start, { once: true });
  addEventListener("touchstart", start, { once: true });
}

function playSfx(name, volume = 0.6){
  const buffer = sfxBuffers[name];
  if(!buffer || audioCtx.state !== "running") return;
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(audioCtx.destination);
  source.start(0);
}

// ===== ゲーム状態 =====
const state = {
  player: { x: canvas.width/2, y: canvas.height-100, size: 20, speed: 5, hp: 100 },

  bullets: [],
  enemies: [],
  boss: null,
  finalBoss: null,
  bossBullets: [],
  chests: [],

  score: 0,
  weaponLevel: 1,
  gameOver: false,
  gameClear: false,

  sliding: false,
  slideTimer: 0,
  invincible: false,
  shootCooldown: 0,
};

// ===== 入力 =====
const keys = {};
const touch = { move: null, shoot: null };

function setupInput(){
  addEventListener("keydown", e => {
    keys[e.key] = true;

    if(e.key === "x" && !state.sliding){
      state.sliding = true;
      state.slideTimer = SLIDE_DURATION;
      state.invincible = true;
    }
  });

  addEventListener("keyup", e => keys[e.key] = false);

  canvas.addEventListener("touchstart", e => {
    for(const t of e.touches){
      if(t.clientX < canvas.width/2){
        touch.move = t;
      }else{
        touch.shoot = t;
      }
    }
  });

  canvas.addEventListener("touchmove", e => {
    for(const t of e.touches){
      if(touch.move && t.identifier === touch.move.identifier) touch.move = t;
      if(touch.shoot && t.identifier === touch.shoot.identifier) touch.shoot = t;
    }
  });

  canvas.addEventListener("touchend", () => {
    touch.move = null;
    touch.shoot = null;
  });

  document.body.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
}

// ===== スポナー =====
function startSpawners(){
  setInterval(() => {
    if(!state.gameOver){
      state.enemies.push({
        x: Math.random()*canvas.width,
        y: -20,
        size: 20,
        speed: 2,
      });
    }
  }, ENEMY_SPAWN_INTERVAL);

  setInterval(() => {
    state.chests.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height/2,
      size: 20,
      type: Math.random() < 0.5 ? "herb" : "gun",
    });
  }, CHEST_SPAWN_INTERVAL);
}

// ===== プレイヤー =====
function shoot(){
  if(state.gameOver || state.gameClear) return;
  if(state.shootCooldown > 0) return;

  playSfx("shot", 0.3);

  const { player } = state;

  if(state.weaponLevel >= MAX_WEAPON_LEVEL){
    // Lv4: SWORD（11発の散弾）
    const angle = -Math.PI/2;
    for(let i = -1; i <= 1; i += 0.2){
      state.bullets.push({
        x: player.x, y: player.y,
        dx: Math.cos(angle+i)*10,
        dy: Math.sin(angle+i)*10,
        size: 5,
      });
    }
  }else if(state.weaponLevel === 1){
    state.bullets.push({ x: player.x, y: player.y, dx: 0, dy: -8, size: 5 });
  }else if(state.weaponLevel === 2){
    state.bullets.push({ x: player.x-5, y: player.y, dx: 0, dy: -8, size: 5 });
    state.bullets.push({ x: player.x+5, y: player.y, dx: 0, dy: -8, size: 5 });
  }else{
    // Lv3: 5発のV字散弾
    for(let i = -2; i <= 2; i++){
      state.bullets.push({ x: player.x, y: player.y, dx: i, dy: -8, size: 5 });
    }
  }

  state.shootCooldown = SHOOT_COOLDOWN;
}

function updatePlayer(){
  if(state.shootCooldown > 0) state.shootCooldown--;

  const { player } = state;

  if(keys["a"]) player.x -= player.speed;
  if(keys["d"]) player.x += player.speed;
  if(keys["w"]) player.y -= player.speed;
  if(keys["s"]) player.y += player.speed;
  if(keys["g"]) shoot();

  if(touch.move) player.x += (touch.move.clientX - player.x) * 0.15;
  if(touch.shoot) shoot();

  if(state.sliding){
    player.y -= SLIDE_SPEED;
    state.slideTimer--;
    if(state.slideTimer <= 0){
      state.sliding = false;
      state.invincible = false;
    }
  }

  state.bullets.forEach(b => { b.x += b.dx; b.y += b.dy; });
  state.bullets = state.bullets.filter(b => !isOffScreen(b));
}

// ===== 敵 =====
function updateEnemies(){
  state.enemies.forEach(e => e.y += e.speed);
  state.enemies = state.enemies.filter(e => !isOffScreen(e));
}

// ===== ボス =====
function updateBosses(){
  if(state.score >= BOSS_SCORE && !state.boss){
    state.boss = { x: canvas.width/2, y: 80, size: 60, hp: 50, maxHp: 50 };
  }

  if(state.boss){
    state.boss.x += Math.sin(Date.now()*0.002)*2;
    if(Math.random() < 0.02){
      state.bossBullets.push({
        x: state.boss.x, y: state.boss.y,
        dx: 0, dy: 4, size: 8,
      });
    }
  }

  if(state.score >= FINAL_BOSS_SCORE && !state.finalBoss){
    state.finalBoss = { x: canvas.width/2, y: 60, size: 80, hp: 200, maxHp: 200 };
  }

  if(state.finalBoss){
    state.finalBoss.x += Math.sin(Date.now()*0.003)*3;
    if(Math.random() < 0.1){
      for(let i = 0; i < 6; i++){
        const a = Math.PI*2/6 * i;
        state.bossBullets.push({
          x: state.finalBoss.x,
          y: state.finalBoss.y,
          dx: Math.cos(a)*3,
          dy: Math.sin(a)*3,
          size: 10,
        });
      }
    }
  }

  state.bossBullets.forEach(b => { b.x += b.dx; b.y += b.dy; });
  state.bossBullets = state.bossBullets.filter(b => !isOffScreen(b));
}

// ===== 衝突判定 =====
function handleCollisions(){
  // 弾 vs 敵
  state.bullets.forEach((b, bi) => {
    state.enemies.forEach((e, ei) => {
      if(Math.hypot(b.x-e.x, b.y-e.y) < e.size){
        state.enemies.splice(ei, 1);
        state.bullets.splice(bi, 1);
        state.score++;
      }
    });
  });

  // 敵 vs プレイヤー
  state.enemies.forEach((e, ei) => {
    if(Math.hypot(e.x-state.player.x, e.y-state.player.y) < state.player.size){
      state.enemies.splice(ei, 1);
      if(!state.invincible){
        state.player.hp -= PLAYER_DAMAGE;
        state.weaponLevel = 1;
        playSfx("shotDamage");
      }
    }
  });

  // 宝箱 vs プレイヤー
  state.chests.forEach((c, ci) => {
    if(Math.hypot(state.player.x-c.x, state.player.y-c.y) < CHEST_PICKUP_RANGE){
      state.chests.splice(ci, 1);
      if(c.type === "herb"){
        state.player.hp = Math.min(MAX_HP, state.player.hp + HERB_HEAL);
      }else{
        state.weaponLevel = Math.min(MAX_WEAPON_LEVEL, state.weaponLevel + 1);
      }
      playSfx("getItem", 0.7);
    }
  });

  // 弾 vs ボス
  state.bullets.forEach((b, bi) => {
    if(state.boss && Math.hypot(b.x-state.boss.x, b.y-state.boss.y) < state.boss.size){
      state.boss.hp--;
      state.bullets.splice(bi, 1);
      if(state.boss.hp <= 0){
        state.boss = null;
        state.score += BOSS_DEFEAT_SCORE;
      }
    }
    if(state.finalBoss && Math.hypot(b.x-state.finalBoss.x, b.y-state.finalBoss.y) < state.finalBoss.size){
      state.finalBoss.hp--;
      state.bullets.splice(bi, 1);
      if(state.finalBoss.hp <= 0) state.gameClear = true;
    }
  });

  // ボス弾 vs プレイヤー
  state.bossBullets.forEach((b, bi) => {
    if(!state.invincible && Math.hypot(b.x-state.player.x, b.y-state.player.y) < state.player.size){
      state.bossBullets.splice(bi, 1);
      state.player.hp -= PLAYER_DAMAGE;
      state.weaponLevel = 1;
      playSfx("shotDamage");
    }
  });

  if(state.player.hp <= 0) state.gameOver = true;
}

// ===== 描画 =====
function drawPanel(x, y, w, h){
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawHPBar(x, y, w, h, ratio, fillColor){
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function hpColor(ratio){
  if(ratio > 0.5) return "#4caf50";
  if(ratio > 0.25) return "#ff9800";
  return "#f44336";
}

function drawPlayer(){
  const p = state.player;
  ctx.save();
  ctx.shadowColor = state.invincible ? "white" : "cyan";
  ctx.shadowBlur = state.invincible ? 22 : 12;
  ctx.fillStyle = state.invincible ? "rgba(255, 255, 255, 0.9)" : "#00e5ff";
  ctx.fillRect(p.x, p.y, p.size, p.size);
  ctx.restore();
}

function drawBullets(){
  ctx.fillStyle = "#fff176";
  state.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.size, b.size));
}

function drawEnemies(){
  ctx.fillStyle = "#ef5350";
  state.enemies.forEach(e => ctx.fillRect(e.x, e.y, e.size, e.size));
}

function drawChests(){
  ctx.save();
  ctx.shadowBlur = 14;
  state.chests.forEach(c => {
    const color = c.type === "herb" ? "#66bb6a" : "#42a5f5";
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillRect(c.x, c.y, c.size, c.size);
  });
  ctx.restore();
}

function drawBosses(){
  if(state.boss){
    drawBossHPBar({
      label: "BOSS",
      hp: state.boss.hp, maxHp: state.boss.maxHp,
      width: 320, y: 24, fillColor: "#ab47bc",
    });
    ctx.save();
    ctx.shadowColor = "#9c27b0";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#9c27b0";
    ctx.fillRect(state.boss.x, state.boss.y, state.boss.size, state.boss.size);
    ctx.restore();
  }

  if(state.finalBoss){
    drawBossHPBar({
      label: "FINAL BOSS",
      hp: state.finalBoss.hp, maxHp: state.finalBoss.maxHp,
      width: 420, y: state.boss ? 70 : 24, fillColor: "#e53935",
    });
    ctx.save();
    ctx.shadowColor = "#ff1744";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(state.finalBoss.x, state.finalBoss.y, state.finalBoss.size, state.finalBoss.size);
    ctx.restore();
  }
}

function drawBossHPBar({ label, hp, maxHp, width, y, fillColor }){
  const height = 18;
  const x = canvas.width/2 - width/2;

  ctx.fillStyle = "white";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${label}  ${hp} / ${maxHp}`, canvas.width/2, y - 4);
  ctx.textAlign = "left";

  drawHPBar(x, y, width, height, hp / maxHp, fillColor);
}

function drawBossBullets(){
  ctx.fillStyle = "#ffb74d";
  state.bossBullets.forEach(b => ctx.fillRect(b.x, b.y, b.size, b.size));
}

function drawHUD(){
  const panelX = 12;
  const panelY = 12;
  const panelW = 260;
  const panelH = 96;
  drawPanel(panelX, panelY, panelW, panelH);

  // スコア
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255, 235, 59, 0.95)";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("SCORE", panelX + 12, panelY + 24);
  ctx.fillStyle = "white";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(state.score.toString(), panelX + 70, panelY + 26);

  // プレイヤーHPバー
  const hpRatio = state.player.hp / MAX_HP;
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("HP", panelX + 12, panelY + 52);
  drawHPBar(panelX + 38, panelY + 42, 160, 14, hpRatio, hpColor(hpRatio));
  ctx.fillStyle = "white";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.max(0, state.player.hp)} / ${MAX_HP}`, panelX + 246, panelY + 52);
  ctx.textAlign = "left";

  // 武器レベル
  ctx.font = "bold 13px sans-serif";
  if(state.weaponLevel >= MAX_WEAPON_LEVEL){
    ctx.fillStyle = "#ffeb3b";
    ctx.fillText("⚔️ SWORD (MAX)", panelX + 12, panelY + 80);
  }else{
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillText(`WEAPON Lv.${state.weaponLevel} / ${MAX_WEAPON_LEVEL}`, panelX + 12, panelY + 80);
  }
}

function drawOverlay(){
  if(!state.gameOver && !state.gameClear) return;

  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.textAlign = "center";

  if(state.gameOver){
    ctx.shadowColor = "#f44336";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#f44336";
    ctx.font = "bold 64px sans-serif";
    ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
  }else{
    ctx.shadowColor = "#ffeb3b";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#ffeb3b";
    ctx.font = "bold 64px sans-serif";
    ctx.fillText("CLEAR!!", canvas.width/2, canvas.height/2);
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = "white";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(`SCORE: ${state.score}`, canvas.width/2, canvas.height/2 + 44);
  ctx.restore();
  ctx.textAlign = "left";
}

function draw(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawChests();
  drawBosses();
  drawBossBullets();
  drawHUD();
  drawOverlay();
}

// ===== ゲームループ =====
function update(){
  if(state.gameOver || state.gameClear) return;

  updatePlayer();
  updateEnemies();
  updateBosses();
  handleCollisions();
}

function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}

// ===== 起動 =====
setupAudio();
setupInput();
startSpawners();
loop();
