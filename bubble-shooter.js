
/* =====================================================
   GAMEBANGLA ARENA - BUBBLE SHOOTER POP
   Complete replacement code
   ===================================================== */

(function () {
  "use strict";

  const W = 360;
  const H = 560;
  const COLS = 10;
  const MAX_ROWS = 16;
  const R = 15;
  const GAP = 2;
  const PITCH = R * 2 + GAP;
  const DANGER_Y = 435;
  const SAVE_KEY = "gbaBubbleShooterProgressV2";

  const COLORS = [
    "#ff303f",
    "#168bff",
    "#ffd52e",
    "#19d66b",
    "#a34cff",
    "#ff8b22"
  ];

  let root = null;
  let canvas = null;
  let ctx = null;
  let animationId = null;
  let lastTime = 0;
  let grid = [];
  let particles = [];
  let confetti = [];
  let projectile = null;
  let aiming = false;
  let aimPoint = { x: W / 2, y: 250 };
  let pointerId = null;
  let currentColor = 0;
  let nextColor = 1;
  let level = 1;
  let score = 0;
  let bestScore = 0;
  let soundOn = true;
  let gameState = "playing";
  let menuOpen = false;
  let confirmOpen = false;
  let lastShotTime = 0;

  const rand = n => Math.floor(Math.random() * n);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      level = Math.max(1, Number(saved.level) || 1);
      score = Math.max(0, Number(saved.score) || 0);
      bestScore = Math.max(0, Number(saved.bestScore) || 0);
      soundOn = saved.soundOn !== false;
    } catch (e) {
      level = 1;
      score = 0;
      bestScore = 0;
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        level,
        score,
        bestScore,
        soundOn
      }));
    } catch (e) {}
  }

  function activeColorCount() {
    return Math.min(6, 3 + Math.floor(level / 2));
  }

  function startingRows() {
    return Math.min(14, 5 + Math.floor((level - 1) * 0.65));
  }

  function activeColors() {
    return COLORS.slice(0, activeColorCount());
  }

  function randomColor() {
    const colors = activeColors();
    return colors[rand(colors.length)];
  }

  function getCellPosition(row, col) {
    const baseX = (W - ((COLS - 1) * PITCH + R * 2)) / 2;
    return {
      x: baseX + R + col * PITCH + (row % 2 ? PITCH / 2 : 0),
      y: 25 + row * (PITCH - 2)
    };
  }

  function createGrid() {
    grid = Array.from({ length: MAX_ROWS }, () =>
      Array(COLS).fill(null)
    );

    const rows = startingRows();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        // A few spaces make the board pattern more interesting.
        const holeChance = level < 3 ? 0.04 : Math.min(0.15, 0.04 + level * 0.002);

        if (Math.random() > holeChance || r === 0) {
          grid[r][c] = { color: randomColor() };
        }
      }
    }

    // Ensure every available color exists on the board.
    const colors = activeColors();
    colors.forEach((color, i) => {
      if (grid[0][i]) grid[0][i].color = color;
    });
  }

  function playSound(frequency = 440, duration = 0.09, type = "sine") {
    if (!soundOn) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audio = new AudioCtx();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      gain.gain.setValueAtTime(0.08, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);

      oscillator.onended = () => audio.close();
    } catch (e) {}
  }

  function updateInfo() {
    if (!root) return;

    const levelText = root.querySelector(".bs-level");
    const scoreText = root.querySelector(".bs-score");
    const bestText = root.querySelector(".bs-best");
    const soundText = root.querySelector(".bs-sound");

    if (levelText) levelText.textContent = level;
    if (scoreText) scoreText.textContent = score;
    if (bestText) bestText.textContent = bestScore;
    if (soundText) soundText.textContent = soundOn ? "🔊 Sound On" : "🔇 Sound Off";

    const currentBall = root.querySelector(".bs-current-ball");
    const nextBall = root.querySelector(".bs-next-ball");

    if (currentBall) currentBall.style.background = COLORS[currentColor];
    if (nextBall) nextBall.style.background = COLORS[nextColor];
  }

  function createInterface(box) {
    box.innerHTML = `
      <div class="bs-game">
        <style>
          .bs-game {
            width:100%;
            max-width:420px;
            margin:0 auto;
            padding:10px;
            box-sizing:border-box;
            color:#fff;
            font-family:Arial,sans-serif;
            background:linear-gradient(145deg,#101b38,#182c52);
            border-radius:18px;
            position:relative;
            overflow:hidden;
          }
          .bs-game * { box-sizing:border-box; }
          .bs-top {
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:6px;
            margin-bottom:9px;
          }
          .bs-stat {
            flex:1;
            text-align:center;
            padding:7px 3px;
            border-radius:9px;
            background:#263d67;
            font-size:12px;
            font-weight:bold;
          }
          .bs-stat strong {
            display:block;
            font-size:17px;
            margin-top:3px;
            color:#ffe36a;
          }
          .bs-settings {
            border:0;
            border-radius:10px;
            background:#ffca3a;
            color:#18213a;
            font-size:22px;
            width:43px;
            height:43px;
            cursor:pointer;
          }
          .bs-canvas-wrap {
            position:relative;
            width:100%;
            border-radius:13px;
            overflow:hidden;
            background:linear-gradient(#152c56,#101b37);
            border:2px solid #496da5;
          }
          .bs-canvas {
            display:block;
            width:100%;
            height:auto;
            touch-action:none;
            user-select:none;
          }
          .bs-controls {
            display:flex;
            justify-content:center;
            align-items:center;
            gap:12px;
            margin-top:10px;
          }
          .bs-ball-info {
            display:flex;
            align-items:center;
            gap:7px;
            background:#263d67;
            border-radius:12px;
            padding:7px 10px;
            font-size:11px;
            font-weight:bold;
          }
          .bs-ball {
            width:25px;
            height:25px;
            border-radius:50%;
            border:2px solid #ffffffaa;
            box-shadow:inset -4px -5px 7px #0005,inset 4px 4px 7px #fff8,0 0 8px #fff5;
          }
          .bs-change {
            border:0;
            padding:11px 13px;
            border-radius:10px;
            background:#12c98a;
            color:#062d24;
            font-weight:bold;
            font-size:13px;
            cursor:pointer;
          }
          .bs-hint {
            text-align:center;
            color:#c8d9f7;
            font-size:11px;
            margin-top:9px;
          }
          .bs-overlay {
            position:absolute;
            inset:0;
            z-index:5;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:15px;
            background:#071329dd;
          }
          .bs-panel {
            width:100%;
            max-width:290px;
            text-align:center;
            padding:20px 15px;
            border-radius:17px;
            background:linear-gradient(145deg,#294b7d,#172b50);
            border:2px solid #7db8ff;
            box-shadow:0 10px 35px #0008;
          }
          .bs-panel h2 {
            margin:0 0 12px;
            font-size:25px;
            color:#ffe36a;
          }
          .bs-panel p {
            font-size:14px;
            line-height:1.6;
          }
          .bs-menu-btn {
            display:block;
            width:100%;
            border:0;
            border-radius:10px;
            padding:12px;
            margin-top:9px;
            font-weight:bold;
            font-size:14px;
            cursor:pointer;
            background:#e6f0ff;
            color:#152748;
          }
          .bs-primary {
            background:#ffcf3d;
            color:#342400;
          }
          .bs-danger {
            background:#ff626e;
            color:#fff;
          }
          .bs-hidden { display:none !important; }
          .bs-confetti {
            position:absolute;
            top:-15px;
            width:9px;
            height:14px;
            border-radius:2px;
            animation:bs-fall 2.8s linear infinite;
            z-index:1;
          }
          @keyframes bs-fall {
            0% { transform:translateY(-20px) rotate(0deg); opacity:1; }
            100% { transform:translateY(580px) rotate(720deg); opacity:0; }
          }
          .bs-celebrate {
            animation:bs-pop .5s ease-in-out infinite alternate;
          }
          @keyframes bs-pop {
            from { transform:scale(1); }
            to { transform:scale(1.06); }
          }
          @media (max-width:380px) {
            .bs-stat { font-size:10px; }
            .bs-stat strong { font-size:15px; }
            .bs-controls { gap:6px; }
            .bs-ball-info { padding:6px; }
            .bs-change { padding:10px 8px; }
          }
        </style>

        <div class="bs-top">
          <div class="bs-stat">LEVEL<strong class="bs-level">1</strong></div>
          <div class="bs-stat">SCORE<strong class="bs-score">0</strong></div>
          <div class="bs-stat">BEST<strong class="bs-best">0</strong></div>
          <button class="bs-settings" type="button" aria-label="Settings">⚙️</button>
        </div>

        <div class="bs-canvas-wrap">
          <canvas class="bs-canvas" width="360" height="560"></canvas>

          <div class="bs-overlay bs-menu bs-hidden">
            <div class="bs-panel">
              <h2>⚙️ Settings</h2>
              <button class="bs-menu-btn bs-sound-toggle">🔊 Sound On</button>
              <button class="bs-menu-btn bs-restart-open bs-danger">Restart Game</button>
              <button class="bs-menu-btn bs-menu-close">Back to Game</button>
            </div>
          </div>

          <div class="bs-overlay bs-confirm bs-hidden">
            <div class="bs-panel">
              <h2>Restart?</h2>
              <p>আপনি কি সত্যিই নতুন করে খেলা শুরু করতে চান?</p>
              <button class="bs-menu-btn bs-primary bs-confirm-yes">হ্যাঁ, Restart</button>
              <button class="bs-menu-btn bs-menu-close">না, ফিরে যান</button>
            </div>
          </div>

          <div class="bs-overlay bs-level-complete bs-hidden">
            <div class="bs-panel">
              <div class="bs-celebrate" style="font-size:36px">🎉🏆🎉</div>
              <h2>LEVEL COMPLETE!</h2>
              <p>অসাধারণ! আপনি Level <span class="bs-completed-level"></span> শেষ করেছেন।</p>
              <p>আপনার স্কোর: <strong class="bs-completed-score">0</strong></p>
              <button class="bs-menu-btn bs-primary bs-next-level">Next Level ➜</button>
            </div>
          </div>

          <div class="bs-overlay bs-game-over bs-hidden">
            <div class="bs-panel">
              <div style="font-size:38px">😢</div>
              <h2>GAME OVER</h2>
              <p>আপনার স্কোর: <strong class="bs-over-score">0</strong></p>
              <p>Settings থেকে Restart করে আবার খেলুন।</p>
              <button class="bs-menu-btn bs-primary bs-over-settings">⚙️ Settings</button>
            </div>
          </div>
        </div>

        <div class="bs-controls">
          <div class="bs-ball-info">
            <span>NOW</span>
            <span class="bs-ball bs-current-ball"></span>
          </div>
          <button class="bs-change" type="button">🔄 বল বদল</button>
          <div class="bs-ball-info">
            <span>NEXT</span>
            <span class="bs-ball bs-next-ball"></span>
          </div>
        </div>

        <div class="bs-hint">
          বলের কাছে আঙুল চেপে ধরে লক্ষ্য ঠিক করুন, ছেড়ে দিলে বল ছুটবে।
        </div>
      </div>
    `;

    root = box.querySelector(".bs-game");
    canvas = root.querySelector(".bs-canvas");
    ctx = canvas.getContext("2d");

    root.querySelector(".bs-settings").addEventListener("click", openSettings);
    root.querySelector(".bs-change").addEventListener("click", changeBall);
    root.querySelector(".bs-sound-toggle").addEventListener("click", toggleSound);
    root.querySelector(".bs-restart-open").addEventListener("click", openRestartConfirm);
    root.querySelector(".bs-confirm-yes").addEventListener("click", restartGame);
    root.querySelector(".bs-next-level").addEventListener("click", nextLevel);
    root.querySelector(".bs-over-settings").addEventListener("click", openSettings);

    root.querySelectorAll(".bs-menu-close").forEach(btn => {
      btn.addEventListener("click", closePanels);
    });

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("lostpointercapture", onPointerCancel);

    updateInfo();
  }

  function showPanel(selector) {
    if (!root) return;
    root.querySelectorAll(".bs-overlay").forEach(el => el.classList.add("bs-hidden"));
    const panel = root.querySelector(selector);
    if (panel) panel.classList.remove("bs-hidden");
  }

  function closePanels() {
    if (!root) return;
    root.querySelectorAll(".bs-overlay").forEach(el => el.classList.add("bs-hidden"));
    menuOpen = false;
    confirmOpen = false;
    if (gameState === "playing") playSound(520, 0.05);
  }

  function openSettings() {
    if (gameState === "levelcomplete" || gameState === "gameover") {
      // Settings can still be opened from the game-over panel.
    }
    menuOpen = true;
    showPanel(".bs-menu");
  }

  function openRestartConfirm() {
    confirmOpen = true;
    showPanel(".bs-confirm");
  }

  function toggleSound() {
    soundOn = !soundOn;
    updateInfo();
    saveProgress();
    const btn = root.querySelector(".bs-sound-toggle");
    btn.textContent = soundOn ? "🔊 Sound On" : "🔇 Sound Off";
    if (soundOn) playSound(660, 0.1);
  }

  function changeBall() {
    if (gameState !== "playing" || projectile || aiming) return;

    const temp = currentColor;
    currentColor = nextColor;
    nextColor = temp;

    updateInfo();
    playSound(620, 0.07);
  }

  function restartGame() {
    level = 1;
    score = 0;
    currentColor = 0;
    nextColor = 1;
    projectile = null;
    particles = [];
    gameState = "playing";
    createGrid();
    closePanels();
    saveProgress();
    updateInfo();
    playSound(520, 0.12);
  }

  function nextLevel() {
    if (gameState !== "levelcomplete") return;

    level++;
    gameState = "playing";
    projectile = null;
    particles = [];
    currentColor = rand(activeColorCount());
    nextColor = rand(activeColorCount());

    createGrid();
    closePanels();
    saveProgress();
    updateInfo();
    playSound(700, 0.15);
  }

  function getPointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (W / rect.width),
      y: (event.clientY - rect.top) * (H / rect.height)
    };
  }

  function onPointerDown(event) {
    if (gameState !== "playing" || projectile) return;

    const p = getPointerPosition(event);

    // Start aiming only when touching the lower shooter area.
    if (p.y < H - 145) return;

    event.preventDefault();
    aiming = true;
    pointerId = event.pointerId;
    aimPoint = p;

    try {
      canvas.setPointerCapture(pointerId);
    } catch (e) {}
  }

  function onPointerMove(event) {
    if (!aiming || event.pointerId !== pointerId) return;
    event.preventDefault();
    aimPoint = getPointerPosition(event);
  }

  function onPointerUp(event) {
    if (!aiming || event.pointerId !== pointerId) return;

    event.preventDefault();
    aimPoint = getPointerPosition(event);
    aiming = false;
    pointerId = null;

    fireBall();
  }

  function onPointerCancel(event) {
    if (!aiming) return;
    if (event && pointerId !== null && event.pointerId !== pointerId) return;

    aiming = false;
    pointerId = null;
  }

  function getShooterPosition() {
    return { x: W / 2, y: H - 42 };
  }

  function fireBall() {
    if (gameState !== "playing" || projectile) return;

    const shooter = getShooterPosition();
    let dx = aimPoint.x - shooter.x;
    let dy = aimPoint.y - shooter.y;

    if (dy > -20) dy = -20;

    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= length;
    dy /= length;

    // Prevent shooting downwards.
    if (dy > -0.18) dy = -0.18;

    const normalLength = Math.sqrt(dx * dx + dy * dy);
    dx /= normalLength;
    dy /= normalLength;

    projectile = {
      x: shooter.x,
      y: shooter.y,
      vx: dx * 7,
      vy: dy * 7,
      color: COLORS[currentColor]
    };

    currentColor = nextColor;
    nextColor = rand(activeColorCount());

    updateInfo();
    playSound(380, 0.08, "triangle");
  }

  function getNeighbors(row, col) {
    const list = [];

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === row && c === col) continue;

        const a = getCellPosition(row, col);
        const b = getCellPosition(r, c);
        const dx = a.x - b.x;
        const dy = a.y - b.y;

        if (Math.sqrt(dx * dx + dy * dy) < PITCH + 2) {
          list.push([r, c]);
        }
      }
    }

    return list;
  }

  function findNearestEmpty(x, y) {
    let best = null;
    let bestDistance = Infinity;

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) continue;

        const p = getCellPosition(r, c);
        const dx = p.x - x;
        const dy = p.y - y;
        const d = dx * dx + dy * dy;

        if (d < bestDistance) {
          bestDistance = d;
          best = { row: r, col: c, distance: d };
        }
      }
    }

    return best;
  }

  function findMatchingGroup(startRow, startCol, color) {
    const queue = [[startRow, startCol]];
    const visited = new Set();
    const group = [];

    while (queue.length) {
      const [r, c] = queue.shift();
      const key = r + "," + c;

      if (visited.has(key)) continue;
      visited.add(key);

      const cell = grid[r] && grid[r][c];
      if (!cell || cell.color !== color) continue;

      group.push([r, c]);

      getNeighbors(r, c).forEach(([nr, nc]) => {
        const next = grid[nr] && grid[nr][nc];
        if (next && next.color === color) {
          queue.push([nr, nc]);
        }
      });
    }

    return group;
  }

  function removeFloatingBubbles() {
    const connected = new Set();
    const queue = [];

    for (let c = 0; c < COLS; c++) {
      if (grid[0][c]) queue.push([0, c]);
    }

    while (queue.length) {
      const [r, c] = queue.shift();
      const key = r + "," + c;

      if (connected.has(key)) continue;
      if (!grid[r] || !grid[r][c]) continue;

      connected.add(key);

      getNeighbors(r, c).forEach(([nr, nc]) => {
        if (grid[nr][nc]) queue.push([nr, nc]);
      });
    }

    let removed = 0;

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] && !connected.has(r + "," + c)) {
          const p = getCellPosition(r, c);
          createBurst(p.x, p.y, grid[r][c].color);
          grid[r][c] = null;
          removed++;
        }
      }
    }

    if (removed) {
      score += removed * 15;
      playSound(760, 0.13, "sine");
    }

    return removed;
  }

  function createBurst(x, y, color) {
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + rand(15),
        color
      });
    }
  }

  function attachProjectile() {
    if (!projectile) return;

    const nearest = findNearestEmpty(projectile.x, projectile.y);

    if (!nearest) {
      projectile = null;
      endGame();
      return;
    }

    const { row, col } = nearest;
    grid[row][col] = { color: projectile.color };

    const group = findMatchingGroup(row, col, projectile.color);

    if (group.length >= 3) {
      group.forEach(([r, c]) => {
        const p = getCellPosition(r, c);
        createBurst(p.x, p.y, grid[r][c].color);
        grid[r][c] = null;
      });

      score += group.length * 10;
      playSound(590, 0.14, "triangle");

      removeFloatingBubbles();
    }

    projectile = null;

    if (score > bestScore) bestScore = score;

    updateInfo();
    saveProgress();

    if (isBoardEmpty()) {
      completeLevel();
      return;
    }

    if (hasReachedDangerLine()) {
      endGame();
    }
  }

  function isBoardEmpty() {
    return grid.every(row => row.every(cell => !cell));
  }

  function hasReachedDangerLine() {
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!grid[r][c]) continue;

        const p = getCellPosition(r, c);
        if (p.y + R >= DANGER_Y) return true;
      }
    }
    return false;
  }

  function completeLevel() {
    gameState = "levelcomplete";
    projectile = null;

    if (score > bestScore) bestScore = score;
    saveProgress();
    updateInfo();

    root.querySelector(".bs-completed-level").textContent = level;
    root.querySelector(".bs-completed-score").textContent = score;

    createConfetti();
    showPanel(".bs-level-complete");

    playSound(660, 0.18);
    setTimeout(() => playSound(820, 0.18), 170);
    setTimeout(() => playSound(980, 0.25), 340);
  }

  function endGame() {
    if (gameState !== "playing") return;

    gameState = "gameover";
    projectile = null;

    if (score > bestScore) bestScore = score;

    root.querySelector(".bs-over-score").textContent = score;
    saveProgress();
    updateInfo();
    showPanel(".bs-game-over");
    playSound(170, 0.35, "sawtooth");
  }

  function createConfetti() {
    const layer = root.querySelector(".bs-level-complete");

    layer.querySelectorAll(".bs-confetti").forEach(el => el.remove());

    const colors = ["#ff3e6c", "#ffe34d", "#31e7a1", "#43a5ff", "#bd69ff"];

    for (let i = 0; i < 35; i++) {
      const piece = document.createElement("span");
      piece.className = "bs-confetti";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colors[rand(colors.length)];
      piece.style.animationDelay = Math.random() * 2 + "s";
      piece.style.animationDuration = 2 + Math.random() * 2 + "s";
      layer.appendChild(piece);
    }
  }

  function updateProjectile() {
    if (!projectile) return;

    projectile.x += projectile.vx;
    projectile.y += projectile.vy;

    if (projectile.x < R || projectile.x > W - R) {
      projectile.vx *= -1;
      projectile.x = clamp(projectile.x, R, W - R);
    }

    // Hit the ceiling.
    if (projectile.y <= 25 + R) {
      attachProjectile();
      return;
    }

    // Check collision with existing bubbles.
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!grid[r][c]) continue;

        const p = getCellPosition(r, c);
        const dx = projectile.x - p.x;
        const dy = projectile.y - p.y;

        if (dx * dx + dy * dy <= (R * 2 - 1) * (R * 2 - 1)) {
          attachProjectile();
          return;
        }
      }
    }

    if (projectile.y > H + 20) {
      attachProjectile();
    }
  }

  function drawBubble(x, y, color, radius = R) {
    const gradient = ctx.createRadialGradient(
      x - radius * 0.35,
      y - radius * 0.4,
      1,
      x,
      y,
      radius * 1.2
    );

    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.13, color);
    gradient.addColorStop(0.72, color);
    gradient.addColorStop(1, "#111827");

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      x - radius * 0.32,
      y - radius * 0.35,
      radius * 0.25,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "#ffffffbb";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff66";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawBackground() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#172f5c");
    bg.addColorStop(1, "#0d1934");

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Decorative stars.
    ctx.fillStyle = "#ffffff35";
    for (let i = 0; i < 28; i++) {
      const x = (i * 71 + 19) % W;
      const y = (i * 97 + 35) % 390;
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.strokeStyle = "#ff737355";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, DANGER_Y);
    ctx.lineTo(W, DANGER_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#ff9c9c";
    ctx.font = "10px Arial";
    ctx.fillText("DANGER LINE", 8, DANGER_Y - 7);
  }

  function drawAimLine() {
    if (!aiming || gameState !== "playing") return;

    const shooter = getShooterPosition();
    let dx = aimPoint.x - shooter.x;
    let dy = aimPoint.y - shooter.y;

    if (dy > -20) dy = -20;

    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= len;
    dy /= len;

    if (dy > -0.18) dy = -0.18;

    const norm = Math.sqrt(dx * dx + dy * dy);
    dx /= norm;
    dy /= norm;

    let x = shooter.x;
    let y = shooter.y;
    let vx = dx;
    let vy = dy;

    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 35; i++) {
      x += vx * 8;
      y += vy * 8;

      if (x < R || x > W - R) vx *= -1;

      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.globalAlpha = 1 - i / 45;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (y < 25 || y > DANGER_Y) break;
    }

    ctx.beginPath();
    ctx.arc(aimPoint.x, aimPoint.y, 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffe36a";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawShooter() {
    const shooter = getShooterPosition();

    ctx.beginPath();
    ctx.arc(shooter.x, shooter.y + 3, 25, Math.PI, 0);
    ctx.fillStyle = "#5479ad";
    ctx.fill();

    drawBubble(shooter.x, shooter.y, COLORS[currentColor], R + 1);
  }

  function drawParticles() {
    particles = particles.filter(p => p.life > 0);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life--;

      ctx.globalAlpha = Math.max(0, p.life / 40);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function draw() {
    if (!ctx) return;

    drawBackground();

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r] && grid[r][c];
        if (!cell) continue;

        const p = getCellPosition(r, c);
        drawBubble(p.x, p.y, cell.color);
      }
    }

    drawAimLine();
    drawShooter();

    if (projectile) {
      drawBubble(projectile.x, projectile.y, projectile.color, R);
    }

    drawParticles();
  }

  function loop(timestamp) {
    if (!root || !canvas) return;

    if (gameState === "playing") {
      if (projectile) updateProjectile();
    }

    draw();
    animationId = requestAnimationFrame(loop);
  }

  function cleanup() {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;

    if (canvas) {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("lostpointercapture", onPointerCancel);
    }

    aiming = false;
    pointerId = null;
    projectile = null;
    root = null;
    canvas = null;
    ctx = null;
    grid = [];
    particles = [];
    gameState = "playing";
  }

  function start(box) {
    cleanup();

    loadProgress();
    currentColor = rand(activeColorCount());
    nextColor = rand(activeColorCount());

    gameState = "playing";
    aiming = false;
    projectile = null;
    particles = [];

    createInterface(box);
    createGrid();
    updateInfo();

    const soundButton = root.querySelector(".bs-sound-toggle");
    soundButton.textContent = soundOn ? "🔊 Sound On" : "🔇 Sound Off";

    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
  }

  // Keep these names so the existing game launcher can start this game.
  window.startBubbleShooter = start;
  window.stopBubbleShooter = cleanup;

})();
