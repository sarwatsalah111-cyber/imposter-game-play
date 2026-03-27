import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = 'game-engine';

async function extractInvokeErrorMessage(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : 'Engine error';
  const maybeContext = (error as { context?: Response } | null)?.context;

  if (!maybeContext) return fallback;

  try {
    const body = await maybeContext.clone().json() as { error?: string; message?: string };
    return body?.error || body?.message || fallback;
  } catch {
    try {
      const text = await maybeContext.clone().text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
}

async function callEngine<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, ...params },
  });

  if (error) {
    throw new Error(await extractInvokeErrorMessage(error));
  }

  if ((data as { error?: string } | null)?.error) {
    throw new Error((data as { error: string }).error);
  }

  return data as T;
}

export function useGameEngine() {
  return {
    createRoom: (session_id: string, nickname: string, language: string, settings?: Record<string, unknown>) =>
      callEngine<{ room: Record<string, unknown> }>('create-room', { session_id, nickname, language, settings }),

    joinRoom: (session_id: string, nickname: string, code: string) =>
      callEngine<{ room: Record<string, unknown> }>('join-room', { session_id, nickname, code }),

    updateSettings: (session_id: string, room_id: string, settings: Record<string, unknown>) =>
      callEngine<{ success: boolean }>('update-settings', { session_id, room_id, settings }),

    startGame: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean; round: number }>('start-game', { session_id, room_id }),

    getReveal: (session_id: string, room_id: string) =>
      callEngine<{ role: 'imposter' | 'normal'; word?: string; translations?: Record<string, string> }>('get-reveal', { session_id, room_id }),

    advancePhase: (session_id: string, room_id: string, phase: string) =>
      callEngine<{ success: boolean }>('advance-phase', { session_id, room_id, phase }),

    markSpoke: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean }>('mark-spoke', { session_id, room_id }),

    getSpokeStatus: (room_id: string) =>
      callEngine<{ spoken: string[] }>('get-spoke-status', { room_id }),

    vote: (session_id: string, room_id: string, target_session_id: string) =>
      callEngine<{ success: boolean }>('vote', { session_id, room_id, target_session_id }),

    getResults: (room_id: string) =>
      callEngine<{
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
      }>('get-results', { room_id }),

    imposterGuess: (session_id: string, room_id: string, guess: string) =>
      callEngine<{ correct: boolean; outcome?: string }>('imposter-guess', { session_id, room_id, guess }),

    getLeaderboard: (room_id: string) =>
      callEngine<{
        players: Array<{ session_id: string; nickname: string; score: number; is_host: boolean; is_online: boolean; joined_at: string }>;
        round_results: unknown[];
        latest_points: Array<{ player_id: string; delta: number; reason: string; round_index: number }>;
        current_round: number;
      }>('get-leaderboard', { room_id }),

    resetScores: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean }>('reset-scores', { session_id, room_id }),

    leaveRoom: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean }>('leave-room', { session_id, room_id }),

    heartbeat: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean }>('heartbeat', { session_id, room_id }),

    finishGame: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean }>('finish-game', { session_id, room_id }),

    kickPlayer: (session_id: string, room_id: string, target_session_id: string) =>
      callEngine<{ success: boolean }>('kick-player', { session_id, room_id, target_session_id }),

    migrateHost: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean }>('migrate-host', { session_id, room_id }),

    recoverStart: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean }>('recover-start', { session_id, room_id }),

    shufflePlayers: (session_id: string, room_id: string) =>
      callEngine<{ success: boolean }>('shuffle-players', { session_id, room_id }),

    skipTurn: (session_id: string, room_id: string, target_session_id: string) =>
      callEngine<{ success: boolean }>('skip-turn', { session_id, room_id, target_session_id }),
  };
}
