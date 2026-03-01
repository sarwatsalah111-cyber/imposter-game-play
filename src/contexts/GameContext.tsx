import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId, getNickname, setNickname as saveNickname } from '@/lib/session';
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
    imposter_session_id: string;
    secret_word: string;
    caught: boolean;
    isTie: boolean;
    top_voted: string[];
  } | null;
  hasVoted: boolean;
  spokeStatus: SpokeStatus | null;
  spokenPlayers: string[];
}

interface GameActions {
  setNickname: (name: string) => void;
  setLanguage: (lang: Language) => void;
  createRoom: () => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  updateSettings: (settings: Record<string, unknown>) => Promise<void>;
  startGame: () => Promise<void>;
  advancePhase: (phase: GamePhase) => Promise<void>;
  markSpoke: () => Promise<void>;
  vote: (targetSessionId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  finishGame: () => Promise<void>;
  clearError: () => void;
  goHome: () => void;
}

const GameContext = createContext<(GameState & GameActions) | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be within GameProvider');
  return ctx;
}

const INITIAL_STATE: GameState = {
  sessionId: getSessionId(),
  nickname: getNickname(),
  language: 'EN',
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

export function GameProvider({ children }: { children: React.ReactNode }) {
  const engine = useGameEngine();
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const playerPollRef = useRef<NodeJS.Timeout>();

  // Use refs for values needed inside subscriptions to avoid stale closures
  const roomIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef(state.sessionId);

  // Keep refs in sync
  useEffect(() => {
    roomIdRef.current = state.room?.id ?? null;
  }, [state.room?.id]);
  useEffect(() => {
    sessionIdRef.current = state.sessionId;
  }, [state.sessionId]);

  const update = useCallback((partial: Partial<GameState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  // Centralized player fetch — used by realtime AND polling fallback
  const fetchPlayers = useCallback(async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);
      if (!error && data) {
        setState(prev => {
          // Only update if data actually changed (avoid unnecessary re-renders)
          const prevIds = prev.players.map(p => `${p.id}-${p.is_online}-${p.is_eliminated}`).join(',');
          const newIds = (data as unknown as RoomPlayer[]).map(p => `${p.id}-${p.is_online}-${p.is_eliminated}`).join(',');
          if (prevIds === newIds) return prev;
          return { ...prev, players: data as unknown as RoomPlayer[] };
        });
      }
    } catch {
      // Silently fail — polling will retry
    }
  }, []);

  const refreshSpokeStatus = useCallback(async (roomId: string) => {
    try {
      const status = await engine.getSpokeStatus(roomId);
      update({ spokeStatus: status as SpokeStatus });
    } catch {}
  }, [engine, update]);

  // ─── Realtime subscription + polling fallback ───
  useEffect(() => {
    if (!state.room) return;
    const roomId = state.room.id;

    // Immediate initial fetch to ensure we have latest players
    fetchPlayers(roomId);

    const roomChannel = supabase
      .channel(`room-${roomId}-${Date.now()}`) // unique channel name to avoid reuse issues
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
            (['phase', 'status', 'host_session_id', 'current_round', 'updated_at', 'closed_at',
              'language', 'discussion_time', 'voting_time', 'reveal_time', 'total_rounds', 'max_players',
            ] as const).forEach(k => {
              if (k in newRoom) (updated as Record<string, unknown>)[k] = newRoom[k];
            });
            return {
              ...prev,
              room: updated as Room,
              phase: (newRoom.phase as GamePhase) || prev.phase,
              isHost: newRoom.host_session_id === sessionIdRef.current,
            };
          });
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchPlayers(roomId);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchPlayers(roomId);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchPlayers(roomId);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_events',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const evt = payload.new as Record<string, unknown>;
        if (evt.event_type === 'spoke') {
          refreshSpokeStatus(roomId);
        }
      })
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          // Re-fetch players immediately after subscribe confirms — 
          // events during connection setup may have been missed
          fetchPlayers(roomId);
        }
      });

    // Polling fallback: re-fetch players every 5s as safety net
    // This catches any realtime events that were missed
    playerPollRef.current = setInterval(() => {
      fetchPlayers(roomId);
    }, 5000);

    // Heartbeat
    heartbeatRef.current = setInterval(() => {
      engine.heartbeat(sessionIdRef.current, roomId).catch(() => {});
    }, 12000);

    return () => {
      supabase.removeChannel(roomChannel);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (playerPollRef.current) clearInterval(playerPollRef.current);
    };
  }, [state.room?.id]); // Only re-subscribe when room changes

  // Fetch reveal when phase changes to reveal
  useEffect(() => {
    if (state.phase === 'reveal' && state.room && !state.reveal) {
      engine.getReveal(state.sessionId, state.room.id)
        .then(reveal => update({ reveal }))
        .catch(() => {});
    }
  }, [state.phase, state.room?.id]);

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
        .then(results => update({ results }))
        .catch(() => {});
    }
  }, [state.phase, state.room?.id]);

  const resetState = () => ({
    room: null, players: [], phase: 'lobby' as GamePhase, reveal: null,
    results: null, isHost: false, hasVoted: false, spokeStatus: null, spokenPlayers: [],
  });

  const actions: GameActions = {
    setNickname: (name) => { saveNickname(name); update({ nickname: name }); },
    setLanguage: (lang) => update({ language: lang }),
    createRoom: async () => {
      update({ loading: true, error: null });
      try {
        const { room } = await engine.createRoom(state.sessionId, state.nickname, state.language);
        const r = room as unknown as Room;
        // Fetch players immediately after creating
        const { data: players } = await supabase.from('room_players').select('*').eq('room_id', r.id);
        update({
          room: r,
          phase: 'lobby',
          isHost: true,
          loading: false,
          players: (players as unknown as RoomPlayer[]) || [],
        });
      } catch (e: unknown) {
        update({ error: (e as Error).message, loading: false });
      }
    },
    joinRoom: async (code) => {
      update({ loading: true, error: null });
      try {
        const { room } = await engine.joinRoom(state.sessionId, state.nickname, code);
        const r = room as unknown as Room;
        const { data: players } = await supabase.from('room_players').select('*').eq('room_id', r.id);
        update({
          room: r,
          phase: r.phase,
          isHost: r.host_session_id === state.sessionId,
          loading: false,
          players: (players as unknown as RoomPlayer[]) || [],
        });
      } catch (e: unknown) {
        update({ error: (e as Error).message, loading: false });
      }
    },
    updateSettings: async (settings) => {
      if (!state.room) return;
      try { await engine.updateSettings(state.sessionId, state.room.id, settings); }
      catch (e: unknown) { update({ error: (e as Error).message }); }
    },
    startGame: async () => {
      if (!state.room) return;
      update({ loading: true, error: null });
      try {
        await engine.startGame(state.sessionId, state.room.id);
        update({ loading: false, reveal: null, results: null, hasVoted: false, spokeStatus: null, spokenPlayers: [] });
      } catch (e: unknown) {
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
    clearError: () => update({ error: null }),
    goHome: () => update(resetState()),
  };

  return (
    <GameContext.Provider value={{ ...state, ...actions }}>
      {children}
    </GameContext.Provider>
  );
}
