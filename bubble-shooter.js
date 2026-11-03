/* =====================================================
   GAMEBANGLA ARENA - BUBBLE SHOOTER POP
   Improved Complete Version
   ===================================================== */

(function () {
  "use strict";

  const W = 360;
  const H = 560;
  const COLS = 10;
  const MAX_ROWS = 18;
  const R = 14;
  const PITCH = 30;
  const SHOOTER_X = 180;
  const SHOOTER_Y = 500;
  const DANGER_Y = 435;
  const SAVE_KEY = "gbaBubbleShooterProgressV3";

  const COLORS = [
    "#ff3045",
    "#168bff",
    "#ffd52e",
    "#19d66b",
    "#a34cff",
    "#ff8b22"
  ];

  let root = null;
  let canvas = null;
  let ctx = null;
  let animationId = 0;
  let lastTime = 0;
  let running = false;
  let destroyed = false;

  let grid = [];
  let projectile = null;

  let aiming = false;
  let pointerStart = null;
  let aimPoint = { x: 180, y: 180 };
  let pointerMoved = false;

  let level = 1;
  let score = 0;
  let best = 0;
  let soundOn = true;

  let currentColor = COLORS[0];
  let nextColor = COLORS[1];

  let settingsOpen = false;
  let restartConfirmOpen = false;
  let levelComplete = false;
  let gameOver = false;

  let shotCount = 0;
  let particles = [];
  let audioContext = null;
  let lastWallSound = 0;

  /* =========================
     SAVE SYSTEM
  ========================= */

  function loadSave() {
    try {
      const data = JSON.parse(
        localStorage.getItem(SAVE_KEY) || "{}"
      );

      level = Math.max(1, Number(data.level) || 1);
      score = Math.max(0, Number(data.score) || 0);
      best = Math.max(0, Number(data.best) || 0);
      soundOn = data.soundOn !== false;
    } catch (e) {
      level = 1;
      score = 0;
      best = 0;
      soundOn = true;
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          level,
          score,
          best,
          soundOn
        })
      );
    } catch (e) {}
  }

  /* =========================
     SOUND SYSTEM
  ========================= */

  function unlockAudio() {
    if (!soundOn) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioCtx) return;

      if (!audioContext) {
        audioContext = new AudioCtx();
      }

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
    } catch (e) {}
  }

  function playTone(freq, duration, type, volume) {
    if (!soundOn) return;

    try {
      unlockAudio();
      if (!audioContext) return;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      const now = audioContext.currentTime;

      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(
        volume || 0.07,
        now
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + duration
      );

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  function playShootSound() {
    playTone(420, 0.09, "triangle", 0.06);
  }

  function playWallSound() {
    const now = performance.now();

    if (now - lastWallSound < 140) return;

    lastWallSound = now;
    playTone(260, 0.045, "sine", 0.035);
  }

  function playPopSound(count) {
    playTone(
      480 + Math.min(count, 10) * 55,
      0.16,
      "sine",
      0.08
    );
  }

  function playDropSound() {
    playTone(240, 0.22, "triangle", 0.07);
  }

  function playLevelSound() {
    playTone(660, 0.18, "sine", 0.08);

    setTimeout(() => {
      if (soundOn) playTone(880, 0.2, "sine", 0.08);
    }, 180);

    setTimeout(() => {
      if (soundOn) playTone(1100, 0.32, "sine", 0.08);
    }, 360);
  }

  /* =========================
     COLORS AND GRID
  ========================= */

  function randomColor(list) {
    return list[
      Math.floor(Math.random() * list.length)
    ];
  }

  function activeColors() {
    const count = Math.min(
      6,
      3 + Math.floor((level - 1) / 2)
    );

    return COLORS.slice(0, count);
  }

  function rowX(row, col) {
    return R + col * PITCH +
      (row % 2 ? PITCH / 2 : 0);
  }

  function rowY(row) {
    return R + row * PITCH;
  }

  function makeEmptyGrid() {
    grid = [];

    for (let r = 0; r < MAX_ROWS; r++) {
      grid.push(new Array(COLS).fill(null));
    }
  }

  function startingRows() {
    return Math.min(
      14,
      5 + Math.floor((level - 1) * 0.65)
    );
  }

  function createGrid() {
    makeEmptyGrid();

    const colors = activeColors();
    const rows = startingRows();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const emptyChance = r < 2 ? 0.06 : 0.12;

        if (Math.random() > emptyChance) {
          grid[r][c] = randomColor(colors);
        }
      }
    }

    for (let c = 0; c < COLS; c++) {
      if (!grid[0][c]) {
        grid[0][c] = randomColor(colors);
      }
    }
  }

  /* =========================
     HEXAGON NEIGHBORS
  ========================= */

  function getNeighbors(row, col) {
    const result = [];

    if (col > 0) {
      result.push([row, col - 1]);
    }

    if (col < COLS - 1) {
      result.push([row, col + 1]);
    }

    if (row > 0) {
      if (row % 2 === 0) {
        if (col > 0) {
          result.push([row - 1, col - 1]);
        }

        result.push([row - 1, col]);
      } else {
        result.push([row - 1, col]);

        if (col < COLS - 1) {
          result.push([row - 1, col + 1]);
        }
      }
    }

    if (row < MAX_ROWS - 1) {
      if (row % 2 === 0) {
        if (col > 0) {
          result.push([row + 1, col - 1]);
        }

        result.push([row + 1, col]);
      } else {
        result.push([row + 1, col]);

        if (col < COLS - 1) {
          result.push([row + 1, col + 1]);
        }
      }
    }

    return result;
  }

  function findMatchingGroup(startRow, startCol, color) {
    const queue = [[startRow, startCol]];
    const visited = new Set();
    const group = [];

    let index = 0;

    while (index < queue.length) {
      const [r, c] = queue[index++];
      const key = r + "," + c;

      if (visited.has(key)) continue;
      visited.add(key);

      if (
        r < 0 || r >= MAX_ROWS ||
        c < 0 || c >= COLS
      ) continue;

      if (grid[r][c] !== color) continue;

      group.push([r, c]);

      const neighbors = getNeighbors(r, c);

      for (const [nr, nc] of neighbors) {
        const nextKey = nr + "," + nc;

        if (!visited.has(nextKey)) {
          queue.push([nr, nc]);
        }
      }
    }

    return group;
  }

  function removeFloatingBubbles() {
    const connected = new Set();
    const queue = [];

    for (let c = 0; c < COLS; c++) {
      if (grid[0][c]) {
        queue.push([0, c]);
      }
    }

    let index = 0;

    while (index < queue.length) {
      const [r, c] = queue[index++];
      const key = r + "," + c;

      if (connected.has(key)) continue;
      if (!grid[r] || !grid[r][c]) continue;

      connected.add(key);

      for (const [nr, nc] of getNeighbors(r, c)) {
        const nextKey = nr + "," + nc;

        if (
          !connected.has(nextKey) &&
          grid[nr][nc]
        ) {
          queue.push([nr, nc]);
        }
      }
    }

    let removed = 0;

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (
          grid[r][c] &&
          !connected.has(r + "," + c)
        ) {
          grid[r][c] = null;
          removed++;
        }
      }
    }

    return removed;
  }

  function findNearestEmpty(x, y, hitRow, hitCol) {
    const candidates = [];

    if (hitRow === null || hitCol === null) {
      for (let c = 0; c < COLS; c++) {
        if (!grid[0][c]) {
          candidates.push([0, c]);
        }
      }
    } else {
      for (const [r, c] of getNeighbors(hitRow, hitCol)) {
        if (!grid[r][c]) {
          candidates.push([r, c]);
        }
      }
    }

    let bestCell = null;
    let bestDistance = Infinity;

    for (const [r, c] of candidates) {
      const dx = rowX(r, c) - x;
      const dy = rowY(r) - y;
      const distance = dx * dx + dy * dy;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestCell = [r, c];
      }
    }

    return bestCell;
  }

  function getBubbleAt(x, y) {
    const limit = (R * 2 + 1) ** 2;

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!grid[r][c]) continue;

        const dx = rowX(r, c) - x;
        const dy = rowY(r) - y;

        if (dx * dx + dy * dy <= limit) {
          return [r, c];
        }
      }
    }

    return null;
  }

  function countBubbles() {
    let total = 0;

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) total++;
      }
    }

    return total;
  }

  /* =========================
     SCORE AND DISPLAY
  ========================= */

  function updateScore(points) {
    score += points;

    if (score > best) {
      best = score;
    }

    updateScoreText();
    saveProgress();
  }

  function updateScoreText() {
    const scoreEl = root && root.querySelector("#bs-score");
    const bestEl = root && root.querySelector("#bs-best");
    const levelEl = root && root.querySelector("#bs-level");

    if (scoreEl) scoreEl.textContent = score;
    if (bestEl) bestEl.textContent = best;
    if (levelEl) levelEl.textContent = level;
  }

  function updateBallPreview() {
    const current = root &&
      root.querySelector("#bs-current");

    const next = root &&
      root.querySelector("#bs-next");

    if (current) {
      current.style.background = currentColor;
    }

    if (next) {
      next.style.background = nextColor;
    }
  }

  /* =========================
     CONFETTI CELEBRATION
  ========================= */

  function createParticles() {
    particles = [];

    const confettiColors = [
      "#ffd700",
      "#fff176",
      "#ff4f81",
      "#4de3ff",
      "#b56cff",
      "#5cff91",
      "#ffffff"
    ];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * W,
        y: -Math.random() * H,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 1.5 + Math.random() * 3.5,
        size: 3 + Math.random() * 5,
        rotation: Math.random() * 6,
        spin: (Math.random() - 0.5) * 0.16,
        color: randomColor(confettiColors),
        life: 5 + Math.random() * 4
      });
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.rotation += p.spin * dt * 60;
      p.vy += 0.035 * dt * 60;

      if (p.y > H + 12) {
        p.y = -10;
        p.x = Math.random() * W;
        p.vy = 1.5 + Math.random() * 3;
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5;

      ctx.fillRect(
        -p.size / 2,
        -p.size / 2,
        p.size,
        p.size * 1.8
      );

      ctx.restore();
    }
  }

  function createSmallBurst(x, y, color) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        rotation: 0,
        spin: 0.1,
        color: color || randomColor(COLORS),
        life: 1.2
      });
    }
  }

  /* =========================
     LEVEL AND GAME OVER
  ========================= */

  function checkLevelComplete() {
    if (
      countBubbles() !== 0 ||
      levelComplete ||
      gameOver
    ) return;

    levelComplete = true;
    projectile = null;

    createParticles();

    updateScore(100 + level * 20);
    playLevelSound();

    showOverlay("complete");
  }

  function checkGameOver() {
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (
          grid[r][c] &&
          rowY(r) + R >= DANGER_Y
        ) {
          gameOver = true;
          projectile = null;

          showOverlay("gameover");
          playTone(160, 0.35, "triangle", 0.08);

          return true;
        }
      }
    }

    return false;
  }

  function nextLevel() {
    level++;

    levelComplete = false;
    gameOver = false;
    projectile = null;
    shotCount = 0;
    particles = [];

    createGrid();

    currentColor = randomColor(activeColors());
    nextColor = randomColor(activeColors());

    updateScoreText();
    updateBallPreview();
    hideOverlay();
    saveProgress();
  }

  function restartLevel() {
    levelComplete = false;
    gameOver = false;
    projectile = null;
    particles = [];
    shotCount = 0;

    createGrid();

    currentColor = randomColor(activeColors());
    nextColor = randomColor(activeColors());

    updateScoreText();
    updateBallPreview();
    hideOverlay();
    saveProgress();
  }

  function restartWholeGame() {
    level = 1;
    score = 0;
    shotCount = 0;

    levelComplete = false;
    gameOver = false;
    projectile = null;
    particles = [];

    createGrid();

    currentColor = randomColor(activeColors());
    nextColor = randomColor(activeColors());

    closeSettings();
    closeRestartConfirm();
    hideOverlay();

    updateScoreText();
    updateBallPreview();
    saveProgress();
  }

  /* =========================
     PROJECTILE
  ========================= */

  function attachProjectile(hitRow, hitCol) {
    if (!projectile) return;

    const px = projectile.x;
    const py = projectile.y;
    const color = projectile.color;

    const cell = findNearestEmpty(
      px,
      py,
      hitRow,
      hitCol
    );

    if (!cell) {
      gameOver = true;
      projectile = null;
      showOverlay("gameover");
      return;
    }

    const [r, c] = cell;

    grid[r][c] = color;

    const group = findMatchingGroup(r, c, color);

    if (group.length >= 3) {
      for (const [gr, gc] of group) {
        createSmallBurst(
          rowX(gr, gc),
          rowY(gr),
          grid[gr][gc]
        );

        grid[gr][gc] = null;
      }

      const floating = removeFloatingBubbles();

      updateScore(
        group.length * 10 + floating * 15
      );

      playPopSound(group.length);

      if (floating > 0) {
        playDropSound();
      }
    } else {
      shotCount++;
    }

    projectile = null;

    currentColor = nextColor;
    nextColor = randomColor(activeColors());

    updateBallPreview();

    if (!checkGameOver()) {
      checkLevelComplete();
    }
  }

  function shoot() {
    if (
      projectile ||
      levelComplete ||
      gameOver ||
      settingsOpen ||
      restartConfirmOpen
    ) return;

    let dx = aimPoint.x - SHOOTER_X;
    let dy = aimPoint.y - SHOOTER_Y;

    let length = Math.sqrt(dx * dx + dy * dy);

    if (length < 12) {
      dx = 0;
      dy = -1;
      length = 1;
    }

    let vx = dx / length;
    let vy = dy / length;

    // নিচের দিকে বা একেবারে সমান্তরাল শট আটকানো।
    if (vy > -0.12) {
      vy = -0.12;

      const horizontal = Math.sqrt(1 - vy * vy);
      vx = (dx < 0 ? -1 : 1) * horizontal;
    }

    // আগের 430 থেকে গতি বাড়ানো হয়েছে।
    const speed = 590;

    projectile = {
      x: SHOOTER_X,
      y: SHOOTER_Y - 8,
      vx: vx * speed,
      vy: vy * speed,
      color: currentColor
    };

    aiming = false;
    pointerStart = null;

    playShootSound();
  }

  function updateProjectile(dt) {
    if (!projectile) return;

    const p = projectile;

    const step = Math.min(dt, 0.035);
    const subSteps = Math.max(
      1,
      Math.ceil(step / 0.006)
    );

    const subDt = step / subSteps;

    for (let i = 0; i < subSteps; i++) {
      p.x += p.vx * subDt;
      p.y += p.vy * subDt;

      if (p.x <= R) {
        p.x = R;
        p.vx = Math.abs(p.vx);
        playWallSound();
      } else if (p.x >= W - R) {
        p.x = W - R;
        p.vx = -Math.abs(p.vx);
        playWallSound();
      }

      if (p.y <= R) {
        p.y = R;
        attachProjectile(null, null);
        return;
      }

      const hit = getBubbleAt(p.x, p.y);

      if (hit) {
        attachProjectile(hit[0], hit[1]);
        return;
      }
    }
  }

  /* =========================
     BUBBLE DRAWING
  ========================= */

  function shadeColor(color, amount) {
    const num = parseInt(
      color.replace("#", ""),
      16
    );

    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 255) + amount;
    let b = (num & 255) + amount;

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    return "#" +
      (0x1000000 + r * 0x10000 + g * 0x100 + b)
        .toString(16)
        .slice(1);
  }

  function drawBubble(x, y, color, radius) {
    const r = radius || R;

    const gradient = ctx.createRadialGradient(
      x - r * 0.35,
      y - r * 0.4,
      1,
      x,
      y,
      r
    );

    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.18, color);
    gradient.addColorStop(
      1,
      shadeColor(color, -40)
    );

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      x - r * 0.35,
      y - r * 0.4,
      r * 0.24,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fill();
  }

  /* =========================
     AIM LINE + BOUNCE
  ========================= */

  function getAimDirection() {
    let dx = aimPoint.x - SHOOTER_X;
    let dy = aimPoint.y - SHOOTER_Y;

    let length = Math.sqrt(dx * dx + dy * dy);

    if (length < 10) {
      return { vx: 0, vy: -1 };
    }

    let vx = dx / length;
    let vy = dy / length;

    if (vy > -0.12) {
      vy = -0.12;

      const horizontal = Math.sqrt(1 - vy * vy);
      vx = (dx < 0 ? -1 : 1) * horizontal;
    }

    return { vx, vy };
  }

  function drawAimLine() {
    if (
      !aiming ||
      projectile ||
      levelComplete ||
      gameOver
    ) return;

    const direction = getAimDirection();

    let vx = direction.vx;
    let vy = direction.vy;

    let x = SHOOTER_X;
    let y = SHOOTER_Y - 8;

    let bounces = 0;
    let hitPoint = null;

    ctx.save();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(x, y);

    // সর্বোচ্চ দুইবার দেয়ালে বাউন্স।
    // বলের আঘাত বা ছাদের কাছে পৌঁছালে রেখা থামবে।
    for (let i = 0; i < 1100; i++) {
      x += vx * 2;
      y += vy * 2;

      if (x <= R) {
        x = R;
        vx = Math.abs(vx);
        bounces++;
      } else if (x >= W - R) {
        x = W - R;
        vx = -Math.abs(vx);
        bounces++;
      }

      if (bounces > 2) {
        break;
      }

      if (y <= R) {
        hitPoint = { x, y };
        break;
      }

      const hit = getBubbleAt(x, y);

      if (hit) {
        hitPoint = { x, y };
        break;
      }

      ctx.lineTo(x, y);
    }

    if (hitPoint) {
      ctx.lineTo(hitPoint.x, hitPoint.y);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    if (hitPoint) {
      ctx.beginPath();
      ctx.arc(
        hitPoint.x,
        hitPoint.y,
        5,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  /* =========================
     BOARD DRAWING
  ========================= */

  function drawBoard() {
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(
      0, 0, 0, H
    );

    bg.addColorStop(0, "#15234c");
    bg.addColorStop(1, "#08132e");

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(5, 5, W - 10, DANGER_Y - 5);

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) {
          drawBubble(
            rowX(r, c),
            rowY(r),
            grid[r][c]
          );
        }
      }
    }

    // বিপদসীমা।
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = "rgba(255,90,90,0.75)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(5, DANGER_Y);
    ctx.lineTo(W - 5, DANGER_Y);
    ctx.stroke();

    ctx.restore();

    drawAimLine();

    // Shooter base.
    ctx.beginPath();
    ctx.arc(
      SHOOTER_X,
      SHOOTER_Y,
      24,
      Math.PI,
      0
    );

    ctx.fillStyle = "#40558a";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      SHOOTER_X,
      SHOOTER_Y,
      15,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#dbeafe";
    ctx.fill();

    drawBubble(
      SHOOTER_X,
      SHOOTER_Y - 8,
      currentColor,
      13
    );

    if (projectile) {
      drawBubble(
        projectile.x,
        projectile.y,
        projectile.color
      );
    }

    drawParticles();
  }

  /* =========================
     OVERLAYS
  ========================= */

  function showOverlay(type) {
    if (!root) return;

    const overlay = root.querySelector("#bs-overlay");

    if (!overlay) return;

    overlay.style.display = "flex";

    if (type === "complete") {
      overlay.innerHTML = `
        <div class="bs-modal bs-celebrate">
          <div class="bs-big-emoji">🏆🎉</div>
          <h2>লেভেল সম্পন্ন!</h2>
          <p>অসাধারণ খেলেছেন!</p>
          <div class="bs-modal-score">
            স্কোর: ${score}
          </div>
          <div class="bs-confetti-label">
            ✨ অভিনন্দন! ✨
          </div>
          <button id="bs-next-level" class="bs-primary">
            পরের লেভেল ▶
          </button>
        </div>
      `;

      overlay.querySelector(
        "#bs-next-level"
      ).onclick = nextLevel;
    }

    if (type === "gameover") {
      overlay.innerHTML = `
        <div class="bs-modal">
          <div class="bs-big-emoji">😢</div>
          <h2>গেম ওভার!</h2>
          <p>বল বিপদসীমায় পৌঁছে গেছে।</p>
          <div class="bs-modal-score">
            স্কোর: ${score}
          </div>
          <button id="bs-try-again" class="bs-primary">
            আবার খেলুন
          </button>
        </div>
      `;

      overlay.querySelector(
        "#bs-try-again"
      ).onclick = restartLevel;
    }
  }

  function hideOverlay() {
    const overlay = root &&
      root.querySelector("#bs-overlay");

    if (overlay) {
      overlay.style.display = "none";
      overlay.innerHTML = "";
    }
  }

  /* =========================
     SETTINGS
  ========================= */

  function openSettings() {
    if (levelComplete || gameOver) return;

    settingsOpen = true;

    const panel = root.querySelector("#bs-settings");

    if (panel) {
      panel.style.display = "flex";
    }
  }

  function closeSettings() {
    settingsOpen = false;

    const panel = root &&
      root.querySelector("#bs-settings");

    if (panel) {
      panel.style.display = "none";
    }
  }

  function openRestartConfirm() {
    restartConfirmOpen = true;

    const panel = root.querySelector("#bs-confirm");

    if (panel) {
      panel.style.display = "flex";
    }
  }

  function closeRestartConfirm() {
    restartConfirmOpen = false;

    const panel = root &&
      root.querySelector("#bs-confirm");

    if (panel) {
      panel.style.display = "none";
    }
  }

  function updateSoundButton() {
    const button = root &&
      root.querySelector("#bs-sound-btn");

    if (button) {
      button.textContent = soundOn
        ? "🔊 সাউন্ড বন্ধ করুন"
        : "🔇 সাউন্ড চালু করুন";
    }
  }

  function changeBall() {
    if (
      projectile ||
      levelComplete ||
      gameOver ||
      settingsOpen
    ) return;

    const old = currentColor;

    currentColor = nextColor;
    nextColor = old;

    updateBallPreview();
    playTone(600, 0.07, "sine", 0.06);
  }

  /* =========================
     POINTER / TOUCH CONTROL
  ========================= */

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) *
        (W / rect.width),

      y: (event.clientY - rect.top) *
        (H / rect.height)
    };
  }

  function onPointerDown(event) {
    if (
      settingsOpen ||
      restartConfirmOpen ||
      levelComplete ||
      gameOver ||
      projectile
    ) return;

    event.preventDefault();

    unlockAudio();

    const point = getCanvasPoint(event);

    pointerStart = point;
    aimPoint = point;
    pointerMoved = false;
    aiming = true;

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (e) {}
  }

  function onPointerMove(event) {
    if (!aiming || !pointerStart) return;

    event.preventDefault();

    const point = getCanvasPoint(event);

    const dx = point.x - pointerStart.x;
    const dy = point.y - pointerStart.y;

    if (
      Math.abs(dx) > 3 ||
      Math.abs(dy) > 3
    ) {
      pointerMoved = true;
    }

    aimPoint = point;
  }

  function onPointerUp(event) {
    if (!aiming) return;

    event.preventDefault();

    if (event.type === "pointercancel") {
      aiming = false;
      pointerStart = null;
      return;
    }

    aimPoint = getCanvasPoint(event);

    // ট্যাপ অথবা ধরে টেনে ছেড়ে দেওয়া—দুটিই শট।
    shoot();

    pointerStart = null;
    pointerMoved = false;
  }

  /* =========================
     INTERFACE
  ========================= */

  function createInterface(box) {
    box.innerHTML = `
      <div id="bs-game" class="bs-game">

        <style>
          .bs-game {
            width: 100%;
            max-width: 430px;
            margin: 0 auto;
            color: #fff;
            font-family: Arial, sans-serif;
            background: #101b3c;
            border-radius: 16px;
            padding: 10px;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            user-select: none;
          }

          .bs-game * {
            box-sizing: border-box;
          }

          .bs-topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
          }

          .bs-stat {
            background: #223563;
            padding: 7px 9px;
            border-radius: 9px;
            text-align: center;
            flex: 1;
            font-size: 12px;
          }

          .bs-stat strong {
            display: block;
            font-size: 16px;
            margin-top: 3px;
            color: #ffe47a;
          }

          .bs-icon-btn {
            border: 0;
            color: #fff;
            background: #344b80;
            border-radius: 9px;
            padding: 9px 11px;
            font-size: 19px;
            cursor: pointer;
          }

          .bs-canvas-wrap {
            width: 100%;
            position: relative;
            border-radius: 12px;
            overflow: hidden;
            background: #08132e;
          }

          #bs-canvas {
            width: 100%;
            height: auto;
            display: block;
            touch-action: none;
            cursor: crosshair;
          }

          .bs-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
          }

          .bs-ball-info {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
          }

          .bs-preview-ball {
            display: inline-block;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,.7);
            box-shadow:
              inset -4px -5px 6px rgba(0,0,0,.3);
          }

          .bs-change {
            border: 0;
            border-radius: 9px;
            padding: 10px 12px;
            background: #ffd43b;
            color: #18264b;
            font-weight: bold;
            cursor: pointer;
          }

          .bs-overlay {
            position: absolute;
            inset: 0;
            z-index: 5;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 14px;
            background: rgba(4,10,30,.72);
          }

          .bs-modal {
            width: 100%;
            max-width: 300px;
            padding: 22px 16px;
            text-align: center;
            background: #233967;
            border: 1px solid rgba(255,255,255,.2);
            border-radius: 16px;
            box-shadow: 0 10px 35px rgba(0,0,0,.35);
          }

          .bs-modal h2 {
            margin: 8px 0;
            font-size: 23px;
          }

          .bs-modal p {
            margin: 8px 0 15px;
            color: #dce7ff;
            font-size: 14px;
          }

          .bs-big-emoji {
            font-size: 42px;
          }

          .bs-modal-score {
            margin: 12px 0;
            color: #ffe47a;
            font-weight: bold;
          }

          .bs-confetti-label {
            margin: 12px 0;
            color: #ffe47a;
            font-size: 18px;
            font-weight: bold;
            text-shadow: 0 0 10px #ffd700;
          }

          .bs-primary {
            width: 100%;
            border: 0;
            border-radius: 10px;
            padding: 12px;
            background: #ffd43b;
            color: #17264b;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
          }

          .bs-settings-panel,
          .bs-confirm-panel {
            position: absolute;
            inset: 0;
            z-index: 8;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 15px;
            background: rgba(4,10,30,.86);
          }

          .bs-menu-btn {
            width: 100%;
            margin-top: 10px;
            padding: 12px;
            border: 0;
            border-radius: 9px;
            background: #405b91;
            color: #fff;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
          }

          .bs-menu-btn.danger {
            background: #b83b4b;
          }

          .bs-menu-btn.light {
            background: #dbeafe;
            color: #17264b;
          }

          .bs-hint {
            text-align: center;
            font-size: 11px;
            color: #c8d5f5;
            margin-top: 8px;
          }
        </style>

        <div class="bs-topbar">
          <div class="bs-stat">
            লেভেল
            <strong id="bs-level">1</strong>
          </div>

          <div class="bs-stat">
            স্কোর
            <strong id="bs-score">0</strong>
          </div>

          <div class="bs-stat">
            সেরা
            <strong id="bs-best">0</strong>
          </div>

          <button
            id="bs-settings-btn"
            class="bs-icon-btn"
            aria-label="Settings"
          >⚙️</button>
        </div>

        <div class="bs-canvas-wrap">

          <canvas
            id="bs-canvas"
            width="${W}"
            height="${H}"
          ></canvas>

          <div id="bs-overlay" class="bs-overlay"></div>

          <div
            id="bs-settings"
            class="bs-settings-panel"
          >
            <div class="bs-modal">
              <h2>⚙️ সেটিংস</h2>

              <button
                id="bs-sound-btn"
                class="bs-menu-btn"
              ></button>

              <button
                id="bs-restart-btn"
                class="bs-menu-btn danger"
              >
                🔄 নতুন করে শুরু
              </button>

              <button
                id="bs-settings-close"
                class="bs-menu-btn light"
              >
                ফিরে যান
              </button>
            </div>
          </div>

          <div
            id="bs-confirm"
            class="bs-confirm-panel"
          >
            <div class="bs-modal">
              <h2>নতুন করে শুরু করবেন?</h2>

              <p>
                আপনার বর্তমান লেভেল ও স্কোর মুছে যাবে।
              </p>

              <button
                id="bs-confirm-yes"
                class="bs-menu-btn danger"
              >
                হ্যাঁ, শুরু করুন
              </button>

              <button
                id="bs-confirm-no"
                class="bs-menu-btn light"
              >
                না, ফিরে যান
              </button>
            </div>
          </div>

        </div>

        <div class="bs-bottom">

          <div class="bs-ball-info">
            <span>এখন:</span>
            <span
              id="bs-current"
              class="bs-preview-ball"
            ></span>

            <span>পরের:</span>
            <span
              id="bs-next"
              class="bs-preview-ball"
            ></span>
          </div>

          <button
            id="bs-change"
            class="bs-change"
          >
            বল পরিবর্তন
          </button>

        </div>

        <div class="bs-hint">
          বল লক্ষ্য করতে টাচ করুন, ধরে টেনে ছেড়ে দিন
        </div>

      </div>
    `;

    root = box.querySelector("#bs-game");
    canvas = root.querySelector("#bs-canvas");
    ctx = canvas.getContext("2d");

    root.querySelector(
      "#bs-settings-btn"
    ).onclick = openSettings;

    root.querySelector(
      "#bs-settings-close"
    ).onclick = closeSettings;

    root.querySelector(
      "#bs-restart-btn"
    ).onclick = openRestartConfirm;

    root.querySelector(
      "#bs-confirm-yes"
    ).onclick = restartWholeGame;

    root.querySelector(
      "#bs-confirm-no"
    ).onclick = closeRestartConfirm;

    root.querySelector(
      "#bs-change"
    ).onclick = changeBall;

    root.querySelector(
      "#bs-sound-btn"
    ).onclick = function () {
      soundOn = !soundOn;

      updateSoundButton();
      saveProgress();

      if (soundOn) {
        unlockAudio();
        playTone(650, 0.1, "sine", 0.07);
      }
    };

    canvas.addEventListener(
      "pointerdown",
      onPointerDown
    );

    canvas.addEventListener(
      "pointermove",
      onPointerMove
    );

    canvas.addEventListener(
      "pointerup",
      onPointerUp
    );

    canvas.addEventListener(
      "pointercancel",
      onPointerUp
    );

    updateSoundButton();
    updateScoreText();
    updateBallPreview();
  }

  /* =========================
     GAME LOOP
  ========================= */

  function loop(timestamp) {
    if (!running || destroyed) return;

    const dt = lastTime
      ? Math.min((timestamp - lastTime) / 1000, 0.035)
      : 0.016;

    lastTime = timestamp;

    if (
      !settingsOpen &&
      !restartConfirmOpen &&
      !levelComplete &&
      !gameOver
    ) {
      updateProjectile(dt);
    }

    if (levelComplete) {
      updateParticles(dt);
    }

    drawBoard();

    animationId = requestAnimationFrame(loop);
  }

  /* =========================
     CLEANUP
  ========================= */

  function cleanup() {
    running = false;
    destroyed = true;

    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    if (canvas) {
      canvas.removeEventListener(
        "pointerdown",
        onPointerDown
      );

      canvas.removeEventListener(
        "pointermove",
        onPointerMove
      );

      canvas.removeEventListener(
        "pointerup",
        onPointerUp
      );

      canvas.removeEventListener(
        "pointercancel",
        onPointerUp
      );
    }

    aiming = false;
    projectile = null;
    particles = [];

    root = null;
    canvas = null;
    ctx = null;
  }

  /* =========================
     START GAME
  ========================= */

  function start(box) {
    if (typeof box === "string") {
      box = document.querySelector(box);
    }

    if (!box) {
      console.error(
        "Bubble Shooter: game container not found."
      );
      return;
    }

    if (running) {
      cleanup();
    }

    destroyed = false;
    running = true;
    lastTime = 0;

    projectile = null;
    aiming = false;
    pointerStart = null;

    settingsOpen = false;
    restartConfirmOpen = false;
    levelComplete = false;
    gameOver = false;

    particles = [];

    loadSave();
    createInterface(box);
    createGrid();

    currentColor = randomColor(activeColors());
    nextColor = randomColor(activeColors());

    updateScoreText();
    updateBallPreview();

    animationId = requestAnimationFrame(loop);
  }

  window.startBubbleShooter = start;
  window.stopBubbleShooter = cleanup;

})();
