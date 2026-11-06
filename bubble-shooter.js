/* BUBBLE SHOOTER POP — GORGEOUS EDITION */
(() => {
  "use strict";

  if (window.BubbleShooterPop) return;

  const SAVE_KEY = "gamebangla_bubble_shooter_save_v2";
  const W = 420, H = 720, R = 16;
  const COLS = 10;
  const STEP_X = 36;
  const STEP_Y = 31;
  const START_X = 30;
  const COLORS = [
    "#ff1768",
    "#00d9ff",
    "#ffe000",
    "#a855ff",
    "#00f58a",
    "#ff7a18"
  ];

  let root, canvas, ctx;
  let active = false;
  let paused = false;
  let gameOver = false;
  let aiming = false;
  let raf = 0;
  let lastTime = 0;
  let audio = null;

  let bubbles = [];
  let particles = [];
  let confetti = [];
  let projectile = null;

  let score = 0;
  let level = 1;
  let shots = 0;
  let misses = 0;
  let currentColor = 0;
  let nextColor = 1;
  let aimX = W / 2;
  let aimY = 200;
  let celebrationTime = 0;
  let levelCompletePending = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const random = (a, b) => Math.random() * (b - a) + a;

  function audioContext() {
    try {
      if (!audio) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audio = new AC();
      }
      if (audio && audio.state === "suspended") audio.resume();
      return audio;
    } catch (_) {
      return null;
    }
  }

  function tone(freq, duration, type = "sine", volume = 0.08, endFreq = null) {
    const ac = audioContext();
    if (!ac) return;

    try {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);

      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(1, endFreq),
          ac.currentTime + duration
        );
      }

      gain.gain.setValueAtTime(volume, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ac.currentTime + duration
      );

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + duration);
    } catch (_) {}
  }

  function playShoot() {
    tone(440, 0.11, "triangle", 0.07, 190);
  }

  function playPop() {
    tone(700, 0.09, "sine", 0.08, 280);
    setTimeout(() => tone(950, 0.07, "triangle", 0.04, 500), 35);
  }

  function playLevelUp() {
    [523, 659, 784, 1047].forEach((n, i) => {
      setTimeout(() => tone(n, 0.22, "sine", 0.09), i * 130);
    });
  }

  function playCelebration() {
    [660, 880, 1046, 1320, 1568].forEach((n, i) => {
      setTimeout(() => tone(n, 0.25, "triangle", 0.07), i * 110);
    });
  }

  function playGameOver() {
    tone(380, 0.3, "triangle", 0.08, 180);
    setTimeout(() => tone(240, 0.45, "sine", 0.07, 90), 250);
  }

  function saveGame() {
    try {
      const data = {
        version: 2,
        bubbles,
        score,
        level,
        shots,
        misses,
        currentColor,
        nextColor,
        gameOver,
        paused,
        levelCompletePending
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.bubbles)) return false;
      if (!Number.isFinite(data.level) || data.level < 1) return false;

      bubbles = data.bubbles.filter(b =>
        b &&
        Number.isInteger(b.row) &&
        Number.isInteger(b.col) &&
        b.row >= 0 &&
        b.col >= 0 &&
        b.col < COLS &&
        COLORS.includes(b.color)
      );

      score = Number(data.score) || 0;
      level = Number(data.level) || 1;
      shots = Number(data.shots) || 0;
      misses = Number(data.misses) || 0;
      currentColor = clamp(Number(data.currentColor) || 0, 0, COLORS.length - 1);
      nextColor = clamp(Number(data.nextColor) || 1, 0, COLORS.length - 1);
      gameOver = !!data.gameOver;
      levelCompletePending = !!data.levelCompletePending;

      if (!bubbles.length && !gameOver && !levelCompletePending) {
        return false;
      }

      paused = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  function cellX(row, col) {
    return START_X + col * STEP_X + (row % 2 ? STEP_X / 2 : 0);
  }

  function cellY(row) {
    return 48 + row * STEP_Y;
  }

  function createBoard() {
    bubbles = [];
    const rows = Math.min(5 + Math.floor((level - 1) / 2), 9);
    const colorCount = Math.min(3 + Math.floor((level - 1) / 3), COLORS.length);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r > 2 && Math.random() < 0.08) continue;

        bubbles.push({
          row: r,
          col: c,
          color: COLORS[Math.floor(Math.random() * colorCount)]
        });
      }
    }

    currentColor = Math.floor(Math.random() * colorCount);
    nextColor = Math.floor(Math.random() * colorCount);
    projectile = null;
    misses = 0;
  }

  function start(resetAll = true) {
    if (resetAll) {
      score = 0;
      level = 1;
      shots = 0;
      misses = 0;
      gameOver = false;
      levelCompletePending = false;
      particles = [];
      confetti = [];
      createBoard();
    }

    paused = false;
    active = true;
    saveGame();
    showStatus();
  }

  function showStatus() {
    if (!root) return;

    const scoreEl = root.querySelector("[data-score]");
    const levelEl = root.querySelector("[data-level]");
    const shotsEl = root.querySelector("[data-shots]");

    if (scoreEl) scoreEl.textContent = score;
    if (levelEl) levelEl.textContent = level;
    if (shotsEl) shotsEl.textContent = shots;
  }

  function getBubble(row, col) {
    return bubbles.find(b => b.row === row && b.col === col);
  }

  function neighbors(b) {
    const even = b.row % 2 === 0;
    const offsets = even
      ? [[0,-1],[0,1],[-1,-1],[-1,0],[1,-1],[1,0]]
      : [[0,-1],[0,1],[-1,0],[-1,1],[1,0],[1,1]];

    return offsets
      .map(([dr, dc]) => getBubble(b.row + dr, b.col + dc))
      .filter(Boolean);
  }

  function findGroup(startBubble) {
    const found = [];
    const seen = new Set();
    const queue = [startBubble];

    while (queue.length) {
      const b = queue.shift();
      const key = `${b.row},${b.col}`;

      if (seen.has(key)) continue;
      seen.add(key);
      found.push(b);

      neighbors(b).forEach(n => {
        if (n.color === startBubble.color) {
          queue.push(n);
        }
      });
    }

    return found;
  }

  function dropFloatingBubbles() {
    const connected = new Set();
    const queue = bubbles.filter(b => b.row === 0);

    while (queue.length) {
      const b = queue.shift();
      const key = `${b.row},${b.col}`;

      if (connected.has(key)) continue;
      connected.add(key);
      neighbors(b).forEach(n => queue.push(n));
    }

    const floating = bubbles.filter(
      b => !connected.has(`${b.row},${b.col}`)
    );

    if (floating.length) {
      bubbles = bubbles.filter(b =>
        connected.has(`${b.row},${b.col}`)
      );

      floating.forEach(b => {
        score += 10;
        makePopParticles(cellX(b.row, b.col), cellY(b.row), b.color);
      });
      playPop();
    }
  }

  function makePopParticles(x, y, color) {
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = random(55, 190);

      particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: random(0.35, 0.7),
        maxLife: 0.7,
        size: random(2, 5),
        color
      });
    }
  }

  function findNearestFreeCell(x, y) {
    let best = null;
    let bestDistance = Infinity;

    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < COLS; col++) {
        if (getBubble(row, col)) continue;

        const cx = cellX(row, col);
        const cy = cellY(row);
        const d = Math.hypot(cx - x, cy - y);

        if (d < bestDistance) {
          bestDistance = d;
          best = { row, col, distance: d };
        }
      }
    }

    return best;
  }

  function snapProjectile() {
    if (!projectile) return;

    const spot = findNearestFreeCell(projectile.x, projectile.y);

    if (!spot) {
      projectile = null;
      return;
    }

    const placed = {
      row: spot.row,
      col: spot.col,
      color: projectile.color
    };

    bubbles.push(placed);
    projectile = null;

    const group = findGroup(placed);

    if (group.length >= 3) {
      group.forEach(b => {
        score += 10;
        makePopParticles(cellX(b.row, b.col), cellY(b.row), b.color);
      });

      const removed = new Set(group);
      bubbles = bubbles.filter(b => !removed.has(b));
      playPop();
      dropFloatingBubbles();
      misses = 0;
    } else {
      misses++;
    }

    shots++;
    currentColor = nextColor;
    nextColor = Math.floor(Math.random() * COLORS.length);

    if (misses >= 5) {
      addNewRow();
      misses = 0;
    }

    if (bubbles.some(b => cellY(b.row) > 560)) {
      endGame();
      return;
    }

    if (!bubbles.length) {
      finishLevel();
      return;
    }

    showStatus();
    saveGame();
  }

  function addNewRow() {
    bubbles.forEach(b => b.row++);

    for (let c = 0; c < COLS; c++) {
      bubbles.push({
        row: 0,
        col: c,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
  }

  function shoot() {
    if (!active || paused || gameOver || projectile) return;

    const dx = aimX - W / 2;
    const dy = aimY - 650;
    const length = Math.hypot(dx, dy) || 1;

    if (dy > -25) return;

    const speed = 570;

    projectile = {
      x: W / 2,
      y: 650,
      vx: dx / length * speed,
      vy: dy / length * speed,
      color: COLORS[currentColor]
    };

    playShoot();
  }

  function finishLevel() {
    level++;

    if (level > 20) {
      endGame(true);
      return;
    }

    score += 100;
    createBoard();

    paused = true;
    active = true;
    levelCompletePending = true;

    celebrate();
    playCelebration();
    saveGame();
    showOverlay("🎉 লেভেল সম্পন্ন!", "পরের লেভেলে যেতে নিচের বোতাম চাপুন", "পরের লেভেল");
    showStatus();
  }

  function endGame(won = false) {
    gameOver = true;
    paused = true;
    active = true;
    projectile = null;

    saveGame();

    if (won) {
      celebrate();
      playCelebration();
      showOverlay("🏆 অভিনন্দন!", "আপনি সব লেভেল শেষ করেছেন!", "আবার খেলুন");
    } else {
      playGameOver();
      showOverlay("গেম ওভার!", "আবার চেষ্টা করুন।", "আবার খেলুন");
    }
  }

  function celebrate() {
    confetti = [];

    for (let i = 0; i < 170; i++) {
      confetti.push({
        x: random(0, W),
        y: random(-H, 0),
        vx: random(-45, 45),
        vy: random(80, 260),
        size: random(4, 9),
        rot: random(0, 6),
        spin: random(-5, 5),
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }

    celebrationTime = 4.5;
  }

  function showOverlay(title, message, buttonText) {
    const overlay = root.querySelector("[data-overlay]");
    overlay.innerHTML = `
      <div class="bsp-panel">
        <div class="bsp-big">${title}</div>
        <p>${message}</p>
        <button class="bsp-main" data-overlay-action>${buttonText}</button>
      </div>
    `;
    overlay.style.display = "flex";

    overlay.querySelector("[data-overlay-action]").onclick = () => {
      overlay.style.display = "none";

      if (levelCompletePending) {
        levelCompletePending = false;
        paused = false;
        saveGame();
      } else {
        start(true);
      }
    };
  }

  function hideOverlay() {
    const overlay = root.querySelector("[data-overlay]");
    if (overlay) overlay.style.display = "none";
  }

  function togglePause() {
    if (!active || gameOver || levelCompletePending) return;

    paused = !paused;

    if (paused) {
      showOverlay("⏸️ গেম বিরতি", "খেলা আবার শুরু করতে নিচের বোতাম চাপুন", "খেলা চালু করুন");
      const btn = root.querySelector("[data-overlay-action]");
      btn.onclick = () => {
        hideOverlay();
        paused = false;
      };
    } else {
      hideOverlay();
    }

    saveGame();
  }

  function changeColor() {
    if (paused || gameOver) return;

    const old = currentColor;
    currentColor = nextColor;
    nextColor = old;
    saveGame();
  }

  function settings() {
    if (!active || gameOver) return;

    paused = true;

    const overlay = root.querySelector("[data-overlay]");
    overlay.innerHTML = `
      <div class="bsp-panel">
        <div class="bsp-big">⚙️ সেটিংস</div>
        <p>আপনি কী করতে চান?</p>
        <button class="bsp-main" data-resume>খেলায় ফিরে যান</button>
        <button class="bsp-secondary" data-reset>নতুন করে শুরু</button>
        <button class="bsp-secondary" data-close>বন্ধ করুন</button>
      </div>
    `;
    overlay.style.display = "flex";

    overlay.querySelector("[data-resume]").onclick = () => {
      hideOverlay();
      paused = false;
    };

    overlay.querySelector("[data-reset]").onclick = () => {
      hideOverlay();
      start(true);
    };

    overlay.querySelector("[data-close]").onclick = () => {
      saveGame();
      hideOverlay();
      if (typeof window.closeGame === "function") {
        window.closeGame();
      }
    };
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#111b45");
    g.addColorStop(0.55, "#17265a");
    g.addColorStop(1, "#080f2b");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 35; i++) {
      const x = (i * 83) % W;
      const y = (i * 137) % H;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(0, 0, W, 5);
  }

  function drawBubble(x, y, color, radius = R) {
    const g = ctx.createRadialGradient(
      x - radius * 0.35,
      y - radius * 0.42,
      1,
      x,
      y,
      radius * 1.2
    );

    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.13, color);
    g.addColorStop(0.7, color);
    g.addColorStop(1, "#10152c");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(
      x - radius * 0.34,
      y - radius * 0.4,
      radius * 0.25,
      radius * 0.12,
      -0.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(x + radius * 0.35, y + radius * 0.35, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawAim() {
    if (!aiming || paused || gameOver || projectile) return;

    let dx = aimX - W / 2;
    let dy = aimY - 650;
    const length = Math.hypot(dx, dy) || 1;

    dx /= length;
    dy /= length;

    if (dy > -0.15) return;

    let x = W / 2;
    let y = 650;
    let vx = dx;
    let vy = dy;

    ctx.save();
    ctx.setLineDash([7, 7]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let i = 0; i < 180; i++) {
      x += vx * 4;
      y += vy * 4;

      if (x < R || x > W - R) {
        vx *= -1;
        x = clamp(x, R, W - R);
      }

      ctx.lineTo(x, y);

      if (y < 0 || y > 610) break;
    }

    ctx.stroke();
    ctx.restore();
  }

  function drawShooter() {
    ctx.save();

    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 12;

    ctx.fillStyle = "#b7d7ff";
    ctx.beginPath();
    ctx.arc(W / 2, 650, 23, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#304b91";
    ctx.beginPath();
    ctx.arc(W / 2, 650, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    drawBubble(W / 2, 650, COLORS[currentColor], 15);
    drawBubble(W / 2 + 52, 650, COLORS[nextColor], 10);

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("NEXT", W / 2 + 52, 678);
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawConfetti() {
    confetti.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
      ctx.restore();
    });
  }

  function draw() {
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);
    drawBackground();

    bubbles.forEach(b => {
      drawBubble(cellX(b.row, b.col), cellY(b.row), b.color);
    });

    drawAim();

    if (projectile) {
      drawBubble(projectile.x, projectile.y, projectile.color);
    }

    drawShooter();
    drawParticles();
    drawConfetti();
  }

  function update(dt) {
    if (!paused && !gameOver && projectile) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;

      if (projectile.x < R) {
        projectile.x = R;
        projectile.vx = Math.abs(projectile.vx);
      }

      if (projectile.x > W - R) {
        projectile.x = W - R;
        projectile.vx = -Math.abs(projectile.vx);
      }

      let hit = false;

      if (projectile.y < 35) {
        hit = true;
      }

      for (const b of bubbles) {
        const d = Math.hypot(
          projectile.x - cellX(b.row, b.col),
          projectile.y - cellY(b.row)
        );

        if (d < R * 2 - 2) {
          hit = true;
          break;
        }
      }

      if (hit) snapProjectile();
    }

    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      p.life -= dt;
    });

    particles = particles.filter(p => p.life > 0);

    confetti.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;

      if (p.y > H + 20) {
        p.y = -15;
        p.x = random(0, W);
      }
    });

    if (celebrationTime > 0) {
      celebrationTime -= dt;
      if (celebrationTime <= 0) confetti = [];
    }
  }

  function loop(time) {
    if (!active) return;

    const dt = Math.min((time - lastTime) / 1000 || 0, 0.035);
    lastTime = time;

    update(dt);
    draw();

    raf = requestAnimationFrame(loop);
  }

  function pointerPosition(e) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: (e.clientX - rect.left) * W / rect.width,
      y: (e.clientY - rect.top) * H / rect.height
    };
  }

  function pointerDown(e) {
    if (paused || gameOver || projectile) return;

    audioContext();
    aiming = true;

    const p = pointerPosition(e);
    aimX = p.x;
    aimY = p.y;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  function pointerMove(e) {
    if (!aiming) return;

    const p = pointerPosition(e);
    aimX = p.x;
    aimY = p.y;
  }

  function pointerUp() {
    if (!aiming) return;

    aiming = false;
    shoot();
  }

  function mount(box) {
    if (!box) return;

    if (root === box && active) return;

    root = box;

    root.innerHTML = `
      <div class="bsp-game">
        <div class="bsp-header">
          <div class="bsp-brand">🫧 Bubble Shooter Pop</div>
          <button class="bsp-close" data-close aria-label="বন্ধ করুন">✕</button>
        </div>

        <div class="bsp-stats">
          <div>⭐ স্কোর <b data-score>0</b></div>
          <div>🏆 লেভেল <b data-level>1</b></div>
          <div>🎯 শট <b data-shots>0</b></div>
        </div>

        <div class="bsp-stage">
          <canvas width="420" height="720"></canvas>
          <div class="bsp-overlay" data-overlay></div>
        </div>

        <div class="bsp-controls">
          <button data-settings>⚙️ সেটিংস</button>
          <button data-change>🎨 বল বদল</button>
          <button data-pause>⏸️ বিরতি</button>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      .bsp-game {
        width:100%;
        max-width:560px;
        height:98dvh;
        max-height:900px;
        min-height:420px;
        margin:auto;
        padding:7px;
        box-sizing:border-box;
        display:flex;
        flex-direction:column;
        gap:7px;
        color:#fff;
        font-family:Arial,sans-serif;
        background:linear-gradient(145deg,#101b46,#080d24);
        border-radius:17px;
        overflow:hidden;
      }

      .bsp-header {
        display:flex;
        justify-content:space-between;
        align-items:center;
        flex-shrink:0;
      }

      .bsp-brand {
        font-size:18px;
        font-weight:900;
        color:#fff;
        text-shadow:0 2px 8px #00cfff;
      }

      .bsp-close {
        width:35px;
        height:35px;
        border:0;
        border-radius:50%;
        color:#fff;
        background:#e53962;
        font-size:20px;
        font-weight:bold;
      }

      .bsp-stats {
        display:flex;
        justify-content:space-around;
        gap:4px;
        padding:8px 3px;
        flex-shrink:0;
        border-radius:10px;
        background:#ffffff17;
        font-size:12px;
      }

      .bsp-stats b {
        color:#ffe45e;
        font-size:14px;
      }

      .bsp-stage {
        position:relative;
        flex:1;
        min-height:0;
        display:flex;
        justify-content:center;
        align-items:center;
        overflow:hidden;
        border-radius:12px;
        background:#0b1435;
      }

      .bsp-stage canvas {
        display:block;
        width:auto;
        height:100%;
        max-width:100%;
        aspect-ratio:420/720;
        object-fit:contain;
        touch-action:none;
        user-select:none;
      }

      .bsp-controls {
        display:flex;
        gap:6px;
        flex-shrink:0;
      }

      .bsp-controls button {
        flex:1;
        min-width:0;
        padding:11px 3px;
        border:0;
        border-radius:10px;
        color:#fff;
        background:linear-gradient(135deg,#3759bc,#713bba);
        font-weight:bold;
        font-size:12px;
      }

      .bsp-overlay {
        position:absolute;
        inset:0;
        z-index:3;
        display:none;
        align-items:center;
        justify-content:center;
        padding:15px;
        box-sizing:border-box;
        background:#080d207e;
      }

      .bsp-panel {
        width:100%;
        max-width:300px;
        padding:23px 16px;
        border:1px solid #ffffff55;
        border-radius:20px;
        text-align:center;
        background:linear-gradient(145deg,#253c86,#421d70);
        box-shadow:0 12px 40px #0009;
      }

      .bsp-big {
        font-size:24px;
        font-weight:900;
        color:#fff;
        text-shadow:0 2px 10px #00d9ff;
      }

      .bsp-panel p {
        color:#fff;
        font-size:14px;
      }

      .bsp-panel button {
        width:100%;
        padding:12px;
        margin-top:9px;
        border:0;
        border-radius:10px;
        color:#182044;
        font-size:15px;
        font-weight:900;
      }

      .bsp-main {
        background:linear-gradient(90deg,#ffe45e,#ff9d38);
      }

      .bsp-secondary {
        background:#ffffffdd;
      }

      @media(max-height:560px) {
        .bsp-game { gap:4px; padding:4px; }
        .bsp-stats { padding:4px; }
        .bsp-controls button { padding:7px 2px; }
        .bsp-brand { font-size:15px; }
      }
    `;

    root.appendChild(style);

    canvas = root.querySelector("canvas");
    ctx = canvas.getContext("2d");

    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);

    root.querySelector("[data-settings]").onclick = settings;
    root.querySelector("[data-change]").onclick = changeColor;
    root.querySelector("[data-pause]").onclick = togglePause;

    root.querySelector("[data-close]").onclick = () => {
      saveGame();
      if (typeof window.closeGame === "function") {
        window.closeGame();
      }
    };

    particles = [];
    confetti = [];
    projectile = null;

    if (loadGame()) {
      active = true;

      if (levelCompletePending) {
        celebrate();
        showOverlay(
          "🎉 লেভেল সম্পন্ন!",
          "পরের লেভেলে যেতে নিচের বোতাম চাপুন",
          "পরের লেভেল"
        );
      } else if (gameOver) {
        showOverlay("গেম শেষ!", "আবার চেষ্টা করুন।", "আবার খেলুন");
      } else {
        paused = false;
      }
    } else {
      start(true);
    }

    showStatus();

    cancelAnimationFrame(raf);
    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function destroy() {
    saveGame();
    active = false;
    aiming = false;
    cancelAnimationFrame(raf);
    raf = 0;

    if (audio) {
      try {
        audio.close();
      } catch (_) {}
      audio = null;
    }

    root = null;
    canvas = null;
    ctx = null;
  }

  window.BubbleShooterPop = {
    mount,
    start,
    reset: () => start(true),
    pause: togglePause,
    changeColor,
    destroy
  };
})();
