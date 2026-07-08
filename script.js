/* =============================================
   TICTAC PRO — script.js
   Sections:
     1. Constants & State
     2. Sound Engine
     3. localStorage (Persistence)
     4. AI Engine (Easy / Medium / Hard-Minimax)
     5. Game Logic (win detection, turn handling)
     6. UI Rendering
     7. Setup Modal
     8. Event Listeners
     9. Init
   ============================================= */


/* ============================================
   1. CONSTANTS & STATE
   ============================================ */

const WINNING_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8],   // rows
  [0,3,6],[1,4,7],[2,5,8],   // columns
  [0,4,8],[2,4,6]            // diagonals
];

// All game state lives in this one object
const state = {
  board:         Array(9).fill(''),  // '' | 'X' | 'O'
  currentPlayer: 'X',
  gameActive:    false,
  mode:          'pvp',              // 'pvp' | 'pva'
  difficulty:    'easy',             // 'easy' | 'medium' | 'hard'
  playerSymbol:  'X',                // human's symbol in PvA
  aiSymbol:      'O',
  moveCount:     0,
  round:         1,
  soundOn:       true,
  scores:        { X: 0, O: 0, D: 0 },
  history:       [],
};


/* ============================================
   2. SOUND ENGINE
   Uses Web Audio API — no external files needed
   ============================================ */

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

/**
 * Plays a synthesized tone.
 * @param {number} freq  - frequency in Hz
 * @param {string} type  - oscillator type
 * @param {number} dur   - duration in seconds
 * @param {number} vol   - gain (0–1)
 */
function playTone(freq, type = 'sine', dur = 0.12, vol = 0.18) {
  if (!state.soundOn) return;
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type      = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch(e) { /* audio not available */ }
}

const SFX = {
  move() { playTone(440, 'sine', 0.1, 0.15); },
  winX()  { [523, 659, 784].forEach((f,i) => setTimeout(() => playTone(f,'triangle',0.18,0.2), i*90)); },
  winO()  { [392, 494, 587].forEach((f,i) => setTimeout(() => playTone(f,'triangle',0.18,0.2), i*90)); },
  draw()  { playTone(220, 'sawtooth', 0.25, 0.12); },
  click() { playTone(600, 'square', 0.04, 0.08); },
};


/* ============================================
   3. LOCALSTORAGE PERSISTENCE
   ============================================ */

const LS_KEYS = { scores: 'ttp_scores', sound: 'ttp_sound', theme: 'ttp_theme' };

function saveScores()  { localStorage.setItem(LS_KEYS.scores, JSON.stringify(state.scores)); }
function loadScores()  {
  const saved = localStorage.getItem(LS_KEYS.scores);
  if (saved) state.scores = JSON.parse(saved);
}
function saveSound()   { localStorage.setItem(LS_KEYS.sound, state.soundOn); }
function loadSound()   {
  const saved = localStorage.getItem(LS_KEYS.sound);
  if (saved !== null) state.soundOn = saved === 'true';
}
function saveTheme(t)  { localStorage.setItem(LS_KEYS.theme, t); }
function loadTheme()   { return localStorage.getItem(LS_KEYS.theme) || 'dark'; }


/* ============================================
   4. AI ENGINE
   ============================================ */

/** Returns all empty cell indices on the board */
function getEmptyCells(board) {
  return board.reduce((acc, val, i) => { if (!val) acc.push(i); return acc; }, []);
}

/** Checks if a given symbol has won on the provided board snapshot */
function checkWinForBoard(board, symbol) {
  return WINNING_COMBOS.some(([a,b,c]) =>
    board[a] === symbol && board[b] === symbol && board[c] === symbol
  );
}

/* ----- EASY: fully random ----- */
function aiMoveEasy(board) {
  const empty = getEmptyCells(board);
  return empty[Math.floor(Math.random() * empty.length)];
}

/* ----- MEDIUM: win if possible, block if needed, else random ----- */
function aiMoveMedium(board, aiSym, humanSym) {
  // 1. Try to win immediately
  for (const i of getEmptyCells(board)) {
    const test = [...board]; test[i] = aiSym;
    if (checkWinForBoard(test, aiSym)) return i;
  }
  // 2. Block human from winning
  for (const i of getEmptyCells(board)) {
    const test = [...board]; test[i] = humanSym;
    if (checkWinForBoard(test, humanSym)) return i;
  }
  // 3. Take center if free
  if (!board[4]) return 4;
  // 4. Random
  return aiMoveEasy(board);
}

