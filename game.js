// ===== 定数 =====
const SHOOT_COOLDOWN = 30;
const BOSS_SCORE = 20;
const SWORD_SCORE = 100;
const FINAL_BOSS_SCORE = 150;
const BOSS_DEFEAT_SCORE = 50;
const ENEMY_SPAWN_INTERVAL = 100;
const CHEST_SPAWN_INTERVAL = 8000;
const PLAYER_DAMAGE = 10;
const HERB_HEAL = 20;
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

// ===== ゲーム状態 =====
const state = {
  player: { x: canvas.width/2, y: canvas.height-100, size: 20, speed: 5, hp: 100 },

  bullets: [],
  enemies: [],
  boss: null,
  finalBoss: null,
  bossBullets: [],
  chests: [],
  inventory: [],

  score: 0,
  weaponLevel: 1,
  hasSword: false,
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

    if(e.key === "e" && state.inventory.length > 0){
      const item = state.inventory[0];
      if(item === "herb") state.player.hp += HERB_HEAL;
      if(item === "gun") state.weaponLevel++;
      state.inventory.shift();
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
    });
  }, CHEST_SPAWN_INTERVAL);
}

// ===== プレイヤー =====
function shoot(){
  if(state.gameOver || state.gameClear) return;
  if(state.shootCooldown > 0) return;

  const angle = -Math.PI/2;
  const { player } = state;

  if(state.hasSword){
    for(let i = -1; i <= 1; i += 0.2){
      state.bullets.push({
        x: player.x, y: player.y,
        dx: Math.cos(angle+i)*10,
        dy: Math.sin(angle+i)*10,
        size: 5,
      });
    }
    state.shootCooldown = SHOOT_COOLDOWN;
    return;
  }

  if(state.weaponLevel === 1){
    state.bullets.push({ x: player.x, y: player.y, dx: 0, dy: -8, size: 5 });
  }else if(state.weaponLevel === 2){
    state.bullets.push({ x: player.x-5, y: player.y, dx: 0, dy: -8, size: 5 });
    state.bullets.push({ x: player.x+5, y: player.y, dx: 0, dy: -8, size: 5 });
  }else{
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

  if(state.score >= SWORD_SCORE) state.hasSword = true;
}

// ===== 敵 =====
function updateEnemies(){
  state.enemies.forEach(e => e.y += e.speed);
  state.enemies = state.enemies.filter(e => !isOffScreen(e));
}

// ===== ボス =====
function updateBosses(){
  if(state.score >= BOSS_SCORE && !state.boss){
    state.boss = { x: canvas.width/2, y: 80, size: 60, hp: 50 };
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
    state.finalBoss = { x: canvas.width/2, y: 60, size: 80, hp: 200 };
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
      if(!state.invincible) state.player.hp -= PLAYER_DAMAGE;
    }
  });

  // 宝箱 vs プレイヤー
  state.chests.forEach((c, ci) => {
    if(Math.hypot(state.player.x-c.x, state.player.y-c.y) < CHEST_PICKUP_RANGE){
      state.chests.splice(ci, 1);
      state.inventory.push(Math.random() < 0.5 ? "gun" : "herb");
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
    }
  });

  if(state.player.hp <= 0) state.gameOver = true;
}

// ===== 描画 =====
function drawPlayer(){
  ctx.fillStyle = "cyan";
  ctx.fillRect(state.player.x, state.player.y, state.player.size, state.player.size);
}

function drawBullets(){
  ctx.fillStyle = "yellow";
  state.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.size, b.size));
}

function drawEnemies(){
  ctx.fillStyle = "red";
  state.enemies.forEach(e => ctx.fillRect(e.x, e.y, e.size, e.size));
}

function drawChests(){
  ctx.fillStyle = "gold";
  state.chests.forEach(c => ctx.fillRect(c.x, c.y, c.size, c.size));
}

function drawBosses(){
  if(state.boss){
    ctx.fillStyle = "purple";
    ctx.fillRect(state.boss.x, state.boss.y, state.boss.size, state.boss.size);
    ctx.fillStyle = "white";
    ctx.fillText("Boss HP:" + state.boss.hp, canvas.width/2 - 50, 20);
  }
  if(state.finalBoss){
    ctx.fillStyle = "black";
    ctx.fillRect(state.finalBoss.x, state.finalBoss.y, state.finalBoss.size, state.finalBoss.size);
  }
}

function drawBossBullets(){
  ctx.fillStyle = "orange";
  state.bossBullets.forEach(b => ctx.fillRect(b.x, b.y, b.size, b.size));
}

function drawHUD(){
  ctx.fillStyle = "white";
  ctx.fillText("Score:" + state.score, 20, 30);
  ctx.fillText("HP:" + state.player.hp, 20, 50);

  state.inventory.forEach((item, i) => {
    ctx.fillText(item, 20, 80 + i * 20);
  });

  if(state.hasSword) ctx.fillText("⚔️ SWORD!", 20, 140);
}

function drawOverlay(){
  if(state.gameOver){
    ctx.fillStyle = "red";
    ctx.font = "40px sans-serif";
    ctx.fillText("GAME OVER", canvas.width/2 - 120, canvas.height/2);
  }
  if(state.gameClear){
    ctx.fillStyle = "yellow";
    ctx.font = "40px sans-serif";
    ctx.fillText("CLEAR!!", canvas.width/2 - 100, canvas.height/2);
  }
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
setupInput();
startSpawners();
loop();
