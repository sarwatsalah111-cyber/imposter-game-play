import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case 'create-room': {
        const { session_id, nickname, language = 'EN', settings } = params;
        if (!session_id || !nickname) return json({ error: 'Missing session_id or nickname' }, 400);

        let code = generateRoomCode();
        let attempts = 0;
        while (attempts < 10) {
          const { data: existing } = await supabase
            .from('rooms').select('id').eq('code', code).eq('status', 'waiting').maybeSingle();
          if (!existing) break;
          code = generateRoomCode();
          attempts++;
        }

        const roomData: Record<string, unknown> = {
          code,
          host_session_id: session_id,
          status: 'waiting',
          language,
          phase: 'lobby',
        };
        if (settings) {
          if (settings.max_players !== undefined) roomData.max_players = Math.min(Math.max(Number(settings.max_players), 3), 22);
          if (settings.min_players !== undefined) roomData.min_players = Math.min(Math.max(Number(settings.min_players), 3), 22);
          if (settings.total_rounds !== undefined) roomData.total_rounds = Math.min(Math.max(Number(settings.total_rounds), 1), 10);
          if (settings.voting_time !== undefined) roomData.voting_time = Math.min(Math.max(Number(settings.voting_time), 15), 120);
          if (settings.discussion_time !== undefined) roomData.discussion_time = Math.min(Math.max(Number(settings.discussion_time), 30), 300);
          if (settings.reveal_time !== undefined) roomData.reveal_time = Math.min(Math.max(Number(settings.reveal_time), 5), 30);
          if (settings.spoke_rounds !== undefined) roomData.spoke_rounds = Math.min(Math.max(Number(settings.spoke_rounds), 1), 5);
          if (settings.categories !== undefined) roomData.categories = settings.categories;
        }

        const { data: room, error: roomErr } = await supabase
          .from('rooms').insert(roomData).select().single();
        if (roomErr) return json({ error: roomErr.message }, 500);

        await supabase.from('room_players').insert({
          room_id: room.id, session_id, nickname, is_host: true,
        });

        await supabase.from('room_events').insert({
          room_id: room.id, event_type: 'created', session_id,
        });

        return json({ room: { ...room, secret_word: undefined, imposter_session_id: undefined } });
      }

      case 'update-settings': {
        const { session_id, room_id, settings } = params;
        if (!session_id || !room_id || !settings) return json({ error: 'Missing fields' }, 400);

        const { data: room } = await supabase
          .from('rooms').select('host_session_id, phase').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);
        if (room.host_session_id !== session_id) return json({ error: 'Only host' }, 403);
        if (room.phase !== 'lobby') return json({ error: 'Can only change settings in lobby' }, 400);

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (settings.total_rounds !== undefined) updates.total_rounds = Math.min(Math.max(Number(settings.total_rounds), 1), 10);
        if (settings.voting_time !== undefined) updates.voting_time = Math.min(Math.max(Number(settings.voting_time), 15), 120);
        if (settings.discussion_time !== undefined) updates.discussion_time = Math.min(Math.max(Number(settings.discussion_time), 30), 300);
        if (settings.max_players !== undefined) updates.max_players = Math.min(Math.max(Number(settings.max_players), 3), 22);
        if (settings.min_players !== undefined) updates.min_players = Math.min(Math.max(Number(settings.min_players), 3), 22);
        if (settings.reveal_time !== undefined) updates.reveal_time = Math.min(Math.max(Number(settings.reveal_time), 5), 30);
        if (settings.spoke_rounds !== undefined) updates.spoke_rounds = Math.min(Math.max(Number(settings.spoke_rounds), 1), 5);
        if (settings.categories !== undefined) updates.categories = settings.categories;

        const { error: updateErr } = await supabase.from('rooms').update(updates).eq('id', room_id);
        if (updateErr) return json({ error: updateErr.message }, 500);
        return json({ success: true });
      }

      case 'join-room': {
        const { session_id, nickname, code } = params;
        if (!session_id || !nickname || !code) return json({ error: 'Missing fields' }, 400);

        const { data: room, error: roomErr } = await supabase
          .from('rooms').select('*').eq('code', code).eq('status', 'waiting').maybeSingle();
        if (roomErr || !room) return json({ error: 'Room not found or already started' }, 404);

        const { count } = await supabase
          .from('room_players').select('*', { count: 'exact', head: true }).eq('room_id', room.id);
        if ((count || 0) >= room.max_players) return json({ error: 'Room is full' }, 400);

        // ── Duplicate-nickname guard (case-insensitive, trimmed) ──
        const normName = (n: string) =>
          n.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
        const normalized = normName(nickname);
        if (!normalized) return json({ error: 'Nickname required' }, 400);
        const { data: roster } = await supabase
          .from('room_players').select('session_id, nickname').eq('room_id', room.id);
        const taken = (roster || []).some(
          (p) => p.session_id !== session_id && normName(p.nickname) === normalized,
        );
        if (taken) return json({ error: 'NICKNAME_TAKEN' }, 409);

        const { data: existing } = await supabase
          .from('room_players').select('id').eq('room_id', room.id).eq('session_id', session_id).maybeSingle();
        if (existing) {
          await supabase.from('room_players').update({ nickname, is_online: true, last_heartbeat: new Date().toISOString() })
            .eq('id', existing.id);
          return json({ room: { ...room, secret_word: undefined, imposter_session_id: undefined } });
        }

        const { error: joinErr } = await supabase.from('room_players').insert({
          room_id: room.id, session_id, nickname,
        });
        if (joinErr) return json({ error: joinErr.message }, 500);

        await supabase.from('room_events').insert({
          room_id: room.id, event_type: 'joined', session_id,
        });

        return json({ room: { ...room, secret_word: undefined, imposter_session_id: undefined } });
      }

      case 'start-game': {
        const { session_id, room_id } = params;
        const { data: room } = await supabase
          .from('rooms').select('*').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);
        if (room.host_session_id !== session_id) return json({ error: 'Only host can start' }, 403);

        // ── Idempotency: if already in reveal for the expected round, return success ──
        const expectedRound = (room.phase === 'results') ? room.current_round + 1 : 1;
        if (room.phase === 'reveal' && room.current_round === expectedRound) {
          return json({ success: true, round: expectedRound });
        }

        if (room.phase !== 'lobby' && room.phase !== 'results') return json({ error: 'Cannot start now' }, 400);

        // ── Prevent double-start: reject if already 'starting' (but auto-recover stale locks > 10s) ──
        if (room.status === 'starting') {
          const lockAge = Date.now() - new Date(room.updated_at).getTime();
          if (lockAge < 10000) {
            return json({ error: 'Game is already starting. Please wait.' }, 409);
          }
          // Stale lock — clear it so we can re-acquire below
          await supabase.from('rooms').update({
            status: room.phase === 'results' ? 'playing' : 'waiting',
            updated_at: new Date().toISOString(),
          }).eq('id', room_id);
          room.status = room.phase === 'results' ? 'playing' : 'waiting';
        }

        // ── Step 1: Acquire lock by setting status = 'starting' ──
        const { data: lockRows, error: lockErr } = await supabase.from('rooms').update({
          status: 'starting', updated_at: new Date().toISOString(),
        }).eq('id', room_id).eq('status', room.status).select('id'); // optimistic lock
        if (lockErr) {
          console.error('start-game lock error:', lockErr);
          return json({ error: `Failed to acquire start lock: ${lockErr.message}` }, 500);
        }
        if (!lockRows || lockRows.length === 0) {
          // Another request grabbed the lock first — treat as already-starting
          return json({ error: 'Game is already starting. Please wait.' }, 409);
        }

        try {
          const { data: players } = await supabase
            .from('room_players').select('*').eq('room_id', room_id).eq('is_online', true);
          if (!players || players.length < room.min_players) {
            // ── Rollback: not enough players ──
            await supabase.from('rooms').update({ status: 'waiting', updated_at: new Date().toISOString() }).eq('id', room_id);
            return json({ error: `Need at least ${room.min_players} players` }, 400);
          }

          // Select word — exclude previous round's word, filter by categories if set
          const previousWord = room.secret_word || null;
          let wordQuery = supabase.from('word_bank').select('word').eq('is_active', true);
          if (room.categories && Array.isArray(room.categories) && room.categories.length > 0) {
            wordQuery = wordQuery.in('category', room.categories);
          }
          const { data: words } = await wordQuery;
          if (!words || words.length === 0) {
            await supabase.from('rooms').update({ status: 'waiting', updated_at: new Date().toISOString() }).eq('id', room_id);
            return json({ error: 'No words available for selected categories. Cannot start.' }, 500);
          }
          let availableWords = previousWord ? words.filter(w => w.word !== previousWord) : words;
          if (availableWords.length === 0) availableWords = words;
          const secretWord = availableWords[Math.floor(Math.random() * availableWords.length)].word;

          // Select imposter — exclude previous round's imposter to prevent repeats (unless ≤2 players)
          const previousImposter = room.imposter_session_id || null;
          let eligiblePlayers = players.length > 2 && previousImposter
            ? players.filter(p => p.session_id !== previousImposter)
            : players;
          if (eligiblePlayers.length === 0) eligiblePlayers = players;
          const imposterIdx = Math.floor(Math.random() * eligiblePlayers.length);
          const imposterSessionId = eligiblePlayers[imposterIdx].session_id;

          // Auto-shuffle player order for fairness
          const shuffledPlayers = [...players];
          for (let si = shuffledPlayers.length - 1; si > 0; si--) {
            const sj = Math.floor(Math.random() * (si + 1));
            [shuffledPlayers[si], shuffledPlayers[sj]] = [shuffledPlayers[sj], shuffledPlayers[si]];
          }
          const shuffleBase = new Date('2020-01-01T00:00:00Z');
          await Promise.all(shuffledPlayers.map((p, idx) =>
            supabase.from('room_players')
              .update({ joined_at: new Date(shuffleBase.getTime() + idx * 1000).toISOString() })
              .eq('id', p.id)
          ));

          const newRound = (room.phase === 'results') ? room.current_round + 1 : 1;

          // Reset scores on first round of a new match
          if (newRound === 1) {
            const newMatchId = crypto.randomUUID();
            await supabase.from('room_players').update({ score: 0, match_id: newMatchId }).eq('room_id', room_id);
            await supabase.from('rooms').update({
              match_id: newMatchId,
              phase: 'reveal',
              status: 'playing',
              secret_word: secretWord,
              imposter_session_id: imposterSessionId,
              current_round: newRound,
              updated_at: new Date().toISOString(),
            }).eq('id', room_id);
          } else {
            const { error: updateErr } = await supabase.from('rooms').update({
              phase: 'reveal',
              status: 'playing',
              secret_word: secretWord,
              imposter_session_id: imposterSessionId,
              current_round: newRound,
              updated_at: new Date().toISOString(),
            }).eq('id', room_id);
            if (updateErr) {
              console.error('start-game update failed:', updateErr);
              await supabase.from('rooms').update({ status: 'waiting', updated_at: new Date().toISOString() }).eq('id', room_id);
              return json({ error: 'Failed to start game. Please retry.' }, 500);
            }
          }

          // ── Insert round_started event for backup Realtime trigger ──
          await supabase.from('room_events').insert({
            room_id, event_type: 'round_started', session_id,
            data: {
              round: newRound,
              word_selected: secretWord,
              imposter_selected: imposterSessionId,
              previous_word: previousWord,
              previous_imposter: previousImposter,
              player_count: players.length,
            },
          });

          return json({ success: true, round: newRound });
        } catch (err) {
          // ── Rollback on any unexpected error ──
          console.error('start-game unexpected error:', err);
          await supabase.from('rooms').update({ status: 'waiting', updated_at: new Date().toISOString() }).eq('id', room_id);
          return json({ error: 'Failed to start game. Please retry.' }, 500);
        }
      }

      // ── Recover from stuck 'starting' state ──
      case 'recover-start': {
        const { room_id } = params;
        if (!room_id) return json({ error: 'Missing room_id' }, 400);

        const { data: room } = await supabase
          .from('rooms').select('status, updated_at').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);

        if (room.status !== 'starting') {
          return json({ error: 'Room is not in starting state' }, 400);
        }

        const elapsed = Date.now() - new Date(room.updated_at).getTime();
        if (elapsed < 10000) {
          return json({ error: 'Start still in progress, please wait' }, 400);
        }

        // Reset to waiting
        await supabase.from('rooms').update({
          status: 'waiting', phase: 'lobby', updated_at: new Date().toISOString(),
        }).eq('id', room_id);

        await supabase.from('room_events').insert({
          room_id, event_type: 'start_recovered', session_id: params.session_id || null,
          data: { elapsed_ms: elapsed },
        });

        return json({ success: true, recovered: true });
      }

      case 'get-reveal': {
        const { session_id, room_id } = params;
        const { data: room } = await supabase
          .from('rooms').select('secret_word, imposter_session_id, phase').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);
        if (room.phase !== 'reveal' && room.phase !== 'discussion') {
          return json({ error: 'Not in reveal phase' }, 400);
        }

        const { data: player } = await supabase
          .from('room_players').select('id').eq('room_id', room_id).eq('session_id', session_id).maybeSingle();
        if (!player) return json({ error: 'Not in room' }, 403);

        if (session_id === room.imposter_session_id) {
          return json({ role: 'imposter' });
        }

        // Look up translations from word_bank
        const { data: wordEntry } = await supabase
          .from('word_bank').select('translations')
          .eq('word', room.secret_word).maybeSingle();

        return json({ role: 'normal', word: room.secret_word, translations: (wordEntry?.translations as Record<string, string>) || {} });
      }

      case 'mark-spoke': {
        const { session_id, room_id } = params;
        const { data: room } = await supabase
          .from('rooms').select('phase, current_round, total_rounds, spoke_rounds, host_session_id').eq('id', room_id).single();
        if (!room || room.phase !== 'discussion') return json({ error: 'Not in discussion phase' }, 400);

        // Rate limit
        const { data: recentSpoke } = await supabase
          .from('room_events').select('created_at')
          .eq('room_id', room_id).eq('event_type', 'spoke').eq('session_id', session_id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (recentSpoke) {
          const elapsed = Date.now() - new Date(recentSpoke.created_at).getTime();
          if (elapsed < 1500) return json({ error: 'Too fast, please wait' }, 429);
        }

        const { data: allSpokeEvents } = await supabase
          .from('room_events').select('session_id, data')
          .eq('room_id', room_id).eq('event_type', 'spoke');

        const roundSpokeEvents = (allSpokeEvents || []).filter(e => {
          const d = e.data as Record<string, unknown> | null;
          return d && d.game_round === room.current_round;
        });

        const spokeRounds = room.spoke_rounds || room.total_rounds;
        const myTurnCount = roundSpokeEvents.filter(e => e.session_id === session_id).length;
        if (myTurnCount >= spokeRounds) {
          return json({ error: 'You have used all your speaking turns' }, 400);
        }

        const { data: activePlayers } = await supabase
          .from('room_players').select('session_id')
          .eq('room_id', room_id).eq('is_online', true).eq('is_eliminated', false)
          .order('joined_at');
        if (!activePlayers || activePlayers.length === 0) return json({ error: 'No active players' }, 400);

        const playerOrder = activePlayers.map(p => p.session_id);
        const totalTurns = playerOrder.length * spokeRounds;
        const currentTurnIndex = roundSpokeEvents.length;

        const expectedPlayer = playerOrder[currentTurnIndex % playerOrder.length];
        if (session_id !== expectedPlayer) {
          return json({ error: 'Not your turn' }, 400);
        }

        const turnNumber = Math.floor(currentTurnIndex / playerOrder.length) + 1;

        await supabase.from('room_events').insert({
          room_id, event_type: 'spoke', session_id,
          data: { game_round: room.current_round, turn: turnNumber, turn_index: currentTurnIndex },
        });

        const newTotalSpoken = currentTurnIndex + 1;
        if (newTotalSpoken >= totalTurns) {
          await supabase.from('rooms').update({
            phase: 'voting', updated_at: new Date().toISOString(),
          }).eq('id', room_id);

          await supabase.from('room_events').insert({
            room_id, event_type: 'phase_changed', session_id: room.host_session_id,
            data: { from: 'discussion', to: 'voting', auto: true },
          });
        }

        return json({ success: true, turn_index: currentTurnIndex, total_turns: totalTurns, auto_advanced: newTotalSpoken >= totalTurns });
      }

      case 'get-spoke-status': {
        const { room_id } = params;
        const { data: room } = await supabase
          .from('rooms').select('current_round, total_rounds, spoke_rounds').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);

        const { data: events } = await supabase
          .from('room_events').select('session_id, data')
          .eq('room_id', room_id).eq('event_type', 'spoke');

        const roundEvents = (events || []).filter(e => {
          const d = e.data as Record<string, unknown> | null;
          return d && d.game_round === room.current_round;
        });

        const { data: activePlayers } = await supabase
          .from('room_players').select('session_id')
          .eq('room_id', room_id).eq('is_online', true).eq('is_eliminated', false)
          .order('joined_at');

        const spokeRounds = room.spoke_rounds || room.total_rounds;
        const playerOrder = (activePlayers || []).map(p => p.session_id);
        const totalTurns = playerOrder.length * spokeRounds;
        const currentTurnIndex = roundEvents.length;
        const currentTurnPlayer = currentTurnIndex < totalTurns ? playerOrder[currentTurnIndex % playerOrder.length] : null;

        const spokeCounts: Record<string, number> = {};
        roundEvents.forEach(e => {
          if (e.session_id) {
            spokeCounts[e.session_id] = (spokeCounts[e.session_id] || 0) + 1;
          }
        });

        return json({
          spoken: roundEvents.map(e => e.session_id).filter(Boolean),
          spoke_counts: spokeCounts,
          player_order: playerOrder,
          current_turn_index: currentTurnIndex,
          current_turn_player: currentTurnPlayer,
          total_turns: totalTurns,
          total_rounds: spokeRounds,
        });
      }

      case 'advance-phase': {
        const { session_id, room_id, phase } = params;
        const { data: room } = await supabase
          .from('rooms').select('*').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);
        if (room.host_session_id !== session_id) return json({ error: 'Only host' }, 403);

        const validTransitions: Record<string, string> = {
          'reveal': 'discussion',
          'discussion': 'voting',
          'voting': 'results',
        };

        if (room.phase === phase) {
          return json({ success: true });
        }

        if (validTransitions[room.phase] !== phase) {
          return json({ error: 'Invalid phase transition' }, 400);
        }

        // When transitioning to results, auto-finalize the round scoring
        if (phase === 'results') {
          await finalizeRound(supabase, room_id, room.match_id, room.current_round);
        }

        const updateData: Record<string, unknown> = {
          phase, updated_at: new Date().toISOString(),
        };
        // Close the room only when ALL rounds are done
        if (phase === 'results' && room.current_round >= room.total_rounds) {
          updateData.status = 'closed';
          updateData.closed_at = new Date().toISOString();
        }

        await supabase.from('rooms').update(updateData).eq('id', room_id);

        await supabase.from('room_events').insert({
          room_id, event_type: 'phase_changed', session_id, data: { from: room.phase, to: phase },
        });

        return json({ success: true });
      }

      case 'vote': {
        const { session_id, room_id, target_session_id } = params;
        const { data: room } = await supabase
          .from('rooms').select('phase, current_round').eq('id', room_id).single();
        if (!room || room.phase !== 'voting') return json({ error: 'Not voting phase' }, 400);
        if (session_id === target_session_id) return json({ error: 'Cannot vote for yourself' }, 400);

        const { data: existingVote } = await supabase
          .from('votes').select('id').eq('room_id', room_id).eq('round', room.current_round).eq('voter_session_id', session_id).maybeSingle();
        if (existingVote) return json({ error: 'Already voted' }, 400);

        await supabase.from('votes').insert({
          room_id, round: room.current_round,
          voter_session_id: session_id, target_session_id,
        });

        return json({ success: true });
      }

      case 'get-results': {
        const { room_id } = params;
        const { data: room } = await supabase
          .from('rooms').select('current_round, imposter_session_id, secret_word, match_id').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);

        // Get round_results if available (server-authoritative scoring)
        const { data: roundResult } = await supabase
          .from('round_results').select('*')
          .eq('room_id', room_id).eq('match_id', room.match_id).eq('round_index', room.current_round)
          .maybeSingle();

        const { data: votes } = await supabase
          .from('votes').select('*').eq('room_id', room_id).eq('round', room.current_round);

        const tally: Record<string, number> = {};
        const voteDetails: Array<{ voter: string; target: string }> = [];
        (votes || []).forEach(v => {
          tally[v.target_session_id] = (tally[v.target_session_id] || 0) + 1;
          voteDetails.push({ voter: v.voter_session_id, target: v.target_session_id });
        });

        const maxVotes = Math.max(...Object.values(tally), 0);
        const topVoted = Object.entries(tally).filter(([_, c]) => c === maxVotes).map(([id]) => id);
        const isTie = topVoted.length > 1;
        const caught = !isTie && topVoted[0] === room.imposter_session_id;

        // Get player scores
        const { data: playerScores } = await supabase
          .from('room_players').select('session_id, score, nickname')
          .eq('room_id', room_id);

        return json({
          votes: tally,
          vote_details: voteDetails,
          imposter_session_id: room.imposter_session_id,
          secret_word: room.secret_word,
          caught,
          isTie,
          top_voted: topVoted,
          outcome: roundResult?.outcome || (caught ? 'IMPOSTER_CAUGHT' : 'IMPOSTER_ESCAPED'),
          points_awarded: roundResult?.points_awarded || {},
          scores: (playerScores || []).reduce((acc: Record<string, number>, p) => {
            acc[p.session_id] = p.score;
            return acc;
          }, {}),
        });
      }

      // ─── Imposter Guess (Rule C) ───
      case 'imposter-guess': {
        const { session_id, room_id, guess } = params;
        if (!session_id || !room_id || !guess) return json({ error: 'Missing fields' }, 400);

        const { data: room } = await supabase
          .from('rooms').select('*').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);

        // Only imposter can guess
        if (room.imposter_session_id !== session_id) {
          return json({ error: 'Only the imposter can guess' }, 403);
        }

        // Only during discussion or voting
        if (room.phase !== 'discussion' && room.phase !== 'voting') {
          return json({ error: 'Cannot guess now' }, 400);
        }

        // Normalize and compare against primary word AND all translations
        const normalizedGuess = guess.trim().toLowerCase();
        const normalizedWord = (room.secret_word || '').trim().toLowerCase();
        let correct = normalizedGuess === normalizedWord;

        // Also check all translations from word_bank
        if (!correct && room.secret_word) {
          const { data: wordEntry } = await supabase
            .from('word_bank').select('translations')
            .eq('word', room.secret_word).maybeSingle();
          if (wordEntry?.translations) {
            const translations = wordEntry.translations as Record<string, string>;
            correct = Object.values(translations).some(
              t => t && t.trim().toLowerCase() === normalizedGuess
            );
          }
        }

        if (correct) {
          // Award +3 to imposter, skip voting, go to results
          const pointsAwarded: Record<string, number> = { [session_id]: 3 };

          // Check for double-award
          const { data: existing } = await supabase
            .from('round_results').select('id')
            .eq('room_id', room_id).eq('match_id', room.match_id).eq('round_index', room.current_round)
            .maybeSingle();

          if (!existing) {
            await supabase.from('round_results').insert({
              room_id, match_id: room.match_id, round_index: room.current_round,
              imposter_player_id: session_id,
              outcome: 'IMPOSTER_GUESS_WIN',
              points_awarded: pointsAwarded,
              secret_word: room.secret_word,
            });

            await supabase.from('score_events').insert({
              room_id, match_id: room.match_id, round_index: room.current_round,
              player_id: session_id, delta: 3, reason: 'GUESS_WIN',
            });

            // Update player score atomically
            await supabase.rpc('increment_player_score', {
              p_room_id: room_id,
              p_session_id: session_id,
              p_delta: 3,
            });
          }

          // Advance to results — only close if final round
          const isFinalRound = room.current_round >= room.total_rounds;
          const roomUpdate: Record<string, unknown> = {
            phase: 'results',
            updated_at: new Date().toISOString(),
          };
          if (isFinalRound) {
            roomUpdate.status = 'closed';
            roomUpdate.closed_at = new Date().toISOString();
          }
          await supabase.from('rooms').update(roomUpdate).eq('id', room_id);

          await supabase.from('room_events').insert({
            room_id, event_type: 'phase_changed', session_id,
            data: { from: room.phase, to: 'results', reason: 'imposter_guess_win' },
          });

          return json({ correct: true, outcome: 'IMPOSTER_GUESS_WIN' });
        }

        // Wrong guess — no penalty, game continues
        await supabase.from('room_events').insert({
          room_id, event_type: 'imposter_guess_failed', session_id,
          data: { guess: normalizedGuess, round: room.current_round },
        });

        return json({ correct: false });
      }

      // ─── Get Leaderboard ───
      case 'get-leaderboard': {
        const { room_id } = params;
        if (!room_id) return json({ error: 'Missing room_id' }, 400);

        const { data: room } = await supabase
          .from('rooms').select('match_id, current_round').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);

        const { data: players } = await supabase
          .from('room_players').select('session_id, nickname, score, is_host, is_online, joined_at')
          .eq('room_id', room_id)
          .order('score', { ascending: false });

        const { data: roundResults } = await supabase
          .from('round_results').select('round_index, outcome, points_awarded')
          .eq('room_id', room_id).eq('match_id', room.match_id)
          .order('round_index');

        // Get latest score_events for animation
        const { data: latestEvents } = await supabase
          .from('score_events').select('player_id, delta, reason, round_index')
          .eq('room_id', room_id).eq('match_id', room.match_id)
          .eq('round_index', room.current_round);

        return json({
          players: players || [],
          round_results: roundResults || [],
          latest_points: latestEvents || [],
          current_round: room.current_round,
        });
      }

      // ─── Reset Match Scores (host only) ───
      case 'reset-scores': {
        const { session_id, room_id } = params;
        const { data: room } = await supabase
          .from('rooms').select('host_session_id').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);
        if (room.host_session_id !== session_id) return json({ error: 'Only host' }, 403);

        const newMatchId = crypto.randomUUID();
        await supabase.from('room_players').update({ score: 0, match_id: newMatchId }).eq('room_id', room_id);
        await supabase.from('rooms').update({ match_id: newMatchId, updated_at: new Date().toISOString() }).eq('id', room_id);

        return json({ success: true, match_id: newMatchId });
      }

      case 'leave-room': {
        const { session_id, room_id } = params;
        await supabase.from('room_players').delete().eq('room_id', room_id).eq('session_id', session_id);
        await supabase.from('room_events').insert({
          room_id, event_type: 'left', session_id,
        });

        const { data: room } = await supabase.from('rooms').select('host_session_id').eq('id', room_id).single();
        if (room && room.host_session_id === session_id) {
          const { data: nextHost } = await supabase
            .from('room_players').select('session_id').eq('room_id', room_id).eq('is_online', true).order('joined_at').limit(1).maybeSingle();
          if (nextHost) {
            await supabase.from('rooms').update({ host_session_id: nextHost.session_id }).eq('id', room_id);
            await supabase.from('room_players').update({ is_host: true }).eq('room_id', room_id).eq('session_id', nextHost.session_id);
            await supabase.from('room_events').insert({
              room_id, event_type: 'host_migrated', session_id: nextHost.session_id,
            });
          } else {
            await supabase.from('rooms').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', room_id);
          }
        }

        return json({ success: true });
      }

      case 'heartbeat': {
        const { session_id, room_id } = params;
        await supabase.from('room_players').update({
          last_heartbeat: new Date().toISOString(), is_online: true,
        }).eq('room_id', room_id).eq('session_id', session_id);
        return json({ success: true });
      }

      case 'finish-game': {
        const { session_id, room_id } = params;
        const { data: room } = await supabase.from('rooms').select('host_session_id').eq('id', room_id).single();
        if (!room || room.host_session_id !== session_id) return json({ error: 'Only host' }, 403);

        await supabase.from('rooms').update({
          phase: 'finished', status: 'closed',
          updated_at: new Date().toISOString(),
          closed_at: new Date().toISOString(),
        }).eq('id', room_id);

        return json({ success: true });
      }

      case 'kick-player': {
        const { session_id, room_id, target_session_id } = params;
        if (!session_id || !room_id || !target_session_id) return json({ error: 'Missing fields' }, 400);
        if (session_id === target_session_id) return json({ error: 'Cannot kick yourself' }, 400);

        const { data: room } = await supabase.from('rooms').select('host_session_id, phase').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);
        if (room.host_session_id !== session_id) return json({ error: 'Only host can kick' }, 403);
        if (room.phase !== 'lobby') return json({ error: 'Can only kick in lobby' }, 400);

        await supabase.from('room_players').delete().eq('room_id', room_id).eq('session_id', target_session_id);
        await supabase.from('room_events').insert({
          room_id, event_type: 'kicked', session_id, data: { target: target_session_id },
        });

        return json({ success: true });
      }

      case 'migrate-host': {
        const { session_id, room_id } = params;
        if (!session_id || !room_id) return json({ error: 'Missing fields' }, 400);

        const { data: room } = await supabase.from('rooms').select('host_session_id, status').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);
        if (room.status === 'closed') return json({ error: 'Room is closed' }, 400);

        const { data: currentHost } = await supabase
          .from('room_players').select('last_heartbeat, is_online')
          .eq('room_id', room_id).eq('session_id', room.host_session_id).maybeSingle();

        if (currentHost) {
          const hostLastSeen = new Date(currentHost.last_heartbeat).getTime();
          const elapsed = Date.now() - hostLastSeen;
          if (currentHost.is_online && elapsed < 25000) {
            return json({ error: 'Current host is still connected' }, 400);
          }
        }

        const { data: oldestPlayer } = await supabase
          .from('room_players').select('session_id')
          .eq('room_id', room_id).eq('is_online', true)
          .order('joined_at').limit(1).maybeSingle();

        if (!oldestPlayer || oldestPlayer.session_id !== session_id) {
          return json({ error: 'Only the oldest connected player can become host' }, 403);
        }

        await supabase.from('room_players').update({ is_host: false })
          .eq('room_id', room_id).eq('session_id', room.host_session_id);
        await supabase.from('room_players').update({ is_host: true })
          .eq('room_id', room_id).eq('session_id', session_id);

        const updateData: Record<string, unknown> = {
          host_session_id: session_id, updated_at: new Date().toISOString(),
        };
        // If room was stuck in 'starting', new host resets to waiting
        if (room.status === 'starting') {
          updateData.status = 'waiting';
          updateData.phase = 'lobby';
        }

        await supabase.from('rooms').update(updateData).eq('id', room_id);

        await supabase.from('room_events').insert({
          room_id, event_type: 'host_migrated', session_id,
        });

        return json({ success: true });
      }

      case 'shuffle-players': {
        const { session_id, room_id } = params;
        if (!session_id || !room_id) return json({ error: 'Missing fields' }, 400);

        const { data: room } = await supabase
          .from('rooms').select('host_session_id').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);
        if (room.host_session_id !== session_id) return json({ error: 'Only host' }, 403);

        const { data: players } = await supabase
          .from('room_players').select('id, session_id')
          .eq('room_id', room_id).order('joined_at');
        if (!players || players.length === 0) return json({ error: 'No players' }, 400);

        // Fisher-Yates shuffle then assign new sequential joined_at timestamps
        const shuffled = [...players];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const baseTime = new Date('2020-01-01T00:00:00Z');
        const updates = shuffled.map((p, i) => 
          supabase.from('room_players')
            .update({ joined_at: new Date(baseTime.getTime() + i * 1000).toISOString() })
            .eq('id', p.id)
        );
        await Promise.all(updates);

        // Touch room to trigger realtime update
        await supabase.from('rooms').update({ updated_at: new Date().toISOString() }).eq('id', room_id);

        return json({ success: true });
      }

      // ─── Skip Turn (host skips offline player) ───
      case 'skip-turn': {
        const { session_id, room_id, target_session_id } = params;
        if (!session_id || !room_id || !target_session_id) return json({ error: 'Missing fields' }, 400);

        const { data: room } = await supabase
          .from('rooms').select('phase, current_round, spoke_rounds, host_session_id').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);
        if (room.host_session_id !== session_id && session_id !== target_session_id) {
          return json({ error: 'Only host or self' }, 403);
        }
        if (room.phase !== 'discussion') return json({ error: 'Not in discussion phase' }, 400);

        // Verify the target is the current speaker
        const { data: allSpokeEvents } = await supabase
          .from('room_events').select('session_id, data')
          .eq('room_id', room_id).eq('event_type', 'spoke');
        const roundSpokeEvents = (allSpokeEvents || []).filter(e => {
          const d = e.data as Record<string, unknown> | null;
          return d && d.game_round === room.current_round;
        });

        const { data: activePlayers } = await supabase
          .from('room_players').select('session_id')
          .eq('room_id', room_id).eq('is_eliminated', false)
          .order('joined_at');
        const playerOrder = (activePlayers || []).map(p => p.session_id);
        const spokeRounds = room.spoke_rounds || 2;
        const totalTurns = playerOrder.length * spokeRounds;
        const currentTurnIndex = roundSpokeEvents.length;

        const expectedPlayer = playerOrder[currentTurnIndex % playerOrder.length];
        if (target_session_id !== expectedPlayer) {
          return json({ error: 'This player is not the current speaker' }, 400);
        }

        const turnNumber = Math.floor(currentTurnIndex / playerOrder.length) + 1;

        // Insert a spoke event on behalf of the skipped player
        await supabase.from('room_events').insert({
          room_id, event_type: 'spoke', session_id: target_session_id,
          data: { game_round: room.current_round, turn: turnNumber, turn_index: currentTurnIndex, skipped_by_host: true },
        });

        const newTotalSpoken = currentTurnIndex + 1;
        if (newTotalSpoken >= totalTurns) {
          await supabase.from('rooms').update({
            phase: 'voting', updated_at: new Date().toISOString(),
          }).eq('id', room_id);
          await supabase.from('room_events').insert({
            room_id, event_type: 'phase_changed', session_id,
            data: { from: 'discussion', to: 'voting', auto: true },
          });
        }

        return json({ success: true, skipped: target_session_id, auto_advanced: newTotalSpoken >= totalTurns });
      }

      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    console.error('Game engine error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});

// ─── Server-authoritative scoring function ───
async function finalizeRound(
  supabase: ReturnType<typeof createClient>,
  roomId: string,
  matchId: string,
  roundIndex: number,
) {
  // Prevent double-award
  const { data: existing } = await supabase
    .from('round_results').select('id')
    .eq('room_id', roomId).eq('match_id', matchId).eq('round_index', roundIndex)
    .maybeSingle();
  if (existing) return; // Already scored

  const { data: room } = await supabase
    .from('rooms').select('imposter_session_id, secret_word').eq('id', roomId).single();
  if (!room || !room.imposter_session_id) return;

  // Check if imposter guess win already happened
  const { data: guessWinEvent } = await supabase
    .from('round_results').select('id')
    .eq('room_id', roomId).eq('match_id', matchId).eq('round_index', roundIndex)
    .eq('outcome', 'IMPOSTER_GUESS_WIN').maybeSingle();
  if (guessWinEvent) return; // Already handled by imposter-guess

  // Tally votes
  const { data: votes } = await supabase
    .from('votes').select('voter_session_id, target_session_id')
    .eq('room_id', roomId).eq('round', roundIndex);

  const tally: Record<string, number> = {};
  (votes || []).forEach(v => {
    tally[v.target_session_id] = (tally[v.target_session_id] || 0) + 1;
  });

  const maxVotes = Math.max(...Object.values(tally), 0);
  const topVoted = Object.entries(tally).filter(([_, c]) => c === maxVotes).map(([id]) => id);
  const isTie = topVoted.length > 1 || maxVotes === 0;

  // Tie Rule: Tie = Imposter Escapes (Option 1)
  const caught = !isTie && topVoted[0] === room.imposter_session_id;

  let outcome: string;
  const pointsAwarded: Record<string, number> = {};
  const scoreEvents: { player_id: string; delta: number; reason: string }[] = [];

  if (caught) {
    // Rule B: each correct voter gets +1
    outcome = 'IMPOSTER_CAUGHT';
    (votes || []).forEach(v => {
      if (v.target_session_id === room.imposter_session_id) {
        pointsAwarded[v.voter_session_id] = (pointsAwarded[v.voter_session_id] || 0) + 1;
        scoreEvents.push({ player_id: v.voter_session_id, delta: 1, reason: 'CORRECT_VOTE' });
      }
    });
    // Rule C: caught imposter loses 1 point starting round 2
    if (roundIndex >= 2) {
      pointsAwarded[room.imposter_session_id] = (pointsAwarded[room.imposter_session_id] || 0) - 1;
      scoreEvents.push({ player_id: room.imposter_session_id, delta: -1, reason: 'CAUGHT_PENALTY' });
    }
  } else {
    // Imposter escaped. Total votes on imposter (may be 0 or >=1 in tie case)
    const impVotes = tally[room.imposter_session_id] || 0;
    if (impVotes === 0) {
      // Rule D: nobody voted for imposter → clean escape +4
      outcome = 'IMPOSTER_ESCAPED_CLEAN';
      pointsAwarded[room.imposter_session_id] = 4;
      scoreEvents.push({ player_id: room.imposter_session_id, delta: 4, reason: 'ESCAPE_CLEAN' });
    } else {
      // Rule A: got some votes but not caught → +3
      outcome = 'IMPOSTER_ESCAPED';
      pointsAwarded[room.imposter_session_id] = 3;
      scoreEvents.push({ player_id: room.imposter_session_id, delta: 3, reason: 'ESCAPE' });
      // Correct voters (who voted for imposter, in a tie) also get +1
      (votes || []).forEach(v => {
        if (v.target_session_id === room.imposter_session_id) {
          pointsAwarded[v.voter_session_id] = (pointsAwarded[v.voter_session_id] || 0) + 1;
          scoreEvents.push({ player_id: v.voter_session_id, delta: 1, reason: 'CORRECT_VOTE' });
        }
      });
    }
  }

  // Insert round_results
  await supabase.from('round_results').insert({
    room_id: roomId, match_id: matchId, round_index: roundIndex,
    imposter_player_id: room.imposter_session_id,
    outcome,
    votes: tally,
    points_awarded: pointsAwarded,
    secret_word: room.secret_word,
  });

  // Insert score_events
  for (const se of scoreEvents) {
    await supabase.from('score_events').insert({
      room_id: roomId, match_id: matchId, round_index: roundIndex,
      player_id: se.player_id, delta: se.delta, reason: se.reason,
    });
  }

  // Update player scores atomically using RPC
  for (const [playerId, delta] of Object.entries(pointsAwarded)) {
    await supabase.rpc('increment_player_score', {
      p_room_id: roomId,
      p_session_id: playerId,
      p_delta: delta,
    });
  }

  // Elimination check — any player at score <= 0 becomes eliminated
  const { data: updated } = await supabase
    .from('room_players').select('id, session_id, score, is_eliminated')
    .eq('room_id', roomId);
  const toEliminate = (updated || []).filter(p => !p.is_eliminated && p.score <= 0);
  if (toEliminate.length > 0) {
    await Promise.all(toEliminate.map(p =>
      supabase.from('room_players').update({ is_eliminated: true }).eq('id', p.id)
    ));
  }
}
