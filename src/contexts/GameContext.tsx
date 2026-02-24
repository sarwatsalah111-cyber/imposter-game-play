import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId, getNickname, setNickname as saveNickname } from '@/lib/session';
import { useGameEngine } from '@/hooks/useGameEngine';
import type { Language } from '@/lib/i18n';
import type { Room, RoomPlayer, GamePhase, RevealData } from '@/lib/game-types';

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
}

interface GameActions {
  setNickname: (name: string) => void;
  setLanguage: (lang: Language) => void;
  createRoom: () => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  startGame: () => Promise<void>;
  advancePhase: (phase: GamePhase) => Promise<void>;
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

export function GameProvider({ children }: { children: React.ReactNode }) {
  const engine = useGameEngine();
  const [state, setState] = useState<GameState>({
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
  });
  const heartbeatRef = useRef<NodeJS.Timeout>();

  const update = useCallback((partial: Partial<GameState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!state.room) return;
    const roomId = state.room.id;

    const roomChannel = supabase
      .channel(`room-${roomId}`)
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
            // Update safe fields only
            (['phase', 'status', 'host_session_id', 'current_round', 'updated_at', 'closed_at',
              'language', 'discussion_time', 'voting_time', 'reveal_time', 'total_rounds', 'max_players',
            ] as const).forEach(k => {
              if (k in newRoom) (updated as Record<string, unknown>)[k] = newRoom[k];
            });
            return {
              ...prev,
              room: updated as Room,
              phase: (newRoom.phase as GamePhase) || prev.phase,
              isHost: newRoom.host_session_id === prev.sessionId,
            };
          });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        // Refetch players
        supabase.from('room_players').select('*').eq('room_id', roomId)
          .then(({ data }) => {
            if (data) update({ players: data as unknown as RoomPlayer[] });
          });
      })
      .subscribe();

    // Heartbeat
    heartbeatRef.current = setInterval(() => {
      engine.heartbeat(state.sessionId, roomId).catch(() => {});
    }, 12000);

    return () => {
      supabase.removeChannel(roomChannel);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [state.room?.id, state.sessionId]);

  // Fetch reveal when phase changes to reveal
  useEffect(() => {
    if (state.phase === 'reveal' && state.room && !state.reveal) {
      engine.getReveal(state.sessionId, state.room.id)
        .then(reveal => update({ reveal }))
        .catch(() => {});
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

  const actions: GameActions = {
    setNickname: (name) => {
      saveNickname(name);
      update({ nickname: name });
    },
    setLanguage: (lang) => update({ language: lang }),
    createRoom: async () => {
      update({ loading: true, error: null });
      try {
        const { room } = await engine.createRoom(state.sessionId, state.nickname, state.language);
        const r = room as unknown as Room;
        update({ room: r, phase: 'lobby', isHost: true, loading: false });
        // Fetch players
        const { data: players } = await supabase.from('room_players').select('*').eq('room_id', r.id);
        if (players) update({ players: players as unknown as RoomPlayer[] });
      } catch (e: unknown) {
        update({ error: (e as Error).message, loading: false });
      }
    },
    joinRoom: async (code) => {
      update({ loading: true, error: null });
      try {
        const { room } = await engine.joinRoom(state.sessionId, state.nickname, code);
        const r = room as unknown as Room;
        update({
          room: r,
          phase: r.phase,
          isHost: r.host_session_id === state.sessionId,
          loading: false,
        });
        const { data: players } = await supabase.from('room_players').select('*').eq('room_id', r.id);
        if (players) update({ players: players as unknown as RoomPlayer[] });
      } catch (e: unknown) {
        update({ error: (e as Error).message, loading: false });
      }
    },
    startGame: async () => {
      if (!state.room) return;
      update({ loading: true, error: null });
      try {
        await engine.startGame(state.sessionId, state.room.id);
        update({ loading: false, reveal: null, results: null, hasVoted: false });
      } catch (e: unknown) {
        update({ error: (e as Error).message, loading: false });
      }
    },
    advancePhase: async (phase) => {
      if (!state.room) return;
      try {
        await engine.advancePhase(state.sessionId, state.room.id, phase);
      } catch (e: unknown) {
        update({ error: (e as Error).message });
      }
    },
    vote: async (targetSessionId) => {
      if (!state.room) return;
      try {
        await engine.vote(state.sessionId, state.room.id, targetSessionId);
        update({ hasVoted: true });
      } catch (e: unknown) {
        update({ error: (e as Error).message });
      }
    },
    leaveRoom: async () => {
      if (state.room) {
        await engine.leaveRoom(state.sessionId, state.room.id).catch(() => {});
      }
      update({ room: null, players: [], phase: 'lobby', reveal: null, results: null, isHost: false, hasVoted: false });
    },
    finishGame: async () => {
      if (!state.room) return;
      try {
        await engine.finishGame(state.sessionId, state.room.id);
        update({ room: null, players: [], phase: 'lobby', reveal: null, results: null, isHost: false, hasVoted: false });
      } catch (e: unknown) {
        update({ error: (e as Error).message });
      }
    },
    clearError: () => update({ error: null }),
    goHome: () => {
      update({ room: null, players: [], phase: 'lobby', reveal: null, results: null, isHost: false, hasVoted: false });
    },
  };

  return (
    <GameContext.Provider value={{ ...state, ...actions }}>
      {children}
    </GameContext.Provider>
  );
}
