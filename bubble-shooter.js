/* BUBBLE SHOOTER POP */
(() => {
"use strict";

if (window.BubbleShooterPop) return;

const GAME_ID = "bubble-shooter-pop";

const W = 420;
const H = 720;
const R = 17;
const COLS = 10;
const COLORS = [
  "#ff3b6b",
  "#36c9ff",
  "#ffd43b",
  "#9b65ff",
  "#48e28a",
  "#ff963c"
];

let box = null;
let container = null;
let canvas = null;
let ctx = null;

let bubbles = [];
let particles = [];
let projectile = null;

let level = 1;
let score = 0;
let shots = 0;

let active = false;
let paused = false;
let gameOver = false;
let aiming = false;

let aimAngle = -Math.PI / 2;
let currentColor = COLORS[0];
let nextColor = COLORS[1];

let raf = 0;
let lastTime = 0;
let audio = null;

const rand = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function sound(freq = 500) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    audio ||= new AC();

    if (audio.state === "suspended") audio.resume();

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.frequency.value = freq;
    oscillator.type = "sine";

    gain.gain.setValueAtTime(0.12, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audio.currentTime + 0.15
    );

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start();
    oscillator.stop(audio.currentTime + 0.15);
  } catch (e) {}
}

function playPop() {
  sound(700);
  setTimeout(() => sound(950), 70);
}

function centerX() {
  return W / 2;
}

function shooterY() {
  return H - 65;
}

function createContainer(mountPoint) {
  container = document.createElement("section");
  container.id = GAME_ID;

  container.style.cssText =
    "width:100%;max-width:500px;margin:auto;position:relative;overflow:hidden;border-radius:18px;background:#10172e;color:white;font-family:Arial,sans-serif;";

  container.innerHTML = `
    <style>
      #${GAME_ID} * {
        box-sizing:border-box;
      }

      #${GAME_ID} .bsp-head {
        display:flex;
        justify-content:space-around;
        padding:13px 5px;
        background:#ffffff12;
        text-align:center;
        font-weight:bold;
      }

      #${GAME_ID} .bsp-value {
        display:block;
        color:#ffe47b;
        font-size:20px;
        margin-top:5px;
      }

      #${GAME_ID} canvas {
        display:block;
        width:100%;
        height:auto;
        touch-action:none;
      }

      #${GAME_ID} .bsp-controls {
        display:flex;
        justify-content:center;
        gap:8px;
        padding:12px;
        flex-wrap:wrap;
      }

      #${GAME_ID} button {
        border:0;
        border-radius:12px;
        padding:11px 14px;
        color:white;
        background:linear-gradient(135deg,#477dff,#8b48ef);
        font-weight:bold;
        cursor:pointer;
      }

      #${GAME_ID} button:active {
        transform:scale(.95);
      }

      #${GAME_ID} .bsp-overlay {
        position:absolute;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#090f20df;
        z-index:5;
      }

      #${GAME_ID} .bsp-panel {
        background:linear-gradient(145deg,#273c76,#181b3a);
        border:1px solid #ffffff40;
        border-radius:22px;
        padding:24px;
        text-align:center;
        width:85%;
      }

      #${GAME_ID} .bsp-panel h2 {
        color:#ffe47b;
      }

      #${GAME_ID} .bsp-panel button {
        margin:5px;
      }

      #${GAME_ID} .bsp-hidden {
        display:none!important;
      }
    </style>

    <div class="bsp-head">
      <div>SCORE<span class="bsp-value" id="bsp-score">0</span></div>
      <div>LEVEL<span class="bsp-value" id="bsp-level">1</span></div>
      <div>SHOTS<span class="bsp-value" id="bsp-shots">0</span></div>
    </div>

    <canvas id="bsp-canvas" width="420" height="720"></canvas>

    <div class="bsp-controls">
      <button id="bsp-settings">⚙ Settings</button>
      <button id="bsp-change">🎨 Change Ball</button>
      <button id="bsp-pause">Ⅱ Pause</button>
    </div>

    <div class="bsp-overlay bsp-hidden" id="bsp-overlay">
      <div class="bsp-panel">
        <h2 id="bsp-title">BUBBLE SHOOTER</h2>
        <p id="bsp-message">Ready?</p>
        <button id="bsp-primary">Play</button>
        <button id="bsp-secondary">Settings</button>
      </div>
    </div>
  `;

  mountPoint.innerHTML = "";
  mountPoint.appendChild(container);

  canvas = container.querySelector("#bsp-canvas");
  ctx = canvas.getContext("2d");

  return container;
}

