/* =====================================================
   GAMEBANGLA ARENA - BUBBLE SHOOTER POP
   Complete replacement version
   ===================================================== */

(function () {
  "use strict";

  const W = 360;
  const H = 560;
  const COLS = 10;
  const MAX_ROWS = 18;
  const R = 14;
  const GAP = 2;
  const PITCH = R * 2 + GAP;
  const SHOOTER_X = W / 2;
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
  let aimPoint = { x: W / 2, y: 200 };

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
  let lastShotTime = 0;

  let audioContext = null;

  function loadSave() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
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
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        level,
        score,
        best,
        soundOn
      }));
    } catch (e) {}
  }

  function playSound(frequency, duration, type) {
    if (!soundOn) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContext) audioContext = new AudioCtx();

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = type || "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.08, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {}
  }

  function randomColor(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function activeColors() {
    const count = Math.min(6, 3 + Math.floor((level - 1) / 2));
    return COLORS.slice(0, count);
  }

  function rowX(row, col) {
    return R + col * PITCH + (row % 2 ? PITCH / 2 : 0);
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
    return Math.min(14, 5 + Math.floor((level - 1) * 0.65));
  }

  function createGrid() {
    makeEmptyGrid();

    const colors = activeColors();
    const rows = startingRows();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        // ওপরের সারিগুলোতে কিছু ফাঁকা জায়গা থাকবে।
        const emptyChance = r < 2 ? 0.08 : 0.13;

        if (Math.random() > emptyChance) {
          grid[r][c] = randomColor(colors);
        }
      }
    }

    // প্রথম সারি যেন কখনো ফাঁকা না থাকে।
    for (let c = 0; c < COLS; c++) {
      if (!grid[0][c]) grid[0][c] = randomColor(colors);
    }
  }

  function getNeighbors(row, col) {
    const result = [];

    if (col > 0) result.push([row, col - 1]);
    if (col < COLS - 1) result.push([row, col + 1]);

    if (row > 0) {
      if (row % 2 === 0) {
        if (col > 0) result.push([row - 1, col - 1]);
        result.push([row - 1, col]);
      } else {
        result.push([row - 1, col]);
        if (col < COLS - 1) result.push([row - 1, col + 1]);
      }
    }

    if (row < MAX_ROWS - 1) {
      if (row % 2 === 0) {
        if (col > 0) result.push([row + 1, col - 1]);
        result.push([row + 1, col]);
      } else {
        result.push([row + 1, col]);
        if (col < COLS - 1) result.push([row + 1, col + 1]);
      }
    }

    return result;
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

      if (r < 0 || r >= MAX_ROWS || c < 0 || c >= COLS) continue;
      if (grid[r][c] !== color) continue;

      group.push([r, c]);

      for (const [nr, nc] of getNeighbors(r, c)) {
        const neighborKey = nr + "," + nc;
        if (!visited.has(neighborKey)) {
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
      if (grid[0][c]) queue.push([0, c]);
    }

    while (queue.length) {
      const [r, c] = queue.shift();
      const key = r + "," + c;

      if (connected.has(key)) continue;
      if (!grid[r] || !grid[r][c]) continue;

      connected.add(key);

      for (const [nr, nc] of getNeighbors(r, c)) {
        const nextKey = nr + "," + nc;
        if (!connected.has(nextKey) && grid[nr][nc]) {
          queue.push([nr, nc]);
        }
      }
    }

    let removed = 0;

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] && !connected.has(r + "," + c)) {
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
        if (!grid[0][c]) candidates.push([0, c]);
      }
    } else {
      for (const [r, c] of getNeighbors(hitRow, hitCol)) {
        if (!grid[r][c]) candidates.push([r, c]);
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
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!grid[r][c]) continue;

        const dx = rowX(r, c) - x;
        const dy = rowY(r) - y;

        if (dx * dx + dy * dy <= (R * 2 + 2) ** 2) {
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

  function isBoardEmpty() {
    return countBubbles() === 0;
  }

  function updateScore(points) {
    score += points;
    if (score > best) best = score;
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

  function createParticles() {
    particles = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * W,
        y: -Math.random() * H,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        size: 3 + Math.random() * 5,
        rotation: Math.random() * 6,
        spin: (Math.random() - 0.5) * 0.15,
        color: randomColor(COLORS)
      });
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;

      if (p.y > H + 15) {
        p.y = -10;
        p.x = Math.random() * W;
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
      ctx.restore();
    }
  }

  function checkLevelComplete() {
    if (!isBoardEmpty() || levelComplete || gameOver) return;

    levelComplete = true;
    projectile = null;
    createParticles();

    updateScore(100 + level * 20);
    playSound(660, 0.15);
    setTimeout(() => playSound(880, 0.25), 150);
    setTimeout(() => playSound(1100, 0.3), 300);

    showOverlay("complete");
  }

  function checkGameOver() {
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] && rowY(r) + R >= DANGER_Y) {
          gameOver = true;
          projectile = null;
          showOverlay("gameover");
          playSound(160, 0.35, "triangle");
          return true;
        }
      }
    }

    return false;
  }

  function attachProjectile(hitRow, hitCol) {
    if (!projectile) return;

    const cell = findNearestEmpty(
      projectile.x,
      projectile.y,
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
    grid[r][c] = projectile.color;

    const group = findMatchingGroup(r, c, projectile.color);

    if (group.length >= 3) {
      for (const [gr, gc] of group) {
        grid[gr][gc] = null;
      }

      const floating = removeFloatingBubbles();
      const popped = group.length + floating;

      updateScore(group.length * 10 + floating * 15);
      playSound(520 + Math.min(group.length, 8) * 55, 0.18);

      if (floating > 0) {
        playSound(300, 0.2, "triangle");
      }

      if (popped >= 5) {
        createSmallBurst();
      }
    } else {
      shotCount++;

      // কয়েকটি শটের পর বোর্ডের চাপ বাড়ে, তবে চলতি লেভেলে নতুন সারি যোগ হয় না।
      if (shotCount % 6 === 0) {
        playSound(260, 0.12, "triangle");
      }
    }

    projectile = null;
    currentColor = nextColor;
    nextColor = randomColor(activeColors());

    updateBallPreview();
    updateScoreText();

    if (!checkGameOver()) checkLevelComplete();
  }

  function createSmallBurst() {
    for (let i = 0; i < 18; i++) {
      particles.push({
        x: W / 2,
        y: 180,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.5) * 7,
        size: 3 + Math.random() * 4,
        rotation: 0,
        spin: 0.1,
        color: randomColor(COLORS)
      });
    }
  }

  function shoot() {
    if (projectile || levelComplete || gameOver || settingsOpen ||
        restartConfirmOpen) return;

    const dx = aimPoint.x - SHOOTER_X;
    const dy = aimPoint.y - SHOOTER_Y;

    let length = Math.sqrt(dx * dx + dy * dy);

    if (length < 12) {
      aimPoint = { x: SHOOTER_X, y: 150 };
      length = 350;
    }

    let vx = dx / length;
    let vy = dy / length;

    // বলকে সবসময় ওপরের দিকে পাঠানো হবে।
    if (vy > -0.12) {
      vy = -0.12;
      const horizontal = Math.sqrt(1 - vy * vy);
      vx = (dx < 0 ? -1 : 1) * horizontal;
    }

    projectile = {
      x: SHOOTER_X,
      y: SHOOTER_Y - 8,
      vx: vx * 430,
      vy: vy * 430,
      color: currentColor
    };

    aiming = false;
    playSound(420, 0.08);
  }

  function updateProjectile(dt) {
    if (!projectile) return;

    const p = projectile;
    const step = Math.min(dt, 0.035);
    const subSteps = Math.max(1, Math.ceil(step / 0.008));
    const subDt = step / subSteps;

    for (let i = 0; i < subSteps; i++) {
      p.x += p.vx * subDt;
      p.y += p.vy * subDt;

      if (p.x <= R) {
        p.x = R;
        p.vx = Math.abs(p.vx);
        playSound(250, 0.035);
      } else if (p.x >= W - R) {
        p.x = W - R;
        p.vx = -Math.abs(p.vx);
        playSound(250, 0.035);
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
    gradient.addColorStop(1, shadeColor(color, -35));

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
  }

  function shadeColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x0000ff) + percent;

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b)
      .toString(16)
      .slice(1);
  }

  function drawAimLine() {
    if (!aiming || projectile || levelComplete || gameOver) return;

    let dx = aimPoint.x - SHOOTER_X;
    let dy = aimPoint.y - SHOOTER_Y;
    let length = Math.sqrt(dx * dx + dy * dy);

    if (length < 10) return;

    let vx = dx / length;
    let vy = dy / length;

    if (vy > -0.12) {
      vy = -0.12;
      const h = Math.sqrt(1 - vy * vy);
      vx = (dx < 0 ? -1 : 1) * h;
    }

    let x = SHOOTER_X;
    let y = SHOOTER_Y - 8;
    let hitPoint = null;
    let bounces = 0;

    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.moveTo(x, y);

    // সর্বোচ্চ দুইবার দেয়ালে বাউন্স দেখানো হবে।
    for (let i = 0; i < 900; i++) {
      x += vx * 3;
      y += vy * 3;

      if (x <= R || x >= W - R) {
        x = Math.max(R, Math.min(W - R, x));
        vx *= -1;
        bounces++;

        if (bounces > 2) break;
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
      ctx.arc(hitPoint.x, hitPoint.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    ctx.restore();
  }

  function drawBoard() {
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#15234c");
    bg.addColorStop(1, "#08132e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // উপরের বোর্ডের সীমানা।
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(5, 5, W - 10, DANGER_Y - 5);

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) {
          drawBubble(rowX(r, c), rowY(r), grid[r][c]);
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
    ctx.arc(SHOOTER_X, SHOOTER_Y, 24, Math.PI, 0);
    ctx.fillStyle = "#40558a";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(SHOOTER_X, SHOOTER_Y, 15, 0, Math.PI * 2);
    ctx.fillStyle = "#dbeafe";
    ctx.fill();

    drawBubble(SHOOTER_X, SHOOTER_Y - 8, currentColor, 13);

    if (projectile) {
      drawBubble(projectile.x, projectile.y, projectile.color);
    }

    drawParticles();
  }

  function updateBallPreview() {
    const current = root && root.querySelector("#bs-current");
    const next = root && root.querySelector("#bs-next");

    if (current) current.style.background = currentColor;
    if (next) next.style.background = nextColor;
  }

  function showOverlay(type) {
    if (!root) return;

    const overlay = root.querySelector("#bs-overlay");
    if (!overlay) return;

    overlay.style.display = "flex";

    if (type === "complete") {
      overlay.innerHTML = `
        <div class="bs-modal bs-celebrate">
          <div class="bs-big-emoji">🎉</div>
          <h2>লেভেল সম্পন্ন!</h2>
          <p>অসাধারণ খেলেছেন!</p>
          <div class="bs-modal-score">স্কোর: ${score}</div>
          <button id="bs-next-level" class="bs-primary">পরের লেভেল ▶</button>
        </div>
      `;

      overlay.querySelector("#bs-next-level").onclick = nextLevel;
    } else if (type === "gameover") {
      overlay.innerHTML = `
        <div class="bs-modal">
          <div class="bs-big-emoji">😢</div>
          <h2>গেম ওভার!</h2>
          <p>বল বিপদসীমায় পৌঁছে গেছে।</p>
          <div class="bs-modal-score">স্কোর: ${score}</div>
          <button id="bs-try-again" class="bs-primary">আবার খেলুন</button>
        </div>
      `;

      overlay.querySelector("#bs-try-again").onclick = restartLevel;
    }
  }

  function hideOverlay() {
    const overlay = root && root.querySelector("#bs-overlay");
    if (overlay) overlay.style.display = "none";
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

    settingsOpen = false;
    restartConfirmOpen = false;

    updateScoreText();
    updateBallPreview();
    hideOverlay();
    closeSettings();
    closeRestartConfirm();
    saveProgress();
  }

  function openSettings() {
    settingsOpen = true;
    const panel = root.querySelector("#bs-settings");
    if (panel) panel.style.display = "flex";
  }

  function closeSettings() {
    settingsOpen = false;
    const panel = root && root.querySelector("#bs-settings");
    if (panel) panel.style.display = "none";
  }

  function openRestartConfirm() {
    restartConfirmOpen = true;
    const panel = root.querySelector("#bs-confirm");
    if (panel) panel.style.display = "flex";
  }

  function closeRestartConfirm() {
    restartConfirmOpen = false;
    const panel = root && root.querySelector("#bs-confirm");
    if (panel) panel.style.display = "none";
  }

  function changeBall() {
    if (projectile || levelComplete || gameOver) return;

    const old = currentColor;
    currentColor = nextColor;
    nextColor = old;

    updateBallPreview();
    playSound(600, 0.07);
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (W / rect.width),
      y: (event.clientY - rect.top) * (H / rect.height)
    };
  }

  function onPointerDown(event) {
    if (settingsOpen || restartConfirmOpen || levelComplete || gameOver ||
        projectile) return;

    event.preventDefault();

    const point = getCanvasPoint(event);
    pointerStart = point;
    aimPoint = point;
    aiming = true;

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (e) {}
  }

  function onPointerMove(event) {
    if (!aiming || !pointerStart) return;

    event.preventDefault();
    aimPoint = getCanvasPoint(event);
  }

  function onPointerUp(event) {
    if (!aiming) return;

    event.preventDefault();

    if (event.type !== "pointercancel") {
      aimPoint = getCanvasPoint(event);
      shoot();
    } else {
      aiming = false;
    }

    pointerStart = null;
  }

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
          .bs-game * { box-sizing: border-box; }
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
            box-shadow: inset -4px -5px 6px rgba(0,0,0,.3);
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
            background: rgba(4,10,30,.82);
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
          .bs-big-emoji { font-size: 42px; }
          .bs-modal-score {
            margin: 12px 0;
            color: #ffe47a;
            font-weight: bold;
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
          .bs-settings-panel, .bs-confirm-panel {
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
          .bs-menu-btn.danger { background: #b83b4b; }
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
          <div class="bs-stat">লেভেল<strong id="bs-level">1</strong></div>
          <div class="bs-stat">স্কোর<strong id="bs-score">0</strong></div>
          <div class="bs-stat">সেরা<strong id="bs-best">0</strong></div>
          <button id="bs-settings-btn" class="bs-icon-btn" aria-label="Settings">⚙️</button>
        </div>

        <div class="bs-canvas-wrap">
          <canvas id="bs-canvas" width="${W}" height="${H}"></canvas>

          <div id="bs-overlay" class="bs-overlay"></div>

          <div id="bs-settings" class="bs-settings-panel">
            <div class="bs-modal">
              <h2>⚙️ সেটিংস</h2>
              <button id="bs-sound-btn" class="bs-menu-btn"></button>
              <button id="bs-restart-btn" class="bs-menu-btn danger">🔄 নতুন করে শুরু</button>
              <button id="bs-settings-close" class="bs-menu-btn light">ফিরে যান</button>
            </div>
          </div>

          <div id="bs-confirm" class="bs-confirm-panel">
            <div class="bs-modal">
              <h2>নতুন করে শুরু করবেন?</h2>
              <p>আপনার বর্তমান লেভেল ও স্কোর মুছে যাবে।</p>
              <button id="bs-confirm-yes" class="bs-menu-btn danger">হ্যাঁ, শুরু করুন</button>
              <button id="bs-confirm-no" class="bs-menu-btn light">না, ফিরে যান</button>
            </div>
          </div>
        </div>

        <div class="bs-bottom">
          <div class="bs-ball-info">
            <span>এখন:</span>
            <span id="bs-current" class="bs-preview-ball"></span>
            <span>পরের:</span>
            <span id="bs-next" class="bs-preview-ball"></span>
          </div>
          <button id="bs-change" class="bs-change">বল পরিবর্তন</button>
        </div>

        <div class="bs-hint">লক্ষ্য ঠিক করতে টাচ করুন বা ধরে টেনে ছেড়ে দিন</div>
      </div>
    `;

    root = box.querySelector("#bs-game");
    canvas = root.querySelector("#bs-canvas");
    ctx = canvas.getContext("2d");

    root.querySelector("#bs-settings-btn").onclick = openSettings;
    root.querySelector("#bs-settings-close").onclick = closeSettings;
    root.querySelector("#bs-restart-btn").onclick = openRestartConfirm;
    root.querySelector("#bs-confirm-yes").onclick = restartWholeGame;
    root.querySelector("#bs-confirm-no").onclick = closeRestartConfirm;
    root.querySelector("#bs-change").onclick = changeBall;

    root.querySelector("#bs-sound-btn").onclick = function () {
      soundOn = !soundOn;
      updateSoundButton();
      saveProgress();
      if (soundOn) playSound(650, 0.1);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    updateSoundButton();
    updateScoreText();
    updateBallPreview();
  }

  function updateSoundButton() {
    const button = root && root.querySelector("#bs-sound-btn");
    if (button) {
      button.textContent = soundOn ? "🔊 সাউন্ড বন্ধ করুন" : "🔇 সাউন্ড চালু করুন";
    }
  }

  function loop(timestamp) {
    if (!running || destroyed) return;

    const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.035) : 0.016;
    lastTime = timestamp;

    if (!settingsOpen && !restartConfirmOpen && !levelComplete && !gameOver) {
      updateProjectile(dt);
    }

    if (levelComplete) updateParticles(dt);

    drawBoard();
    animationId = requestAnimationFrame(loop);
  }

  function cleanup() {
    running = false;
    destroyed = true;

    if (animationId) cancelAnimationFrame(animationId);

    if (canvas) {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    }

    aiming = false;
    projectile = null;
    particles = [];
    root = null;
    canvas = null;
    ctx = null;
  }

  function start(box) {
    if (typeof box === "string") {
      box = document.querySelector(box);
    }

    if (!box) {
      console.error("Bubble Shooter: game container not found.");
      return;
    }

    if (running) cleanup();

    destroyed = false;
    running = true;
    lastTime = 0;
    projectile = null;
    aiming = false;
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