/* ----- HARD: Minimax (optimal / unbeatable) ----- */
/**
 * Minimax recursively evaluates all possible game states.
 * Returns +10 if AI wins, -10 if human wins, 0 for draw.
 * Depth subtracted so it prefers faster wins.
 *
 * @param {string[]} board   - current board snapshot
 * @param {number}   depth   - recursion depth
 * @param {boolean}  isMax   - true = AI's turn (maximizer)
 * @param {string}   aiSym   - AI's symbol
 * @param {string}   huSym   - human's symbol
 */
function minimax(board, depth, isMax, aiSym, huSym) {
  if (checkWinForBoard(board, aiSym))  return 10 - depth;
  if (checkWinForBoard(board, huSym))  return depth - 10;
  const empty = getEmptyCells(board);
  if (!empty.length) return 0;  // draw

  if (isMax) {
    let best = -Infinity;
    for (const i of empty) {
      board[i] = aiSym;
      best = Math.max(best, minimax(board, depth + 1, false, aiSym, huSym));
      board[i] = '';
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) {
      board[i] = huSym;
      best = Math.min(best, minimax(board, depth + 1, true, aiSym, huSym));
      board[i] = '';
    }
    return best;
  }
}

function aiMoveHard(board, aiSym, humanSym) {
  let bestScore = -Infinity;
  let bestMove  = -1;
  for (const i of getEmptyCells(board)) {
    board[i] = aiSym;
    const score = minimax(board, 0, false, aiSym, humanSym);
    board[i] = '';
    if (score > bestScore) { bestScore = score; bestMove = i; }
  }
  return bestMove;
}

/** Master AI dispatcher */
function getAIMove() {
  const { board, difficulty, aiSymbol, playerSymbol } = state;
  if (difficulty === 'easy')   return aiMoveEasy(board);
  if (difficulty === 'medium') return aiMoveMedium(board, aiSymbol, playerSymbol);
  return aiMoveHard([...board], aiSymbol, playerSymbol); // hard - pass copy for minimax
}


/* ============================================
   5. GAME LOGIC
   ============================================ */

/** Checks current board for winner. Returns { winner, combo } or null */
function checkWinner() {
  for (const combo of WINNING_COMBOS) {
    const [a,b,c] = combo;
    if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
      return { winner: state.board[a], combo };
    }
  }
  return null;
}

/** Checks if board is full (draw condition) */
function isBoardFull() {
  return state.board.every(cell => cell !== '');
}

/** Places a mark on the board for the given player */
function placeMove(index, symbol) {
  state.board[index] = symbol;
  state.moveCount++;

  // Record history
  const label = state.mode === 'pva' && symbol === state.aiSymbol
    ? `🤖 AI (${symbol}) → cell ${index + 1}`
    : `👤 Player ${symbol} → cell ${index + 1}`;
  state.history.push({ label, symbol });

  // Animate and render the cell
  renderCell(index, symbol);
  addHistoryEntry(label, symbol);
  updateInfoPanel();
  SFX.move();
}

/** Called after every move — checks win/draw, switches turn */
function afterMove() {
  const result = checkWinner();

  if (result) {
    // WINNER
    state.gameActive = false;
    highlightWinners(result.combo);
    state.scores[result.winner]++;
    saveScores();
    updateScoreboard();

    const comboName = getComboName(result.combo);
    const isAI      = state.mode === 'pva' && result.winner === state.aiSymbol;
    const title     = isAI ? `🤖 AI Wins!` : `Player ${result.winner} Wins!`;

    setTimeout(() => {
      showResultModal(
        result.winner === 'X' ? '🏆' : '🎉',
        title,
        `via ${comboName}`,
      );
    }, 500);

    if (result.winner === state.aiSymbol) SFX.winO();
    else if (result.winner === 'X') SFX.winX();
    else SFX.winO();
    return;
  }

  if (isBoardFull()) {
    // DRAW
    state.gameActive = false;
    state.scores.D++;
    saveScores();
    updateScoreboard();
    SFX.draw();
    setTimeout(() => showResultModal('🤝', "It's a Draw!", 'No moves remaining'), 400);
    return;
  }

  // Switch turn
  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  updateStatusBar();

  // If PvA and it's AI's turn, schedule AI move
  if (state.mode === 'pva' && state.currentPlayer === state.aiSymbol) {
    triggerAIMove();
  }
}

/** Schedules and executes the AI's move with a realistic delay */
function triggerAIMove() {
  setAIThinking(true);
  // Delay varies by difficulty for realism
  const delay = state.difficulty === 'easy' ? 350
              : state.difficulty === 'medium' ? 500
              : 700;

  setTimeout(() => {
    setAIThinking(false);
    if (!state.gameActive) return;
    const move = getAIMove();
    if (move !== undefined && move !== -1) {
      placeMove(move, state.aiSymbol);
      afterMove();
    }
  }, delay);
}

