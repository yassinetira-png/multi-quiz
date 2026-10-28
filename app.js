const TABLES = Object.freeze(Array.from({ length: 12 }, (_, i) => i + 1));
const TABLE_SET = new Set(TABLES);
const QUIZ_LENGTH = 10;
const STORAGE_KEY = "multi-quiz-best";
const VIEWS = new Set([
  "home",
  "train-setup",
  "quiz-setup",
  "train",
  "quiz",
  "result",
  "review",
]);
const ANSWER_PATTERN = /^\d{1,4}$/;

const screen = document.getElementById("screen");
const bestEl = document.getElementById("bestScore");

const state = {
  view: "home",
  tables: [2, 3, 4, 5],
  a: 0,
  b: 0,
  score: 0,
  streak: 0,
  quiz: [],
  index: 0,
  answers: [],
  busy: false,
  reviewTable: 2,
};

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

function parseTable(raw) {
  const n = clampInt(raw, 1, 12, NaN);
  return TABLE_SET.has(n) ? n : null;
}

function parseAnswer(raw) {
  const s = String(raw ?? "").trim();
  if (!ANSWER_PATTERN.test(s)) return null;
  const n = Number.parseInt(s, 10);
  if (!Number.isInteger(n) || n < 0 || n > 9999) return null;
  return n;
}

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* mode privé / quota : on ignore */
  }
}

function loadBest() {
  return clampInt(readStorage(STORAGE_KEY), 0, QUIZ_LENGTH, 0);
}

function saveBest(score) {
  const safe = clampInt(score, 0, QUIZ_LENGTH, 0);
  writeStorage(STORAGE_KEY, String(Math.max(loadBest(), safe)));
  renderBest();
}

function renderBest() {
  const best = loadBest();
  if (best > 0) {
    bestEl.hidden = false;
    bestEl.textContent = `Meilleur quiz : ${best}/${QUIZ_LENGTH}`;
  }
}

function pickTables() {
  const tables = state.tables.filter((n) => TABLE_SET.has(n));
  return tables.length ? tables : [1];
}

function randomQuestion(avoid) {
  const tables = pickTables();
  let a;
  let b;
  let guard = 0;
  do {
    a = tables[Math.floor(Math.random() * tables.length)];
    b = TABLES[Math.floor(Math.random() * TABLES.length)];
    guard += 1;
  } while (avoid && a === avoid.a && b === avoid.b && guard < 40);
  return { a, b };
}

