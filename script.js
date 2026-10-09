
 // GameBangla Arena - Playable Games

let gameTimer = null;

// ==============================
// COMMON GAME FUNCTIONS
// ==============================

function stopGameTimer() {
  if (gameTimer !== null) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
}

function play(name) {
  stopGameTimer();

  const old = document.getElementById("gameModal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "gameModal";
  modal.style.cssText = `
    position:fixed; inset:0; z-index:9999;
    background:rgba(0,0,0,.85);
    display:flex; align-items:center; justify-content:center;
    padding:16px; font-family:Arial,sans-serif;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    width:min(520px,100%); max-height:90vh; overflow:auto;
    background:#18213a; color:white; border-radius:18px;
    padding:22px; text-align:center;
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  if (name === "Quick Quiz") startQuickQuiz(box);
  else if (name === "Math Rush") startMathRush(box);
  else if (name === "Target Tap") startTargetTap(box);
   else if (name === "Snake Game") startSnakeGame(box);
  else {
    box.innerHTML = `
      <h3>গেম পাওয়া যায়নি</h3>
      <button onclick="closeGame()">বন্ধ করুন</button>
    `;
  }
}

function closeGame() {
  stopGameTimer();
  const modal = document.getElementById("gameModal");
  if (modal) modal.remove();
}

function gameTitle(title) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <h2>${title}</h2>
      <button onclick="closeGame()"
        style="background:#e74c3c;color:white;border:0;border-radius:8px;padding:8px 12px">
        ✕
      </button>
    </div>
  `;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ==============================
// QUICK QUIZ
// ==============================

function startQuickQuiz(box) {
  const questions = [
    {
      q: "বাংলাদেশের জাতীয় খেলা কোনটি?",
      a: ["কাবাডি", "ক্রিকেট", "ফুটবল"],
      c: 0
    },
    {
      q: "বাংলাদেশের রাজধানী কোনটি?",
      a: ["চট্টগ্রাম", "ঢাকা", "রাজশাহী"],
      c: 1
    },
    {
      q: "পৃথিবীর উপগ্রহ কোনটি?",
      a: ["সূর্য", "চাঁদ", "মঙ্গল"],
      c: 1
    },
    {
      q: "এক সপ্তাহে কয় দিন?",
      a: ["৫ দিন", "৬ দিন", "৭ দিন"],
      c: 2
    },
    {
      q: "পানির রাসায়নিক সংকেত কোনটি?",
      a: ["CO₂", "H₂O", "O₂"],
      c: 1
    },
    {
      q: "সূর্য কোন দিকে ওঠে?",
      a: ["পূর্ব", "পশ্চিম", "উত্তর"],
      c: 0
    },
    {
      q: "বাংলাদেশের জাতীয় ফুল কোনটি?",
      a: ["গোলাপ", "শাপলা", "জবা"],
      c: 1
    },
    {
      q: "এক বছরে সাধারণত কয় মাস?",
      a: ["১০ মাস", "১১ মাস", "১২ মাস"],
      c: 2
    },
    {
      q: "লাল গ্রহ বলা হয় কোনটিকে?",
      a: ["মঙ্গল", "শুক্র", "বৃহস্পতি"],
      c: 0
    },
    {
      q: "বাংলাদেশের জাতীয় ফল কোনটি?",
      a: ["আম", "কাঁঠাল", "লিচু"],
      c: 1
    }
  ];

  const selected = shuffleArray([...questions]).slice(0, 5);
  let index = 0;
  let score = 0;

  function render() {
    if (index >= selected.length) {
      box.innerHTML = `
        ${gameTitle("🧠 Quick Quiz")}
        <h3>🎉 কুইজ শেষ!</h3>
        <p style="font-size:22px">আপনার স্কোর: <b>${score}/${selected.length}</b></p>
        <button onclick="play('Quick Quiz')" style="padding:12px 20px;border:0;border-radius:10px">
          আবার খেলুন
        </button>
      `;
      return;
    }

    const item = selected[index];

    box.innerHTML = `
      ${gameTitle("🧠 Quick Quiz")}
      <p>প্রশ্ন ${index + 1}/${selected.length}</p>
      <h3>${item.q}</h3>
      <div id="quizAnswers"></div>
      <p id="quizFeedback"></p>
      <button id="quizNext" style="display:none;padding:12px 20px;border:0;border-radius:10px">
        পরের প্রশ্ন
      </button>
    `;

    const area = box.querySelector("#quizAnswers");

    item.a.forEach((answer, i) => {
      const button = document.createElement("button");
      button.textContent = answer;
      button.style.cssText = `
        display:block;width:100%;margin:10px 0;padding:13px;
        border:0;border-radius:10px;cursor:pointer;font-size:16px;
      `;

      button.onclick = () => {
        area.querySelectorAll("button").forEach(b => b.disabled = true);

        if (i === item.c) {
          score++;
          box.querySelector("#quizFeedback").textContent = "✅ সঠিক উত্তর!";
        } else {
          box.querySelector("#quizFeedback").textContent =
            "❌ সঠিক উত্তর: " + item.a[item.c];
        }

        const next = box.querySelector("#quizNext");
        next.style.display = "inline-block";
        next.textContent = index === selected.length - 1 ? "ফলাফল দেখুন" : "পরের প্রশ্ন";

        next.onclick = () => {
          index++;
          render();
        };
      };

      area.appendChild(button);
    });
  }

  render();
}

// ==============================
// MATH RUSH
// ==============================

function startMathRush(box) {
  let score = 0;
  let time = 30;
  let answer = 0;
  let finished = false;

  function endGame() {
    if (finished) return;
    finished = true;
    stopGameTimer();

    box.innerHTML = `
      ${gameTitle("🧮 Math Rush")}
      <h3>⏰ সময় শেষ!</h3>
      <p style="font-size:22px">আপনার স্কোর: <b>${score}</b></p>
      <button onclick="play('Math Rush')" style="padding:12px 20px;border:0;border-radius:10px">
        আবার খেলুন
      </button>
    `;
  }

  box.innerHTML = `
    ${gameTitle("🧮 Math Rush")}
    <p>৩০ সেকেন্ডে যত বেশি সঠিক উত্তর দিন!</p>
    <h1 id="mathTime">⏱️ 30</h1>
    <h2 id="mathQuestion"></h2>
    <input id="mathAnswer" type="number" inputmode="numeric"
      placeholder="উত্তর লিখুন"
      style="padding:12px;width:80%;border-radius:10px;border:0;font-size:18px">
    <br><br>
    <button id="mathSubmit" style="padding:12px 22px;border:0;border-radius:10px">
      উত্তর দিন
    </button>
    <p>স্কোর: <b id="mathScore">0</b></p>
    <p id="mathFeedback"></p>
  `;

  function newQuestion() {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const operations = ["+", "-", "×"];
    const op = operations[Math.floor(Math.random() * operations.length)];

    if (op === "+") answer = a + b;
    else if (op === "-") answer = a - b;
    else answer = a * b;

    box.querySelector("#mathQuestion").textContent = `${a} ${op} ${b} = ?`;
    box.querySelector("#mathAnswer").value = "";
  }

  function submit() {
    if (finished) return;

    const input = box.querySelector("#mathAnswer");
    if (input.value.trim() === "") {
      box.querySelector("#mathFeedback").textContent = "আগে উত্তর লিখুন!";
      return;
    }

    if (Number(input.value) === answer) {
      score++;
      box.querySelector("#mathFeedback").textContent = "✅ সঠিক!";
    } else {
      box.querySelector("#mathFeedback").textContent = "❌ ভুল!";
    }

    box.querySelector("#mathScore").textContent = score;
    newQuestion();
  }

  box.querySelector("#mathSubmit").onclick = submit;
  box.querySelector("#mathAnswer").onkeydown = e => {
    if (e.key === "Enter") submit();
  };

  newQuestion();

  gameTimer = setInterval(() => {
    time--;
    const timer = box.querySelector("#mathTime");
    if (timer) timer.textContent = `⏱️ ${time}`;
    if (time <= 0) endGame();
  }, 1000);
}

// ==============================
// TARGET TAP
// ==============================

function startTargetTap(box) {
  let score = 0;
  let time = 20;
  let finished = false;

  function endGame() {
    if (finished) return;
    finished = true;
    stopGameTimer();

    box.innerHTML = `
      ${gameTitle("🎯 Target Tap")}
      <h3>⏰ সময় শেষ!</h3>
      <p style="font-size:22px">আপনার স্কোর: <b>${score}</b></p>
      <button onclick="play('Target Tap')" style="padding:12px 20px;border:0;border-radius:10px">
        আবার খেলুন
      </button>
    `;
  }

  box.innerHTML = `
    ${gameTitle("🎯 Target Tap")}
    <p>২০ সেকেন্ডে যত বেশি টার্গেট ট্যাপ করুন!</p>
    <h3>সময়: <span id="targetTime">20</span> | স্কোর: <span id="targetScore">0</span></h3>
    <div id="targetArea" style="position:relative;height:300px;background:#0d1426;border-radius:14px;overflow:hidden"></div>
  `;

  const area = box.querySelector("#targetArea");

  function createTarget() {
    if (finished || !area.isConnected) return;

    const target = document.createElement("button");
    target.textContent = "🎯";
    target.setAttribute("aria-label", "টার্গেটে ট্যাপ করুন");
    target.style.cssText = `
      position:absolute;width:58px;height:58px;border:0;border-radius:50%;
      background:#ff4757;font-size:28px;cursor:pointer;
    `;

    target.style.left = Math.max(0, Math.random() * (area.clientWidth - 58)) + "px";
    target.style.top = Math.max(0, Math.random() * (area.clientHeight - 58)) + "px";

    target.onclick = () => {
      if (finished) return;
      score++;
      box.querySelector("#targetScore").textContent = score;
      target.remove();
      createTarget();
    };

    area.appendChild(target);
  }

  createTarget();

  gameTimer = setInterval(() => {
    time--;
    const timer = box.querySelector("#targetTime");
    if (timer) timer.textContent = time;
    if (time <= 0) endGame();
  }, 1000);
}

// ==============================
// DAILY CHALLENGE
// ==============================

function startChallenge() {
  const box = document.getElementById("challengeBox");

  if (!box) {
    alert("Daily Challenge-এর challengeBox পাওয়া যায়নি। index.html পরীক্ষা করুন।");
    return;
  }

  // প্রতিদিনের জন্য আলাদা প্রশ্নের সেট।
  // দিন পরিবর্তন হলে তারিখ অনুযায়ী অন্য সেট নির্বাচন হবে।
  const dailySets = [
    [
      { q: "বাংলাদেশের জাতীয় খেলা কোনটি?", a: ["কাবাডি", "ক্রিকেট", "ফুটবল"], c: 0 },
      { q: "বাংলাদেশের রাজধানী কোনটি?", a: ["চট্টগ্রাম", "ঢাকা", "রাজশাহী"], c: 1 },
      { q: "পৃথিবীকে আলো ও তাপ দেয় কে?", a: ["চাঁদ", "সূর্য", "মঙ্গল"], c: 1 },
      { q: "এক সপ্তাহে কয় দিন?", a: ["৫ দিন", "৬ দিন", "৭ দিন"], c: 2 },
      { q: "পানির রাসায়নিক সংকেত কোনটি?", a: ["CO₂", "H₂O", "O₂"], c: 1 }
    ],
    [
      { q: "বাংলাদেশের জাতীয় ফুল কোনটি?", a: ["গোলাপ", "শাপলা", "জবা"], c: 1 },
      { q: "সূর্য কোন দিকে ওঠে?", a: ["পূর্ব", "পশ্চিম", "উত্তর"], c: 0 },
      { q: "বাংলাদেশের জাতীয় ফল কোনটি?", a: ["আম", "কাঁঠাল", "লিচু"], c: 1 },
      { q: "এক বছরে কয় মাস?", a: ["১০ মাস", "১২ মাস", "১৩ মাস"], c: 1 },
      { q: "লাল গ্রহ বলা হয় কোনটিকে?", a: ["মঙ্গল", "শুক্র", "বৃহস্পতি"], c: 0 }
    ],
    [
      { q: "বাংলাদেশের জাতীয় পাখি কোনটি?", a: ["দোয়েল", "কাক", "ময়না"], c: 0 },
      { q: "এক দিনে কয় ঘণ্টা?", a: ["১২ ঘণ্টা", "২৪ ঘণ্টা", "৩৬ ঘণ্টা"], c: 1 },
      { q: "পৃথিবীর প্রাকৃতিক উপগ্রহ কোনটি?", a: ["সূর্য", "চাঁদ", "শুক্র"], c: 1 },
      { q: "বাংলাদেশের মুদ্রার নাম কী?", a: ["রুপি", "টাকা", "রিয়াল"], c: 1 },
      { q: "মানুষ শ্বাস নেওয়ার সময় কোন গ্যাস ব্যবহার করে?", a: ["অক্সিজেন", "হিলিয়াম", "হাইড্রোজেন"], c: 0 }
    ],
    [
      { q: "বাংলাদেশের জাতীয় সংগীতের রচয়িতা কে?", a: ["কাজী নজরুল ইসলাম", "রবীন্দ্রনাথ ঠাকুর", "জসীমউদ্দীন"], c: 1 },
      { q: "পৃথিবীর সবচেয়ে বড় মহাসাগর কোনটি?", a: ["প্রশান্ত মহাসাগর", "ভারত মহাসাগর", "আটলান্টিক মহাসাগর"], c: 0 },
      { q: "এক ডজন সমান কতটি?", a: ["১০টি", "১২টি", "১৪টি"], c: 1 },
      { q: "বরফ গলে কী হয়?", a: ["পানি", "বালি", "তেল"], c: 0 },
      { q: "বাংলাদেশের জাতীয় পশু কোনটি?", a: ["হাতি", "রয়েল বেঙ্গল টাইগার", "হরিণ"], c: 1 }
    ],
    [
      { q: "সৌরজগতের কেন্দ্র কী?", a: ["পৃথিবী", "চাঁদ", "সূর্য"], c: 2 },
      { q: "বাংলাদেশের স্বাধীনতা দিবস কবে?", a: ["২৬ মার্চ", "১৬ ডিসেম্বর", "২১ ফেব্রুয়ারি"], c: 0 },
      { q: "বাংলাদেশের বিজয় দিবস কবে?", a: ["২১ ফেব্রুয়ারি", "১৬ ডিসেম্বর", "২৬ মার্চ"], c: 1 },
      { q: "ত্রিভুজের কয়টি বাহু?", a: ["৩টি", "৪টি", "৫টি"], c: 0 },
      { q: "ইংরেজি বর্ণমালায় কয়টি অক্ষর?", a: ["২৪টি", "২৬টি", "২৮টি"], c: 1 }
    ],
    [
      { q: "বাংলাদেশের জাতীয় মাছ কোনটি?", a: ["রুই", "ইলিশ", "কাতলা"], c: 1 },
      { q: "এক ঘণ্টায় কয় মিনিট?", a: ["৩০ মিনিট", "৬০ মিনিট", "৯০ মিনিট"], c: 1 },
      { q: "গাছ সাধারণত কোন গ্যাস গ্রহণ করে?", a: ["কার্বন ডাই-অক্সাইড", "অক্সিজেন", "হিলিয়াম"], c: 0 },
      { q: "সপ্তাহের প্রথম দিন হিসেবে সাধারণত কোনটি ধরা হয়?", a: ["সোমবার", "রবিবার", "শুক্রবার"], c: 1 },
      { q: "বাংলাদেশ কোন মহাদেশে অবস্থিত?", a: ["এশিয়া", "ইউরোপ", "আফ্রিকা"], c: 0 }
    ],
    [
      { q: "বাংলাদেশের জাতীয় বৃক্ষ কোনটি?", a: ["আমগাছ", "বটগাছ", "নারিকেল গাছ"], c: 0 },
      { q: "২ + ৩ = কত?", a: ["৪", "৫", "৬"], c: 1 },
      { q: "কোনটি একটি পাখি?", a: ["দোয়েল", "ইলিশ", "বাঘ"], c: 0 },
      { q: "পৃথিবী কোন নক্ষত্রকে কেন্দ্র করে ঘোরে?", a: ["ধ্রুবতারা", "সূর্য", "চাঁদ"], c: 1 },
      { q: "বাংলাদেশের রাষ্ট্রভাষা কী?", a: ["বাংলা", "ইংরেজি", "আরবি"], c: 0 }
    ]
  ];

  // একই দিনে একই সেট; পরের দিনে অন্য সেট।
  const today = new Date();
  const dayNumber = Math.floor(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000
  );
  const setIndex = ((dayNumber % dailySets.length) + dailySets.length) % dailySets.length;
  const questions = dailySets[setIndex].map(item => ({
    q: item.q,
    a: [...item.a],
    c: item.c
  }));

  // প্রতিদিন প্রশ্নের সেট নির্দিষ্ট থাকবে, কিন্তু অপশন সাজানো হবে এলোমেলোভাবে।
  questions.forEach(item => {
    const correctAnswer = item.a[item.c];
    shuffleArray(item.a);
    item.c = item.a.indexOf(correctAnswer);
  });

  let index = 0;
  let score = 0;
  let answered = false;

  function showQuestion() {
    answered = false;

    if (index >= questions.length) {
      box.innerHTML = `
        <div style="background:#18213a;color:white;padding:20px;border-radius:12px;margin-top:15px;text-align:center">
          <h3>🎉 আজকের চ্যালেঞ্জ শেষ!</h3>
          <p>আপনার স্কোর: ${score}/${questions.length}</p>
          <p>আগামীকাল আবার নতুন চ্যালেঞ্জ খেলুন!</p>
          <button onclick="startChallenge()" style="padding:10px 16px;border:0;border-radius:8px">
            আবার খেলুন
          </button>
        </div>
      `;
      return;
    }

    const item = questions[index];

    box.innerHTML = `
      <div style="background:#18213a;color:white;padding:20px;border-radius:12px;margin-top:15px;text-align:center">
        <h3>🏆 Daily Challenge</h3>
        <p>প্রশ্ন ${index + 1}/${questions.length}</p>
        <h4>${item.q}</h4>
        <div id="dailyAnswers"></div>
        <p id="dailyFeedback"></p>
      </div>
    `;

    const area = box.querySelector("#dailyAnswers");

    item.a.forEach((answerText, i) => {
      const btn = document.createElement("button");
      btn.textContent = answerText;
      btn.style.cssText = "display:block;width:100%;margin:8px 0;padding:12px;border:0;border-radius:8px;cursor:pointer";

      btn.onclick = () => {
        if (answered) return;
        answered = true;

        if (i === item.c) {
          score++;
          box.querySelector("#dailyFeedback").textContent = "✅ সঠিক উত্তর!";
        } else {
          box.querySelector("#dailyFeedback").textContent =
            "❌ ভুল উত্তর! সঠিক উত্তর: " + item.a[item.c];
        }

        area.querySelectorAll("button").forEach(b => b.disabled = true);

        const next = document.createElement("button");
        next.textContent = index === questions.length - 1 ? "ফলাফল দেখুন" : "পরের প্রশ্ন";
        next.style.cssText = "margin-top:12px;padding:12px 20px;border:0;border-radius:8px";
        next.onclick = () => {
          index++;
          showQuestion();
        };

        area.appendChild(next);
      };

      area.appendChild(btn);
    });
  }

  showQuestion();
}
// ==============================
// SNAKE GAME
// ==============================

function startSnakeGame(box) {
  let snake = [{ x: 8, y: 8 }];
  let food = { x: 4, y: 4 };
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let score = 0;
  let running = true;
  let loop = null;
  const size = 16;
  const cells = 20;

  box.innerHTML = `
    ${gameTitle("🐍 Snake Game")}
    <p>খাবার খাও, সাপ বড় করো!</p>
    <h3>স্কোর: <span id="snakeScore">0</span></h3>
    <canvas id="snakeCanvas"
      width="320" height="320"
      style="width:100%;max-width:320px;background:#0d1426;border:2px solid #35d07f;border-radius:10px;touch-action:none">
    </canvas>
    <p id="snakeMessage">তীর চিহ্ন দিয়ে সাপ চালান</p>
    <div style="display:grid;grid-template-columns:repeat(3,65px);gap:8px;justify-content:center;margin-top:12px">
      <span></span>
      <button id="snakeUp">⬆️</button>
      <span></span>
      <button id="snakeLeft">⬅️</button>
      <button id="snakeDown">⬇️</button>
      <button id="snakeRight">➡️</button>
    </div>
    <br>
    <button id="snakeRestart" style="padding:12px 20px;border:0;border-radius:10px">
      🔄 আবার খেলুন
    </button>
  `;

  const canvas = box.querySelector("#snakeCanvas");
  const ctx = canvas.getContext("2d");

  box.querySelectorAll("#snakeUp,#snakeDown,#snakeLeft,#snakeRight").forEach(btn => {
    btn.style.cssText = "padding:12px;border:0;border-radius:10px;font-size:20px";
  });

  function placeFood() {
    do {
      food = {
        x: Math.floor(Math.random() * cells),
        y: Math.floor(Math.random() * cells)
      };
    } while (snake.some(part => part.x === food.x && part.y === food.y));
  }

  function setDirection(x, y) {
    if (x === -direction.x && y === -direction.y) return;
    nextDirection = { x, y };
  }

  box.querySelector("#snakeUp").onclick = () => setDirection(0, -1);
  box.querySelector("#snakeDown").onclick = () => setDirection(0, 1);
  box.querySelector("#snakeLeft").onclick = () => setDirection(-1, 0);
  box.querySelector("#snakeRight").onclick = () => setDirection(1, 0);

  function keyHandler(e) {
    const keys = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0]
    };

    if (keys[e.key]) {
      e.preventDefault();
      setDirection(keys[e.key][0], keys[e.key][1]);
    }
  }

  document.addEventListener("keydown", keyHandler);

  function draw() {
    ctx.fillStyle = "#0d1426";
    ctx.fillRect(0, 0, 320, 320);

    ctx.fillStyle = "#ff4757";
    ctx.fillRect(food.x * size, food.y * size, size - 1, size - 1);

    snake.forEach((part, i) => {
      ctx.fillStyle = i === 0 ? "#7bed9f" : "#2ed573";
      ctx.fillRect(part.x * size, part.y * size, size - 1, size - 1);
    });
  }

  function endGame() {
    running = false;
    clearInterval(loop);
    document.removeEventListener("keydown", keyHandler);
    box.querySelector("#snakeMessage").textContent =
      "খেলা শেষ! আপনার স্কোর: " + score;
  }

  function tick() {
    if (!running) return;

    direction = nextDirection;

    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y
    };

    const eating = head.x === food.x && head.y === food.y;
    const body = eating ? snake : snake.slice(0, -1);

    if (
      head.x < 0 || head.x >= cells ||
      head.y < 0 || head.y >= cells ||
      body.some(part => part.x === head.x && part.y === head.y)
    ) {
      endGame();
      return;
    }

    snake.unshift(head);

    if (eating) {
      score++;
      box.querySelector("#snakeScore").textContent = score;

      if (snake.length === cells * cells) {
        draw();
        endGame();
        box.querySelector("#snakeMessage").textContent =
          "অসাধারণ! আপনি পুরো বোর্ড জিতেছেন!";
        return;
      }

      placeFood();
    } else {
      snake.pop();
    }

    draw();
  }

  box.querySelector("#snakeRestart").onclick = () => {
    startSnakeGame(box);
  };

  placeFood();
  draw();
  loop = setInterval(tick, 150);
}
