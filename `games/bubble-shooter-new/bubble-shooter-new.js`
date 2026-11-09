/* Bubble Shooter Pop — GameBangla Arena
   Standalone game module.
   Load this file from script.js and call:
   window.BubbleShooterPop.mount(box)
*/
(() => {
  "use strict";
  if (window.BubbleShooterPopNew) return;

  const STYLE_ID = "gb-bubble-shooter-style";
  const COLORS = [
    "#ff3038", "#ffd928", "#19d9dc",
    "#a900ef", "#16d92e", "#174be9", "#85898d"
  ];
  const COLOR_NAMES = [
    "লাল", "হলুদ", "আকাশি", "গোলাপি",
    "সবুজ", "নীল", "ধূসর"
  ];

  const COLS = 10;
  const R = 19;
  const DX = R * 2;
  const DY = Math.sqrt(3) * R;
  const TOP = 28;
  const MAX_ROWS = 15;

  let activeGame = null;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      .gbbs {
        width:100%;
        max-width:620px;
        margin:0 auto;
        color:#fff;
        font-family:Arial,sans-serif;
        position:relative;
        overflow:hidden;
        border-radius:22px;
        background:linear-gradient(180deg,#9b42f5 0%,#c9c5ff 22%,#c8c7ff 100%);
        box-shadow:0 12px 35px #21105b55;
        user-select:none;
      }

      .gbbs * {
        box-sizing:border-box;
      }

      .gbbs-head {
        height:68px;
        padding:10px 14px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        background:linear-gradient(180deg,#a13cff,#7e28d5);
        gap:8px;
      }

      .gbbs-icon {
        border:2px solid #45206e;
        background:linear-gradient(#fff,#8b83ac);
        color:#21163a;
        width:52px;
        height:52px;
        border-radius:50%;
        font-size:25px;
        font-weight:900;
        box-shadow:0 3px 7px #32144b88;
        cursor:pointer;
      }

      .gbbs-stats {
        display:flex;
        gap:8px;
        align-items:center;
        justify-content:center;
        flex:1;
      }

      .gbbs-stat {
        min-width:65px;
        text-align:center;
        text-shadow:0 2px 3px #3b1268;
        font-weight:900;
      }

      .gbbs-stat small {
        display:block;
        font-size:10px;
        opacity:.9;
        letter-spacing:.5px;
      }

      .gbbs-stat b {
        font-size:20px;
      }

      .gbbs-stage {
        position:relative;
        width:100%;
        background:linear-gradient(180deg,#d9d5ff,#bfc1ff);
        touch-action:pan-y;
      }

      .gbbs-canvas {
        display:block;
        width:100%;
        height:auto;
        aspect-ratio:420/690;
        touch-action:none;
      }

      .gbbs-bottom {
        min-height:125px;
        padding:8px 12px 14px;
        background:linear-gradient(180deg,#c4c4ff,#aaa9f5);
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
      }

      .gbbs-power {
        width:68px;
        height:68px;
        border-radius:50%;
        border:4px solid #8af5ff;
        background:radial-gradient(circle at 35% 25%,#5eeaff,#1262c5 55%,#10266c);
        color:white;
        font-size:24px;
        font-weight:900;
        box-shadow:0 5px 0 #5352a6,0 0 12px #fff;
        cursor:pointer;
      }

      .gbbs-power:disabled {
        opacity:.42;
        filter:grayscale(1);
      }

      .gbbs-center {
        flex:1;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:9px;
        min-width:0;
      }

      .gbbs-ballbtn {
        width:48px;
        height:48px;
        border-radius:50%;
        border:3px solid #c8caff;
        background:radial-gradient(circle at 32% 25%,#fff,#ed26c9 30%,#8d087c 75%);
        box-shadow:0 4px 0 #6255c7;
        cursor:pointer;
      }

      .gbbs-next {
        width:52px;
        height:52px;
        border-radius:50%;
        display:grid;
        place-items:center;
        border:4px solid #7770df;
        background:radial-gradient(circle at 32% 24%,#fff,#ffdf22 30%,#b66c00 80%);
        box-shadow:0 4px 0 #5a4ec3;
      }

      .gbbs-next span {
        font-size:11px;
        color:#fff;
        text-shadow:0 1px 3px #222;
        font-weight:bold;
      }

      .gbbs-small {
        font-size:11px;
        color:#35236f;
        font-weight:bold;
        text-align:center;
      }

      .gbbs-overlay {
        position:absolute;
        inset:0;
        z-index:5;
        background:#21113bbd;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:18px;
      }

      .gbbs-overlay[hidden] {
        display:none;
      }

      .gbbs-panel {
        width:min(100%,330px);
        background:linear-gradient(160deg,#fff,#d8d5ff);
        border:4px solid #8c69ed;
        border-radius:22px;
        padding:20px;
        color:#30205e;
        text-align:center;
        box-shadow:0 10px 30px #14052c88;
      }

      .gbbs-panel h2 {
        margin:0 0 12px;
        font-size:25px;
      }

      .gbbs-panel p {
        font-size:14px;
        line-height:1.5;
      }

      .gbbs-action {
        display:block;
        width:100%;
        border:0;
        border-radius:14px;
        margin:9px 0;
        padding:12px;
        background:linear-gradient(180deg,#a64aff,#6825ca);
        color:#fff;
        font-size:16px;
        font-weight:900;
        box-shadow:0 4px 0 #43118d;
        cursor:pointer;
      }

      .gbbs-action.alt {
        background:linear-gradient(180deg,#24c8e7,#1676c5);
        box-shadow:0 4px 0 #104d9a;
      }

      .gbbs-tools {
        display:flex;
        gap:7px;
        justify-content:center;
        flex-wrap:wrap;
        padding:0 10px 10px;
        background:#aaa9f5;
      }

      .gbbs-tool {
        border:1px solid #fff8;
        border-radius:12px;
        padding:7px 10px;
        background:#6540bd;
        color:#fff;
        font-weight:bold;
        font-size:12px;
        cursor:pointer;
      }

      .gbbs-tool:disabled {
        opacity:.35;
      }

      @media(max-width:390px) {
        .gbbs-head {
          height:60px;
          padding:6px;
        }

        .gbbs-icon {
          width:46px;
          height:46px;
        }

        .gbbs-stat {
          min-width:54px;
        }

        .gbbs-stat b {
          font-size:17px;
        }

        .gbbs-power {
          width:58px;
          height:58px;
        }

        .gbbs-bottom {
          min-height:105px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function randColor() {
    return Math.floor(Math.random() * COLORS.length);
  }

  function makeGrid() {
    const grid = [];

    for (let row = 0; row < 8; row++) {
      const line = [];

      for (let col = 0; col < COLS; col++) {
        line.push(Math.random() < 0.12 ? null : randColor());
      }

      grid.push(line);
    }

    grid[0] = [0,0,1,1,2,2,3,3,4,4];
    grid[1] = [0,1,1,2,2,3,3,4,4,5];
    grid[2] = [1,1,2,2,3,3,4,4,5,5];

    return grid;
  }

  function mount(box) {
    if (!box) return;

    addStyles();

    if (activeGame) {
      activeGame.destroy();
    }

    const root = document.createElement("div");
    root.className = "gbbs";

    root.innerHTML = `
      <div class="gbbs-head">

        <button class="gbbs-icon"
          data-action="pause"
          aria-label="Pause">Ⅱ</button>

        <div class="gbbs-stats">
          <div class="gbbs-stat">
            <small>স্কোর</small>
            <b data-score>0</b>
          </div>

          <div class="gbbs-stat">
            <small>লেভেল</small>
            <b data-level>1</b>
          </div>

          <div class="gbbs-stat">
            <small>শট</small>
            <b data-shots>35</b>
          </div>
        </div>

        <button class="gbbs-icon"
          data-action="settings"
          aria-label="Settings">⚙</button>

      </div>

      <div class="gbbs-stage">

        <canvas
          class="gbbs-canvas"
          width="420"
          height="690"
          aria-label="Bubble shooter game">
        </canvas>

        <div class="gbbs-overlay" data-overlay hidden>
          <div class="gbbs-panel" data-panel></div>
        </div>

      </div>

      <div class="gbbs-tools">

        <button class="gbbs-tool" data-action="bomb">
          💣 বোমা <span data-bombs>2</span>
        </button>

        <button class="gbbs-tool" data-action="fire">
          🔥 ফায়ার <span data-fire>1</span>
        </button>

        <button class="gbbs-tool" data-action="rainbow">
          🌈 রেইনবো <span data-rainbow>1</span>
        </button>

        <button class="gbbs-tool" data-action="lightning">
          ⚡ লাইটনিং <span data-lightning>1</span>
        </button>

        <button class="gbbs-tool" data-action="swap">
          🔄 বল বদল
        </button>

      </div>

      <div class="gbbs-bottom">

        <button class="gbbs-power"
          data-action="bomb"
          aria-label="Bomb">💣</button>

        <div class="gbbs-center">

          <div>
            <div class="gbbs-small">পরের বল</div>
            <button class="gbbs-ballbtn"
              data-action="swap"
              aria-label="Swap balls"></button>
          </div>

          <div class="gbbs-next">
            <span data-next-label>বল</span>
          </div>

        </div>

        <button class="gbbs-power"
          data-action="fire"
          aria-label="Fireball">🔥</button>

      </div>
    `;

    box.innerHTML = "";
    box.appendChild(root);

    const canvas = root.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const overlay = root.querySelector("[data-overlay]");
    const panel = root.querySelector("[data-panel]");

    const el = (s) => root.querySelector(s);

    let grid, score, level, shots;
    let current, next, aim;
    let paused, ended, sound, volume;
    let bombs, fires, rainbows, lightnings;
    let special, particles, anim, combo;

    let audioCtx = null;
    let destroyed = false;

    function reset(isNextLevel = false) {
      grid = makeGrid();

      score = isNextLevel ? score : 0;
      level = isNextLevel ? level + 1 : 1;

      shots = 35;

      current = randColor();
      next = randColor();

      aim = { x: 210, y: 280 };

      paused = false;
      ended = false;

      bombs = 2;
      fires = 1;
      rainbows = 1;
      lightnings = 1;

      special = "normal";
      particles = [];
      combo = 0;

      hideOverlay();
      updateUI();
      draw();
    }

    function ballGradient(c) {
      const color = COLORS[c] || "#20c9ff";

      return `radial-gradient(
        circle at 30% 23%,
        #fff 0%,
        ${color} 28%,
        ${color} 58%,
        #29135b 115%
      )`;
    }

    function updateUI() {
      el("[data-score]").textContent = score;
      el("[data-level]").textContent = level;
      el("[data-shots]").textContent = shots;

      el("[data-bombs]").textContent = bombs;
      el("[data-fire]").textContent = fires;
      el("[data-rainbow]").textContent = rainbows;
      el("[data-lightning]").textContent = lightnings;

      el(".gbbs-ballbtn").style.background =
        ballGradient(current);

      el(".gbbs-next").style.background =
        ballGradient(next);

      el("[data-next-label]").textContent =
        COLOR_NAMES[next];

      root.querySelectorAll(".gbbs-tool").forEach(b => {
        const a = b.dataset.action;

        if (a === "bomb") b.disabled = bombs <= 0;
        if (a === "fire") b.disabled = fires <= 0;
        if (a === "rainbow") b.disabled = rainbows <= 0;
        if (a === "lightning") b.disabled = lightnings <= 0;
      });
    }

    function cellCenter(row, col) {
      return {
        x: R + col * DX + (row % 2 ? R : 0),
        y: TOP + R + row * DY
      };
    }

    function neighbors(row, col) {
      const even = row % 2 === 0;

      return [
        [row, col - 1],
        [row, col + 1],
        [row - 1, col + (even ? -1 : 0)],
        [row - 1, col + (even ? 0 : 1)],
        [row + 1, col + (even ? -1 : 0)],
        [row + 1, col + (even ? 0 : 1)]
      ].filter(([r,c]) =>
        r >= 0 && r < MAX_ROWS &&
        c >= 0 && c < COLS
      );
    }

    function findCluster(row, col, color) {
      const seen = new Set();
      const out = [];
      const stack = [[row,col]];

      while (stack.length) {
        const [r,c] = stack.pop();
        const key = r + ":" + c;

        if (seen.has(key)) continue;
        if (!grid[r] || grid[r][c] == null) continue;

        if (color !== "any" && grid[r][c] !== color) {
          continue;
        }

        seen.add(key);
        out.push([r,c]);

        neighbors(r,c).forEach(p => stack.push(p));
      }

      return out;
    }

    function removeFloating() {
      const connected = new Set();
      const stack = [];

      for (let c = 0; c < COLS; c++) {
        if (grid[0][c] != null) {
          stack.push([0,c]);
        }
      }

      while (stack.length) {
        const [r,c] = stack.pop();
        const key = r + ":" + c;

        if (connected.has(key)) continue;
        if (grid[r][c] == null) continue;

        connected.add(key);

        neighbors(r,c).forEach(p => stack.push(p));
      }

      let count = 0;

      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < COLS; c++) {
          if (
            grid[r][c] != null &&
            !connected.has(r + ":" + c)
          ) {
            grid[r][c] = null;
            count++;
          }
        }
      }

      return count;
    }

    function popCells(cells, multiplier = 10) {
      if (!cells.length) return 0;

      cells.forEach(([r,c]) => {
        const p = cellCenter(r,c);

        for (let i = 0; i < 5; i++) {
          particles.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - .5) * 4,
            vy: (Math.random() - .5) * 4,
            life: 24,
            color: COLORS[grid[r][c]]
          });
        }

        grid[r][c] = null;
      });

      score += cells.length * multiplier;

      const floating = removeFloating();
      score += floating * multiplier;

      if (cells.length + floating >= 6) {
        combo++;
      }

      playSound(cells.length >= 5 ? 620 : 420, .09);

      return cells.length + floating;
    }

    function findLanding(x,y) {
      let best = null;
      let bestD = Infinity;

      for (let r = 0; r < MAX_ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!grid[r] || grid[r][c] != null) continue;

          const p = cellCenter(r,c);
          const d = Math.hypot(p.x-x,p.y-y);

          if (d < DX * 1.08 && d < bestD) {
            best = [r,c];
            bestD = d;
          }
        }
      }

      if (!best) {
        let c = Math.max(
          0,
          Math.min(COLS - 1, Math.round((x-R)/DX))
        );

        for (let k = 0; k < COLS; k++) {
          let cc = (c+k) % COLS;

          if (grid[0][cc] == null) {
            best = [0,cc];
            break;
          }
        }
      }

      return best;
    }

    function shoot(x,y) {
      if (paused || ended) return;

      const sx = 210;
      const sy = 610;

      let dx = x - sx;
      let dy = y - sy;

      if (dy > -20) dy = -20;

      const len = Math.hypot(dx,dy) || 1;

      dx /= len;
      dy /= len;

      let bx = sx;
      let by = sy;

      for (let i = 0; i < 500; i++) {
        bx += dx * 3;
        by += dy * 3;

        if (bx < R || bx > 420 - R) {
          dx = -dx;
        }

        if (by < TOP + R) break;

        let hit = false;

        for (let r = 0; r < MAX_ROWS && !hit; r++) {
          for (let c = 0; c < COLS; c++) {
            if (grid[r] && grid[r][c] != null) {
              const p = cellCenter(r,c);

              if (Math.hypot(p.x-bx,p.y-by) < R * 1.8) {
                hit = true;
                break;
              }
            }
          }
        }

        if (hit) break;
      }

      const cell = findLanding(bx,by);

      if (!cell) {
        shots--;
        current = next;
        next = randColor();
        updateUI();
        checkEnd();
        return;
      }

      const [r,c] = cell;

      if (!grid[r]) {
        grid[r] = Array(COLS).fill(null);
      }

      grid[r][c] =
        special === "rainbow"
          ? (function() {
              const around = neighbors(r,c)
                .map(([rr,cc]) => grid[rr][cc])
                .find(v => v != null);

              return around == null ? current : around;
            })()
          : current;

      let popped = 0;

      if (special === "bomb") {
        const cells = [];

        for (let rr = 0; rr < MAX_ROWS; rr++) {
          for (let cc = 0; cc < COLS; cc++) {
            if (grid[rr] && grid[rr][cc] != null) {
              const p = cellCenter(rr,cc);

              if (Math.hypot(p.x-bx,p.y-by) < R * 3.2) {
                cells.push([rr,cc]);
              }
            }
          }
        }

        popped = popCells(cells,15);

      } else if (special === "fire") {
        const cells = [];

        for (let rr = 0; rr < MAX_ROWS; rr++) {
          for (let cc = 0; cc < COLS; cc++) {
            if (
              grid[rr] &&
              grid[rr][cc] != null &&
              Math.abs(cc-c) <= 1 &&
              rr >= r-3 &&
              rr <= r+1
            ) {
              cells.push([rr,cc]);
            }
          }
        }

        popped = popCells(cells,14);

      } else if (special === "lightning") {
        const cells = [];

        for (let rr = 0; rr < MAX_ROWS; rr++) {
          for (let cc = 0; cc < COLS; cc++) {
            if (
              grid[rr] &&
              grid[rr][cc] != null &&
              cc === c
            ) {
              cells.push([rr,cc]);
            }
          }
        }

        popped = popCells(cells,13);

      } else {
        const cluster = findCluster(r,c,grid[r][c]);

        if (cluster.length >= 3) {
          popped = popCells(cluster,10);
        }
      }

      special = "normal";

      shots--;
      current = next;
      next = randColor();

      updateUI();

      if (!anyBubbles()) {
        score += 500;

        showOverlay(
          "লেভেল সম্পন্ন! 🎉",
          "আপনি সব বল পরিষ্কার করেছেন।",
          "পরের লেভেল",
          () => reset(true)
        );

      } else if (shots <= 0) {
        checkEnd();

      } else if (maxOccupiedRow() >= MAX_ROWS - 2) {
        gameOver();
      }

      draw();
    }

    function anyBubbles() {
      return grid.some(row =>
        row && row.some(v => v != null)
      );
    }

    function maxOccupiedRow() {
      let m = 0;

      for (let r = 0; r < grid.length; r++) {
        if (grid[r] && grid[r].some(v => v != null)) {
          m = r;
        }
      }

      return m;
    }

    function checkEnd() {
      if (!anyBubbles()) {
        showOverlay(
          "দারুণ! 🎉",
          "লেভেল সম্পন্ন হয়েছে।",
          "পরের লেভেল",
          () => reset(true)
        );
      } else {
        gameOver();
      }
    }

    function gameOver() {
      ended = true;

      showOverlay(
        "গেম ওভার",
        "আপনার স্কোর: " + score,
        "আবার খেলুন",
        () => reset(false)
      );
    }

    function showOverlay(title,msg,button,action,extra="") {
      overlay.hidden = false;

      panel.innerHTML = `
        <h2>${title}</h2>
        <p>${msg}</p>
        ${extra}
        <button class="gbbs-action" data-main>
          ${button}
        </button>
        <button class="gbbs-action alt" data-close>
          খেলা চালিয়ে যান
        </button>
      `;

      panel.querySelector("[data-main]").onclick = () => {
        hideOverlay();
        action();
      };

      panel.querySelector("[data-close]").onclick = () => {
        hideOverlay();
        paused = false;
        draw();
      };
    }

    function hideOverlay() {
      overlay.hidden = true;
    }

    function settings() {
      paused = true;

      showOverlay(
        "সেটিংস",
        "সাউন্ড ও গেম নিয়ন্ত্রণ",
        "নতুন করে শুরু",
        () => reset(false),
        `
          <button class="gbbs-action alt" data-sound>
            🔊 সাউন্ড: ${sound ? "চালু" : "বন্ধ"}
          </button>

          <button class="gbbs-action alt" data-volume>
            ভলিউম: ${Math.round(volume*100)}%
          </button>
        `
      );

      panel.querySelector("[data-sound]").onclick = () => {
        sound = !sound;
        settings();
      };

      panel.querySelector("[data-volume]").onclick = () => {
        volume = volume >= 1 ? .25 : Math.min(1,volume+.25);
        settings();
      };
    }

    function pause() {
      if (ended) return;

      paused = true;

      showOverlay(
        "খেলা বিরতি",
        "আপনি চাইলে আবার খেলা শুরু করতে পারেন।",
        "আবার শুরু",
        () => {
          paused = false;
          draw();
        }
      );
    }

    function playSound(freq=440,duration=.08) {
      if (!sound || volume <= 0) return;

      try {
        audioCtx = audioCtx ||
          new (window.AudioContext || window.webkitAudioContext)();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.value = volume * .06;

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();

        gain.gain.exponentialRampToValueAtTime(
          .001,
          audioCtx.currentTime + duration
        );

        osc.stop(audioCtx.currentTime + duration);

      } catch (e) {}
    }

    function usePower(type) {
      if (paused || ended) return;

      if (type === "bomb" && bombs > 0) {
        bombs--;
        special = "bomb";

      } else if (type === "fire" && fires > 0) {
        fires--;
        special = "fire";

      } else if (type === "rainbow" && rainbows > 0) {
        rainbows--;
        special = "rainbow";

      } else if (type === "lightning" && lightnings > 0) {
        lightnings--;
        special = "lightning";

      } else {
        return;
      }

      updateUI();
      playSound(760,.12);
    }

    function swap() {
      if (paused || ended) return;

      [current,next] = [next,current];

      updateUI();
      playSound(540,.06);
    }

    function drawBall(x,y,color,r=R,glow=true) {
      const c = COLORS[color] || "#22d8ff";

      if (glow) {
        ctx.save();
        ctx.shadowColor = c;
        ctx.shadowBlur = 7;
      }

      const g = ctx.createRadialGradient(
        x-r*.36,
        y-r*.45,
        r*.08,
        x,
        y,
        r*1.12
      );

      g.addColorStop(0,"#ffffff");
      g.addColorStop(.13,"#ffffff");
      g.addColorStop(.27,c);
      g.addColorStop(.75,c);
      g.addColorStop(1,"#29205d");

      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fillStyle = g;
      ctx.fill();

      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "#ffffff88";
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        x-r*.34,
        y-r*.42,
        r*.22,
        r*.11,
        -.5,
        0,
        Math.PI*2
      );
      ctx.fillStyle = "#ffffffcc";
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(
        x+r*.34,
        y+r*.43,
        r*.25,
        r*.12,
        -.6,
        0,
        Math.PI*2
      );
      ctx.fillStyle = "#ffffff22";
      ctx.fill();

      if (glow) {
        ctx.restore();
      }
    }

    function draw() {
      if (destroyed) return;

      ctx.clearRect(0,0,420,690);

      const bg = ctx.createLinearGradient(0,0,0,690);
      bg.addColorStop(0,"#d9d5ff");
      bg.addColorStop(1,"#c2c2ff");

      ctx.fillStyle = bg;
      ctx.fillRect(0,0,420,690);

      const shine = ctx.createRadialGradient(
        210,300,20,
        210,300,360
      );

      shine.addColorStop(0,"#ffffff22");
      shine.addColorStop(1,"#7777dd00");

      ctx.fillStyle = shine;
      ctx.fillRect(0,0,420,690);

      for (let r = 0; r < MAX_ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r] && grid[r][c] != null) {
            const p = cellCenter(r,c);
            drawBall(p.x,p.y,grid[r][c]);
          }
        }
      }

      ctx.save();
      ctx.shadowColor = "#3d2cbb";
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.arc(210,620,46,Math.PI,0);
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#7562e9";
      ctx.stroke();

      ctx.restore();

      drawBall(210,610,current,24);

      if (!paused && !ended && aim) {
        let x = 210;
        let y = 584;

        let dx = aim.x - 210;
        let dy = aim.y - 584;

        if (dy > -20) dy = -20;

        const l = Math.hypot(dx,dy) || 1;

        dx /= l;
        dy /= l;

        ctx.save();

        ctx.setLineDash([5,7]);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#ffffffdd";

        ctx.beginPath();
        ctx.moveTo(x,y);

        for (let i = 0; i < 170; i++) {
          x += dx * 3;
          y += dy * 3;

          if (x < R || x > 420-R) {
            dx = -dx;
            x = Math.max(R,Math.min(420-R,x));
          }

          if (y < TOP+R) break;

          let hit = false;

          for (let rr = 0; rr < MAX_ROWS && !hit; rr++) {
            for (let cc = 0; cc < COLS; cc++) {
              if (grid[rr] && grid[rr][cc] != null) {
                const p = cellCenter(rr,cc);

                if (Math.hypot(p.x-x,p.y-y) < R*1.8) {
                  hit = true;
                  break;
                }
              }
            }
          }

          if (hit) break;

          ctx.lineTo(x,y);
        }

        ctx.stroke();
        ctx.restore();
      }

      particles = particles.filter(p => p.life > 0);

      particles.forEach(p => {
        ctx.globalAlpha = p.life / 24;
        ctx.fillStyle = p.color;

        ctx.beginPath();
        ctx.arc(p.x,p.y,3,0,Math.PI*2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        p.life--;
      });

      ctx.globalAlpha = 1;

      if (paused) {
        ctx.fillStyle = "#24134a44";
        ctx.fillRect(0,0,420,690);
      }
    }

    function onPointer(e) {
      const rect = canvas.getBoundingClientRect();

      const x = (e.clientX-rect.left) * 420 / rect.width;
      const y = (e.clientY-rect.top) * 690 / rect.height;

      aim = { x,y };

      if (e.type === "pointerdown") {
        e.preventDefault();

        if (y < 580) {
          shoot(x,y);
        }

      } else {
        draw();
      }
    }

    function onClick(e) {
      const btn = e.target.closest("[data-action]");

      if (!btn) return;

      const a = btn.dataset.action;

      if (a === "pause") {
        pause();

      } else if (a === "settings") {
        settings();

      } else if (a === "swap") {
        swap();

      } else {
        usePower(a);
      }
    }

    canvas.addEventListener("pointermove",onPointer);
    canvas.addEventListener("pointerdown",onPointer);
    root.addEventListener("click",onClick);

    function tick() {
      if (destroyed) return;

      draw();
      anim = requestAnimationFrame(tick);
    }

    function destroy() {
      destroyed = true;

      cancelAnimationFrame(anim);

      canvas.removeEventListener("pointermove",onPointer);
      canvas.removeEventListener("pointerdown",onPointer);
      root.removeEventListener("click",onClick);

      if (root.parentNode) {
        root.parentNode.removeChild(root);
      }

      if (activeGame === api) {
        activeGame = null;
      }
    }

    const api = {
      destroy,
      start: () => reset(false),
      reset: () => reset(false),
      pause,
      changeColor: () => swap()
    };

    activeGame = api;

    sound = true;
    volume = .55;

    reset(false);
    tick();

    return api;
  }
window.BubbleShooterPopNew = {
  mount,
  destroy: () => activeGame && activeGame.destroy()
};
  

})();
