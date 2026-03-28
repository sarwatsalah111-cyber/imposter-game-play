import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId, getNickname, setNickname as saveNickname, saveRoomContext, getRoomContext, clearRoomContext } from '@/lib/session';
import { useGameEngine } from '@/hooks/useGameEngine';
import type { Language } from '@/lib/i18n';
import type { Room, RoomPlayer, GamePhase, RevealData } from '@/lib/game-types';

interface SpokeStatus {
  spoken: string[];
  spoke_counts: Record<string, number>;
  player_order: string[];
  current_turn_index: number;
  current_turn_player: string | null;
  total_turns: number;
  total_rounds: number;
}

interface GameState {
  sessionId: string;
  nickname: string;
  language: Language;
  room: Room | null;
  players: RoomPlayer[];
  reveal: RevealData | null;
  phase: GamePhase;
  isHost: boolean;
  error: string | null;
  loading: boolean;
  results: {
    votes: Record<string, number>;
    vote_details: Array<{ voter: string; target: string }>;
    imposter_session_id: string;
    secret_word: string;
    caught: boolean;
    isTie: boolean;
    top_voted: string[];
    outcome: string;
    points_awarded: Record<string, number>;
    scores: Record<string, number>;
  } | null;
  hasVoted: boolean;
  spokeStatus: SpokeStatus | null;
  spokenPlayers: string[];
}

interface GameActions {
  setNickname: (name: string) => void;
  setLanguage: (lang: Language) => void;
  createRoom: (settings?: Record<string, unknown>) => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  updateSettings: (settings: Record<string, unknown>) => Promise<void>;
  startGame: () => Promise<void>;
  advancePhase: (phase: GamePhase) => Promise<void>;
  markSpoke: () => Promise<void>;
  vote: (targetSessionId: string) => Promise<void>;
  kickPlayer: (targetSessionId: string) => Promise<void>;
  skipTurn: (targetSessionId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  finishGame: () => Promise<void>;
  playAgain: () => Promise<void>;
  imposterGuess: (guess: string) => Promise<{ correct: boolean }>;
  resetScores: () => Promise<void>;
  clearError: () => void;
  goHome: () => void;
  retryConnection: () => void;
  recoverStart: () => Promise<void>;
  shufflePlayers: () => Promise<void>;
}

const GameContext = createContext<(GameState & GameActions) | null>(null);

const FALLBACK_ACTIONS: GameActions = {
  setNickname: () => {},
  setLanguage: () => {},
  createRoom: async () => {},
  joinRoom: async () => {},
  updateSettings: async () => {},
  startGame: async () => {},
  advancePhase: async () => {},
  markSpoke: async () => {},
  vote: async () => {},
  kickPlayer: async () => {},
  skipTurn: async () => {},
  leaveRoom: async () => {},
  finishGame: async () => {},
  playAgain: async () => {},
  imposterGuess: async () => ({ correct: false }),
  resetScores: async () => {},
  clearError: () => {},
  goHome: () => {},
  retryConnection: () => {},
  recoverStart: async () => {},
  shufflePlayers: async () => {},
};

export function useGame() {
  const ctx = useContext(GameContext);
  if (ctx) return ctx;
  return {
    ...INITIAL_STATE,
    ...FALLBACK_ACTIONS,
    error: 'Context unavailable. Please refresh.',
  };
}

const INITIAL_STATE: GameState = {
  sessionId: getSessionId(),
  nickname: getNickname(),
  language: 'KU_CENTRAL',
  room: null,
  players: [],
  reveal: null,
  phase: 'lobby',
  isHost: false,
  error: null,
  loading: false,
  results: null,
  hasVoted: false,
  spokeStatus: null,
  spokenPlayers: [],
};

const LOADING_TIMEOUT_MS = 8000;

export function GameProvider({ children }: { children: React.ReactNode }) {
  const engine = useGameEngine();
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const playerPollRef = useRef<NodeJS.Timeout>();
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();

  const roomIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef(state.sessionId);
  const phaseRef = useRef(state.phase);
  const lastRoundRef = useRef<number>(0);

  useEffect(() => {
    roomIdRef.current = state.room?.id ?? null;
  }, [state.room?.id]);
  useEffect(() => {
    sessionIdRef.current = state.sessionId;
  }, [state.sessionId]);
  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);
  useEffect(() => {
    lastRoundRef.current = state.room?.current_round ?? 0;
  }, [state.room?.current_round]);

