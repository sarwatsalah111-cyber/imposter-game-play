# Prevent duplicate nicknames in a room

Two players with the same display name in one room confuses voting and the speaking queue. The server should refuse it, and the client should show a clear, localized error.

## Server: `supabase/functions/game-engine/index.ts`

Add a shared helper:

```ts
const normalizeName = (n: string) =>
  n.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
```

### `join-room` case
Before the insert (and before the "existing session rejoin" rename), query other players in the room and reject if another `session_id` already uses the same normalized nickname:

- Fetch `session_id, nickname` for `room_id = room.id`.
- If any row with a different `session_id` matches `normalizeName(nickname)`, return `409 { error: 'NICKNAME_TAKEN' }`.
- Applies to both branches: new join AND the rejoin path that updates `nickname` (so a returning session can't rename into a taken name).

### `create-room` case
The host is the only player at creation, so no collision is possible — no change needed.

### Optional: `update-settings` / nickname changes mid-lobby
Not currently exposed, so skip unless we add a rename action later.

## Database: defense in depth

Add a partial unique index so the rule holds even if a future code path forgets to check:

```sql
CREATE UNIQUE INDEX room_players_unique_nickname_per_room
ON public.room_players (room_id, lower(btrim(nickname)));
```

This is created via a new migration. Existing rows are fine (each session is unique today); if the index creation fails on legacy duplicates we'll add a one-time cleanup in the same migration.

## Client: `src/contexts/GameContext.tsx` + `src/lib/i18n.ts`

- Map the `NICKNAME_TAKEN` error from `engine.joinRoom` to a friendly toast/inline error using a new i18n key `errors.nicknameTaken`:
  - English: "That name is already used in this room. Pick another."
  - Kurdish Sorani: "ئەو ناوە لەم ژوورەدا بەکارهاتووە. ناوێکی تر هەڵبژێرە."
  - Arabic: "هذا الاسم مستخدم بالفعل في الغرفة. اختر اسمًا آخر."
- Keep `state.loading = false` and surface the message through the existing error pathway so the join screen lets the user edit the nickname and retry.

## Out of scope
- Renaming flows for already-joined players.
- Cross-room uniqueness (names are only restricted within a single room).
