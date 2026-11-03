
/* =========================================
   BUBBLE SHOOTER POP
   GameBangla Arena
   ========================================= */

(function () {
  "use strict";

  const COLORS = ["#ff4d6d", "#35b6ff", "#ffd43b", "#54d17a", "#b47aff", "#ff9635"];
  const COLS = 10;
  const ROWS = 14;
  const R = 17;
  const GAP = 2;
  const STEP_Y = 30;
  const WIDTH = 360;
  const HEIGHT = 560;

  let canvas, ctx, box;
  let grid = [];
  let score = 0;
  let level = 1;
  let shots = 0;
  let currentColor;
  let nextColor;
  let aim = { x: WIDTH / 2, y: 100 };
  let projectile = null;
  let animation = null;
  let running = false;
  let gameOver = false;
  let soundOn = true;
  let message = "";
  let messageTimer = 0;

  function randomColor() {
    return COLORS[Math.floor(Math.random() * Math.min(COLORS.length, 3 + Math.floor((level - 1) / 2)))];
  }

  function initGrid() {
    grid = [];
    const rows = Math.min(4 + level, 10);

    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        if (r < rows && (level < 3 || Math.random() > 0.08)) {
          grid[r][c] = {
            color: randomColor()
          };
        } else {
          grid[r][c] = null;
        }
      }
    }
  }

  function playSound(frequency = 500) {
    if (!soundOn) return;
    try {
      const audio = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.08, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.15);
      oscillator.onended = () => audio.close();
    } catch (e) {}
  }

  function centerX(c) {
    return R + 4 + c * (R * 2 + GAP) + (Math.floor(0) ? R : 0);
  }

  function bubblePosition(r, c) {
    const offset = r % 2 ? R : 0;
    return {
      x: R + 4 + c * (R * 2 + GAP) + offset,
      y: R + 8 + r * STEP_Y
    };
  }

  function drawBubble(x, y, color, radius = R) {
    const gradient = ctx.createRadialGradient(
      x - radius * 0.35,
      y - radius * 0.4,
      2,
      x,
      y,
      radius
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.22, color);
    gradient.addColorStop(1, "#18233d");

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.stroke();
  }

  function draw() {
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    bg.addColorStop(0, "#14234a");
    bg.addColorStop(1, "#090f27");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Background stars
    for (let i = 0; i < 25; i++) {
      ctx.fillStyle = "rgba(255,255,255,.16)";
      ctx.beginPath();
      ctx.arc((i * 71) % WIDTH, (i * 97) % HEIGHT, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Board
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r] && grid[r][c]) {
          const p = bubblePosition(r, c);
          drawBubble(p.x, p.y, grid[r][c].color);
        }
      }
    }

    // Aim line
    if (running && !projectile && !gameOver) {
      const startX = WIDTH / 2;
      const startY = HEIGHT - 75;
      ctx.save();
      ctx.setLineDash([6, 7]);
      ctx.strokeStyle = "rgba(255,255,255,.45)";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(aim.x, aim.y);
      ctx.stroke();
      ctx.restore();
    }

    // Shooter
    drawBubble(WIDTH / 2, HEIGHT - 75, currentColor || COLORS[0], 20);
    drawBubble(WIDTH / 2 + 48, HEIGHT - 75, nextColor || COLORS[1], 11);

    if (projectile) {
      drawBubble(projectile.x, projectile.y, projectile.color);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.fillText("NEXT", WIDTH / 2 + 30, HEIGHT - 48);

    // Bottom danger line
    ctx.strokeStyle = "rgba(255,90,110,.55)";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 120);
    ctx.lineTo(WIDTH, HEIGHT - 120);
    ctx.stroke();
    ctx.setLineDash([]);

    if (messageTimer > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 25px Arial";
      ctx.textAlign = "center";
      ctx.fillText(message, WIDTH / 2, HEIGHT / 2);
      ctx.textAlign = "left";
      messageTimer--;
    }

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,.68)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 30px Arial";
      ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 20);
      ctx.font = "18px Arial";
      ctx.fillText("Score: " + score, WIDTH / 2, HEIGHT / 2 + 20);
      ctx.textAlign = "left";
    }

    if (grid.every(row => row.every(cell => !cell))) {
      gameOver = true;
      running = false;
      message = "LEVEL COMPLETE!";
      ctx.fillStyle = "rgba(0,0,0,.7)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 28px Arial";
      ctx.fillText("LEVEL COMPLETE!", WIDTH / 2, HEIGHT / 2 - 25);
      ctx.font = "18px Arial";
      ctx.fillText("Score: " + score, WIDTH / 2, HEIGHT / 2 + 15);
      ctx.textAlign = "left";
    }
  }

  function neighbors(r, c) {
    const even = r % 2 === 0;
    return even
      ? [[r,c-1],[r,c+1],[r-1,c-1],[r-1,c],[r+1,c-1],[r+1,c]]
      : [[r,c-1],[r,c+1],[r-1,c],[r-1,c+1],[r+1,c],[r+1,c+1]];
  }

  function findGroup(r, c, color, seen = new Set()) {
    const key = r + "," + c;
    if (seen.has(key)) return [];
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return [];
    if (!grid[r][c] || grid[r][c].color !== color) return [];

    seen.add(key);
    let group = [[r,c]];

    neighbors(r,c).forEach(([nr,nc]) => {
      group = group.concat(findGroup(nr,nc,color,seen));
    });

    return group;
  }

  function removeFloating() {
    const connected = new Set();
    const stack = [];

    for (let c = 0; c < COLS; c++) {
      if (grid[0][c]) stack.push([0,c]);
    }

    while (stack.length) {
      const [r,c] = stack.pop();
      const key = r + "," + c;
      if (connected.has(key)) continue;
      connected.add(key);

      neighbors(r,c).forEach(([nr,nc]) => {
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc]) {
          stack.push([nr,nc]);
        }
      });
    }

    let removed = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] && !connected.has(r + "," + c)) {
          grid[r][c] = null;
          removed++;
        }
      }
    }

    score += removed * 10;
  }

  function placeBubble() {
    let best = null;
    let bestDistance = Infinity;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) continue;
        const p = bubblePosition(r,c);
        const d = Math.hypot(p.x - projectile.x, p.y - projectile.y);
        if (d < bestDistance) {
          bestDistance = d;
          best = {r,c};
        }
      }
    }

    if (!best) {
      endGame();
      return;
    }

    grid[best.r][best.c] = { color: projectile.color };

    const group = findGroup(best.r,best.c,projectile.color);
    if (group.length >= 3) {
      group.forEach(([r,c]) => grid[r][c] = null);
      score += group.length * 20;
      playSound(750);
      removeFloating();
      message = "POP! +" + (group.length * 20);
      messageTimer = 35;
    } else {
      playSound(300);
    }

    shots++;
    if (shots % Math.max(5, 8 - Math.floor(level / 2)) === 0) {
      addRow();
    }

    projectile = null;
    currentColor = nextColor;
    nextColor = randomColor();

    if (grid.some(row => row.some(cell => cell && cell.y > 0))) {
      // Board state checked below
    }

    checkEnd();
    updateStats();
  }

  function addRow() {
    for (let r = ROWS - 1; r > 0; r--) {
      grid[r] = grid[r - 1].map(cell => cell ? { color: cell.color } : null);
    }

    grid[0] = [];
    for (let c = 0; c < COLS; c++) {
      grid[0][c] = { color: randomColor() };
    }
  }

  function checkEnd() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) {
          const p = bubblePosition(r,c);
          if (p.y >= HEIGHT - 125) {
            endGame();
            return;
          }
        }
      }
    }

    if (grid.every(row => row.every(cell => !cell))) {
      running = false;
      gameOver = true;
      message = "LEVEL COMPLETE!";
      updateStats();
    }
  }

  function endGame() {
    gameOver = true;
    running = false;
    updateStats();
  }

  function shoot() {
    if (!running || gameOver || projectile) return;

    const sx = WIDTH / 2;
    const sy = HEIGHT - 75;
    const dx = aim.x - sx;
    const dy = aim.y - sy;
    const length = Math.hypot(dx,dy) || 1;

    projectile = {
      x: sx,
      y: sy,
      vx: (dx / length) * 8,
      vy: (dy / length) * 8,
      color: currentColor
    };

    playSound(450);
  }

  function updateProjectile() {
    if (!projectile) return;

    projectile.x += projectile.vx;
    projectile.y += projectile.vy;

    if (projectile.x < R || projectile.x > WIDTH - R) {
      projectile.vx *= -1;
    }

    let hit = projectile.y < 25;

    for (let r = 0; r < ROWS && !hit; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!grid[r][c]) continue;
        const p = bubblePosition(r,c);
        if (Math.hypot(projectile.x-p.x, projectile.y-p.y) < R * 2 - 1) {
          hit = true;
          break;
        }
      }
    }

    if (hit) placeBubble();
  }

  function updateStats() {
    const scoreEl = box.querySelector("#bs-score");
    const levelEl = box.querySelector("#bs-level");
    if (scoreEl) scoreEl.textContent = score;
    if (levelEl) levelEl.textContent = level;
  }

  function newGame() {
    score = 0;
    level = 1;
    shots = 0;
    gameOver = false;
    projectile = null;
    currentColor = randomColor();
    nextColor = randomColor();
    initGrid();
    running = true;
    updateStats();
  }

  function nextLevel() {
    level++;
    shots = 0;
    gameOver = false;
    projectile = null;
    currentColor = randomColor();
    nextColor = randomColor();
    initGrid();
    running = true;
    updateStats();
  }

  function frame() {
    if (!box || !box.isConnected) {
      cleanup();
      return;
    }

    if (running) updateProjectile();
    draw();
    animation = requestAnimationFrame(frame);
  }

  function setAim(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const clientX = event.clientX ?? (event.touches && event.touches[0].clientX);
    const clientY = event.clientY ?? (event.touches && event.touches[0].clientY);

    aim.x = Math.max(15, Math.min(WIDTH - 15, (clientX - rect.left) * scaleX));
    aim.y = Math.min(HEIGHT - 150, (clientY - rect.top) * scaleY);
  }

  function onPointerMove(e) {
    setAim(e);
  }

  function onPointerDown(e) {
    e.preventDefault();
    setAim(e);
    shoot();
  }

  function cleanup() {
    running = false;
    if (animation) cancelAnimationFrame(animation);
    if (canvas) {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
    }
    if (box) {
      box.removeEventListener("click", onBoxClick);
    }
  }

  function onBoxClick(e) {
    const action = e.target.closest("[data-bs-action]");
    if (!action) return;

    const type = action.dataset.bsAction;

    if (type === "restart") newGame();
    if (type === "next" && gameOver && grid.every(row => row.every(cell => !cell))) nextLevel();
    if (type === "sound") {
      soundOn = !soundOn;
      action.textContent = soundOn ? "🔊 Sound On" : "🔇 Sound Off";
    }
  }

  function start(container) {
    cleanup();
    box = container;

    box.innerHTML = `
      <div class="bubble-shooter-game" style="
        max-width:390px;margin:12px auto;padding:14px;
        background:linear-gradient(145deg,#172554,#312e81);
        border-radius:20px;color:white;font-family:Arial,sans-serif;
        box-shadow:0 12px 35px rgba(0,0,0,.3);">
        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:12px;">
          <div style="background:#0f172a;padding:9px 14px;border-radius:12px;">
            🏆 Score: <b id="bs-score">0</b>
          </div>
          <div style="background:#0f172a;padding:9px 14px;border-radius:12px;">
            ⭐ Level: <b id="bs-level">1</b>
          </div>
        </div>
        <canvas id="bubbleShooterCanvas"
          width="${WIDTH}" height="${HEIGHT}"
          style="width:100%;height:auto;display:block;border-radius:14px;
          touch-action:none;background:#14234a;"></canvas>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
          <button data-bs-action="restart" style="flex:1;padding:12px;border:0;border-radius:12px;background:#22c55e;color:white;font-weight:bold;">🔄 Restart</button>
          <button data-bs-action="sound" style="flex:1;padding:12px;border:0;border-radius:12px;background:#2563eb;color:white;font-weight:bold;">🔊 Sound On</button>
          <button data-bs-action="next" style="flex:1;padding:12px;border:0;border-radius:12px;background:#f59e0b;color:#111827;font-weight:bold;">Next Level ➜</button>
        </div>
        <p style="text-align:center;font-size:13px;opacity:.85;margin:12px 0 0;">
          একই রঙের ৩টি বা তার বেশি বল মিলিয়ে ফাটান!
        </p>
      </div>
    `;

    canvas = box.querySelector("#bubbleShooterCanvas");
    ctx = canvas.getContext("2d");

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    box.addEventListener("click", onBoxClick);

    newGame();

    if (animation) cancelAnimationFrame(animation);
    frame();
  }

  window.startBubbleShooter = start;
  window.stopBubbleShooter = cleanup;

})();
