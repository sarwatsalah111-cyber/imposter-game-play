const SESSION_KEY = 'imposter_session_id';
const NICKNAME_KEY = 'imposter_nickname';
const SETTINGS_KEY = 'imposter_default_settings';

export interface DefaultGameSettings {
  max_players: number;
  total_rounds: number;
  voting_time: number;
  discussion_time: number;
}

const DEFAULT_SETTINGS: DefaultGameSettings = {
  max_players: 8,
  total_rounds: 3,
  voting_time: 45,
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
