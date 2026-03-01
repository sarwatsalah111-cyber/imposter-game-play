

## Problem

The game can get stuck on the lobby/loading screen because:
1. No timeouts on `createRoom`/`joinRoom` — if the edge function is slow, the UI spins forever with no escape
2. No reconnect/recovery — if a player refreshes, they lose their room context entirely
3. `startGame` has no timeout or rollback — if the backend is slow, the host sees infinite loading
4. No host migration timeout — if the host disconnects, the room dies
5. The lobby has no "stuck" detection or retry buttons

## Plan

### 1. Add session recovery (reconnect-safe)

**`src/lib/session.ts`** — Add `saveRoomContext` / `getRoomContext` / `clearRoomContext` to persist `{roomId, roomCode, sessionId}` in localStorage.

**`src/contexts/GameContext.tsx`** — On mount, check for saved room context. If found, attempt to re-fetch the room and player record. If valid, restore the correct screen based on `room.phase`. If invalid (room closed, player kicked), clear context and show home.

### 2. Add timeouts + retry UI to all loading operations

**`src/contexts/GameContext.tsx`** — Add a `loadingTimeout` ref. When `loading` is set to true, start a 8-second timer. If it fires, set `loading: false` and `error: 'Connection timed out. Please retry.'`. This prevents infinite spinners on `createRoom`, `joinRoom`, and `startGame`.

### 3. Add error + retry UI to LobbyScreen

**`src/components/game/LobbyScreen.tsx`** — When `error` is set, show an error banner with a dismiss button. The existing `canStart` check already handles the start button state; add a visible error state with retry action.

### 4. Add startGame rollback in edge function

**`supabase/functions/game-engine/index.ts`** — In `start-game`, wrap the multi-step operation: if word selection or role assignment fails, don't leave the room in a broken state. Return error and keep `phase: 'lobby'` so the host can retry. Currently it updates phase to `reveal` at the end, which is correct, but add explicit error handling around each step.

### 5. Add host migration watchdog

**`src/contexts/GameContext.tsx`** — In the polling interval (already 3s), check if the current host's `is_online` is false and `last_heartbeat` is older than 25 seconds. If so, the oldest connected player calls a new `migrate-host` engine action.

**`supabase/functions/game-engine/index.ts`** — Add `migrate-host` action: verifies current host is disconnected (last_heartbeat > 25s), assigns requesting player as new host if they're the oldest connected player.

### 6. Add "stuck in lobby" detection

**`src/components/game/LobbyScreen.tsx`** — If the component has been mounted for >10 seconds and `players.length === 0` (no players loaded), show a "Connection issue — Retry" button that calls `fetchPlayers` and `fetchRoom`.

### Summary of file changes

| File | Change |
|------|--------|
| `src/lib/session.ts` | Add room context persistence functions |
| `src/contexts/GameContext.tsx` | Add session recovery on mount, loading timeouts, host migration watchdog |
| `src/components/game/LobbyScreen.tsx` | Add error banner, stuck detection with retry button |
| `supabase/functions/game-engine/index.ts` | Add `migrate-host` action, harden `start-game` error handling |
| `src/hooks/useGameEngine.ts` | Add `migrateHost` method |

