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
        if (settings.max_players !== undefined) updates.max_players = Math.min(Math.max(Number(settings.max_players), 3), 22);
        if (settings.min_players !== undefined) updates.min_players = Math.min(Math.max(Number(settings.min_players), 3), 22);

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
        if (room.phase !== 'lobby' && room.phase !== 'results') return json({ error: 'Cannot start now' }, 400);

        const { data: players } = await supabase
          .from('room_players').select('*').eq('room_id', room_id).eq('is_online', true);
        if (!players || players.length < room.min_players) {
          return json({ error: `Need at least ${room.min_players} players` }, 400);
        }

        const { data: words } = await supabase
          .from('word_bank').select('word')
          .eq('language', room.language).eq('is_active', true);
        if (!words || words.length === 0) return json({ error: 'No words available' }, 500);
        const secretWord = words[Math.floor(Math.random() * words.length)].word;

        const imposterIdx = Math.floor(Math.random() * players.length);
        const imposterSessionId = players[imposterIdx].session_id;

        const newRound = (room.phase === 'results') ? room.current_round + 1 : 1;

        await supabase.from('rooms').update({
          phase: 'reveal',
          status: 'playing',
          secret_word: secretWord,
          imposter_session_id: imposterSessionId,
          current_round: newRound,
          updated_at: new Date().toISOString(),
        }).eq('id', room_id);

        await supabase.from('room_events').insert({
          room_id, event_type: 'started', session_id,
          data: { round: newRound },
        });

        return json({ success: true, round: newRound });
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
        return json({ role: 'normal', word: room.secret_word });
      }

      case 'mark-spoke': {
        const { session_id, room_id } = params;
        const { data: room } = await supabase
          .from('rooms').select('phase, current_round, total_rounds, host_session_id').eq('id', room_id).single();
        if (!room || room.phase !== 'discussion') return json({ error: 'Not in discussion phase' }, 400);

        // Get all spoke events for this game round
        const { data: allSpokeEvents } = await supabase
          .from('room_events').select('session_id, data')
          .eq('room_id', room_id)
          .eq('event_type', 'spoke');

        const roundSpokeEvents = (allSpokeEvents || []).filter(e => {
          const d = e.data as Record<string, unknown> | null;
          return d && d.game_round === room.current_round;
        });

        // Count how many times this player has spoken this game round
        const myTurnCount = roundSpokeEvents.filter(e => e.session_id === session_id).length;
        if (myTurnCount >= room.total_rounds) {
          return json({ error: 'You have used all your speaking turns' }, 400);
        }

        // Get active players to determine turn order
        const { data: activePlayers } = await supabase
          .from('room_players').select('session_id')
          .eq('room_id', room_id).eq('is_online', true).eq('is_eliminated', false)
          .order('joined_at');
        
        if (!activePlayers || activePlayers.length === 0) return json({ error: 'No active players' }, 400);

        const playerOrder = activePlayers.map(p => p.session_id);
        const totalTurns = playerOrder.length * room.total_rounds;
        const currentTurnIndex = roundSpokeEvents.length;

        // Verify it's this player's turn
        const expectedPlayer = playerOrder[currentTurnIndex % playerOrder.length];
        if (session_id !== expectedPlayer) {
          return json({ error: 'Not your turn' }, 400);
        }

        const turnNumber = Math.floor(currentTurnIndex / playerOrder.length) + 1;

        await supabase.from('room_events').insert({
          room_id, event_type: 'spoke', session_id,
          data: { game_round: room.current_round, turn: turnNumber, turn_index: currentTurnIndex },
        });

        // Check if all turns are now complete (after this insertion)
        const newTotalSpoken = currentTurnIndex + 1;
        if (newTotalSpoken >= totalTurns) {
          // Auto-advance to voting
          await supabase.from('rooms').update({
            phase: 'voting',
            updated_at: new Date().toISOString(),
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
          .from('rooms').select('current_round, total_rounds').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);

        const { data: events } = await supabase
          .from('room_events').select('session_id, data')
          .eq('room_id', room_id)
          .eq('event_type', 'spoke');

        const roundEvents = (events || []).filter(e => {
          const d = e.data as Record<string, unknown> | null;
          return d && d.game_round === room.current_round;
        });

        // Get active players for turn order
        const { data: activePlayers } = await supabase
          .from('room_players').select('session_id')
          .eq('room_id', room_id).eq('is_online', true).eq('is_eliminated', false)
          .order('joined_at');

        const playerOrder = (activePlayers || []).map(p => p.session_id);
        const totalTurns = playerOrder.length * room.total_rounds;
        const currentTurnIndex = roundEvents.length;
        const currentTurnPlayer = currentTurnIndex < totalTurns ? playerOrder[currentTurnIndex % playerOrder.length] : null;

        // Build per-player spoke counts
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
          total_rounds: room.total_rounds,
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
        if (validTransitions[room.phase] !== phase) {
          return json({ error: 'Invalid phase transition' }, 400);
        }

        await supabase.from('rooms').update({
          phase,
          updated_at: new Date().toISOString(),
        }).eq('id', room_id);

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
          .from('rooms').select('current_round, imposter_session_id, secret_word').eq('id', room_id).single();
        if (!room) return json({ error: 'Room not found' }, 404);

        const { data: votes } = await supabase
          .from('votes').select('*').eq('room_id', room_id).eq('round', room.current_round);

        const tally: Record<string, number> = {};
        (votes || []).forEach(v => {
          tally[v.target_session_id] = (tally[v.target_session_id] || 0) + 1;
        });

        const maxVotes = Math.max(...Object.values(tally), 0);
        const topVoted = Object.entries(tally).filter(([_, c]) => c === maxVotes).map(([id]) => id);
        const isTie = topVoted.length > 1;
        const caught = !isTie && topVoted[0] === room.imposter_session_id;

        return json({
          votes: tally,
          imposter_session_id: room.imposter_session_id,
          secret_word: room.secret_word,
          caught, isTie, top_voted: topVoted,
        });
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

      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    console.error('Game engine error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