  const update = useCallback((partial: Partial<GameState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  // ─── Loading timeout: auto-cancel after 8s ───
  const setLoadingWithTimeout = useCallback((isLoading: boolean) => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = undefined;
    }
    if (isLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        setState(prev => {
          if (!prev.loading) return prev;
          return { ...prev, loading: false, error: 'Connection timed out. Please retry.' };
        });
      }, LOADING_TIMEOUT_MS);
    }
    update({ loading: isLoading });
  }, [update]);

  // Centralized player fetch
  const fetchPlayers = useCallback(async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);
      if (!error && data) {
        setState(prev => {
          const prevKey = prev.players.map(p => `${p.id}-${p.is_online}-${p.is_eliminated}-${p.nickname}`).join(',');
          const newKey = (data as unknown as RoomPlayer[]).map(p => `${p.id}-${p.is_online}-${p.is_eliminated}-${p.nickname}`).join(',');
          if (prevKey === newKey && prev.players.length === data.length) return prev;
          return { ...prev, players: data as unknown as RoomPlayer[] };
        });
      }
    } catch {}
  }, []);

  // Centralized room fetch
  const fetchRoom = useCallback(async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      if (!error && data) {
        const r = data as unknown as Room;
        setState(prev => {
          if (!prev.room) return prev;
          const newPhase = r.phase as GamePhase;
          const roundChanged = r.current_round !== (prev.room?.current_round ?? 0);
          const phaseChanged = newPhase !== prev.phase;

          // Unconditional round reset when round changes
          const roundReset = roundChanged
            ? { reveal: null, results: null, hasVoted: false, spokeStatus: null, spokenPlayers: [] }
            : {};

          return {
            ...prev,
            ...roundReset,
            room: { ...r, secret_word: undefined, imposter_session_id: undefined } as unknown as Room,
            phase: newPhase,
            isHost: r.host_session_id === sessionIdRef.current,
          };
        });
      }
    } catch {}
  }, []);

  const refreshSpokeStatus = useCallback(async (roomId: string) => {
    try {
      const status = await engine.getSpokeStatus(roomId);
      update({ spokeStatus: status as SpokeStatus });
    } catch {}
  }, [engine, update]);

  // ─── Session recovery on mount ───
  useEffect(() => {
    const savedCtx = getRoomContext();
    if (!savedCtx) return;
    if (savedCtx.sessionId !== state.sessionId) {
      clearRoomContext();
      return;
    }

    // Attempt to recover
    (async () => {
      try {
        const { data: room } = await supabase
          .from('rooms').select('*').eq('id', savedCtx.roomId).single();
        if (!room || room.status === 'closed') {
          clearRoomContext();
          return;
        }

        const { data: player } = await supabase
          .from('room_players').select('*')
          .eq('room_id', savedCtx.roomId).eq('session_id', savedCtx.sessionId).maybeSingle();
        if (!player) {
          clearRoomContext();
          return;
        }

        // Mark online
        await supabase.from('room_players').update({
          is_online: true, last_heartbeat: new Date().toISOString(),
        }).eq('id', player.id);

        const r = room as unknown as Room;
        const { data: players } = await supabase
          .from('room_players').select('*').eq('room_id', r.id);

        update({
          room: { ...r, secret_word: undefined, imposter_session_id: undefined } as unknown as Room,
          phase: r.phase as GamePhase,
          isHost: r.host_session_id === state.sessionId,
          players: (players as unknown as RoomPlayer[]) || [],
        });

        // ── Reconnect: fetch phase-specific data immediately ──
        const phase = r.phase as GamePhase;
        if (phase === 'reveal' || phase === 'discussion') {
          engine.getReveal(state.sessionId, r.id)
            .then(reveal => update({ reveal }))
            .catch(() => {});
        } else if (phase === 'results') {
          engine.getResults(r.id)
            .then(results => update({ results: { ...results, vote_details: results.vote_details || [] } }))
            .catch(() => {});
        }
      } catch {
        clearRoomContext();
      }
    })();
  }, []); // Only on mount

  // ─── Save room context when room changes ───
  useEffect(() => {
    if (state.room) {
      saveRoomContext({ roomId: state.room.id, roomCode: state.room.code, sessionId: state.sessionId });
    }
  }, [state.room?.id, state.sessionId]);

  // ─── Realtime subscription + polling fallback ───
  useEffect(() => {
    if (!state.room) return;
    const roomId = state.room.id;

    fetchPlayers(roomId);

    const channelName = `room-${roomId}-${Date.now()}`;
    const roomChannel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => {
         if (payload.eventType === 'UPDATE') {
          const newRoom = payload.new as Record<string, unknown>;
          setState(prev => {
            if (!prev.room) return prev;
            const updated = { ...prev.room };
            const syncKeys = [
              'phase', 'status', 'host_session_id', 'current_round', 'updated_at', 'closed_at',
              'language', 'discussion_time', 'voting_time', 'reveal_time', 'total_rounds', 'spoke_rounds',
              'max_players', 'min_players',
            ];
            syncKeys.forEach(k => {
              if (k in newRoom) (updated as Record<string, unknown>)[k] = newRoom[k];
            });

            const newPhase = (newRoom.phase as GamePhase) || prev.phase;
            const newRound = (newRoom.current_round as number) ?? prev.room?.current_round ?? 0;
            const roundChanged = newRound !== (prev.room?.current_round ?? 0);

            // ── Unconditional state clear when round changes OR phase goes to reveal ──
            const roundReset = roundChanged || (newPhase === 'reveal' && newPhase !== prev.phase)
              ? { reveal: null, results: null, hasVoted: false, spokeStatus: null, spokenPlayers: [] }
              : {};

            return {
              ...prev,
              ...roundReset,
              room: updated as Room,
              phase: newPhase,
              isHost: newRoom.host_session_id === sessionIdRef.current,
            };
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, () => { fetchPlayers(roomId); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, () => { fetchPlayers(roomId); })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, () => { fetchPlayers(roomId); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_events', filter: `room_id=eq.${roomId}` }, (payload) => {
        const evt = payload.new as Record<string, unknown>;
        if (evt.event_type === 'spoke') {
          refreshSpokeStatus(roomId);
        }
        // ── Backup trigger: round_started event forces state clear + re-fetch ──
        if (evt.event_type === 'round_started') {
          setState(prev => ({
            ...prev,
            reveal: null, results: null, hasVoted: false, spokeStatus: null, spokenPlayers: [],
          }));
          fetchRoom(roomId);
        }
      })
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          fetchPlayers(roomId);
          fetchRoom(roomId);
        }
      });

    // Polling fallback + host migration watchdog
    // Use a faster interval (1.5s) for spoke status during discussion
    const spokePollRef_inner = setInterval(() => {
      if (phaseRef.current === 'discussion') {
        refreshSpokeStatus(roomId);
      }
    }, 1500);

    // ── Faster polling (2s) during phase transitions, 3s otherwise ──
    playerPollRef.current = setInterval(async () => {
      fetchPlayers(roomId);
      fetchRoom(roomId);

      // Host migration watchdog
      setState(prev => {
        if (!prev.room || prev.isHost) return prev;
        const hostPlayer = prev.players.find(p => p.is_host);
        if (!hostPlayer) return prev;
        if (hostPlayer.is_online) return prev;
        const elapsed = Date.now() - new Date(hostPlayer.last_heartbeat).getTime();
        if (elapsed > 25000) {
          const onlinePlayers = prev.players.filter(p => p.is_online).sort((a, b) =>
            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
          );
          if (onlinePlayers.length > 0 && onlinePlayers[0].session_id === sessionIdRef.current) {
            setTimeout(() => {
              engine.migrateHost(sessionIdRef.current, roomId).catch(() => {});
            }, 0);
          }
        }
        return prev;
      });
    }, 2000);

    // Heartbeat
    heartbeatRef.current = setInterval(() => {
      engine.heartbeat(sessionIdRef.current, roomId).catch(() => {});
    }, 10000);

    return () => {
      supabase.removeChannel(roomChannel);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (playerPollRef.current) clearInterval(playerPollRef.current);
      clearInterval(spokePollRef_inner);
    };
  }, [state.room?.id]);

  // Fetch reveal when phase changes to reveal or discussion, or when reveal is cleared (new round)
  useEffect(() => {
    if ((state.phase === 'reveal' || state.phase === 'discussion') && state.room && !state.reveal) {
      engine.getReveal(state.sessionId, state.room.id)
        .then(reveal => update({ reveal }))
        .catch(() => {});
    }
  }, [state.phase, state.room?.id, state.reveal]);

  // Fetch spoke status when entering discussion phase
  useEffect(() => {
    if (state.phase === 'discussion' && state.room) {
      update({ spokeStatus: null, spokenPlayers: [] });
      refreshSpokeStatus(state.room.id);
    }
  }, [state.phase, state.room?.id]);

  // Fetch results when phase changes to results
  useEffect(() => {
    if (state.phase === 'results' && state.room && !state.results) {
      engine.getResults(state.room.id)
        .then(results => update({ results: { ...results, vote_details: results.vote_details || [] } }))
        .catch(() => {});
    }
  }, [state.phase, state.room?.id]);

  const resetState = () => {
    clearRoomContext();
    return {
      room: null, players: [], phase: 'lobby' as GamePhase, reveal: null,
      results: null, isHost: false, hasVoted: false, spokeStatus: null, spokenPlayers: [],
    };
  };

  const actions: GameActions = {
    setNickname: (name) => { saveNickname(name); update({ nickname: name }); },
    setLanguage: (lang) => update({ language: lang }),
    createRoom: async (settings?: Record<string, unknown>) => {
      setLoadingWithTimeout(true);
      update({ error: null });
      try {
        const { room } = await engine.createRoom(state.sessionId, state.nickname, state.language, settings);
        const r = room as unknown as Room;
        const { data: players } = await supabase.from('room_players').select('*').eq('room_id', r.id);
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        update({
          room: r,
          phase: 'lobby',
          isHost: true,
          loading: false,
          players: (players as unknown as RoomPlayer[]) || [],
        });
      } catch (e: unknown) {
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        update({ error: (e as Error).message, loading: false });
      }
    },
    joinRoom: async (code) => {
      setLoadingWithTimeout(true);
      update({ error: null });
      try {
        const { room } = await engine.joinRoom(state.sessionId, state.nickname, code);
        const r = room as unknown as Room;
        const { data: players } = await supabase.from('room_players').select('*').eq('room_id', r.id);
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        update({
          room: r,
          phase: r.phase as GamePhase,
          isHost: r.host_session_id === state.sessionId,
          loading: false,
          players: (players as unknown as RoomPlayer[]) || [],
        });
      } catch (e: unknown) {
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        update({ error: (e as Error).message, loading: false });
      }
    },
    updateSettings: async (settings) => {
      if (!state.room) return;
      try {
        await engine.updateSettings(state.sessionId, state.room.id, settings);
        setState(prev => {
          if (!prev.room) return prev;
          const updated = { ...prev.room };
          Object.entries(settings).forEach(([k, v]) => {
            (updated as Record<string, unknown>)[k] = v;
          });
          return { ...prev, room: updated as Room };
        });
      } catch {
        // Settings update failures are non-critical; silently ignore
      }
    },
    startGame: async () => {
      if (!state.room) return;
      setLoadingWithTimeout(true);
      update({ error: null });
      try {
        await engine.startGame(state.sessionId, state.room.id);
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        // ── Don't locally set phase — wait for Realtime update so host + players converge ──
        update({ loading: false });
      } catch (e: unknown) {
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        update({ error: (e as Error).message, loading: false });
      }
    },
    advancePhase: async (phase) => {
      if (!state.room) return;
      try { await engine.advancePhase(state.sessionId, state.room.id, phase); }
      catch (e: unknown) { update({ error: (e as Error).message }); }
    },
    markSpoke: async () => {
      if (!state.room) return;
      try {
        await engine.markSpoke(state.sessionId, state.room.id);
        refreshSpokeStatus(state.room.id);
      } catch (e: unknown) {
        update({ error: (e as Error).message });
      }
    },
    vote: async (targetSessionId) => {
      if (!state.room) return;
      try {
        await engine.vote(state.sessionId, state.room.id, targetSessionId);
        update({ hasVoted: true });
      } catch (e: unknown) { update({ error: (e as Error).message }); }
    },
    kickPlayer: async (targetSessionId) => {
      if (!state.room) return;
      try {
        await engine.kickPlayer(state.sessionId, state.room.id, targetSessionId);
      } catch (e: unknown) { update({ error: (e as Error).message }); }
    },
    skipTurn: async (targetSessionId) => {
      if (!state.room) return;
      try {
        await engine.skipTurn(state.sessionId, state.room.id, targetSessionId);
        refreshSpokeStatus(state.room.id);
      } catch (e: unknown) { update({ error: (e as Error).message }); }
    },
    leaveRoom: async () => {
      if (state.room) { await engine.leaveRoom(state.sessionId, state.room.id).catch(() => {}); }
      update(resetState());
    },
    finishGame: async () => {
      if (!state.room) return;
      try {
        await engine.finishGame(state.sessionId, state.room.id);
        update(resetState());
      } catch (e: unknown) { update({ error: (e as Error).message }); }
    },
    imposterGuess: async (guess: string) => {
      if (!state.room) return { correct: false };
      try {
        const result = await engine.imposterGuess(state.sessionId, state.room.id, guess);
        return result;
      } catch (e: unknown) {
        update({ error: (e as Error).message });
        return { correct: false };
      }
    },
    resetScores: async () => {
      if (!state.room) return;
      try {
        await engine.resetScores(state.sessionId, state.room.id);
      } catch (e: unknown) { update({ error: (e as Error).message }); }
    },
    clearError: () => update({ error: null }),
    playAgain: async () => {
      if (!state.room) return;
      const settings: Record<string, unknown> = {
        max_players: state.room.max_players,
        min_players: state.room.min_players,
        total_rounds: state.room.total_rounds,
        spoke_rounds: state.room.spoke_rounds ?? 2,
        voting_time: state.room.voting_time,
        discussion_time: state.room.discussion_time,
        reveal_time: state.room.reveal_time,
      };
      const lang = state.room.language as Language;
      // Reset local state first
      update(resetState());
      // Create new room with same settings & language
      setLoadingWithTimeout(true);
      update({ error: null });
      try {
        const { room } = await engine.createRoom(state.sessionId, state.nickname, lang, settings);
        const r = room as unknown as Room;
        const { data: players } = await supabase.from('room_players').select('*').eq('room_id', r.id);
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        update({
          room: r,
          phase: 'lobby',
          isHost: true,
          loading: false,
          players: (players as unknown as RoomPlayer[]) || [],
        });
      } catch (e: unknown) {
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        update({ error: (e as Error).message, loading: false });
      }
    },
    recoverStart: async () => {
      if (!state.room) return;
      try {
        await engine.recoverStart(state.sessionId, state.room.id);
        update({ error: null });
      } catch (e: unknown) {
        update({ error: (e as Error).message });
      }
    },
    shufflePlayers: async () => {
      if (!state.room) return;
      try {
        await engine.shufflePlayers(state.sessionId, state.room.id);
        await fetchPlayers(state.room.id);
      } catch (e: unknown) {
        update({ error: (e as Error).message });
      }
    },
    goHome: () => update(resetState()),
    retryConnection: () => {
      if (state.room) {
        fetchRoom(state.room.id);
        fetchPlayers(state.room.id);
        update({ error: null });
      }
    },
  };

  return (
    <GameContext.Provider value={{ ...state, ...actions }}>
      {children}
    </GameContext.Provider>
  );
}