/** Returns a human-readable name for a winning combo */
function getComboName(combo) {
  const rows = [[0,1,2],[3,4,5],[6,7,8]];
  const cols = [[0,3,6],[1,4,7],[2,5,8]];
  const diag = [[0,4,8],[2,4,6]];
  const str  = combo.join(',');
  if (rows.some(r => r.join(',') === str)) return 'Row';
  if (cols.some(c => c.join(',') === str)) return 'Column';
  if (diag.some(d => d.join(',') === str)) return 'Diagonal';
  return 'Line';
}

/** Restarts just the board, keeps scores */
function restartGame() {
  state.board         = Array(9).fill('');
  state.currentPlayer = 'X';
  state.gameActive    = true;
  state.moveCount     = 0;
  state.history       = [];
  state.round++;

  clearBoard();
  clearHistory();
  updateStatusBar();
  updateInfoPanel();

  // If AI goes first (player chose O), trigger AI
  if (state.mode === 'pva' && state.aiSymbol === 'X') {
    triggerAIMove();
  }
}


/* ============================================
   6. UI RENDERING
   ============================================ */

// DOM references
const $ = id => document.getElementById(id);
const cells       = document.querySelectorAll('.cell');
const boardEl     = $('board');
const turnSymEl   = $('turnSymbol');
const turnTextEl  = $('turnText');
const aiThinkEl   = $('aiThinking');
const turnIndEl   = $('turnIndicator');
const histListEl  = $('historyList');
const scoreXEl    = $('scoreX');
const scoreOEl    = $('scoreO');
const scoreDEl    = $('scoreD');
const scoreNXEl   = $('scoreNameX');
const scoreNOEl   = $('scoreNameO');
const infoModeEl  = $('infoMode');
const infoDiffEl  = $('infoDiff');
const infoRoundEl = $('infoRound');
const infoMovesEl = $('infoMoves');
const soundBtn    = $('soundBtn');
const themeBtn    = $('themeBtn');

function renderCell(index, symbol) {
  const cell = cells[index];
  cell.textContent = symbol === 'X' ? '✕' : '○';
  cell.classList.add(symbol.toLowerCase(), 'taken', 'placed');
  // Remove 'placed' after animation to allow re-use
  cell.addEventListener('animationend', () => cell.classList.remove('placed'), { once: true });
}

function clearBoard() {
  cells.forEach(cell => {
    cell.textContent = '';
    cell.className   = 'cell';
  });
}

function highlightWinners(combo) {
  combo.forEach(i => cells[i].classList.add('winner'));
}

function updateStatusBar() {
  const sym  = state.currentPlayer;
  const isAI = state.mode === 'pva' && sym === state.aiSymbol;
  turnSymEl.textContent = sym === 'X' ? '✕' : '○';
  turnSymEl.className   = `turn-symbol sym-${sym.toLowerCase()}`;
  turnTextEl.textContent = isAI
    ? `AI's turn (${sym})`
    : `Player ${sym}'s turn`;
  turnIndEl.classList.remove('hidden');
}

function setAIThinking(on) {
  if (on) {
    aiThinkEl.classList.remove('hidden');
    turnIndEl.classList.add('hidden');
    // Disable board clicks
    boardEl.style.pointerEvents = 'none';
  } else {
    aiThinkEl.classList.add('hidden');
    turnIndEl.classList.remove('hidden');
    boardEl.style.pointerEvents = '';
  }
}

function addHistoryEntry(label, symbol) {
  const emptyEl = histListEl.querySelector('.history-empty');
  if (emptyEl) emptyEl.remove();

  const li = document.createElement('li');
  li.textContent = label;
  li.classList.add(`move-${symbol.toLowerCase()}`);
  histListEl.appendChild(li);
  histListEl.scrollTop = histListEl.scrollHeight;
}

function clearHistory() {
  histListEl.innerHTML = '<li class="history-empty">No moves yet</li>';
}

function updateScoreboard() {
  scoreXEl.textContent = state.scores.X;
  scoreOEl.textContent = state.scores.O;
  scoreDEl.textContent = state.scores.D;
}

function updateInfoPanel() {
  infoModeEl.textContent  = state.mode === 'pvp' ? 'Player vs Player' : 'Player vs AI';
  infoDiffEl.textContent  = state.mode === 'pva' ? state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1) : '—';
  infoRoundEl.textContent = state.round;
  infoMovesEl.textContent = state.moveCount;
}

function updateSoundBtn() {
  soundBtn.textContent = state.soundOn ? '🔊' : '🔇';
}

