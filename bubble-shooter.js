/* BUBBLE SHOOTER POP — Enhanced Edition */
(() => {
  "use strict";

  if (window.BubbleShooterPop) return;

  const GAME_ID = "bubble-shooter-pop";
  const SAVE_KEY = "gamebangla_bubble_shooter_save_v2";

  const W = 420, H = 720, R = 16;
  const COLS = 10, STEP_X = 34, STEP_Y = 29.5, START_X = 38;
  const COLORS = [
    "#ff3b6b", "#36c9ff", "#ffd43b",
    "#9b65ff", "#48e28a", "#ff963c"
  ];

  let box = null, container = null, canvas = null, ctx = null;
  let bubbles = [], particles = [], confetti = [], projectile = null;

  let level = 1, score = 0, shots = 0;
  let active = false, paused = false, gameOver = false, aiming = false;
  let aimAngle = -Math.PI / 2;
  let currentColor = COLORS[0], nextColor = COLORS[1];

  let raf = 0, lastTime = 0, audio = null;
  let soundEnabled = true, volume = 0.45;
  let celebrationTime = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = a => a[Math.floor(Math.random() * a.length)];
  const shooterX = () => W / 2;
  const shooterY = () => H - 66;

  function ensureAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audio) audio = new AC();
      if (audio.state === "suspended") audio.resume();
      return audio;
    } catch (_) {
      return null;
    }
  }

  function tone(freq, duration = 0.12, type = "sine", gainValue = 0.12) {
    if (!soundEnabled) return;
    const ac = ensureAudio();
    if (!ac) return;

    try {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const now = ac.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(
        Math.max(0.001, gainValue * volume), now
      );
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (_) {}
  }

  function playPop() {
    tone(620, 0.09, "sine", 0.16);
    setTimeout(() => tone(880, 0.11, "triangle", 0.12), 55);
  }

  function playLevelUp() {
    tone(523, 0.16, "triangle", 0.15);
    setTimeout(() => tone(659, 0.16, "triangle", 0.15), 130);
    setTimeout(() => tone(784, 0.2, "triangle", 0.16), 260);
    setTimeout(() => tone(1046, 0.3, "sine", 0.16), 390);
  }

  function playGameOver() {
    tone(330, 0.2, "triangle", 0.14);
    setTimeout(() => tone(240, 0.25, "triangle", 0.14), 180);
    setTimeout(() => tone(150, 0.4, "sawtooth", 0.12), 380);
  }

  /* SAVE / RESTORE */

  function saveGame() {
    try {
      const data = {
        version: 2,
        level, score, shots,
        bubbles: bubbles.map(b => ({
          row: b.row,
          col: b.col,
          x: b.x,
          y: b.y,
          color: b.color
        })),
        projectile: projectile ? { ...projectile } : null,
        currentColor,
        nextColor,
        aimAngle,
        soundEnabled,
        volume,
        gameOver
      };

      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Game save failed:", e);
    }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;

      const data = JSON.parse(raw);

      if (
        !data ||
        data.version !== 2 ||
        !Array.isArray(data.bubbles) ||
        !data.bubbles.length ||
        !Number.isFinite(data.level)
      ) {
        return false;
      }

      level = Math.max(1, Number(data.level) || 1);
      score = Math.max(0, Number(data.score) || 0);
      shots = Math.max(0, Number(data.shots) || 0);

      bubbles = data.bubbles
        .filter(b =>
          Number.isFinite(b.row) &&
          Number.isFinite(b.col) &&
          Number.isFinite(b.x) &&
          Number.isFinite(b.y) &&
          COLORS.includes(b.color)
        )
        .map(b => ({ ...b }));

      if (!bubbles.length) return false;

      projectile = data.projectile &&
        Number.isFinite(data.projectile.x) &&
        Number.isFinite(data.projectile.y)
        ? { ...data.projectile }
        : null;

      currentColor = COLORS.includes(data.currentColor)
        ? data.currentColor : rand(COLORS);

      nextColor = COLORS.includes(data.nextColor)
        ? data.nextColor : rand(COLORS);

      aimAngle = Number.isFinite(data.aimAngle)
        ? data.aimAngle : -Math.PI / 2;

      soundEnabled = data.soundEnabled !== false;
      volume = clamp(Number(data.volume) || 0.45, 0, 1);
      gameOver = data.gameOver === true;

      return true;
    } catch (_) {
      return false;
    }
  }

  function clearSavedGame() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (_) {}
  }

  /* INTERFACE */

  function createContainer(mountPoint) {
    container = document.createElement("section");
    container.id = GAME_ID;

    container.style.cssText = [
      "width:100%",
      "max-width:500px",
      "height:min(96dvh,900px)",
      "min-height:0",
      "margin:auto",
      "position:relative",
      "overflow:hidden",
      "display:flex",
      "flex-direction:column",
      "border-radius:24px",
      "background:#10132d",
      "color:white",
      "font-family:Arial,sans-serif",
      "box-shadow:0 20px 65px #000b",
      "border:1px solid #ffffff25"
    ].join(";");

    container.innerHTML = `
      <style>
        #${GAME_ID},#${GAME_ID} *{box-sizing:border-box}

        #${GAME_ID}{
          background:
            radial-gradient(circle at 50% 0%,#394b91 0%,#171d43 42%,#0c1028 100%);
        }

        #${GAME_ID} .bsp-top{
          flex:0 0 auto;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          padding:11px 13px;
          background:linear-gradient(120deg,#354b9b,#6638a5,#253b82);
          border-bottom:1px solid #ffffff35;
          box-shadow:0 4px 16px #0005;
        }

        #${GAME_ID} .bsp-brand{
          font-weight:900;
          font-size:15px;
          letter-spacing:.5px;
          text-shadow:0 2px 5px #0008;
        }

        #${GAME_ID} .bsp-close{
          width:38px;height:36px;
          padding:0!important;
          border-radius:12px!important;
          background:linear-gradient(145deg,#ff6683,#d51e53)!important;
          font-size:22px!important;
          line-height:1;
          box-shadow:0 4px 10px #0005;
        }

        #${GAME_ID} .bsp-stats{
          flex:0 0 auto;
          display:flex;
          justify-content:space-around;
          gap:5px;
          padding:9px 5px;
          background:#ffffff0d;
          text-align:center;
          font-weight:800;
        }

        #${GAME_ID} .bsp-stat{
          font-size:11px;
          color:#dce5ff;
          letter-spacing:1px;
        }

        #${GAME_ID} .bsp-value{
          display:block;
          color:#ffe58b;
          font-size:20px;
          margin-top:3px;
          text-shadow:0 2px 8px #ffca4d55;
        }

        #${GAME_ID} .bsp-board{
          flex:1 1 auto;
          min-height:0;
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
          background:
            radial-gradient(ellipse at 50% 30%,#263c78 0%,#151d42 55%,#0c122e 100%);
        }

        #${GAME_ID} canvas{
          display:block;
          width:auto;
          height:100%;
          max-width:100%;
          aspect-ratio:420/720;
          touch-action:none;
        }

        #${GAME_ID} .bsp-controls{
          flex:0 0 auto;
          display:flex;
          justify-content:center;
          gap:7px;
          padding:9px 7px calc(9px + env(safe-area-inset-bottom));
          background:linear-gradient(120deg,#151a3d,#28265c,#151a3d);
          border-top:1px solid #ffffff20;
        }

        #${GAME_ID} button{
          border:1px solid #ffffff25;
          border-radius:13px;
          padding:10px 11px;
          color:white;
          background:linear-gradient(145deg,#638bff,#7044d7);
          font-weight:800;
          font-size:13px;
          cursor:pointer;
          white-space:nowrap;
          box-shadow:0 4px 10px #0004,inset 0 1px 1px #ffffff55;
          transition:transform .12s;
        }

        #${GAME_ID} button:active{transform:scale(.95)}

        #${GAME_ID} .bsp-overlay{
          position:absolute;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:18px;
          background:#080d20df;
          backdrop-filter:blur(7px);
          z-index:5;
        }

        #${GAME_ID} .bsp-panel{
          background:linear-gradient(145deg,#354c91,#24234f 60%,#452d77);
          border:1px solid #ffffff55;
          border-radius:24px;
          padding:23px 17px;
          text-align:center;
          width:min(90%,340px);
          box-shadow:0 18px 55px #000a,inset 0 1px 1px #ffffff33;
        }

        #${GAME_ID} .bsp-panel h2{
          color:#ffe58b;
          margin:0 0 10px;
          text-shadow:0 2px 10px #ffcf5c55;
        }

        #${GAME_ID} .bsp-panel p{line-height:1.55;color:#f0f2ff}
        #${GAME_ID} .bsp-panel button{margin:5px}
        #${GAME_ID} .bsp-hidden{display:none!important}

        #${GAME_ID} .bsp-setting-row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin:13px 0;
          color:white;
        }

        #${GAME_ID} input[type=range]{width:130px;accent-color:#ffdc70}
        #${GAME_ID} input[type=checkbox]{width:20px;height:20px;accent-color:#8d74ff}

        @media(max-height:620px){
          #${GAME_ID}{height:96dvh!important}
          #${GAME_ID} .bsp-top{padding:5px 9px}
          #${GAME_ID} .bsp-stats{padding:4px}
          #${GAME_ID} .bsp-controls{padding:5px}
          #${GAME_ID} button{padding:8px 9px;font-size:12px}
        }
      </style>

      <div class="bsp-top">
        <span class="bsp-brand">🫧 BUBBLE SHOOTER POP</span>
        <button class="bsp-close" id="bsp-close" aria-label="Close game">✕</button>
      </div>

      <div class="bsp-stats">
        <div class="bsp-stat">SCORE
          <span class="bsp-value" id="bsp-score">0</span>
        </div>
        <div class="bsp-stat">LEVEL
          <span class="bsp-value" id="bsp-level">1</span>
        </div>
        <div class="bsp-stat">SHOTS
          <span class="bsp-value" id="bsp-shots">0</span>
        </div>
      </div>

      <div class="bsp-board">
        <canvas id="bsp-canvas" width="420" height="720"></canvas>
      </div>

      <div class="bsp-controls">
        <button id="bsp-settings">⚙ Settings</button>
        <button id="bsp-change">🎨 Change Ball</button>
        <button id="bsp-pause">Ⅱ Pause</button>
      </div>

      <div class="bsp-overlay bsp-hidden" id="bsp-overlay">
        <div class="bsp-panel">
          <h2 id="bsp-title">BUBBLE SHOOTER</h2>
          <p id="bsp-message">Ready?</p>
          <div id="bsp-extra"></div>
          <button id="bsp-primary">Continue</button>
          <button id="bsp-secondary">Settings</button>
        </div>
      </div>
    `;

    mountPoint.innerHTML = "";
    mountPoint.appendChild(container);

    canvas = container.querySelector("#bsp-canvas");
    ctx = canvas.getContext("2d");
  }

  const get = id => container.querySelector("#" + id);

  function updateUI() {
    get("bsp-score").textContent = score;
    get("bsp-level").textContent = level;
    get("bsp-shots").textContent = shots;
  }

  function showOverlay(title, message, primary = "Continue", secondary = "Settings") {
    get("bsp-title").textContent = title;
    get("bsp-message").textContent = message;
    get("bsp-primary").textContent = primary;
    get("bsp-secondary").textContent = secondary;
    get("bsp-extra").innerHTML = "";
    get("bsp-overlay").classList.remove("bsp-hidden");
  }

  function hideOverlay() {
    get("bsp-overlay").classList.add("bsp-hidden");
  }

  /* BOARD LOGIC */

  function position(row, col) {
    return {
      row,
      col,
      x: START_X + col * STEP_X + (row % 2) * (STEP_X / 2),
      y: 28 + row * STEP_Y
    };
  }

  function activeColors() {
    return [...new Set(bubbles.map(b => b.color))];
  }

  function chooseBoardColor(exclude) {
    const available = activeColors();
    const choices = available.filter(c => c !== exclude);
    return rand(choices.length ? choices : (available.length ? available : COLORS));
  }

  function refreshShooterColors() {
    const available = activeColors();

    if (!available.length) {
      currentColor = rand(COLORS);
      nextColor = rand(COLORS);
      return;
    }

    if (!available.includes(currentColor)) currentColor = rand(available);

    if (!available.includes(nextColor) || nextColor === currentColor) {
      nextColor = chooseBoardColor(currentColor);
    }
  }

  function createBoard() {
    bubbles = [];

    const paletteSize =
      level <= 2 ? 3 :
      level <= 4 ? 4 :
      level <= 7 ? 5 : 6;

    const palette = COLORS.slice(0, paletteSize);
    const rows = Math.min(5 + Math.floor((level - 1) * 0.65), 12);
    const density = Math.min(0.97, 0.83 + level * 0.012);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < COLS; col++) {
        if (Math.random() < density) {
          bubbles.push({ ...position(row, col), color: rand(palette) });
        }
      }
    }

    if (bubbles.length < 3) {
      for (let col = 0; col < 3; col++) {
        bubbles.push({ ...position(0, col), color: palette[0] });
      }
    }

    currentColor = rand(activeColors());
    nextColor = chooseBoardColor(currentColor);
  }

  function start(resetAll = true) {
    if (resetAll) {
      clearSavedGame();
      level = 1;
      score = 0;
      shots = 0;
      projectile = null;
      gameOver = false;
      createBoard();
    }

    gameOver = false;
    paused = false;
    active = true;
    aiming = false;
    particles = [];
    confetti = [];

    updateUI();
    hideOverlay();

    cancelAnimationFrame(raf);
    lastTime = performance.now();
    saveGame();
    raf = requestAnimationFrame(loop);
  }

  function changeColor() {
    if (!active || paused || gameOver || projectile) return;

    currentColor = chooseBoardColor(currentColor);
    tone(680, 0.1, "triangle");
    saveGame();
  }

  /* SETTINGS */

  function settings() {
    if (!active || gameOver) return;

    paused = true;
    saveGame();

    showOverlay("⚙ SETTINGS", "সাউন্ড ও গেম সেটিংস", "খেলায় ফিরুন", "নতুন করে শুরু");

    get("bsp-extra").innerHTML = `
      <div class="bsp-setting-row">
        <label for="bsp-sound">Sound</label>
        <input id="bsp-sound" type="checkbox" ${soundEnabled ? "checked" : ""}>
      </div>
      <div class="bsp-setting-row">
        <label for="bsp-volume">Volume</label>
        <input id="bsp-volume" type="range" min="0" max="100" value="${Math.round(volume * 100)}">
      </div>
    `;

    get("bsp-sound").onchange = e => {
      soundEnabled = e.target.checked;
      if (soundEnabled) tone(700);
      saveGame();
    };

    get("bsp-volume").oninput = e => {
      volume = Number(e.target.value) / 100;
      saveGame();
    };

    get("bsp-primary").onclick = () => {
      paused = false;
      hideOverlay();
      saveGame();
    };

    get("bsp-secondary").onclick = () => start(true);
  }

  function togglePause() {
    if (!active || gameOver) return;

    paused = !paused;

    if (paused) {
      saveGame();
      showOverlay("PAUSED", "খেলা সাময়িক বন্ধ আছে", "আবার খেলুন", "Settings");

      get("bsp-primary").onclick = () => {
        paused = false;
        hideOverlay();
        saveGame();
      };

      get("bsp-secondary").onclick = settings;
    } else {
      hideOverlay();
      saveGame();
    }
  }

  /* AIM AND SHOOT */

  function pointerPosition(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * W,
      y: (e.clientY - rect.top) / rect.height * H
    };
  }

  function calculateAngle(p) {
    return clamp(
      Math.atan2(p.y - shooterY(), p.x - shooterX()),
      -Math.PI + 0.2,
      -0.2
    );
  }

  function pointerDown(e) {
    ensureAudio();

    if (!active || paused || gameOver || projectile) return;

    aiming = true;
    aimAngle = calculateAngle(pointerPosition(e));

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  function pointerMove(e) {
    if (aiming) aimAngle = calculateAngle(pointerPosition(e));
  }

  function pointerUp() {
    if (!aiming) return;

    aiming = false;

    if (active && !paused && !gameOver && !projectile) shoot();
  }

  function shoot() {
    projectile = {
      x: shooterX(),
      y: shooterY(),
      vx: Math.cos(aimAngle) * 650,
      vy: Math.sin(aimAngle) * 650,
      color: currentColor
    };

    shots++;
    currentColor = nextColor;
    nextColor = chooseBoardColor(currentColor);

    updateUI();
    tone(330, 0.08, "triangle", 0.08);
    saveGame();
  }

  /* PARTICLES AND CELEBRATION */

  function makeParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 55 + Math.random() * 170;

      particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.55,
        color
      });
    }
  }

  function celebrate() {
    celebrationTime = 2.8;

    for (let i = 0; i < 115; i++) {
      confetti.push({
        x: Math.random() * W,
        y: -Math.random() * H * 0.65,
        vx: (Math.random() - 0.5) * 170,
        vy: 90 + Math.random() * 230,
        size: 4 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 8,
        color: rand(COLORS),
        life: 3 + Math.random() * 1.5
      });
    }
  }

  /* BUBBLE CONNECTIONS */

  function neighbors(b) {
    const row = b.row;
    const col = b.col;

    const diagonalCols = row % 2 === 0
      ? [col - 1, col]
      : [col, col + 1];

    const coords = [
      [row, col - 1],
      [row, col + 1],
      [row - 1, diagonalCols[0]],
      [row - 1, diagonalCols[1]],
      [row + 1, diagonalCols[0]],
      [row + 1, diagonalCols[1]]
    ];

    return coords.filter(
      ([r, c]) => r >= 0 && r < 24 && c >= 0 && c < COLS
    );
  }

  function findMatches(seed) {
    const group = [];
    const seen = new Set([seed]);
    const stack = [seed];

    while (stack.length) {
      const b = stack.pop();
      group.push(b);

      for (const [r, c] of neighbors(b)) {
        const n = bubbles.find(x => x.row === r && x.col === c);

        if (n && n.color === seed.color && !seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }

    return group;
  }

  function dropFloatingBubbles() {
    const byCell = new Map(bubbles.map(b => [`${b.row},${b.col}`, b]));
    const connected = new Set();
    const stack = bubbles.filter(b => b.row === 0);

    while (stack.length) {
      const b = stack.pop();
      if (connected.has(b)) continue;

      connected.add(b);

      for (const [r, c] of neighbors(b)) {
        const n = byCell.get(`${r},${c}`);
        if (n && !connected.has(n)) stack.push(n);
      }
    }

    const dropped = bubbles.filter(b => !connected.has(b));

    if (dropped.length) {
      dropped.forEach(b => makeParticles(b.x, b.y, b.color));
      bubbles = bubbles.filter(b => connected.has(b));
      score += dropped.length * 10;
      playPop();
    }
  }

  function cellIsFree(row, col) {
    return !bubbles.some(b => b.row === row && b.col === col);
  }

  /*
   * বল বসানোর নতুন নিরাপদ পদ্ধতি:
   * ১. আগে আঘাত করা বলের পাশের খালি ঘর খোঁজে।
   * ২. পাশের ঘর না পেলে কাছের অন্য খালি ঘর খোঁজে।
   * ৩. কোনো অবস্থাতেই বল চুপচাপ মুছে ফেলে না।
   */

  function findOpenNeighbor(hitBubble) {
    let candidates = [];

    if (hitBubble) {
      candidates = neighbors(hitBubble)
        .filter(([row, col]) => cellIsFree(row, col))
        .map(([row, col]) => position(row, col));
    }

    if (candidates.length) {
      return candidates.sort((a, b) =>
        Math.hypot(a.x - projectile.x, a.y - projectile.y) -
        Math.hypot(b.x - projectile.x, b.y - projectile.y)
      )[0];
    }

    return findNearestFreeCell(projectile.x, projectile.y);
  }

  function findNearestFreeCell(x, y) {
    let best = null;
    let bestDistance = Infinity;

    for (let row = 0; row < 24; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!cellIsFree(row, col)) continue;

        const p = position(row, col);

        if (p.y > shooterY() - R) continue;

        const distance = Math.hypot(p.x - x, p.y - y);

        if (distance < bestDistance) {
          bestDistance = distance;
          best = p;
        }
      }
    }

    return best;
  }

  function finishLevel() {
    level++;
    projectile = null;
    celebrate();
    playLevelUp();
    updateUI();

    if (level > 20) {
      active = false;
      gameOver = true;
      saveGame();

      showOverlay(
        "🏆 YOU WIN!",
        "অসাধারণ! সব ২০টি লেভেল শেষ করেছেন। স্কোর: " + score,
        "আবার খেলুন",
        "বন্ধ করুন"
      );

      get("bsp-primary").onclick = () => start(true);
      get("bsp-secondary").onclick = closeGame;
      return;
    }

    createBoard();
    updateUI();

    paused = true;
    saveGame();

    showOverlay(
      "🎉 LEVEL COMPLETE!",
      "লেভেল " + (level - 1) + " শেষ! এবার লেভেল " + level + " শুরু করুন।",
      "পরের লেভেল",
      "বন্ধ করুন"
    );

    get("bsp-primary").onclick = () => {
      paused = false;
      hideOverlay();
      saveGame();
    };

    get("bsp-secondary").onclick = closeGame;
  }

  function snapProjectile(hitBubble = null) {
    if (!projectile) return;

    const spot = findOpenNeighbor(hitBubble);

    if (!spot) {
      /*
       * বোর্ডে আর কোনো জায়গা না থাকলে বল হারাবে না।
       * গেম ওভার দেখিয়ে বলের অবস্থা সংরক্ষণ করবে।
       */
      projectile = null;
      active = false;
      gameOver = true;
      saveGame();

      showOverlay(
        "GAME OVER",
        "বোর্ডে আর জায়গা নেই। আপনার স্কোর: " + score,
        "আবার খেলুন",
        "বন্ধ করুন"
      );

      get("bsp-primary").onclick = () => start(true);
      get("bsp-secondary").onclick = closeGame;
      playGameOver();
      return;
    }

    const placed = {
      ...spot,
      color: projectile.color
    };

    bubbles.push(placed);
    projectile = null;

    const matches = findMatches(placed);

    if (matches.length >= 3) {
      matches.forEach(b => makeParticles(b.x, b.y, b.color));

      const matched = new Set(matches);
      bubbles = bubbles.filter(b => !matched.has(b));

      score += matches.length * 15;
      playPop();
      dropFloatingBubbles();
    }

    updateUI();

    if (bubbles.length === 0) {
      finishLevel();
      return;
    }

    refreshShooterColors();

    if (bubbles.some(b => b.y >= shooterY() - 70)) {
      active = false;
      gameOver = true;
      celebrate();
      saveGame();

      showOverlay(
        "💥 GAME OVER",
        "আপনার স্কোর: " + score,
        "আবার খেলুন",
        "বন্ধ করুন"
      );

      get("bsp-primary").onclick = () => start(true);
      get("bsp-secondary").onclick = closeGame;

      playGameOver();
    }

    saveGame();
  }

  /* PROJECTILE COLLISION */

  function distanceToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length2 = dx * dx + dy * dy;

    if (!length2) return Math.hypot(px - x1, py - y1);

    const t = clamp(
      ((px - x1) * dx + (py - y1) * dy) / length2,
      0,
      1
    );

    const cx = x1 + t * dx;
    const cy = y1 + t * dy;

    return Math.hypot(px - cx, py - cy);
  }

  function update(dt) {
    if (projectile) {
      const oldX = projectile.x;
      const oldY = projectile.y;

      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;

      /* দেয়ালে লাগলে প্রতিফলন */
      if (projectile.x < R) {
        projectile.x = R + (R - projectile.x);
        projectile.vx = Math.abs(projectile.vx);
      } else if (projectile.x > W - R) {
        projectile.x = (W - R) - (projectile.x - (W - R));
        projectile.vx = -Math.abs(projectile.vx);
      }

      projectile.x = clamp(projectile.x, R, W - R);

      /* দ্রুত চললেও বল যেন অন্য বলের ভেতর দিয়ে চলে না যায় */
      let hitBubble = null;
      let closest = Infinity;

      for (const b of bubbles) {
        const distance = distanceToSegment(
          b.x, b.y,
          oldX, oldY,
          projectile.x, projectile.y
        );

        if (distance <= R * 1.9 && distance < closest) {
          closest = distance;
          hitBubble = b;
        }
      }

      if (projectile.y <= R || hitBubble) {
        snapProjectile(hitBubble);
      }
    }

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 150 * dt;
      p.life -= dt;
    }

    particles = particles.filter(p => p.life > 0);

    for (const c of confetti) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rotation += c.spin * dt;
      c.life -= dt;
    }

    confetti = confetti.filter(c => c.life > 0);
    celebrationTime = Math.max(0, celebrationTime - dt);
  }

  /* DRAWING */

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#243e78");
    g.addColorStop(0.48, "#172750");
    g.addColorStop(1, "#10142e");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(
      W / 2, 170, 20,
      W / 2, 170, 360
    );

    glow.addColorStop(0, "#638aff20");
    glow.addColorStop(1, "#638aff00");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#ffffff0b";
    ctx.lineWidth = 1;

    for (let y = 30; y < H; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  /* আরও চকচকে 3D বল */

  function drawBubble(x, y, color, radius = R) {
    ctx.save();

    /* বাইরের নরম ছায়া */
    ctx.shadowColor = color;
    ctx.shadowBlur = 13;

    const g = ctx.createRadialGradient(
      x - radius * 0.38,
      y - radius * 0.43,
      radius * 0.03,
      x + radius * 0.12,
      y + radius * 0.15,
      radius * 1.15
    );

    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.12, color);
    g.addColorStop(0.58, color);
    g.addColorStop(0.82, shadeColor(color, -35));
    g.addColorStop(1, "#090d22");

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.shadowBlur = 0;

    /* বাইরের কাঁচের রিং */
    ctx.lineWidth = Math.max(1, radius * 0.075);
    ctx.strokeStyle = "#ffffff65";
    ctx.stroke();

    /* উপরের বড় আলো */
    const shine = ctx.createRadialGradient(
      x - radius * 0.38,
      y - radius * 0.48,
      0,
      x - radius * 0.25,
      y - radius * 0.35,
      radius * 0.7
    );

    shine.addColorStop(0, "#ffffffed");
    shine.addColorStop(0.25, "#ffffff8c");
    shine.addColorStop(1, "#ffffff00");

    ctx.beginPath();
    ctx.ellipse(
      x - radius * 0.28,
      y - radius * 0.36,
      radius * 0.35,
      radius * 0.19,
      -0.55,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = shine;
    ctx.fill();

    /* ছোট প্রতিফলিত আলো */
    ctx.beginPath();
    ctx.arc(
      x + radius * 0.43,
      y + radius * 0.38,
      radius * 0.11,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#ffffff80";
    ctx.fill();

    ctx.restore();
  }

  function shadeColor(hex, amount) {
    const value = hex.replace("#", "");
    const num = parseInt(value, 16);

    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 255) + amount;
    let b = (num & 255) + amount;

    r = clamp(r, 0, 255);
    g = clamp(g, 0, 255);
    b = clamp(b, 0, 255);

    return "#" + (
      (1 << 24) +
      (r << 16) +
      (g << 8) +
      b
    ).toString(16).slice(1);
  }

  function drawAim() {
    if (!aiming) return;

    let x = shooterX();
    let y = shooterY();

    let dx = Math.cos(aimAngle);
    let dy = Math.sin(aimAngle);

    ctx.save();
    ctx.strokeStyle = "#ffffffdd";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 7]);

    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let i = 0; i < 170; i++) {
      const oldX = x;
      const oldY = y;

      x += dx * 4;
      y += dy * 4;

      if (x < R) {
        x = R + (R - x);
        dx = Math.abs(dx);
      } else if (x > W - R) {
        x = (W - R) - (x - (W - R));
        dx = -Math.abs(dx);
      }

      ctx.lineTo(x, y);

      if (
        y < R ||
        bubbles.some(b =>
          distanceToSegment(b.x, b.y, oldX, oldY, x, y) < R * 1.7
        )
      ) {
        break;
      }
    }

    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawShooter() {
    const x = shooterX();
    const y = shooterY();

    ctx.save();

    ctx.translate(x, y);
    ctx.rotate(aimAngle + Math.PI / 2);

    const barrel = ctx.createLinearGradient(-9, 0, 9, 0);
    barrel.addColorStop(0, "#8295d8");
    barrel.addColorStop(0.5, "#ffffff");
    barrel.addColorStop(1, "#5669ad");

    ctx.fillStyle = barrel;
    ctx.beginPath();
    ctx.roundRect(-8, -44, 16, 48, 6);
    ctx.fill();

    ctx.strokeStyle = "#ffffff90";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    drawBubble(x, y, currentColor, R + 2);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Arial";
    ctx.fillText("NEXT", x + 34, y + 4);

    drawBubble(x + 75, y, nextColor, 11);
  }

  function drawConfetti() {
    for (const c of confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.globalAlpha = clamp(c.life, 0, 1);

      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 1.5);

      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  function draw() {
    drawBackground();

    for (const b of bubbles) {
      drawBubble(b.x, b.y, b.color);
    }

    if (projectile) {
      drawBubble(projectile.x, projectile.y, projectile.color);
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.55);
      drawBubble(p.x, p.y, p.color, 4);
    }

    ctx.globalAlpha = 1;

    drawConfetti();
    drawAim();
    drawShooter();
  }

  /* GAME LOOP */

  function loop(time) {
    if (!active) return;

    const dt = Math.min((time - lastTime) / 1000, 0.035);
    lastTime = time;

    if (!paused && !gameOver) update(dt);

    draw();
    raf = requestAnimationFrame(loop);
  }

  /* CLOSE / DESTROY */

  function closeGame() {
    saveGame();
    destroy();

    if (typeof window.closeGame === "function") {
      try {
        window.closeGame();
      } catch (_) {}
    }

    const modal = document.getElementById("gameModal");
    if (modal) modal.remove();
  }

  function destroy() {
    saveGame();

    active = false;
    paused = false;
    aiming = false;

    cancelAnimationFrame(raf);

    if (canvas) {
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
    }

    if (container) container.remove();

    if (audio) {
      try {
        audio.close();
      } catch (_) {}
      audio = null;
    }

    canvas = null;
    ctx = null;
    container = null;
    box = null;
  }

  /* MOUNT */

  function mount(mountPoint) {
    if (!mountPoint) return;

    if (container) destroy();

    box = mountPoint;
    createContainer(box);

    get("bsp-close").onclick = closeGame;
    get("bsp-settings").onclick = settings;
    get("bsp-change").onclick = changeColor;
    get("bsp-pause").onclick = togglePause;

    get("bsp-primary").onclick = () => {
      paused = false;
      hideOverlay();
    };

    get("bsp-secondary").onclick = settings;

    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);

    /* নতুন গেম নয়, আগের সেভ করা গেম খোলার চেষ্টা */
    const restored = loadGame();

    if (restored) {
      active = true;
      paused = false;
      aiming = false;
      particles = [];
      confetti = [];

      updateUI();

      if (gameOver) {
        active = false;

        showOverlay(
          "GAME OVER",
          "আপনার আগের স্কোর: " + score,
          "আবার খেলুন",
          "বন্ধ করুন"
        );

        get("bsp-primary").onclick = () => start(true);
        get("bsp-secondary").onclick = closeGame;
      } else {
        hideOverlay();
      }

      lastTime = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    } else {
      start(true);
    }
  }

  window.BubbleShooterPop = {
    mount,
    start: () => start(true),
    reset: () => start(true),
    pause: togglePause,
    changeColor,
    destroy
  };

})();
