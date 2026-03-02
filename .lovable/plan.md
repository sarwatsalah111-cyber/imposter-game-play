

## Architecture Constraint

Lovable projects cannot run persistent WebSocket servers (no Node.js backend, no long-lived processes). The platform supports only stateless HTTP edge functions and Supabase Realtime (which already uses WebSockets under the hood for push updates).

A "pure WebSocket server" architecture as described in the prompt is **not possible** on this platform. However, every outcome you listed — no stuck lobby, atomic start, reconnect safety, host migration, no desync — **can be achieved** by hardening the current Supabase Realtime + Edge Function architecture.

The current bugs (desync, stuck lobby, only-host-sees-updates) are implementation issues, not architectural ones. Here is the plan to fix them all.

---

## Plan: Harden Realtime Sync to Achieve All Listed Outcomes

### 1. Make `start-game` truly atomic with a status lock

**`supabase/functions/game-engine/index.ts`** — `start-game` action:
- Before doing anything, set `status = 'starting'` on the room. If the room is already `starting`, return an error (prevents double-start).
- If any step fails (word selection, imposter selection, DB update), roll back status to `waiting` and return a clear error.
- Add a 10-second watchdog: if the room stays in `starting` for >10s, any client can reset it via a new `recover-start` action.

### 2. Fix round state broadcast to guarantee all-player sync

**`supabase/functions/game-engine/index.ts`** — After updating the room row with the new round's `phase`, `current_round`, `secret_word`, and `imposter_session_id`, insert a `round_started` event into `room_events` with the `round_index`. This triggers the Realtime subscription for all clients.

**`src/contexts/GameContext.tsx`** — The Realtime handler already watches `rooms` table changes. The fix:
- When `current_round` changes, **unconditionally** clear `reveal`, `results`, `hasVoted`, `spokeStatus` — this already exists but needs to also force a re-fetch even if `phase` didn't change (covers edge case where polling catches the update before Realtime).
- Add a `round_started` event listener on `room_events` as a backup trigger to clear state and re-fetch reveal.

### 3. Add `STARTING` status to UI with progress + timeout

**`src/components/game/LobbyScreen.tsx`** — When `room.status === 'starting'`:
- Show a progress overlay: "Starting match..." with a 10-second timeout.
- If timeout fires, show "Start failed — Retry" button (host) or "Reconnect" (players).

### 4. Strengthen reconnect flow

**`src/contexts/GameContext.tsx`** — Session recovery on mount:
- After restoring room state, if `phase` is `reveal` or `discussion`, immediately fetch `get-reveal` to get the current round's role/word.
- If `phase` is `results`, fetch `get-results`.
- This ensures reconnecting players always see current round data.

### 5. Add idempotency to critical actions

**`supabase/functions/game-engine/index.ts`**:
- `start-game`: If room is already in `reveal` phase for the requested round, return success (idempotent).
- `vote`: Already idempotent (checks for existing vote).
- `mark-spoke`: Already has rate limiting.

### 6. Strengthen host migration

**`supabase/functions/game-engine/index.ts`** — `migrate-host` action:
- Already exists. Add: if room is in `starting` status and host disconnected, new host can reset to `waiting` status.

### 7. Add `recover-start` action for stuck `starting` state

**`supabase/functions/game-engine/index.ts`** — New action `recover-start`:
- If room `status === 'starting'` and `updated_at` is older than 10 seconds, reset to `status: 'waiting', phase: 'lobby'`.
- Any player can call this (not host-only, since host may be the one stuck).

### 8. Faster Realtime convergence

**`src/contexts/GameContext.tsx`**:
- Reduce the polling fallback from 3s to 2s during phase transitions (reveal, voting).
- After `startGame` succeeds for the host, don't locally set phase — wait for the Realtime update so host and players converge on the same trigger.

---

## File Changes Summary

| File | Changes |
|------|---------|
| `supabase/functions/game-engine/index.ts` | Add `starting` status lock to `start-game`, rollback on failure, add `recover-start` action, make `start-game` idempotent |
| `src/contexts/GameContext.tsx` | Add `round_started` event listener, unconditional state clear on round change, fetch reveal/results on reconnect based on phase, remove host-side local phase override in `startGame` |
| `src/components/game/LobbyScreen.tsx` | Show "Starting match..." overlay when `status === 'starting'`, 10s timeout with retry |

