const PROFILE_KEY = "amphibianAcademyReactState";
const STARTING_HP = 10;
const ROUND_SECONDS = 30;
const COUNTDOWN_SECONDS = 3;

const BOT_CONFIG = {
  easy: { accuracy: 0.65, intervalMs: 1900 },
  medium: { accuracy: 0.78, intervalMs: 1400 },
  hard: { accuracy: 0.88, intervalMs: 980 }
};

const REWARD_FLIES = {
  player: 40,
  bot: 15,
  draw: 25
};

const PHASE_LABEL = {
  idle: "Idle",
  countdown: "Countdown",
  live: "Live",
  resolve: "Round End",
  gameOver: "Game Over"
};

const elements = {
  fliesValue: document.getElementById("fliesValue"),
  winsValue: document.getElementById("winsValue"),
  phaseBadge: document.getElementById("phaseBadge"),
  difficultySelect: document.getElementById("difficultySelect"),
  roundValue: document.getElementById("roundValue"),
  startBtn: document.getElementById("startBtn"),
  nextRoundBtn: document.getElementById("nextRoundBtn"),
  damageChip: document.getElementById("damageChip"),
  rewardText: document.getElementById("rewardText"),
  botPoints: document.getElementById("botPoints"),
  playerPoints: document.getElementById("playerPoints"),
  botHpValue: document.getElementById("botHpValue"),
  playerHpValue: document.getElementById("playerHpValue"),
  botHpFill: document.getElementById("botHpFill"),
  playerHpFill: document.getElementById("playerHpFill"),
  timerValue: document.getElementById("timerValue"),
  countdownValue: document.getElementById("countdownValue"),
  answerForm: document.getElementById("answerForm"),
  answerInput: document.getElementById("answerInput"),
  submitBtn: document.getElementById("submitBtn"),
  questionText: document.getElementById("questionText"),
  statusLine: document.getElementById("statusLine")
};

const timers = {
  countdownId: null,
  timerId: null,
  botId: null
};

const state = {
  profile: loadProfile(),
  battle: createBattleState()
};

function loadProfile() {
  const fallback = {
    flies: 0,
    wins: 0,
    settings: {
      difficulty: "easy"
    }
  };

  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      settings: {
        ...fallback.settings,
        ...(parsed.settings || {})
      }
    };
  } catch {
    return fallback;
  }
}

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
}

