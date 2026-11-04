
/* =========================================================
   BUBBLE SHOOTER POP
   Standalone JavaScript Game Engine
   Version: 1.0
   ========================================================= */

(() => {
  "use strict";

  if (window.BubbleShooterPop) return;

  const GAME_ID = "bubble-shooter-pop";
  const COLORS = [
    "#ff3b6b",
    "#36c9ff",
    "#ffd43b",
    "#9b65ff",
    "#48e28a",
    "#ff963c"
  ];

  const CONFIG = {
    width: 420,
    height: 720,
    radius: 17,
    rows: 9,
    columns: 10,
    minMatch: 3,
    speed: 650,
    maxLevel: 20
  };

  let canvas = null;
  let ctx = null;
  let animation = null;
  let active = false;
  let paused = false;
  let gameOver = false;
  let level = 1;
  let score = 0;
  let shots = 0;
  let bubbles = [];
  let particles = [];
  let projectile = null;
  let aimAngle = -Math.PI / 2;
  let aiming = false;
  let pointer = null;
  let currentColor = COLORS[0];
  let nextColor = COLORS[1];
  let audioContext = null;
  let lastTime = 0;
  let width = CONFIG.width;
  let height = CONFIG.height;
  let scale = 1;
  let container = null;
  let ui = {};
  let raf = 0;

  const random = arr => arr[Math.floor(Math.random() * arr.length)];
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function sound(freq = 440, duration = 0.12, type = "sine", volume = 0.12) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;

      audioContext ||= new AC();

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) {}
  }

  function popSound() {
    sound(700, 0.08, "sine", 0.09);
    setTimeout(() => sound(950, 0.12, "triangle", 0.08), 45);
  }

  function celebrationSound() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => sound(f, 0.25, "triangle", 0.12), i * 130);
    });
  }

  function ensureCanvas() {
    container = document.getElementById(GAME_ID);

    if (!container) {
      container = document.createElement("section");
      container.id = GAME_ID;
      container.style.cssText =
        "width:100%;max-width:500px;margin:auto;position:relative;";
      document.body.appendChild(container);
    }

    container.innerHTML = "";

    const style = document.createElement("style");
    style.textContent = `
      #${GAME_ID} {
        background: radial-gradient(ellipse at top,#243d75,#10172e 75%);
        color:white;font-family:Arial,sans-serif;
        border-radius:18px;overflow:hidden;
        box-shadow:0 12px 45px #0008;
        user-select:none;
      }
      #${GAME_ID} .bsp-head {
        display:flex;justify-content:space-around;
        padding:13px 5px;background:#ffffff12;
        font-weight:bold;text-align:center;
      }
      #${GAME_ID} .bsp-value {
        color:#ffe47b;font-size:20px;display:block;
        margin-top:5px;
      }
      #${GAME_ID} canvas {
        display:block;width:100%;height:auto;
        touch-action:none;
      }
      #${GAME_ID} .bsp-controls {
        display:flex;justify-content:center;gap:9px;
        padding:12px;flex-wrap:wrap;
      }
      #${GAME_ID} button {
        border:0;border-radius:12px;padding:11px 15px;
        color:white;background:linear-gradient(135deg,#477dff,#8b48ef);
        font-weight:bold;cursor:pointer;
      }
      #${GAME_ID} button:active { transform:scale(.95); }
      #${GAME_ID} .bsp-overlay {
        position:absolute;inset:0;display:flex;
        align-items:center;justify-content:center;
        background:#090f20df;z-index:5;
      }
      #${GAME_ID} .bsp-panel {
        background:linear-gradient(145deg,#273c76,#181b3a);
        border:1px solid #ffffff40;border-radius:22px;
        padding:24px;text-align:center;width:82%;
        box-shadow:0 15px 50px #0008;
      }
      #${GAME_ID} .bsp-panel h2 {color:#ffe47b;}
      #${GAME_ID} .bsp-panel button {margin:5px;}
      #${GAME_ID} .bsp-hidden {display:none!important;}
    `;
    container.appendChild(style);

    const header = document.createElement("div");
    header.className = "bsp-head";
    header.innerHTML = `
      <div>SCORE<span class="bsp-value" id="bsp-score">0</span></div>
      <div>LEVEL<span class="bsp-value" id="bsp-level">1</span></div>
      <div>SHOTS<span class="bsp-value" id="bsp-shots">0</span></div>
    `;
    container.appendChild(header);

    canvas = document.createElement("canvas");
    canvas.width = CONFIG.width;
    canvas.height = CONFIG.height;
    canvas.setAttribute("aria-label", "Bubble Shooter game board");
    container.appendChild(canvas);
    ctx = canvas.getContext("2d");

    const controls = document.createElement("div");
    controls.className = "bsp-controls";
    controls.innerHTML = `
      <button id="bsp-settings">⚙ Settings</button>
      <button id="bsp-change">🎨 Change Ball</button>
      <button id="bsp-pause">Ⅱ Pause</button>
    `;
    container.appendChild(controls);

    const overlay = document.createElement("div");
    overlay.className = "bsp-overlay bsp-hidden";
    overlay.id = "bsp-overlay";
    overlay.innerHTML = `
      <div class="bsp-panel">
        <h2 id="bsp-title">BUBBLE SHOOTER</h2>
        <p id="bsp-message">Ready?</p>
        <button id="bsp-primary">Play</button>
        <button id="bsp-secondary">Settings</button>
      </div>
    `;
    container.appendChild(overlay);

    const get = id => container.querySelector("#" + id);

    ui = {
      score: get("bsp-score"),
      level: get("bsp-level"),
      shots: get("bsp-shots"),
      overlay: get("bsp-overlay"),
      title: get("bsp-title"),
      message: get("bsp-message"),
      primary: get("bsp-primary"),
      secondary: get("bsp-secondary")
    };

    get("bsp-settings").addEventListener("click", settings);
    get("bsp-change").addEventListener("click", changeColor);
    get("bsp-pause").addEventListener("click", togglePause);

    ui.primary.addEventListener("click", () => {
      if (gameOver) start();
      else if (paused) togglePause();
      else hideOverlay();
    });

    ui.secondary.addEventListener("click", settings);

    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);

    window.addEventListener("resize", resize);
    resize();
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    scale = rect.width / CONFIG.width || 1;
  }

  function updateUI() {
    ui.score.textContent = score;
    ui.level.textContent = level;
    ui.shots.textContent = shots;
  }

  function showOverlay(title, message, primary = "Continue", secondary = "Settings") {
    ui.title.textContent = title;
    ui.message.textContent = message;
    ui.primary.textContent = primary;
    ui.secondary.textContent = secondary;
    ui.overlay.classList.remove("bsp-hidden");
  }

  function hideOverlay() {
    ui.overlay.classList.add("bsp-hidden");
  }

  function settings() {
    if (!active) return;
    paused = true;
    showOverlay("⚙ SETTINGS", "Choose your game option", "Resume", "Reset Game");
    ui.secondary.onclick = () => {
      ui.secondary.onclick = null;
      start();
    };
    ui.primary.onclick = () => {
      ui.primary.onclick = null;
      paused = false;
      hideOverlay();
    };
  }

  function changeColor() {
    const available = COLORS.filter(c => c !== currentColor);
    currentColor = random(available);
    sound(650, 0.1, "triangle");
  }

  function togglePause() {
    if (!active || gameOver) return;
    paused = !paused;
    if (paused) showOverlay("PAUSED", "Game is paused", "Resume", "Settings");
    else hideOverlay();
  }

  function createBubble(row, col, color) {
    return {
      row,
      col,
      x: col * CONFIG.radius * 2 + CONFIG.radius + (row % 2) * CONFIG.radius,
      y: row * CONFIG.radius * 1.72 + CONFIG.radius + 12,
      color
    };
  }

  function getCenterX() {
    return CONFIG.width / 2;
  }

  function getShooterY() {
    return CONFIG.height - 65;
  }

  function createBoard() {
    bubbles = [];

    const rowCount = Math.min(5 + Math.floor(level / 2), CONFIG.rows);

    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < CONFIG.columns; c++) {
        if (Math.random() < 0.91) {
          bubbles.push(createBubble(r, c, random(COLORS)));
        }
      }
    }

    currentColor = random(COLORS);
    nextColor = random(COLORS);
  }

  function start() {
    level = 1;
    score = 0;
    shots = 0;
    gameOver = false;
    paused = false;
    active = true;
    particles = [];
    projectile = null;
    createBoard();
    hideOverlay();
    updateUI();
    lastTime = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function nextLevel() {
    if (level >= CONFIG.maxLevel) {
      gameOver = true;
      active = false;
      celebrationSound();
      showOverlay("🏆 YOU WIN!", "All levels completed!", "Play Again", "Settings");
      return;
    }

    level++;
    celebrationSound();
    showOverlay("🎉 LEVEL UP!", "Welcome to Level " + level, "Continue", "Settings");
    createBoard();
    updateUI();
  }

  function pointerDown(e) {
    if (!active || paused || gameOver || projectile) return;
    aiming = true;
    pointer = getPointer(e);
    aimAngle = calculateAngle(pointer);
    canvas.setPointerCapture(e.pointerId);
  }

  function pointerMove(e) {
    if (!aiming || !active) return;
    pointer = getPointer(e);
    aimAngle = calculateAngle(pointer);
  }

  function pointerUp(e) {
    if (!aiming) return;
    aiming = false;
    if (!active || paused || gameOver || projectile) return;
    shoot();
  }

  function getPointer(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * CONFIG.width,
      y: (e.clientY - rect.top) / rect.height * CONFIG.height
    };
  }

  function calculateAngle(p) {
    const dx = p.x - getCenterX();
    const dy = p.y - getShooterY();
    return clamp(Math.atan2(dy, dx), -Math.PI + 0.18, -0.18);
  }

  function shoot() {
    if (projectile) return;

    projectile = {
      x: getCenterX(),
      y: getShooterY(),
      vx: Math.cos(aimAngle) * CONFIG.speed,
      vy: Math.sin(aimAngle) * CONFIG.speed,
      color: currentColor
    };

    shots++;
    currentColor = nextColor;
    nextColor = random(COLORS);
    updateUI();
    sound(360, 0.08, "triangle");
  }

  function snapProjectile() {
    if (!projectile) return;

    const p = projectile;
    const bubble = {
      x: clamp(p.x, CONFIG.radius, CONFIG.width - CONFIG.radius),
      y: Math.max(CONFIG.radius, p.y),
      color: p.color
    };

    bubbles.push(bubble);
    projectile = null;

    const matched = findMatches(bubble);

    if (matched.length >= CONFIG.minMatch) {
      matched.forEach(b => {
        score += 10;
        createParticles(b.x, b.y, b.color);
      });

      bubbles = bubbles.filter(b => !matched.includes(b));
      popSound();
      score += matched.length * 5;

      const floating = findFloatingBubbles();
      floating.forEach(b => {
        score += 15;
        createParticles(b.x, b.y, b.color);
      });
      bubbles = bubbles.filter(b => !floating.includes(b));
    }

    updateUI();

    if (bubbles.length === 0) {
      nextLevel();
      return;
    }

    if (bubbles.some(b => b.y > getShooterY() - 45)) {
      gameOver = true;
      active = false;
      sound(150, 0.5, "sawtooth");
      showOverlay("GAME OVER", "Final Score: " + score, "Play Again", "Settings");
    }
  }

  function findMatches(startBubble) {
    const result = [];
    const stack = [startBubble];
    const visited = new Set();

    while (stack.length) {
      const b = stack.pop();
      if (visited.has(b)) continue;
      visited.add(b);

      if (b.color !== startBubble.color) continue;
      result.push(b);

      bubbles.forEach(other => {
        if (!visited.has(other) && other !== b &&
            distance(b, other) < CONFIG.radius * 2.15) {
          stack.push(other);
        }
      });
    }

    return result;
  }

  function findFloatingBubbles() {
    const connected = new Set();
    const stack = bubbles.filter(b => b.y < CONFIG.radius * 2.2);

    while (stack.length) {
      const b = stack.pop();
      if (connected.has(b)) continue;
      connected.add(b);

      bubbles.forEach(other => {
        if (!connected.has(other) && distance(b, other) < CONFIG.radius * 2.15) {
          stack.push(other);
        }
      });
    }

    return bubbles.filter(b => !connected.has(b));
  }

  function createParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 190;

      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.65,
        maxLife: 0.65,
        color,
        size: 2 + Math.random() * 5
      });
    }
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#192b56");
    gradient.addColorStop(1, "#10152d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#ffffff0c";
    ctx.lineWidth = 1;

    for (let y = 30; y < height; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawBubble(x, y, color, radius = CONFIG.radius) {
    const gradient = ctx.createRadialGradient(
      x - radius * 0.35,
      y - radius * 0.4,
      radius * 0.05,
      x,
      y,
      radius
    );

    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.13, color);
    gradient.addColorStop(0.65, color);
    gradient.addColorStop(1, "#111827");

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 9;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x - radius * 0.34, y - radius * 0.36, radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffffbb";
    ctx.fill();

    ctx.restore();
  }

  function drawAim() {
    if (!aiming) return;

    const x = getCenterX();
    const y = getShooterY();
    let dx = Math.cos(aimAngle);
    let dy = Math.sin(aimAngle);
    let px = x;
    let py = y;

    ctx.save();
    ctx.setLineDash([6, 7]);
    ctx.strokeStyle = "#ffffffd9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);

    for (let i = 0; i < 160; i++) {
      px += dx * 4;
      py += dy * 4;

      if (px < CONFIG.radius || px > CONFIG.width - CONFIG.radius) {
        dx *= -1;
        px = clamp(px, CONFIG.radius, CONFIG.width - CONFIG.radius);
      }

      ctx.lineTo(px, py);

      if (py < CONFIG.radius ||
          bubbles.some(b => Math.hypot(b.x - px, b.y - py) < CONFIG.radius * 1.8)) {
        break;
      }
    }

    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawShooter() {
    const x = getCenterX();
    const y = getShooterY();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(aimAngle + Math.PI / 2);

    ctx.fillStyle = "#cbd5ff";
    ctx.beginPath();
    ctx.roundRect(-8, -45, 16, 48, 8);
    ctx.fill();
    ctx.restore();

    drawBubble(x, y, currentColor, CONFIG.radius + 2);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Arial";
    ctx.fillText("NEXT", x + 36, y + 4);
    drawBubble(x + 78, y, nextColor, 11);
  }

  function drawParticles(dt) {
    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 170 * dt;
      p.life -= dt;

      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    particles = particles.filter(p => p.life > 0);
  }

  function update(dt) {
    if (projectile) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;

      if (projectile.x < CONFIG.radius ||
          projectile.x > CONFIG.width - CONFIG.radius) {
        projectile.vx *= -1;
      }

      const hit = bubbles.some(b =>
        distance(projectile, b) < CONFIG.radius * 1.85
      );

      if (projectile.y < CONFIG.radius || hit) {
        snapProjectile();
      }
    }

    drawParticles(dt);
  }

  function draw() {
    drawBackground();

    bubbles.forEach(b => drawBubble(b.x, b.y, b.color));

    if (projectile) {
      drawBubble(projectile.x, projectile.y, projectile.color);
    }

    drawAim();
    drawShooter();
  }

  function loop(timestamp) {
    if (!active) return;

    const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.035);
    lastTime = timestamp;

    if (!paused && !gameOver) update(dt);
    else drawParticles(dt);

    draw();

    raf = requestAnimationFrame(loop);
  }

  function reset() {
    start();
  }

  function destroy() {
    active = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);

    if (container) container.remove();
    canvas = null;
    ctx = null;
    container = null;
  }

  const API = {
    start,
    reset,
    pause: togglePause,
    destroy,
    changeColor,
    getState: () => ({
      level,
      score,
      shots,
      active,
      paused,
      gameOver
    })
  };

  window.BubbleShooterPop = API;

  ensureCanvas();
  start();

})();
