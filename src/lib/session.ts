const SESSION_KEY = 'imposter_session_id';
const NICKNAME_KEY = 'imposter_nickname';
const SETTINGS_KEY = 'imposter_default_settings';
const ROOM_CONTEXT_KEY = 'imposter_room_context';
const SORANI_FONT_KEY = 'imposter_sorani_font';

export type SoraniFont = 'peshang' | 'zana' | 'k24' | 'kobane' | 'peshmerge' | 'rabar017' | 'rabar018' | 'rabar026' | 'rabar032' | 'mahansaria';

export function getSoraniFont(): SoraniFont {
  return (localStorage.getItem(SORANI_FONT_KEY) as SoraniFont) || 'zana';
}

export function setSoraniFont(font: SoraniFont): void {
  localStorage.setItem(SORANI_FONT_KEY, font);
}

export interface RoomContext {
  roomId: string;
  roomCode: string;
  sessionId: string;
}

export interface DefaultGameSettings {
  max_players: number;
  total_rounds: number;
  spoke_rounds: number;
  voting_time: number;
  discussion_time: number;
}

const DEFAULT_SETTINGS: DefaultGameSettings = {
  max_players: 12,
  total_rounds: 5,
  spoke_rounds: 2,
  voting_time: 30,
  discussion_time: 90,
};

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) || '';
}

export function setNickname(name: string): void {
  localStorage.setItem(NICKNAME_KEY, name);
}

export function getDefaultSettings(): DefaultGameSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveDefaultSettings(settings: DefaultGameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function saveRoomContext(ctx: RoomContext): void {
  try {
    localStorage.setItem(ROOM_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {}
}

export function getRoomContext(): RoomContext | null {
  try {
    const stored = localStorage.getItem(ROOM_CONTEXT_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export function clearRoomContext(): void {
  try {
    localStorage.removeItem(ROOM_CONTEXT_KEY);
  } catch {}
}