function get(id) {
  return container.querySelector("#" + id);
}

function updateUI() {
  get("bsp-score").textContent = score;
  get("bsp-level").textContent = level;
  get("bsp-shots").textContent = shots;
}

function showOverlay(title, message, button = "Continue") {
  get("bsp-title").textContent = title;
  get("bsp-message").textContent = message;
  get("bsp-primary").textContent = button;
  get("bsp-overlay").classList.remove("bsp-hidden");
}

function hideOverlay() {
  get("bsp-overlay").classList.add("bsp-hidden");
}
   function createBubble(row, col, color) {
  return {
    row,
    col,
    color,
    x: 48 + col * 34 + (row % 2) * 17,
    y: 29 + row * 29.4
  };
}

function createBoard() {
  bubbles = [];

  const rows = Math.min(5 + Math.floor(level / 2), 9);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      if (Math.random() > 0.08) {
        bubbles.push(createBubble(r, c, rand(COLORS)));
      }
    }
  }

  currentColor = rand(COLORS);
  nextColor = rand(COLORS);
}

function start() {
  level = 1;
  score = 0;
  shots = 0;
  gameOver = false;
  paused = false;
  active = true;
  aiming = false;
  projectile = null;
  particles = [];

  createBoard();
  updateUI();
  hideOverlay();

  cancelAnimationFrame(raf);
  lastTime = performance.now();
  raf = requestAnimationFrame(loop);
}

function changeColor() {
  currentColor = rand(COLORS.filter(c => c !== currentColor));
  sound(650);
}

function settings() {
  if (!active || gameOver) return;

  paused = true;

  showOverlay("⚙ SETTINGS", "খেলা বন্ধ আছে", "আবার খেলুন");

  get("bsp-secondary").textContent = "নতুন করে শুরু";

  get("bsp-primary").onclick = () => {
    paused = false;
    hideOverlay();
  };

  get("bsp-secondary").onclick = () => {
    start();
  };
}

function togglePause() {
  if (!active || gameOver) return;

  paused = !paused;

  if (paused) {
    showOverlay("PAUSED", "খেলা বন্ধ আছে", "আবার খেলুন");
  } else {
    hideOverlay();
  }
}

function pointerPosition(e) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (e.clientX - rect.left) / rect.width * W,
    y: (e.clientY - rect.top) / rect.height * H
  };
}

function calculateAngle(p) {
  const dx = p.x - centerX();
  const dy = p.y - shooterY();

  return clamp(
    Math.atan2(dy, dx),
    -Math.PI + 0.18,
    -0.18
  );
}

function pointerDown(e) {
  if (!active || paused || gameOver || projectile) return;

  aiming = true;
  aimAngle = calculateAngle(pointerPosition(e));

  canvas.setPointerCapture(e.pointerId);
}

function pointerMove(e) {
  if (!aiming) return;

  aimAngle = calculateAngle(pointerPosition(e));
}

function pointerUp() {
  if (!aiming) return;

  aiming = false;

  if (!active || paused || gameOver || projectile) return;

  shoot();
}

function shoot() {
  projectile = {
    x: centerX(),
    y: shooterY(),
    vx: Math.cos(aimAngle) * 650,
    vy: Math.sin(aimAngle) * 650,
    color: currentColor
  };

  shots++;

  currentColor = nextColor;
  nextColor = rand(COLORS);

  updateUI();
  sound(350);
}

function makeParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 160;

    particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.6,
      color
    });
  }
}

function findMatches(startBubble) {
  const found = [];
  const stack = [startBubble];

  while (stack.length) {
    const b = stack.pop();

    if (found.includes(b)) continue;
    if (b.color !== startBubble.color) continue;

    found.push(b);

    for (const other of bubbles) {
      if (
        !found.includes(other) &&
        Math.hypot(b.x - other.x, b.y - other.y) < R * 2.1
      ) {
        stack.push(other);
      }
    }
  }

  return found;
}

