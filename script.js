// GameBangla Arena - Playable Games

let gameTimer = null;

function play(name) {
  const old = document.getElementById("gameModal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "gameModal";
  modal.style.cssText = `
    position:fixed;
    inset:0;
    z-index:9999;
    background:rgba(0,0,0,.82);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:16px;
    font-family:Arial,sans-serif;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    width:min(520px,100%);
    max-height:90vh;
    overflow:auto;
    background:#18213a;
    color:#fff;
    border-radius:18px;
    padding:22px;
    text-align:center;
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  if (name === "Quick Quiz") startQuickQuiz(box);
  else if (name === "Math Rush") startMathRush(box);
  else if (name === "Target Tap") startTargetTap(box);
}

function closeGame() {
  if (gameTimer) clearInterval(gameTimer);
  gameTimer = null;

  const modal = document.getElementById("gameModal");
  if (modal) modal.remove();
}

function gameTitle(title) {
  return `
    <h2>${title}</h2>
    <button onclick="closeGame()"
      style="float:right;margin-top:-45px;background:#e74c3c;color:white;border:0;border-radius:8px;padding:8px 12px;">
      ✕
    </button>
  `;
}

// QUICK QUIZ
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
      a: ["৫", "৬", "৭"],
      c: 2
    },
    {
      q: "পানির রাসায়নিক সংকেত কোনটি?",
      a: ["CO₂", "H₂O", "O₂"],
      c: 1
    }
  ];

  let index = 0;
  let score = 0;

  function render() {
    if (index >= questions.length) {
      box.innerHTML = `
        ${gameTitle("🧠 Quick Quiz")}
        <h3>🎉 খেলা শেষ!</h3>
        <p style="font-size:22px">
          আপনার স্কোর: <b>${score}/${questions.length}</b>
        </p>
        <button onclick="play('Quick Quiz')"
          style="padding:12px 20px;border:0;border-radius:10px;">
          আবার খেলুন
        </button>
      `;
      return;
    }

    const item = questions[index];

    box.innerHTML = `
      ${gameTitle("🧠 Quick Quiz")}
      <p>প্রশ্ন ${index + 1} / ${questions.length}</p>
      <h3>${item.q}</h3>
      <div id="quizAnswers"></div>
    `;

    const area = box.querySelector("#quizAnswers");

    item.a.forEach((answer, i) => {
      const button = document.createElement("button");

      button.textContent = answer;

      button.style.cssText = `
        display:block;
        width:100%;
        margin:10px 0;
        padding:13px;
        border:0;
        border-radius:10px;
        cursor:pointer;
        font-size:16px;
      `;

      button.onclick = () => {
        if (i === item.c) score++;
        index++;
        render();
      };

      area.appendChild(button);
    });
  }

  render();
}

// MATH RUSH
function startMathRush(box) {
  let score = 0;
  let time = 30;
  let answer = 0;

  function newQuestion() {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;

    const operations = ["+", "-", "×"];
    const op =
      operations[Math.floor(Math.random() * operations.length)];

    if (op === "+") answer = a + b;
    if (op === "-") answer = a - b;
    if (op === "×") answer = a * b;

    box.querySelector("#mathQuestion").textContent =
      `${a} ${op} ${b} = ?`;

    box.querySelector("#mathAnswer").value = "";
    box.querySelector("#mathAnswer").focus();
  }

  box.innerHTML = `
    ${gameTitle("🧮 Math Rush")}

    <p>৩০ সেকেন্ডে যত বেশি সঠিক উত্তর দিন!</p>

    <h1 id="mathTime">⏱️ 30</h1>

    <h2 id="mathQuestion"></h2>

    <input id="mathAnswer"
      type="number"
      inputmode="numeric"
      placeholder="উত্তর লিখুন"
      style="padding:12px;width:80%;border-radius:10px;border:0;font-size:18px;">

    <br><br>

    <button id="mathSubmit"
      style="padding:12px 22px;border:0;border-radius:10px;">
      উত্তর দিন
    </button>

    <p>
      স্কোর: <b id="mathScore">0</b>
    </p>
  `;

  function submit() {
    const value = Number(
      box.querySelector("#mathAnswer").value
    );

    if (value === answer) {
      score++;
    }

    box.querySelector("#mathScore").textContent = score;

    newQuestion();
  }

  box.querySelector("#mathSubmit").onclick = submit;

  box.querySelector("#mathAnswer").onkeydown = function(e) {
    if (e.key === "Enter") {
      submit();
    }
  };

  newQuestion();

  gameTimer = setInterval(() => {
    time--;

    const timer = box.querySelector("#mathTime");

    if (timer) {
      timer.textContent = `⏱️ ${time}`;
    }

    if (time <= 0) {
      clearInterval(gameTimer);
      gameTimer = null;

      box.innerHTML = `
        ${gameTitle("🧮 Math Rush")}

        <h3>⏰ সময় শেষ!</h3>

        <p style="font-size:22px">
          আপনার স্কোর: <b>${score}</b>
        </p>

        <button onclick="play('Math Rush')"
          style="padding:12px 20px;border:0;border-radius:10px;">
          আবার খেলুন
        </button>
      `;
    }
  }, 1000);
}

// TARGET TAP
function startTargetTap(box) {
  let score = 0;
  let time = 20;

  box.innerHTML = `
    ${gameTitle("🎯 Target Tap")}

    <p>২০ সেকেন্ডে যত বেশি টার্গেট ট্যাপ করুন!</p>

    <h3>
      সময়: <span id="targetTime">20</span>
      |
      স্কোর: <span id="targetScore">0</span>
    </h3>

    <div id="targetArea"
      style="
        position:relative;
        height:300px;
        background:#0d1426;
        border-radius:14px;
        overflow:hidden;
      ">
    </div>
  `;

  const area = box.querySelector("#targetArea");

  function createTarget() {
    const target = document.createElement("button");

    target.textContent = "🎯";

    target.style.cssText = `
      position:absolute;
      width:58px;
      height:58px;
      border:0;
      border-radius:50%;
      background:#ff4757;
      font-size:28px;
      cursor:pointer;
    `;

    target.style.left =
      Math.random() * (area.clientWidth - 60) + "px";

    target.style.top =
      Math.random() * (area.clientHeight - 60) + "px";

    target.onclick = () => {
      score++;

      box.querySelector("#targetScore")
        .textContent = score;

      target.remove();

      createTarget();
    };

    area.appendChild(target);
  }

  createTarget();

  gameTimer = setInterval(() => {
    time--;

    const timer = box.querySelector("#targetTime");

    if (timer) {
      timer.textContent = time;
    }

    if (time <= 0) {
      clearInterval(gameTimer);
      gameTimer = null;

      box.innerHTML = `
        ${gameTitle("🎯 Target Tap")}

        <h3>⏰ সময় শেষ!</h3>

        <p style="font-size:22px">
          আপনার স্কোর: <b>${score}</b>
        </p>

        <button onclick="play('Target Tap')"
          style="padding:12px 20px;border:0;border-radius:10px;">
          আবার খেলুন
        </button>
      `;
    }
  }, 1000);
}


 // DAILY CHALLENGE
function startChallenge() {
  const box = document.getElementById("challengeBox");

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
      q: "পৃথিবীকে আলো ও তাপ দেয় কে?",
      a: ["চাঁদ", "সূর্য", "মঙ্গল"],
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
    }
  ];

  // প্রশ্নগুলোর ক্রম এলোমেলো করা
  questions.sort(() => Math.random() - 0.5);

  let index = 0;
  let score = 0;

  function showQuestion() {
    if (index >= questions.length) {
      box.innerHTML = `
        <div style="background:#18213a;color:white;padding:20px;border-radius:12px;margin-top:15px;text-align:center">
          <h3>🎉 চ্যালেঞ্জ শেষ!</h3>
          <p>আপনার স্কোর: ${score}/${questions.length}</p>
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
