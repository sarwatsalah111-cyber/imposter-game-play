
# The Imposter — Improvement Plan

## Current State Summary
The game is a functional multiplayer party word game with: lobby, reveal, speaking queue, voting, results, leaderboard, 4-language support (EN/AR/KU_CENTRAL/KU_KURMANJI), PWA, sound/vibration, imposter guess mechanic, scoring system, and host controls.

---

## 🎯 Accuracy & Bug Fixes (Priority 1)

### 1. Hardcoded English strings still in UI
Several strings in `GameScreen.tsx` and `LobbyScreen.tsx` are still hardcoded in English:
- "Leave Game?" / "You'll lose your progress" / "Stay" / "Leave" (GameScreen L790-803)
- "Loading..." (GameScreen L600)
- "Copied!" (LobbyScreen L242)
- "Starting match..." / "Start failed" / "Retry Start" / "Reconnect" (LobbyScreen L194-216)
- "Connection issue — no players loaded" / "Retry" (LobbyScreen L172-178)
- "Sound Effects" / "Vibration" (LobbyScreen L299, L309)
- "Cancel" in ImposterGuessPanel (GameScreen L279)

**Action:** Add all missing i18n keys and replace hardcoded strings.

### 2. Leave confirmation not translated
The leave game modal uses English-only text.

### 3. CountdownTimer syncs per-client, not server
Each client starts its own countdown from `seconds` — if they enter the phase at different times, timers drift. Consider adding a `phase_started_at` timestamp to the room so clients can compute remaining time from the server clock.

---

## 🎮 Fun & Engagement (Priority 2)

### 4. Category selection for words
Let the host pick which word categories to include (Animals, Places, Professions, etc.) before starting. This adds variety and lets groups tailor difficulty.

### 5. Difficulty levels for words
The word bank has a `difficulty` field but it's not used in the UI. Let the host filter by difficulty (Easy/Medium/Hard).

### 6. Round recap animation
After results, show a quick animated recap: who voted for whom, with lines/arrows. Makes the reveal moment more dramatic and fun.

### 7. Emoji reactions during speaking queue
Let non-speaking players send quick emoji reactions (😂🤔🤨👏) visible to everyone. Adds engagement while waiting for your turn.

### 8. Sound effects per phase
- Victory/defeat sounds exist but phase transition sounds (reveal card flip, voting drumroll, timer warning beep) would add atmosphere.
- Add a "tick-tock" sound in the last 5 seconds of voting timer.

### 9. "Who's the Imposter?" suspense reveal
Instead of instantly showing results, add a dramatic 3-2-1 countdown or card-flip reveal animation before showing who was voted out.

### 10. Player avatars / colors
Assign each player a unique color or simple avatar icon in the lobby. Makes the player list more visually distinct and fun.

---

## 🔧 Quality of Life (Priority 3)

### 11. Share room via link
Generate a shareable URL like `https://imposter-game-play.lovable.app/?join=XXXXXX` that auto-fills the room code on the join screen.

### 12. Game history / stats
Track personal stats across sessions: games played, times as imposter, win rate, best streak. Store in localStorage or optionally in the database.

### 13. Spectator mode
Allow players who join a full room or join mid-game to watch as spectators without participating in voting.

### 14. Auto-kick AFK players
If a player hasn't sent a heartbeat for 30s+ during an active round, auto-mark them as offline and skip their speaking turn automatically.

### 15. "Play Again" should preserve all players
Currently "Play Again" resets scores. Add an option to continue with cumulative scores across multiple matches (tournament mode).

---

## 🏗️ Code Quality (Priority 4)

### 16. Break up GameScreen.tsx (819 lines)
Split into: `RevealPhase.tsx`, `SpeakingQueuePhase.tsx`, `VotingPhase.tsx`, `ResultsPhase.tsx`, `CountdownTimer.tsx`, `ImposterGuessPanel.tsx`.

### 17. Break up HomeScreen.tsx (545 lines)
Extract: `HowToPlayModal.tsx`, `AboutModal.tsx`, `SettingsModal.tsx`.

### 18. Deduplicate SettingRow / SettingControl
`HomeScreen.tsx` and `LobbyScreen.tsx` each define their own setting row component. Extract to a shared `SettingControl` component.

---

## 📋 Recommended Implementation Order

1. **Fix hardcoded English strings** — quick win, big impact for Kurdish/Arabic users
2. **Share room via link** — most requested social feature for party games
3. **Category/difficulty selection** — adds replayability
4. **Dramatic results reveal animation** — makes the core moment more fun
5. **Split large components** — maintainability for all future work
6. **Server-synced timers** — accuracy fix
7. **Emoji reactions** — engagement booster
8. **Player avatars/colors** — visual polish
