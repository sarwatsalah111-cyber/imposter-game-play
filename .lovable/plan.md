
## 1. Scoring rules overhaul (server-authoritative)

Rewrite `computeAndPersistRoundScore` in `supabase/functions/game-engine/index.ts` and the `imposter-guess` branch to match the new rules:

| Situation | Imposter delta | Voters delta |
|---|---|---|
| Imposter got 0 votes | **+4** (`ESCAPE_CLEAN`) | 0 |
| Imposter guessed word correctly | **+4** (`GUESS_WIN`) | 0 |
| Imposter got ≥1 vote but was not top-voted / tie | **+3** (`ESCAPE`) | 0 |
| Imposter caught (top-voted, no tie) | **−1** (`CAUGHT_PENALTY`, only from round ≥ 2) | **+1** each correct voter (`CORRECT_VOTE`) |

Elimination: after applying deltas, if a player's `score` becomes `≤ 0` **because they were caught as imposter**, set `is_eliminated = true`. Eliminated players are already filtered out of voting and imposter-pick lists. The game keeps running through the admin-configured `total_rounds`; the imposter picker in `start-game` must skip eliminated players (verify current logic in lines around 240-290 and patch if needed).

Also expose the delta reasons to the client (`get-results` already returns `points_awarded` and `latest_points` via `get-leaderboard`). Add the new reason strings so the UI can pick the right pop-up copy.

Round-1 guard: use `room.current_round === 1` (1-indexed) to skip the `−1` penalty.

## 2. Points pop-up animation

New component `src/components/game/PointsPopup.tsx`. On entering the `results` phase (in `ResultsPhase.tsx`), read `points_awarded` and the outcome, then for every player render a floating badge over their row/avatar:
- `+4` gold with pulse + confetti burst (framer-motion) for `GUESS_WIN` / `ESCAPE_CLEAN`
- `+3` gold for `ESCAPE`
- `+1` green for each `CORRECT_VOTE`
- `−1` red shake for `CAUGHT_PENALTY`
- "ELIMINATED" red banner if the player just crossed to eliminated

Sound cues via existing `src/lib/sounds.ts` (add `playPointsUp`, `playPointsDown`, `playEliminated`).

## 3. Voting UI: confirmation + one-shot lock

Edit `src/components/game/VotingPhase.tsx`:
- Tapping a player opens a confirm modal ("Vote for {nickname}?") with Confirm / Cancel. Only Confirm calls `vote()`.
- Disable all vote buttons the moment `vote()` is dispatched (local `submitting` state) so double-tap can't fire two calls; existing `hasVoted` handles server echo.
- Server side: the `vote` action must enforce single-vote per (round, voter). Add a pre-insert check in `game-engine/index.ts` (`select id from votes where room_id=? and round=? and voter_session_id=?`) and return `409` if present. Recommend a UNIQUE index migration on `(room_id, round, voter_session_id)` for hard enforcement.

Migration:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS votes_unique_per_round
  ON public.votes(room_id, round, voter_session_id);
```

## 4. Reveal screen upgrades (`src/components/game/RevealPhase.tsx`)

a. **Tap-to-reveal.** Card starts face-down (spooky back with question mark + "Tap to reveal your role"). Tap flips it (framer-motion `rotateY` 0→180). Only after flip does the role/word show. Auto-flip after 3 s if untouched so timers stay honest.

b. **"Don't forget your word" caption.** Localized string `game.dontForget` added to `src/lib/i18n.ts` for all 4 languages, rendered below the word in the non-imposter card.

c. **Gyroscope tilt.** New hook `src/hooks/useDeviceTilt.ts` reading `deviceorientation` (`beta`/`gamma`), clamped ±15°, mapped to CSS `transform: rotateX/rotateY`. Requires iOS permission gate — call `DeviceOrientationEvent.requestPermission()` on first tap-to-reveal. Fallback: pointer-move parallax on desktop.

d. **AI-generated word image preview.** Only shown to non-imposters (imposter must not see the word or an image of it). New Supabase edge function `word-image` that calls Lovable AI Gateway `/v1/images/generations` with `openai/gpt-image-2`, `quality: "low"`, `stream: true`, `partial_images: 1`, prompt: `"A clear, family-friendly illustration of: {word}. Simple centered subject, soft painterly style, no text."`. Client uses the SSE parser from `ai-image-generation` docs, renders base64 partials with blur, sharpens on `completed`. Cache the final data URL in memory per `(room_id, current_round)` so re-mounts don't re-generate. Add a small "Regenerate" icon button.

Server function skeleton lives at `supabase/functions/word-image/index.ts`, verifies the caller is a non-imposter in that room before generating (query `rooms.imposter_session_id` vs body `session_id`), forwards the SSE stream to the client.

## 5. Nearby-rooms radar on Home

Real IP-based LAN discovery isn't possible from a browser sandbox, so implement it as a **public-rooms radar**: any room in `status = 'waiting'` is discoverable; user taps the radar to auto-join the nearest match by "recency" (newest first) or shows a picker.

- Edit `HomeScreen.tsx`: add a green circular radar (SVG + framer-motion sweeping line, pulse rings). Play a soft `radar_ping.mp3` on each sweep (add asset + entry in `sounds.ts`).
- Data source: new engine action `list-open-rooms` that returns `{code, player_count, language, created_at}` for rooms where `status='waiting'` AND `current_round=0` AND `player_count < max_players`. Poll every 4 s while the radar is open, or subscribe via Realtime on `rooms`.
- Each discovered room appears as a dot on the radar with angle randomized-but-stable per code. Tapping a dot calls `joinRoom(code)`. A big center "Auto-join" button joins the newest room.
- If no rooms found after 8 s, show "No rooms nearby — try creating one".

Assumption to flag to the user: "nearby" = any currently open public room, not real geographic/LAN proximity. If they want geo-proximity we'd need optional location permission and a `lat/lng` column on `rooms`.

---

### Technical notes

- Files touched: `supabase/functions/game-engine/index.ts`, new `supabase/functions/word-image/index.ts`, new migration for unique vote index, `src/components/game/VotingPhase.tsx`, `RevealPhase.tsx`, `ResultsPhase.tsx`, `HomeScreen.tsx`, new `PointsPopup.tsx`, new `RadarNearby.tsx`, new `useDeviceTilt.ts`, `src/lib/i18n.ts` (new keys × 4 langs), `src/lib/sounds.ts` (new SFX), `src/hooks/useGameEngine.ts` (new `listOpenRooms`, `generateWordImage` helpers).
- Elimination display: `LeaderboardScreen.tsx` and voting list already filter `is_eliminated`; verify results screen shows them greyed with a skull.
- AI image gen uses Lovable AI Gateway — no user API key required. Free tier applies.
- All new i18n keys added for EN / AR / KU_CENTRAL / KU_KURMANJI.
- Kept in frontend + engine only; no changes to auth or unrelated tables.

Ask before build: confirm the "nearby = public open rooms" interpretation, or say if you want real geo-proximity (adds location permission + schema change).
