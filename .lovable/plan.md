# Vibration reminders + 12s auto-skip on speaking turn

When it becomes a player's turn in the speaking queue, their phone buzzes 3 times (3s apart). If they still haven't pressed **I Spoke** after 12s, the turn is automatically skipped so the game keeps flowing.

## Timeline (per turn, on the current speaker's device)

```text
t=0s   turn starts  → vibrate #1 (short triple buzz)
t=3s                → vibrate #2
t=6s                → vibrate #3
t=12s  no tap yet   → auto-skip self → next player
```

Vibrations stop immediately if the player taps **I Spoke**, leaves the turn (turn advances), the phase changes, or the player goes offline.

## Client: `src/components/game/SpeakingQueuePhase.tsx`

- Add a `useEffect` keyed on `currentTurnPlayer`, `isMyTurn`, and `allDone`.
- On `isMyTurn === true`:
  - Fire `vibrate([60, 80, 60])` immediately, then again at +3s and +6s using `setTimeout` refs.
  - Start a `setTimeout` at +12s that calls `skipTurn(sessionId)` and shows a destructive toast (`t('game.autoSkipped', language)` — new key).
- Cleanup clears all timers when the effect re-runs or unmounts. Also clear them inside `handleSpoke` success so a fast tap never triggers a late buzz.
- Add a tiny inline countdown badge near the "Your Turn" chip (`Xs`) so the player sees why they're being nudged. Optional but cheap.

## Server: `supabase/functions/game-engine/index.ts` — `skip-turn` case

Currently restricted to host. Allow self-skip too:

```ts
if (room.host_session_id !== session_id && session_id !== target_session_id) {
  return json({ error: 'Only host or self' }, 403);
}
```

No other logic changes — the existing "must be the current speaker" check still protects the queue.

## i18n: `src/lib/i18n.ts`

Add one key in all four languages:

- `game.autoSkipped`
  - EN: "Time's up — your turn was skipped."
  - AR: "انتهى الوقت — تم تخطّي دورك."
  - KU Sorani: "کاتت تەواو بوو — نۆرەکەت تێپەڕاند."
  - KU Kurmancî: "Wext qediya — dora te hat derbaskirin."

## Out of scope

- Changing the host's existing manual skip button for offline players (still works).
- Per-room configurable skip timeout — hard-coded to 12s as requested.
- Sound cue alongside vibration (vibration only).