function snapProjectile() {
  if (!projectile) return;

  const p = projectile;

  const bubble = {
    x: Math.max(R, Math.min(W - R, p.x)),
    y: Math.max(R, p.y),
    color: p.color
  };

  bubbles.push(bubble);
  projectile = null;

  const matches = findMatches(bubble);

  if (matches.length >= 3) {
    matches.forEach(b => {
      makeParticles(b.x, b.y, b.color);
    });

    bubbles = bubbles.filter(b => !matches.includes(b));

    score += matches.length * 15;
    playPop();
  }

  updateUI();

  if (bubbles.length === 0) {
    level++;

    if (level > 20) {
      gameOver = true;
      active = false;
      showOverlay("🏆 YOU WIN!", "সব লেভেল শেষ!", "আবার খেলুন");
      return;
    }

    createBoard();
    updateUI();

    showOverlay("🎉 LEVEL UP!", "নতুন লেভেল " + level, "চালিয়ে যান");
    sound(900);
    return;
  }

  if (bubbles.some(b => b.y > shooterY() - 45)) {
    gameOver = true;
    active = false;

    showOverlay("GAME OVER", "আপনার স্কোর: " + score, "আবার খেলুন");
    sound(150);
  }
}
   function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);

  g.addColorStop(0, "#192b56");
  g.addColorStop(1, "#10152d");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#ffffff10";

  for (let y = 30; y < H; y += 45) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawBubble(x, y, color, radius = R) {
  const g = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.4,
    1,
    x,
    y,
    radius
  );

  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.18, color);
  g.addColorStop(0.75, color);
  g.addColorStop(1, "#111827");

  ctx.save();

  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.restore();
}

function drawAim() {
  if (!aiming) return;

  let x = centerX();
  let y = shooterY();

  let dx = Math.cos(aimAngle);
  let dy = Math.sin(aimAngle);

  ctx.save();

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 7]);

  ctx.beginPath();
  ctx.moveTo(x, y);

  for (let i = 0; i < 160; i++) {
    x += dx * 4;
    y += dy * 4;

    if (x < R || x > W - R) {
      dx *= -1;
      x = Math.max(R, Math.min(W - R, x));
    }

    ctx.lineTo(x, y);

    if (
      y < R ||
      bubbles.some(b => Math.hypot(b.x - x, b.y - y) < R * 1.8)
    ) {
      break;
    }
  }

  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawShooter() {
  const x = centerX();
  const y = shooterY();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(aimAngle + Math.PI / 2);

  ctx.fillStyle = "#cbd5ff";
  ctx.fillRect(-8, -45, 16, 48);

  ctx.restore();

  drawBubble(x, y, currentColor, R + 2);

  ctx.fillStyle = "white";
  ctx.font = "bold 11px Arial";
  ctx.fillText("NEXT", x + 35, y + 4);

  drawBubble(x + 75, y, nextColor, 11);
}

function update(dt) {
  if (projectile) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    if (projectile.x < R || projectile.x > W - R) {
      projectile.vx *= -1;
    }

    const hit = bubbles.some(b =>
      Math.hypot(projectile.x - b.x, projectile.y - b.y) < R * 1.8
    );

    if (projectile.y < R || hit) {
      snapProjectile();
    }
  }

  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 150 * dt;
    p.life -= dt;
  });

  particles = particles.filter(p => p.life > 0);
}

function draw() {
  drawBackground();

  bubbles.forEach(b => {
    drawBubble(b.x, b.y, b.color);
  });

  if (projectile) {
    drawBubble(projectile.x, projectile.y, projectile.color);
  }

  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / 0.6);
    drawBubble(p.x, p.y, p.color, 4);
    ctx.globalAlpha = 1;
  });

  drawAim();
  drawShooter();
}

function loop(time) {
  if (!active) return;

  const dt = Math.min((time - lastTime) / 1000, 0.035);
  lastTime = time;

  if (!paused && !gameOver) {
    update(dt);
  }

  draw();

  raf = requestAnimationFrame(loop);
}

function destroy() {
  active = false;

  cancelAnimationFrame(raf);

  if (canvas) {
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", pointerUp);
  }

  if (container) container.remove();

  canvas = null;
  ctx = null;
  container = null;
  box = null;
}

function mount(mountPoint) {
  if (!mountPoint) return;

  if (container) destroy();

  box = mountPoint;

  createContainer(box);

  get("bsp-settings").onclick = settings;
  get("bsp-change").onclick = changeColor;
  get("bsp-pause").onclick = togglePause;

  get("bsp-primary").onclick = () => {
    if (gameOver) {
      start();
    } else {
      paused = false;
      hideOverlay();
    }
  };

  get("bsp-secondary").onclick = settings;

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);

  start();
}

window.BubbleShooterPop = {
  mount,
  start,
  reset: start,
  pause: togglePause,
  changeColor,
  destroy
};

})();