function uniqueQuiz() {
  const seen = new Set();
  const items = [];
  let guard = 0;
  while (items.length < QUIZ_LENGTH && guard < 200) {
    guard += 1;
    const q = randomQuestion();
    const key = `${q.a}x${q.b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ a: q.a, b: q.b });
  }
  return items;
}

function go(view) {
  if (!VIEWS.has(view)) return;
  state.view = view;
  render();
}

function renderTablesPicker() {
  return `
    <p class="lead tight">Tables à travailler</p>
    <div class="tables">
      ${TABLES.map((n) => {
        const selected = state.tables.includes(n) ? "on" : "";
        return `<button type="button" data-table="${n}" class="${selected}">${n}</button>`;
      }).join("")}
    </div>
  `;
}

function home() {
  return `
    <h1>Apprendre la multiplication</h1>
    <p class="lead">Entraîne-toi aux tables de 1 à 12, révise, puis teste-toi avec un quiz de ${QUIZ_LENGTH} questions.</p>
    <div class="cards">
      <button class="card" data-go="train-setup">
        <h2>Entraînement</h2>
        <p>Questions à l’infini, correction immédiate.</p>
      </button>
      <button class="card" data-go="quiz-setup">
        <h2>Quiz</h2>
        <p>${QUIZ_LENGTH} calculs, score à la fin.</p>
      </button>
      <button class="card" data-go="review">
        <h2>Réviser</h2>
        <p>Affiche une table complète.</p>
      </button>
    </div>
  `;
}

function trainSetup() {
  return `
    <h1>Entraînement</h1>
    <p class="lead">Choisis une ou plusieurs tables, puis lance les questions.</p>
    <div class="panel">
      ${renderTablesPicker()}
      <div class="row">
        <button class="btn" data-action="start-train">Commencer</button>
        <button class="btn ghost" data-go="home">Retour</button>
      </div>
    </div>
  `;
}

function quizSetup() {
  return `
    <h1>Quiz</h1>
    <p class="lead">${QUIZ_LENGTH} questions tirées des tables choisies. Pas d’indice : tu valides et tu passes à la suivante.</p>
    <div class="panel">
      ${renderTablesPicker()}
      <div class="row">
        <button class="btn" data-action="start-quiz">Lancer le quiz</button>
        <button class="btn ghost" data-go="home">Retour</button>
      </div>
    </div>
  `;
}

function answerField() {
  return `
    <label class="sr" for="answer">Réponse</label>
    <input
      id="answer"
      class="answer"
      type="text"
      inputmode="numeric"
      pattern="[0-9]{1,4}"
      maxlength="4"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      enterkeyhint="done"
      required
    />
  `;
}

function trainPlay() {
  return `
    <div class="meta">
      <span>Bonnes réponses : ${clampInt(state.score, 0, 9999, 0)}</span>
      <span>Série : ${clampInt(state.streak, 0, 9999, 0)}</span>
    </div>
    <div class="panel">
      <p class="question">${clampInt(state.a, 1, 12, 1)} × ${clampInt(state.b, 1, 12, 1)} = ?</p>
      <form id="answerForm" action="#" method="post" autocomplete="off">
        ${answerField()}
        <p class="feedback" id="feedback"></p>
        <div class="row">
          <button class="btn" type="submit">Valider</button>
          <button class="btn ghost" type="button" data-go="home">Quitter</button>
        </div>
      </form>
    </div>
  `;
}

function quizPlay() {
  const index = clampInt(state.index, 0, QUIZ_LENGTH - 1, 0);
  const q = state.quiz[index];
  if (!q) {
    state.view = "home";
    return home();
  }
  return `
    <div class="meta">
      <span>Question ${index + 1} / ${QUIZ_LENGTH}</span>
      <span>Score : ${clampInt(state.score, 0, QUIZ_LENGTH, 0)}</span>
    </div>
    <div class="progress" data-progress="quiz"><span></span></div>
    <div class="panel">
      <p class="question">${clampInt(q.a, 1, 12, 1)} × ${clampInt(q.b, 1, 12, 1)} = ?</p>
      <form id="answerForm" action="#" method="post" autocomplete="off">
        ${answerField()}
        <div class="row">
          <button class="btn" type="submit">Valider</button>
        </div>
      </form>
    </div>
  `;
}

function quizResult() {
  const recap = state.answers
    .slice(0, QUIZ_LENGTH)
    .map((item) => {
      const a = clampInt(item.a, 1, 12, 1);
      const b = clampInt(item.b, 1, 12, 1);
      const given = escapeText(clampInt(item.given, 0, 9999, 0));
      const ok = item.ok === true;
      const label = ok ? "Juste" : `Ta réponse : ${given}`;
      return `
          <li>
            <span>${a} × ${b} = ${a * b}</span>
            <span class="pill ${ok ? "ok" : "bad"}">${label}</span>
          </li>`;
    })
    .join("");
  const score = clampInt(state.score, 0, QUIZ_LENGTH, 0);
  const message =
    score === QUIZ_LENGTH
      ? "Parfait, tables maîtrisées."
      : score >= 7
        ? "Très bon travail. Relance pour viser 10/10."
        : "Continue l’entraînement sur les tables choisies.";
  return `
    <h1>Résultat</h1>
    <p class="score-big">${score}/${QUIZ_LENGTH}</p>
    <p class="lead center">${message}</p>
    <div class="panel">
      <ul class="recap">${recap}</ul>
      <div class="row">
        <button class="btn" data-action="start-quiz">Recommencer</button>
        <button class="btn ghost" data-go="home">Accueil</button>
      </div>
    </div>
  `;
}

function review() {
  const n = parseTable(state.reviewTable) ?? 2;
  return `
    <h1>Réviser une table</h1>
    <p class="lead">Clique une table pour l’afficher en entier.</p>
    <div class="panel">
      <div class="tables">
        ${TABLES.map((t) => {
          const selected = t === n ? "on" : "";
          return `<button type="button" data-review="${t}" class="${selected}">${t}</button>`;
        }).join("")}
      </div>
      <table class="grid-table">
        <thead><tr><th>×</th>${TABLES.map((t) => `<th>${t}</th>`).join("")}</tr></thead>
        <tbody>
          <tr>
            <th>${n}</th>
            ${TABLES.map((t) => `<td>${n * t}</td>`).join("")}
          </tr>
        </tbody>
      </table>
      <div class="row">
        <button class="btn ghost" data-go="home">Retour</button>
      </div>
    </div>
  `;
}

function render() {
  const views = {
    home,
    "train-setup": trainSetup,
    "quiz-setup": quizSetup,
    train: trainPlay,
    quiz: quizPlay,
    result: quizResult,
    review,
  };
  const view = VIEWS.has(state.view) ? state.view : "home";
  screen.replaceChildren();
  const wrap = document.createElement("div");
  wrap.innerHTML = views[view]();
  screen.append(...wrap.childNodes);
  const bar = screen.querySelector(".progress[data-progress=quiz]");
  if (bar) {
    const pct = Math.round(
      (clampInt(state.index, 0, QUIZ_LENGTH, 0) / QUIZ_LENGTH) * 100
    );
    bar.style.setProperty("--progress", `${clampInt(pct, 0, 100, 0)}%`);
  }
  const input = document.getElementById("answer");
  if (input) input.focus();
}

function nextTrain() {
  const q = randomQuestion({ a: state.a, b: state.b });
  state.a = q.a;
  state.b = q.b;
  state.busy = false;
  state.view = "train";
  render();
}

function startTrain() {
  state.score = 0;
  state.streak = 0;
  state.busy = false;
  state.a = 0;
  state.b = 0;
  nextTrain();
}

function startQuiz() {
  state.quiz = uniqueQuiz();
  state.index = 0;
  state.score = 0;
  state.answers = [];
  state.busy = false;
  state.view = "quiz";
  render();
}

function toggleTable(n) {
  const table = parseTable(n);
  if (table === null) return;
  if (state.tables.includes(table)) {
    state.tables = state.tables.filter((x) => x !== table);
  } else {
    state.tables = [...state.tables, table].sort((a, b) => a - b);
  }
  if (!state.tables.length) state.tables = [table];
  render();
}

function updateTrainMeta() {
  const meta = document.querySelector(".meta");
  if (!meta) return;
  meta.replaceChildren();
  const score = document.createElement("span");
  score.textContent = `Bonnes réponses : ${clampInt(state.score, 0, 9999, 0)}`;
  const streak = document.createElement("span");
  streak.textContent = `Série : ${clampInt(state.streak, 0, 9999, 0)}`;
  meta.append(score, streak);
}

document.body.addEventListener("click", (event) => {
  const goBtn = event.target.closest("[data-go]");
  if (goBtn) {
    event.preventDefault();
    go(goBtn.getAttribute("data-go"));
    return;
  }
  const tableBtn = event.target.closest("[data-table]");
  if (tableBtn) {
    toggleTable(tableBtn.getAttribute("data-table"));
    return;
  }
  const reviewBtn = event.target.closest("[data-review]");
  if (reviewBtn) {
    const table = parseTable(reviewBtn.getAttribute("data-review"));
    if (table === null) return;
    state.reviewTable = table;
    render();
    return;
  }
  const actionBtn = event.target.closest("[data-action]");
  if (!actionBtn) return;
  const action = actionBtn.getAttribute("data-action");
  if (action === "start-train") startTrain();
  if (action === "start-quiz") startQuiz();
});

document.body.addEventListener("submit", (event) => {
  if (event.target.id !== "answerForm") return;
  event.preventDefault();
  if (state.busy) return;
  const input = document.getElementById("answer");
  const given = parseAnswer(input && input.value);
  if (given === null) {
    if (input) {
      input.setCustomValidity("Entre un nombre entier positif (max 4 chiffres).");
      input.reportValidity();
      input.setCustomValidity("");
    }
    return;
  }

  if (state.view === "train") {
    const expected = state.a * state.b;
    const ok = given === expected;
    const feedback = document.getElementById("feedback");
    if (ok) {
      state.busy = true;
      state.score += 1;
      state.streak += 1;
      feedback.className = "feedback ok";
      feedback.textContent = "Bravo !";
      input.disabled = true;
      const submit = event.target.querySelector("[type=submit]");
      if (submit) submit.disabled = true;
      window.setTimeout(nextTrain, 700);
    } else {
      state.streak = 0;
      feedback.className = "feedback bad";
      feedback.textContent = `La bonne réponse est ${expected}`;
      input.select();
    }
    updateTrainMeta();
    return;
  }

  if (state.view === "quiz") {
    const q = state.quiz[state.index];
    if (!q) return;
    const expected = q.a * q.b;
    const ok = given === expected;
    if (ok) state.score += 1;
    state.answers.push({ a: q.a, b: q.b, given, ok });
    state.index += 1;
    if (state.index >= QUIZ_LENGTH) {
      saveBest(state.score);
      state.view = "result";
    }
    render();
  }
});

renderBest();
render();
