/* BUBBLE SHOOTER POP — mobile-ready edition */
(() => {
  "use strict";

  if (window.BubbleShooterPop) return;

  const GAME_ID = "bubble-shooter-pop";
  const W = 420, H = 720, R = 16;
  const COLS = 10, STEP_X = 34, STEP_Y = 29.5, START_X = 38;
  const COLORS = ["#ff3b6b", "#36c9ff", "#ffd43b", "#9b65ff", "#48e28a", "#ff963c"];

  let box = null, container = null, canvas = null, ctx = null;
  let bubbles = [], particles = [], projectile = null;
  let level = 1, score = 0, shots = 0;
  let active = false, paused = false, gameOver = false, aiming = false;
  let aimAngle = -Math.PI / 2, currentColor = COLORS[0], nextColor = COLORS[1];
  let raf = 0, lastTime = 0, audio = null, soundEnabled = true;
  let volume = 0.45;

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
        Math.max(0.001, gainValue * volume),
        now
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + duration
      );

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
    tone(523, 0.16, "triangle", 0.14);
    setTimeout(() => tone(659, 0.16, "triangle", 0.14), 120);
    setTimeout(() => tone(784, 0.24, "triangle", 0.16), 240);
  }

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
      "border-radius:20px",
      "background:#10172e",
      "color:white",
      "font-family:Arial,sans-serif",
      "box-shadow:0 18px 55px #0009"
    ].join(";");

    container.innerHTML = `
      <style>
        #${GAME_ID},#${GAME_ID} *{
          box-sizing:border-box
        }

        #${GAME_ID} .bsp-top{
          flex:0 0 auto;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          padding:8px 12px;
          background:#202b49;
          border-bottom:1px solid #ffffff18
        }

        #${GAME_ID} .bsp-brand{
          font-weight:800;
          font-size:15px;
          letter-spacing:.4px
        }

        #${GAME_ID} .bsp-close{
          width:38px;
          height:36px;
          padding:0!important;
          border-radius:11px!important;
          background:#e83d63!important;
          font-size:22px!important;
          line-height:1
        }

        #${GAME_ID} .bsp-stats{
          flex:0 0 auto;
          display:flex;
          justify-content:space-around;
          gap:4px;
          padding:7px 4px;
          background:#ffffff0d;
          text-align:center;
          font-weight:800
        }

        #${GAME_ID} .bsp-stat{
          font-size:12px;
          color:#e8edff
        }

        #${GAME_ID} .bsp-value{
          display:block;
          color:#ffe47b;
          font-size:19px;
          margin-top:2px
        }

        #${GAME_ID} .bsp-board{
          flex:1 1 auto;
          min-height:0;
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
          background:#111a35
        }

        #${GAME_ID} canvas{
          display:block;
          width:auto;
          height:100%;
          max-width:100%;
          aspect-ratio:420/720;
          touch-action:none
        }

        #${GAME_ID} .bsp-controls{
          flex:0 0 auto;
          display:flex;
          justify-content:center;
          gap:7px;
          padding:8px 7px calc(8px + env(safe-area-inset-bottom));
          background:#10172e
        }

        #${GAME_ID} button{
          border:0;
          border-radius:12px;
          padding:10px 11px;
          color:white;
          background:linear-gradient(135deg,#477dff,#8b48ef);
          font-weight:800;
          font-size:13px;
          cursor:pointer;
          white-space:nowrap
        }

        #${GAME_ID} button:active{
          transform:scale(.96)
        }

        #${GAME_ID} .bsp-overlay{
          position:absolute;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:18px;
          background:#090f20dc;
          z-index:5
        }

        #${GAME_ID} .bsp-panel{
          background:linear-gradient(145deg,#273c76,#181b3a);
          border:1px solid #ffffff40;
          border-radius:22px;
          padding:22px 16px;
          text-align:center;
          width:min(90%,340px);
          box-shadow:0 15px 45px #0008
        }

        #${GAME_ID} .bsp-panel h2{
          color:#ffe47b;
          margin:0 0 10px
        }

        #${GAME_ID} .bsp-panel p{
          line-height:1.5
        }

        #${GAME_ID} .bsp-panel button{
          margin:5px
        }

        #${GAME_ID} .bsp-hidden{
          display:none!important
        }

        #${GAME_ID} .bsp-setting-row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin:12px 0
        }

        #${GAME_ID} input[type=range]{
          width:130px
        }

        @media(max-height:620px){
          #${GAME_ID}{
            height:96dvh!important
          }

          #${GAME_ID} .bsp-top{
            padding:5px 9px
          }

          #${GAME_ID} .bsp-stats{
            padding:4px
          }

          #${GAME_ID} .bsp-controls{
            padding:5px
          }

          #${GAME_ID} button{
            padding:8px 9px;
            font-size:12px
          }
        }
      </style>

      <div class="bsp-top">
        <span class="bsp-brand">🫧 BUBBLE SHOOTER POP</span>
        <button class="bsp-close" id="bsp-close" aria-label="Close game">✕</button>
      </div>

      <div class="bsp-stats">
        <div class="bsp-stat">
          SCORE
          <span class="bsp-value" id="bsp-score">0</span>
        </div>

        <div class="bsp-stat">
          LEVEL
          <span class="bsp-value" id="bsp-level">1</span>
        </div>

        <div class="bsp-stat">
          SHOTS
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

  function showOverlay(
    title,
    message,
    primary = "Continue",
    secondary = "Settings"
  ) {
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

  // Shooter only chooses colors that are still present on the board.
  function chooseBoardColor(exclude) {
    const available = activeColors();
    const choices = available.filter(c => c !== exclude);

    return rand(
      choices.length
        ? choices
        : (available.length ? available : COLORS)
    );
  }

  function refreshShooterColors() {
    const available = activeColors();

    if (!available.length) {
      currentColor = rand(COLORS);
      nextColor = rand(COLORS);
      return;
    }

    if (!available.includes(currentColor)) {
      currentColor = rand(available);
    }

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
          const p = position(row, col);
          bubbles.push({ ...p, color: rand(palette) });
        }
      }
    }

    if (bubbles.length < 3) {
      for (let col = 0; col < 3; col++) {
        const p = position(0, col);
        bubbles.push({ ...p, color: palette[0] });
      }
    }

    currentColor = rand(activeColors());
    nextColor = chooseBoardColor(currentColor);
  }

  function start(resetAll = true) {
    if (resetAll) {
      level = 1;
      score = 0;
      shots = 0;
    }

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
    if (!active || paused || gameOver || projectile) return;

    currentColor = chooseBoardColor(currentColor);
    tone(680, 0.1, "triangle");
  }

  function settings() {
    if (!active || gameOver) return;

    paused = true;

    showOverlay(
      "⚙ SETTINGS",
      "সাউন্ড ও গেম সেটিংস",
      "খেলায় ফিরুন",
      "নতুন করে শুরু"
    );

    const extra = get("bsp-extra");

    extra.innerHTML = `
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
    };

    get("bsp-volume").oninput = e => {
      volume = Number(e.target.value) / 100;
    };

    get("bsp-primary").onclick = () => {
      paused = false;
      hideOverlay();
    };

    get("bsp-secondary").onclick = () => start(true);
  }

  function togglePause() {
    if (!active || gameOver) return;

    paused = !paused;

    if (paused) {
      showOverlay(
        "PAUSED",
        "খেলা সাময়িক বন্ধ আছে",
        "আবার খেলুন",
        "Settings"
      );

      get("bsp-primary").onclick = () => {
        paused = false;
        hideOverlay();
      };

      get("bsp-secondary").onclick = settings;
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
    if (aiming) {
      aimAngle = calculateAngle(pointerPosition(e));
    }
  }

  function pointerUp() {
    if (!aiming) return;

    aiming = false;

    if (active && !paused && !gameOver && !projectile) {
      shoot();
    }
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
  }

  function makeParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 55 + Math.random() * 170;

      particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.55,
        color
      });
    }
  }

  function neighbors(b) {
    const row = b.row;
    const col = b.col;

    const diagonalCols =
      row % 2 === 0
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
        const n = bubbles.find(
          x => x.row === r && x.col === c
        );

        if (n && n.color === seed.color && !seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }

    return group;
  }

  function dropFloatingBubbles() {
    const byCell = new Map(
      bubbles.map(b => [`${b.row},${b.col}`, b])
    );

    const connected = new Set();
    const stack = bubbles.filter(b => b.row === 0);

    while (stack.length) {
      const b = stack.pop();

      if (connected.has(b)) continue;

      connected.add(b);

      for (const [r, c] of neighbors(b)) {
        const n = byCell.get(`${r},${c}`);

        if (n && !connected.has(n)) {
          stack.push(n);
        }
      }
    }

    const dropped = bubbles.filter(b => !connected.has(b));

    if (dropped.length) {
      dropped.forEach(b => {
        makeParticles(b.x, b.y, b.color);
      });

      bubbles = bubbles.filter(b => connected.has(b));
      score += dropped.length * 10;
      playPop();
    }
  }

  function findOpenNeighbor(hitBubble) {
    const candidates = neighbors(hitBubble)
      .map(([row, col]) => position(row, col))
      .filter(
        p => !bubbles.some(
          b => b.row === p.row && b.col === p.col
        )
      );

    if (!candidates.length) return null;

    return candidates.sort(
      (a, b) =>
        Math.hypot(a.x - projectile.x, a.y - projectile.y) -
        Math.hypot(b.x - projectile.x, b.y - projectile.y)
    )[0];
  }

  function finishLevel() {
    level++;
    updateUI();

    if (level > 20) {
      active = false;
      gameOver = true;

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

    showOverlay(
      "🎉 LEVEL COMPLETE!",
      "লেভেল " + (level - 1) + " শেষ! এবার লেভেল " + level + " আরও কঠিন।",
      "পরের লেভেল",
      "বন্ধ করুন"
    );

    get("bsp-primary").onclick = () => {
      paused = false;
      hideOverlay();
    };

    get("bsp-secondary").onclick = closeGame;

    playLevelUp();
  }

  function snapProjectile(hitBubble = null) {
    if (!projectile) return;

    let spot = null;

    if (hitBubble) {
      spot = findOpenNeighbor(hitBubble);
    }

    if (!spot) {
      const row = Math.max(
        0,
        Math.round((projectile.y - 28) / STEP_Y)
      );

      const col = clamp(
        Math.round(
          (projectile.x - START_X - (row % 2) * (STEP_X / 2)) / STEP_X
        ),
        0,
        COLS - 1
      );

      const p = position(row, col);

      if (!bubbles.some(
        b => b.row === p.row && b.col === p.col
      )) {
        spot = p;
      }
    }

    if (!spot) {
      projectile = null;
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
      matches.forEach(b => {
        makeParticles(b.x, b.y, b.color);
      });

      const matched = new Set(matches);

      bubbles = bubbles.filter(
        b => !matched.has(b)
      );

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

      showOverlay(
        "GAME OVER",
        "আপনার স্কোর: " + score,
        "আবার খেলুন",
        "বন্ধ করুন"
      );

      get("bsp-primary").onclick = () => start(true);
      get("bsp-secondary").onclick = closeGame;

      tone(145, 0.35, "sawtooth", 0.16);
    }
  }

  function update(dt) {
    if (projectile) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;

      if (projectile.x < R || projectile.x > W - R) {
        projectile.vx *= -1;
        projectile.x = clamp(projectile.x, R, W - R);
      }

      const hitBubble = bubbles.find(
        b => Math.hypot(
          projectile.x - b.x,
          projectile.y - b.y
        ) <= R * 1.9
      );

      if (projectile.y <= R || hitBubble) {
        snapProjectile(hitBubble || null);
      }
    }

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 150 * dt;
      p.life -= dt;
    }

    particles = particles.filter(p => p.life > 0);
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);

    g.addColorStop(0, "#1b315f");
    g.addColorStop(1, "#10152d");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#ffffff0c";
    ctx.lineWidth = 1;

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
    g.addColorStop(0.76, color);
    g.addColorStop(1, "#111827");

    ctx.save();

    ctx.shadowColor = color;
    ctx.shadowBlur = 11;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.restore();

    ctx.save();

    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#fff";

    ctx.beginPath();
    ctx.arc(
      x - radius * 0.34,
      y - radius * 0.38,
      radius * 0.19,
      0,
      Math.PI * 2
    );

    ctx.fill();
    ctx.restore();
  }

  function drawAim() {
    if (!aiming) return;

    let x = shooterX();
    let y = shooterY();

    let dx = Math.cos(aimAngle);
    let dy = Math.sin(aimAngle);

    ctx.save();

    ctx.strokeStyle = "#ffffffdd";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);

    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let i = 0; i < 170; i++) {
      x += dx * 4;
      y += dy * 4;

      if (x < R || x > W - R) {
        dx *= -1;
        x = clamp(x, R, W - R);
      }

      ctx.lineTo(x, y);

      if (
        y < R ||
        bubbles.some(
          b => Math.hypot(b.x - x, b.y - y) < R * 1.7
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

    ctx.fillStyle = "#cbd5ff";
    ctx.fillRect(-8, -44, 16, 48);

    ctx.restore();

    drawBubble(x, y, currentColor, R + 2);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px Arial";
    ctx.fillText("NEXT", x + 34, y + 4);

    drawBubble(x + 75, y, nextColor, 11);
  }

  function draw() {
    drawBackground();

    for (const b of bubbles) {
      drawBubble(b.x, b.y, b.color);
    }

    if (projectile) {
      drawBubble(
        projectile.x,
        projectile.y,
        projectile.color
      );
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.55);
      drawBubble(p.x, p.y, p.color, 4);
      ctx.globalAlpha = 1;
    }

    drawAim();
    drawShooter();
  }

  function loop(time) {
    if (!active) return;

    const dt = Math.min(
      (time - lastTime) / 1000,
      0.035
    );

    lastTime = time;

    if (!paused && !gameOver) {
      update(dt);
    }

    draw();

    raf = requestAnimationFrame(loop);
  }

  function closeGame() {
    destroy();

    if (typeof window.closeGame === "function") {
      try {
        window.closeGame();
      } catch (_) {}
    }

    const modal = document.getElementById("gameModal");

    if (modal) {
      modal.remove();
    }
  }

  function destroy() {
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

    if (container) {
      container.remove();
    }

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

  function mount(mountPoint) {
    if (!mountPoint) return;

    if (container) {
      destroy();
    }

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

    start(true);
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