function createBattleState() {
  return {
    phase: "idle",
    round: 0,
    countdown: COUNTDOWN_SECONDS,
    timeLeft: ROUND_SECONDS,
    playerHp: STARTING_HP,
    botHp: STARTING_HP,
    playerPoints: 0,
    botPoints: 0,
    question: null,
    answerInput: "",
    netDamage: 0,
    winner: null,
    rewardApplied: false,
    rewardText: "",
    statusLine: "Press Start Battle to begin.",
    statusTone: "neutral"
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isNear(left, right) {
  return Math.abs(left - right) < 0.0001;
}

function formatValue(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2);
}

function chooseOperation(difficulty) {
  if (difficulty === "easy") {
    return Math.random() < 0.55 ? "add" : "subtract";
  }

  if (difficulty === "medium") {
    const pool = ["add", "subtract", "multiply"];
    return pool[randomInt(0, pool.length - 1)];
  }

  const pool = ["add", "subtract", "multiply", "divide"];
  return pool[randomInt(0, pool.length - 1)];
}

function generateQuestion(difficulty) {
  const op = chooseOperation(difficulty);

  if (op === "add") {
    const max = difficulty === "hard" ? 80 : difficulty === "medium" ? 45 : 20;
    const left = randomInt(0, max);
    const right = randomInt(0, max);
    return { prompt: `${left} + ${right} = ?`, answer: left + right };
  }

  if (op === "subtract") {
    const max = difficulty === "hard" ? 90 : difficulty === "medium" ? 50 : 20;
    const right = randomInt(0, max);
    const left = randomInt(right, right + max);
    return { prompt: `${left} - ${right} = ?`, answer: left - right };
  }

  if (op === "multiply") {
    const max = difficulty === "hard" ? 12 : difficulty === "medium" ? 10 : 8;
    const left = randomInt(0, max);
    const right = randomInt(0, max);
    return { prompt: `${left} x ${right} = ?`, answer: left * right };
  }

  const divisorMax = difficulty === "hard" ? 12 : difficulty === "medium" ? 10 : 8;
  const quotientMax = difficulty === "hard" ? 14 : difficulty === "medium" ? 12 : 10;
  const right = randomInt(1, divisorMax);
  const answer = randomInt(1, quotientMax);
  const left = right * answer;

  return { prompt: `${left} / ${right} = ?`, answer };
}

function currentBotModel() {
  return BOT_CONFIG[state.profile.settings.difficulty] || BOT_CONFIG.easy;
}

function clearTimer(name) {
  if (!timers[name]) {
    return;
  }
  clearInterval(timers[name]);
  timers[name] = null;
}

function clearAllTimers() {
  clearTimer("countdownId");
  clearTimer("timerId");
  clearTimer("botId");
}

function applyRewardIfNeeded() {
  if (state.battle.phase !== "gameOver" || state.battle.rewardApplied) {
    return;
  }

  const reward = REWARD_FLIES[state.battle.winner || "draw"];

  state.profile.flies += reward;
  if (state.battle.winner === "player") {
    state.profile.wins += 1;
  }
  saveProfile();

  state.battle.rewardApplied = true;
  state.battle.rewardText = `Battle reward: +${reward} flies`;
}

function resolveRound() {
  const net = state.battle.playerPoints - state.battle.botPoints;

  if (net > 0) {
    state.battle.botHp = Math.max(0, state.battle.botHp - net);
  } else if (net < 0) {
    state.battle.playerHp = Math.max(0, state.battle.playerHp - Math.abs(net));
  }

  const gameOver = state.battle.playerHp === 0 || state.battle.botHp === 0;

  let winner = null;
  if (gameOver) {
    if (state.battle.playerHp === 0 && state.battle.botHp === 0) {
      winner = "draw";
    } else if (state.battle.botHp === 0) {
      winner = "player";
    } else {
      winner = "bot";
    }
  }

  let summary = `Round ${state.battle.round}: You ${state.battle.playerPoints} - Bot ${state.battle.botPoints}. `;
  if (net > 0) {
    summary += `You dealt ${net} damage.`;
  } else if (net < 0) {
    summary += `Bot dealt ${Math.abs(net)} damage.`;
  } else {
    summary += "No damage this round.";
  }

  if (gameOver) {
    if (winner === "player") summary += " You won the battle.";
    if (winner === "bot") summary += " Bot won the battle.";
    if (winner === "draw") summary += " Draw.";
  }

  state.battle.phase = gameOver ? "gameOver" : "resolve";
  state.battle.timeLeft = 0;
  state.battle.netDamage = net;
  state.battle.winner = winner;
  state.battle.rewardApplied = false;
  state.battle.rewardText = "";
  state.battle.question = null;
  state.battle.answerInput = "";
  state.battle.statusLine = summary;
  state.battle.statusTone = net > 0 ? "good" : net < 0 ? "bad" : "neutral";

  applyRewardIfNeeded();
  render();
}

function startLiveRound() {
  clearTimer("countdownId");

  state.battle.phase = "live";
  state.battle.countdown = 0;
  state.battle.timeLeft = ROUND_SECONDS;
  state.battle.playerPoints = 0;
  state.battle.botPoints = 0;
  state.battle.question = generateQuestion(state.profile.settings.difficulty);
  state.battle.answerInput = "";
  state.battle.statusLine = `Round ${state.battle.round} live. Solve as fast as you can.`;
  state.battle.statusTone = "neutral";

  const botModel = currentBotModel();

  timers.timerId = setInterval(() => {
    if (state.battle.phase !== "live") {
      return;
    }

    state.battle.timeLeft -= 1;
    if (state.battle.timeLeft <= 0) {
      clearTimer("timerId");
      clearTimer("botId");
      resolveRound();
      return;
    }

    render();
  }, 1000);

  timers.botId = setInterval(() => {
    if (state.battle.phase !== "live") {
      return;
    }

    if (Math.random() <= botModel.accuracy) {
      state.battle.botPoints += 1;
      render();
    }
  }, botModel.intervalMs);

  render();
  elements.answerInput.focus();
}

function startCountdown(round) {
  clearAllTimers();

  state.battle.phase = "countdown";
  state.battle.round = round;
  state.battle.countdown = COUNTDOWN_SECONDS;
  state.battle.timeLeft = ROUND_SECONDS;
  state.battle.playerPoints = 0;
  state.battle.botPoints = 0;
  state.battle.question = null;
  state.battle.answerInput = "";
  state.battle.netDamage = 0;
  state.battle.statusLine = `Round ${round} starts in ${COUNTDOWN_SECONDS}...`;
  state.battle.statusTone = "neutral";

  render();

  timers.countdownId = setInterval(() => {
    if (state.battle.phase !== "countdown") {
      return;
    }

    state.battle.countdown -= 1;
    if (state.battle.countdown <= 0) {
      startLiveRound();
      return;
    }

    state.battle.statusLine = `Round ${state.battle.round} starts in ${state.battle.countdown}...`;
    state.battle.statusTone = "neutral";
    render();
  }, 1000);
}

function startBattle() {
  state.battle = createBattleState();
  startCountdown(1);
}

function nextRound() {
  if (state.battle.phase !== "resolve") {
    return;
  }

  startCountdown(state.battle.round + 1);
}

function canEditDifficulty() {
  return (
    state.battle.phase === "idle" ||
    state.battle.phase === "resolve" ||
    state.battle.phase === "gameOver"
  );
}

function updateDifficulty(value) {
  if (!canEditDifficulty()) {
    return;
  }

  state.profile.settings.difficulty = value;
  saveProfile();
  render();
}

function submitAnswer(event) {
  event.preventDefault();

  if (state.battle.phase !== "live" || !state.battle.question) {
    return;
  }

  const trimmed = state.battle.answerInput.trim();
  if (!trimmed) {
    return;
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    state.battle.answerInput = "";
    state.battle.statusLine = "Enter a valid number.";
    state.battle.statusTone = "bad";
    render();
    return;
  }

  if (isNear(numeric, state.battle.question.answer)) {
    state.battle.playerPoints += 1;
    state.battle.question = generateQuestion(state.profile.settings.difficulty);
    state.battle.answerInput = "";
    state.battle.statusLine = "Correct. Next question.";
    state.battle.statusTone = "good";
    render();
    elements.answerInput.focus();
    return;
  }

  state.battle.answerInput = "";
  state.battle.statusLine = `${formatValue(numeric)} is incorrect.`;
  state.battle.statusTone = "bad";
  render();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setHpFill(el, hp) {
  const safeHp = clamp(hp, 0, STARTING_HP);
  el.style.width = `${(safeHp / STARTING_HP) * 100}%`;
}

function setStatusToneClass(el, tone) {
  el.classList.remove("good", "bad", "neutral");
  el.classList.add(tone);
}

function render() {
  const b = state.battle;
  const isLive = b.phase === "live";

  elements.fliesValue.textContent = String(state.profile.flies);
  elements.winsValue.textContent = String(state.profile.wins);

  elements.difficultySelect.value = state.profile.settings.difficulty;
  elements.difficultySelect.disabled = !canEditDifficulty();

  elements.roundValue.textContent = String(b.round || 0);
  elements.timerValue.textContent = String(isLive ? b.timeLeft : ROUND_SECONDS);

  elements.playerPoints.textContent = String(b.playerPoints);
  elements.botPoints.textContent = String(b.botPoints);

  elements.playerHpValue.textContent = String(b.playerHp);
  elements.botHpValue.textContent = String(b.botHp);
  setHpFill(elements.playerHpFill, b.playerHp);
  setHpFill(elements.botHpFill, b.botHp);

  elements.phaseBadge.textContent = PHASE_LABEL[b.phase] || "Idle";
  elements.phaseBadge.className = `phase-badge phase-${b.phase}`;

  if (b.phase === "countdown") {
    elements.countdownValue.textContent = String(b.countdown);
    elements.countdownValue.classList.remove("hidden");
  } else {
    elements.countdownValue.classList.add("hidden");
  }

  if (b.phase === "idle" || b.phase === "gameOver") {
    elements.startBtn.classList.remove("hidden");
    elements.startBtn.textContent = b.phase === "gameOver" ? "Play Again" : "Start Battle";
  } else {
    elements.startBtn.classList.add("hidden");
  }

  if (b.phase === "resolve") {
    elements.nextRoundBtn.classList.remove("hidden");
  } else {
    elements.nextRoundBtn.classList.add("hidden");
  }

  if (b.netDamage !== 0 && (b.phase === "resolve" || b.phase === "gameOver")) {
    elements.damageChip.classList.remove("hidden", "good", "bad");
    if (b.netDamage > 0) {
      elements.damageChip.classList.add("good");
      elements.damageChip.textContent = `You dealt ${b.netDamage}`;
    } else {
      elements.damageChip.classList.add("bad");
      elements.damageChip.textContent = `Bot dealt ${Math.abs(b.netDamage)}`;
    }
  } else {
    elements.damageChip.classList.add("hidden");
  }

  elements.rewardText.textContent = b.rewardText;
  elements.questionText.textContent = isLive && b.question ? b.question.prompt : "Battle not live yet.";

  elements.answerInput.value = b.answerInput;
  elements.answerInput.disabled = !isLive;
  elements.submitBtn.disabled = !isLive;

  elements.statusLine.textContent = b.statusLine;
  setStatusToneClass(elements.statusLine, b.statusTone);
}

function bindEvents() {
  elements.startBtn.addEventListener("click", startBattle);
  elements.nextRoundBtn.addEventListener("click", nextRound);

  elements.difficultySelect.addEventListener("change", (event) => {
    updateDifficulty(event.target.value);
  });

  elements.answerInput.addEventListener("input", (event) => {
    state.battle.answerInput = event.target.value;
  });

  elements.answerForm.addEventListener("submit", submitAnswer);
}

bindEvents();
render();
