export type GamePhase = 'lobby' | 'reveal' | 'discussion' | 'voting' | 'results' | 'finished';

export interface Room {
  id: string;
  code: string;
  host_session_id: string;
  status: string;
  min_players: number;
  max_players: number;
  total_rounds: number;
  spoke_rounds: number;
  current_round: number;
  reveal_time: number;
  discussion_time: number;
  voting_time: number;
  language: string;
  phase: GamePhase;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  session_id: string;
  nickname: string;
  is_host: boolean;
  is_online: boolean;
  is_eliminated: boolean;
  joined_at: string;
  last_heartbeat: string;
}

export interface Vote {
  id: string;
  room_id: string;
  round: number;
  voter_session_id: string;
  target_session_id: string;
  created_at: string;
}

export interface RevealData {
  role: 'imposter' | 'normal';
  word?: string;
  translations?: Record<string, string>;
}