function updateThemeBtn() {
  const theme = document.documentElement.getAttribute('data-theme');
  themeBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

/* Result Modal */
function showResultModal(emoji, title, sub) {
  $('resultEmoji').textContent  = emoji;
  $('resultTitle').textContent  = title;
  $('resultSub').textContent    = sub;
  $('resultModal').classList.add('active');
}
function hideResultModal() { $('resultModal').classList.remove('active'); }

/* Game UI toggle */
function showGameUI()   { $('gameUI').classList.remove('hidden'); }
function hideGameUI()   { $('gameUI').classList.add('hidden'); }
function showSetup()    { $('setupModal').classList.add('active'); }
function hideSetup()    { $('setupModal').classList.remove('active'); }

/* Score name labels */
function updateScoreNames() {
  if (state.mode === 'pva') {
    scoreNXEl.textContent = state.playerSymbol === 'X' ? 'You' : 'AI';
    scoreNOEl.textContent = state.playerSymbol === 'O' ? 'You' : 'AI';
  } else {
    scoreNXEl.textContent = 'Player X';
    scoreNOEl.textContent = 'Player O';
  }
}


/* ============================================
   7. SETUP MODAL LOGIC
   ============================================ */

let setupConfig = { mode: 'pvp', difficulty: 'easy', symbol: 'X' };

function makeToggleGroup(groupId, configKey) {
  const group = $(groupId);
  group.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setupConfig[configKey] = btn.dataset.value;
      SFX.click();

      // Show/hide difficulty section
      if (configKey === 'mode') {
        const diffSec = $('difficultySection');
        diffSec.style.display = setupConfig.mode === 'pva' ? '' : 'none';
      }
    });
  });
}

function initSetupModal() {
  makeToggleGroup('modeGroup',       'mode');
  makeToggleGroup('difficultyGroup', 'difficulty');
  makeToggleGroup('symbolGroup',     'symbol');

  // Hide difficulty by default (PvP selected)
  $('difficultySection').style.display = 'none';

  $('startBtn').addEventListener('click', () => {
    SFX.click();
    startGameFromSetup();
  });
}

function startGameFromSetup() {
  // Apply config to state
  state.mode         = setupConfig.mode;
  state.difficulty   = setupConfig.difficulty;
  state.playerSymbol = setupConfig.symbol;
  state.aiSymbol     = setupConfig.symbol === 'X' ? 'O' : 'X';
  state.scores       = { X: 0, O: 0, D: 0 };  // reset scores on new match
  saveScores();
  state.round        = 1;

  hideSetup();
  showGameUI();
  updateScoreboard();
  updateScoreNames();
  restartGame();
}

function openSetupForNewMatch() {
  hideResultModal();
  hideGameUI();

  // Reset toggles to current config visually
  showSetup();
}


/* ============================================
   8. EVENT LISTENERS
   ============================================ */

// Cell clicks
cells.forEach(cell => {
  cell.addEventListener('click', () => {
    const index = parseInt(cell.dataset.index);

    // Guard: game must be active, cell empty, and not AI's turn
    if (!state.gameActive) return;
    if (state.board[index] !== '') return;
    if (state.mode === 'pva' && state.currentPlayer === state.aiSymbol) return;

    placeMove(index, state.currentPlayer);
    afterMove();
  });
});

// Restart (same match settings)
$('restartBtn').addEventListener('click', () => {
  SFX.click();
  hideResultModal();
  restartGame();
});

// New Match (goes back to setup)
$('newMatchBtn').addEventListener('click', () => {
  SFX.click();
  openSetupForNewMatch();
});
$('newMatchBtn2').addEventListener('click', () => {
  SFX.click();
  openSetupForNewMatch();
});

// Rematch (restart with same settings)
$('rematchBtn').addEventListener('click', () => {
  SFX.click();
  hideResultModal();
  restartGame();
});

// Menu button
$('menuBtn').addEventListener('click', () => {
  SFX.click();
  openSetupForNewMatch();
});

// Sound toggle
soundBtn.addEventListener('click', () => {
  state.soundOn = !state.soundOn;
  saveSound();
  updateSoundBtn();
  SFX.click();
});

// Theme toggle
themeBtn.addEventListener('click', () => {
  SFX.click();
  const root    = document.documentElement;
  const current = root.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  saveTheme(next);
  updateThemeBtn();
});

// Reset scores button
$('resetScoreBtn').addEventListener('click', () => {
  SFX.click();
  state.scores = { X: 0, O: 0, D: 0 };
  saveScores();
  updateScoreboard();
});


/* ============================================
   9. INIT
   ============================================ */

function init() {
  // Restore persisted settings
  loadScores();
  loadSound();
  const savedTheme = loadTheme();
  document.documentElement.setAttribute('data-theme', savedTheme);

  updateSoundBtn();
  updateThemeBtn();
  updateScoreboard();

  // Setup modal interactions
  initSetupModal();

  // Show setup modal on load
  showSetup();
}

init();
