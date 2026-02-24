import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = 'game-engine';

async function callEngine<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || 'Engine error');
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function useGameEngine() {
  return {
    createRoom: (session_id: string, nickname: string, language: string, settings?: Record<string, unknown>) =>
      callEngine<{ room: Record<string, unknown> }>('create-room', { session_id, nickname, language, settings }),

    joinRoom: (session_id: string, nickname: string, code: string) =>
      callEngine<{ room: Record<string, unknown> }>('join-room', { session_id, nickname, code }),

    startGame: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean; round: number }>('start-game', { session_id, room_id }),

    getReveal: (session_id: string, room_id: string) =>
      callEngine<{ role: 'imposter' | 'normal'; word?: string }>('get-reveal', { session_id, room_id }),

    advancePhase: (session_id: string, room_id: string, phase: string) =>
      callEngine<{ success: boolean }>('advance-phase', { session_id, room_id, phase }),

    vote: (session_id: string, room_id: string, target_session_id: string) =>
      callEngine<{ success: boolean }>('vote', { session_id, room_id, target_session_id }),

    getResults: (room_id: string) =>
      callEngine<{
        votes: Record<string, number>;
        imposter_session_id: string;
        secret_word: string;
        caught: boolean;
        isTie: boolean;
        top_voted: string[];
      }>('get-results', { room_id }),

    leaveRoom: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean }>('leave-room', { session_id, room_id }),

    heartbeat: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean }>('heartbeat', { session_id, room_id }),

    finishGame: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean }>('finish-game', { session_id, room_id }),
  };
}
