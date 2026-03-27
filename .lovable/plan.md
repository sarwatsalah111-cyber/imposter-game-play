

# Game Improvement Recommendations

After a thorough review of your entire codebase (game engine, context, all phase components, lobby, session management), here are the issues and improvements I recommend, grouped by priority.

---

## Accuracy & Stability Fixes

### 1. Imposter guess should check ALL translations, not just the primary word
Currently the `imposter-guess` action only compares the guess against `room.secret_word`. If the imposter types the English or Arabic translation of the word, it fails. The guess should also match against all translations stored in `word_bank.translations`.

### 2. Non-voters should not block the game
If a player doesn't vote before the timer ends, only the host's timer triggers `advancePhase('results')`. Non-host clients with no vote just sit there. Consider auto-advancing to results server-side when the voting timer expires, or at minimum ensuring the host always advances.

### 3. Player who disconnects mid-round breaks the speaking queue
If a player goes offline during the discussion phase, the queue gets stuck on their turn forever. The `mark-spoke` action should allow the host to skip an offline player's turn, or auto-skip after a timeout.

### 4. Score update is not atomic (race condition)
In `finalizeRound` and `imposter-guess`, you do `SELECT score` then `UPDATE score + delta` — two separate queries. If two score events fire simultaneously, one can overwrite the other. Use a SQL increment: `score = score + delta` via an RPC or raw SQL.

### 5. "Play Again" doesn't carry over `reveal_time`
In `GameContext.tsx` line 578-585, the `playAgain` function copies `max_players`, `total_rounds`, `spoke_rounds`, `voting_time`, `discussion_time` — but NOT `reveal_time`. The host's custom reveal time is lost.

### 6. Imposter guess win closes the room permanently
When the imposter guesses correctly (line 587-591), the room status is set to `closed`. This means no more rounds can be played even if `current_round < total_rounds`. It should only close if it's the final round, otherwise just advance to results.

---

## Fun & Engagement Improvements

### 7. Dramatic suspense reveal before results
Instead of instantly showing who was voted out, add a 3-second countdown animation with a card-flip reveal. Makes the core moment more exciting.

### 8. Auto-advance to voting when all players have spoken
This already works, but there's no visual countdown or warning before the auto-transition. Add a brief "Moving to voting..." toast or animation.

### 9. Show who voted for whom in results
Currently results show vote tallies (counts) but not who voted for whom. Showing vote attribution (e.g., "Ahmed → Dara") adds drama and discussion.

---

## Recommended Implementation Order

1. **Fix "Play Again" missing `reveal_time`** — 1 line fix, high impact
2. **Fix imposter guess win closing room prematurely** — logic bug, breaks multi-round games
3. **Fix imposter guess to check all translations** — fairness improvement
4. **Fix score race condition** — data integrity
5. **Add host skip for offline players in speaking queue** — prevents stuck games
6. **Add suspense reveal animation** — fun factor
7. **Show vote attribution in results** — engagement

---

## Technical Details

**Fix 1 — reveal_time in playAgain** (GameContext.tsx ~line 583):
Add `reveal_time: state.room.reveal_time` to the settings object.

**Fix 2 — imposter guess win room closure** (game-engine/index.ts ~line 586-591):
Change to only set `status: 'closed'` if `room.current_round >= room.total_rounds`, otherwise keep `status: 'playing'`.

**Fix 3 — translation matching** (game-engine/index.ts ~line 548-550):
After the primary word comparison, query `word_bank` for the `translations` field and compare against all values.

**Fix 4 — atomic score increment** (game-engine/index.ts ~line 899-906):
Replace the SELECT+UPDATE pattern with a single UPDATE using SQL: `score = score + $delta`.

**Fix 5 — skip offline player** (game-engine/index.ts mark-spoke):
Add a `skip-turn` action that lets the host advance past an offline player's turn.

