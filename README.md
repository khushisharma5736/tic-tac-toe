# TicTac Pro 🎮

A production-quality Tic-Tac-Toe game with AI, dark/light themes, scoreboard, move history, and sound effects — built with pure HTML, CSS, and JavaScript.

## 🚀 How to Run

1. Download all files into one folder:
```
tic-tac-toe-pro/
├── index.html
├── style.css
├── script.js
└── README.md
```
2. Double-click `index.html` — opens in any browser. No server or install needed.

## 🤖 How the Minimax Algorithm Works (Hard Mode)

Minimax is a recursive decision-tree algorithm used in two-player zero-sum games.

**Core idea:** The AI simulates every possible future move for both itself and the opponent, building a full game tree down to terminal states (win/loss/draw). It then scores each outcome:
- AI wins → `+10 - depth` (prefers faster wins)
- Human wins → `depth - 10` (prefers slower losses)
- Draw → `0`

The AI (Maximizer) picks the move with the **highest** score. The human (Minimizer) is assumed to always pick the **lowest** score (worst for AI). By traversing this tree, the AI always picks the mathematically optimal move — making Hard mode **unbeatable**.

## ✨ Features

| Feature | Details |
|---|---|
| Game Modes | Player vs Player, Player vs AI |
| AI Levels | Easy (random), Medium (heuristic), Hard (Minimax) |
| Scoreboard | Persisted via `localStorage` |
| Move History | Live log with color coding |
| Sound | Web Audio API — no external files |
| Themes | Dark / Light, saved to `localStorage` |
| Responsive | Mobile-first, works on all screen sizes |
